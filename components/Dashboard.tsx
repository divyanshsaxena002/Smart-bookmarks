'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Bookmark } from '@/lib/types';
import {
  Plus, Trash2, ExternalLink, Globe, Search,
  AlertCircle, Loader2, Copy, Check, X, BookmarkPlus
} from 'lucide-react';

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session }: DashboardProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // NEW: Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  // NEW: Copy-to-clipboard state (tracks which bookmark id was just copied)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
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
        { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${session.user.id}` },
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
    if (!/^https?:\/\//i.test(trimmedUrl)) trimmedUrl = 'https://' + trimmedUrl;

    setAdding(true);
    setAddError(null);

    const { error } = await supabase.from('bookmarks').insert({
      title: trimmedTitle,
      url: trimmedUrl,
      user_id: session.user.id,
    } as any);

    if (error) {
      setAddError(error.message);
    } else {
      setTitle('');
      setUrl('');
      // Optimistic add
      setBookmarks((prev) => [{
        id: crypto.randomUUID(),
        title: trimmedTitle,
        url: trimmedUrl,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
      }, ...prev]);
    }
    setAdding(false);
  };

  // ── Delete bookmark ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id)); // optimistic
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
      const { data } = await supabase.from('bookmarks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setBookmarks(data ?? []);
    }
    setDeletingId(null);
  };

  // ── NEW: Copy URL to clipboard ────────────────────────────────────────────
  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Failed to copy URL');
    }
  };

  // ── NEW: Filter bookmarks by search query ─────────────────────────────────
  const filteredBookmarks = bookmarks.filter((b) => {
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
  });

  // ── Favicon helper ────────────────────────────────────────────────────────
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">My Bookmarks</h1>
        <p className="text-sm text-white/40">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* ── Add Bookmark Form ── */}
      <div className="glass-light rounded-2xl p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-2">
          <BookmarkPlus className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Add New Bookmark</h3>
        </div>

        <form onSubmit={handleAdd}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div>
              <label htmlFor="title" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Cool Site"
                required
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 transition-all"
              />
            </div>
            {/* URL */}
            <div>
              <label htmlFor="url" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                URL
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                required
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 transition-all"
              />
            </div>
          </div>

          {addError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {addError}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-indigo-400 hover:to-purple-500 hover:-translate-y-0.5 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:translate-y-0"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {adding ? 'Adding...' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Search Bar (NEW) ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bookmarks by title or URL..."
          className="input-glow w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-white/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/30 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Bookmarks Grid ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white/80">
            {searchQuery
              ? `${filteredBookmarks.length} result${filteredBookmarks.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : 'Your Bookmarks'}
          </h2>
        </div>

        {loading ? (
          // Shimmer skeleton
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer h-44 rounded-2xl" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{fetchError}</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center">
            {searchQuery ? (
              <>
                <Search className="mb-3 h-10 w-10 text-white/20" />
                <h3 className="text-sm font-semibold text-white/60">No results found</h3>
                <p className="mt-1 text-xs text-white/30">Try a different search term</p>
              </>
            ) : (
              <>
                <Globe className="mb-3 h-10 w-10 text-white/20" />
                <h3 className="text-sm font-semibold text-white/60">No bookmarks yet</h3>
                <p className="mt-1 text-xs text-white/30">Add your first bookmark above</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBookmarks.map((bookmark) => {
              const favicon = getFavicon(bookmark.url);
              const isCopied = copiedId === bookmark.id;
              const isDeleting = deletingId === bookmark.id;

              return (
                <div
                  key={bookmark.id}
                  className="card-hover glass group relative flex flex-col justify-between rounded-2xl p-5"
                >
                  {/* Top: icon + title + url */}
                  <div>
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30 transition-all group-hover:bg-indigo-500/30">
                        {favicon ? (
                          <img
                            src={favicon}
                            alt=""
                            className="h-5 w-5 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Globe className="h-5 w-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-sm font-semibold text-white">
                          {bookmark.title}
                        </h3>
                        <p className="mt-0.5 line-clamp-1 break-all text-xs text-white/40">
                          {bookmark.url}
                        </p>
                      </div>
                    </div>

                    {/* Date badge */}
                    <div className="tag-badge inline-block">
                      {new Date(bookmark.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Bottom: action buttons */}
                  <div className="mt-5 flex items-center gap-2">
                    {/* Visit */}
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 transition-all hover:bg-indigo-500/20 hover:text-indigo-300 hover:ring-indigo-500/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit
                    </a>

                    {/* Copy URL (NEW) */}
                    <button
                      onClick={() => handleCopy(bookmark.id, bookmark.url)}
                      title={isCopied ? 'Copied!' : 'Copy URL'}
                      className={`flex items-center justify-center rounded-xl px-3 py-2 ring-1 transition-all ${isCopied
                          ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                          : 'bg-white/5 text-white/50 ring-white/10 hover:bg-white/10 hover:text-white/80'
                        }`}
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      disabled={isDeleting}
                      title="Delete"
                      className="flex items-center justify-center rounded-xl bg-white/5 px-3 py-2 text-white/50 ring-1 ring-white/10 transition-all hover:bg-red-500/20 hover:text-red-400 hover:ring-red-500/30 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}