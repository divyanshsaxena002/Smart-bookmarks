'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Bookmark } from '@/lib/types';
import { Plus, Trash2, ExternalLink, Globe, Search, AlertCircle, Loader2 } from 'lucide-react';

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch bookmarks on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchBookmarks() {
      setLoading(true);
      setFetchError(null);

      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        setFetchError(error.message);
      } else {
        setBookmarks(data ?? []);
      }
      setLoading(false);
    }

    fetchBookmarks();
  }, [supabase, session.user.id]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks((prev) => [payload.new as Bookmark, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter((b) => b.id !== (payload.old as Bookmark).id));
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === (payload.new as Bookmark).id ? (payload.new as Bookmark) : b))
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, session.user.id]);

  // ── Add bookmark ──────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    let trimmedUrl = url.trim();
    if (!trimmedTitle || !trimmedUrl) return;

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = 'https://' + trimmedUrl;
    }

    setAdding(true);
    setAddError(null);

    const { error } = await supabase.from('bookmarks').insert({
      title: trimmedTitle,
      url: trimmedUrl,
      user_id: session.user.id,
    } as any);

    if (error) {
      console.error('Insert error:', error);
      setAddError(error.message);
    } else {
      setTitle('');
      setUrl('');
      // Optimistically add to list (realtime will also fire, but this is faster)
      setBookmarks((prev) => [
        { id: crypto.randomUUID(), title: trimmedTitle, url: trimmedUrl, user_id: session.user.id, created_at: new Date().toISOString() },
        ...prev,
      ]);
    }

    setAdding(false);
  };

  // ── Delete bookmark ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    // Optimistic UI: remove immediately
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    const { error } = await supabase.from('bookmarks').delete().eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete: ${error.message}`);
      // Re-fetch to restore state
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setBookmarks(data ?? []);
    }

    setDeletingId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Add Bookmark Form ── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Add New Bookmark</h3>
        </div>
        <form onSubmit={handleAdd} className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
                Title
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Cool Site"
                  required
                  className="block w-full rounded-md border-0 px-3 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="url" className="block text-sm font-medium leading-6 text-gray-900">
                URL
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                  required
                  className="block w-full rounded-md border-0 px-3 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {addError && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {addError}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {adding ? 'Adding...' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Bookmarks List ── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold leading-6 text-gray-900">
          Your Bookmarks
          {bookmarks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({bookmarks.length})</span>
          )}
        </h2>

        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : fetchError ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center">
            <Search className="mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-sm font-semibold text-gray-900">No bookmarks yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new one above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group relative flex flex-col justify-between rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
                    {bookmark.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 break-all text-sm text-gray-500">
                    {bookmark.url}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    disabled={deletingId === bookmark.id}
                    className="flex items-center justify-center rounded-md bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    title="Delete bookmark"
                  >
                    {deletingId === bookmark.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}