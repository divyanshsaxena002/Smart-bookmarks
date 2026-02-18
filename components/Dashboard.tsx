'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Bookmark } from '@/lib/types';
import {
  Plus, Trash2, ExternalLink, Globe, Search,
  AlertCircle, Loader2, Copy, Check, X, BookmarkPlus,
} from 'lucide-react';

interface DashboardProps { session: Session; }

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
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookmarks').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) setFetchError(error.message);
      else setBookmarks(data ?? []);
      setLoading(false);
    })();
  }, [supabase, session.user.id]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('bm-rt')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${session.user.id}` },
        (p) => {
          if (p.eventType === 'INSERT') setBookmarks(prev => [p.new as Bookmark, ...prev]);
          if (p.eventType === 'DELETE') setBookmarks(prev => prev.filter(b => b.id !== (p.old as Bookmark).id));
          if (p.eventType === 'UPDATE') setBookmarks(prev => prev.map(b => b.id === (p.new as Bookmark).id ? p.new as Bookmark : b));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, session.user.id]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    let u = url.trim();
    if (!t || !u) return;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    setAdding(true); setAddError(null);
    const { error } = await supabase.from('bookmarks').insert({ title: t, url: u, user_id: session.user.id } as any);
    if (error) { setAddError(error.message); }
    else {
      setTitle(''); setUrl('');
      setBookmarks(prev => [{ id: crypto.randomUUID(), title: t, url: u, user_id: session.user.id, created_at: new Date().toISOString() }, ...prev]);
    }
    setAdding(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      const { data } = await supabase.from('bookmarks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setBookmarks(data ?? []);
    }
    setDeletingId(null);
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async (id: string, u: string) => {
    try { await navigator.clipboard.writeText(u); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
    catch { alert('Failed to copy'); }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = bookmarks.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
  });

  const getFavicon = (u: string) => {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(u).hostname}&sz=32`; }
    catch { return null; }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Bookmarks</h1>
        <p className="mt-1 text-sm text-slate-500">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* ── Add Form (light card) ── */}
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-2">
          <BookmarkPlus className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Add New Bookmark</h3>
        </div>

        <form onSubmit={handleAdd}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Title
              </label>
              <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="My Cool Site" required className="form-input" />
            </div>
            <div>
              <label htmlFor="url" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                URL
              </label>
              <input id="url" type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="example.com" required className="form-input" />
            </div>
          </div>

          {addError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {addError}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={adding} className="btn-primary">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {adding ? 'Adding...' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by title or URL..." className="search-bar"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">
            {searchQuery
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : 'Your Bookmarks'}
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-44" />)}
          </div>
        ) : fetchError ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-500">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
            {searchQuery ? (
              <><Search className="mb-3 h-10 w-10 text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-600">No results found</h3>
                <p className="mt-1 text-xs text-slate-400">Try a different search term</p></>
            ) : (
              <><Globe className="mb-3 h-10 w-10 text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-600">No bookmarks yet</h3>
                <p className="mt-1 text-xs text-slate-400">Add your first bookmark above</p></>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(bookmark => {
              const favicon = getFavicon(bookmark.url);
              const isCopied = copiedId === bookmark.id;
              const isDeleting = deletingId === bookmark.id;

              return (
                <div key={bookmark.id} className="card flex flex-col justify-between p-5">
                  {/* Top */}
                  <div>
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
                        {favicon ? (
                          <img src={favicon} alt="" className="h-5 w-5 rounded"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Globe className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{bookmark.title}</h3>
                        <p className="mt-0.5 line-clamp-1 break-all text-xs text-slate-400">{bookmark.url}</p>
                      </div>
                    </div>
                    <span className="badge">
                      {new Date(bookmark.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 justify-center">
                      <ExternalLink className="h-3.5 w-3.5" /> Visit
                    </a>
                    <button onClick={() => handleCopy(bookmark.id, bookmark.url)}
                      title={isCopied ? 'Copied!' : 'Copy URL'}
                      className={`btn-copy ${isCopied ? 'copied' : ''}`}>
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(bookmark.id)} disabled={isDeleting}
                      title="Delete" className="btn-danger">
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