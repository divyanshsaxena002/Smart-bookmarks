'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Bookmark, Database } from '@/lib/types';
import { Plus, Trash2, ExternalLink, Globe, Search, AlertCircle } from 'lucide-react';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Initial Fetch
  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setBookmarks(data);
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBookmarks();

    // Realtime Subscription
    const channel = supabase
      .channel('realtime-bookmarks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks((prev) => [payload.new as Bookmark, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === payload.new.id ? (payload.new as Bookmark) : b))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookmarks, supabase]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    let validUrl = url.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = 'https://' + validUrl;
    }

    try {
      setAdding(true);
      setError(null);

      const insertData: Database['public']['Tables']['bookmarks']['Insert'] = {
        title: title.trim(),
        url: validUrl,
        user_id: session.user.id,
      };

      // @ts-expect-error - Supabase client type inference issue in Next.js client components
      const { error } = await supabase.from('bookmarks').insert(insertData);

      if (error) throw error;

      setTitle('');
      setUrl('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('bookmarks').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting:', error.message);
      alert('Failed to delete bookmark');
    }
  };

  return (
    <div className="space-y-8">
      {/* Add Bookmark Form */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Add New Bookmark</h3>
        </div>
        <form onSubmit={handleAddBookmark} className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
                Title
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Cool Site"
                  className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  required
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
                  name="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                  className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              {adding ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="-ml-0.5 mr-2 h-4 w-4" />
                  Add Bookmark
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bookmarks List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold leading-6 text-gray-900">Your Bookmarks</h2>

        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
                className="group relative flex flex-col justify-between rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md ring-1 ring-gray-900/5"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h3 className="line-clamp-1 text-base font-semibold leading-6 text-gray-900">
                    {bookmark.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-500 break-all">
                    {bookmark.url}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    className="flex items-center justify-center rounded-md bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 transition-colors"
                    title="Delete bookmark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;