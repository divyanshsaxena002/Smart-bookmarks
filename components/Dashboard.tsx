'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Bookmark } from '@/lib/types';
import {
  Plus, Trash2, ExternalLink, Globe, Search,
  AlertCircle, Loader2, Copy, Check, X, BookmarkPlus, CheckCircle2,
} from 'lucide-react';

interface DashboardProps { session: Session; }

// ── Toast ─────────────────────────────────────────────────────────────────────
type Toast = { id: string; message: string; type: 'success' | 'error' };

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl text-sm font-medium min-w-[220px] ${t.type === 'success'
            ? 'bg-white border border-emerald-100 text-emerald-700'
            : 'bg-white border border-red-100 text-red-600'
            }`}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-slate-300 hover:text-slate-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
    if (error) {
      setAddError(error.message);
      addToast('Failed to add bookmark', 'error');
    } else {
      setTitle(''); setUrl('');
      setBookmarks(prev => [{
        id: crypto.randomUUID(), title: t, url: u,
        user_id: session.user.id, created_at: new Date().toISOString(),
      }, ...prev]);
      addToast('Bookmark added!', 'success');
    }
    setAdding(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete bookmark', 'error');
      const { data } = await supabase.from('bookmarks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setBookmarks(data ?? []);
    } else {
      addToast('Bookmark deleted', 'success');
    }
    setDeletingId(null);
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async (id: string, u: string) => {
    try {
      await navigator.clipboard.writeText(u);
      setCopiedId(id);
      addToast('URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('Failed to copy URL', 'error');
    }
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
    <>
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      <div className="space-y-8">

        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Bookmarks</h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Loading...' : `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          {/* Stats pill */}
          {!loading && bookmarks.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5">
              <BookmarkPlus className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">{bookmarks.length} saved</span>
            </div>
          )}
        </div>

        {/* ── Add Form ── */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <BookmarkPlus className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Add New Bookmark</h3>
          </div>

          <form onSubmit={handleAdd}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bm-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Title
                </label>
                <input id="bm-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="My Cool Site" required className="form-input" />
              </div>
              <div>
                <label htmlFor="bm-url" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  URL
                </label>
                <input id="bm-url" type="text" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="example.com" required className="form-input" />
              </div>
            </div>

            {addError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {addError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-slate-400">https:// will be added automatically if missing</p>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        <div>
          {/* Section label */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {searchQuery
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : 'All Bookmarks'}
            </p>
            {searchQuery && filtered.length > 0 && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                Clear search
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-44" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm font-medium text-red-600">Failed to load bookmarks</p>
              <p className="text-xs text-red-400">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
              {searchQuery ? (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Search className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700">No results for &quot;{searchQuery}&quot;</h3>
                  <p className="mt-1 text-xs text-slate-400">Try a different keyword</p>
                  <button onClick={() => setSearchQuery('')} className="mt-4 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                    <Globe className="h-7 w-7 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700">No bookmarks yet</h3>
                  <p className="mt-1 text-xs text-slate-400">Add your first bookmark using the form above</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((bookmark, idx) => {
                const favicon = getFavicon(bookmark.url);
                const isCopied = copiedId === bookmark.id;
                const isDeleting = deletingId === bookmark.id;

                return (
                  <div
                    key={bookmark.id}
                    className="card animate-card flex flex-col justify-between p-5"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Top */}
                    <div>
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden">
                          {favicon ? (
                            <img src={favicon} alt="" className="h-5 w-5"
                              onError={e => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                el.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>`;
                              }}
                            />
                          ) : (
                            <Globe className="h-5 w-5 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 leading-snug">
                            {bookmark.title}
                          </h3>
                          <p className="mt-0.5 line-clamp-1 break-all text-xs text-slate-400">
                            {bookmark.url}
                          </p>
                        </div>
                      </div>
                      <span className="badge">
                        {new Date(bookmark.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="my-4 h-px bg-slate-100" />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost flex-1 justify-center">
                        <ExternalLink className="h-3.5 w-3.5" /> Visit
                      </a>
                      <button onClick={() => handleCopy(bookmark.id, bookmark.url)}
                        title={isCopied ? 'Copied!' : 'Copy URL'}
                        className={`btn-copy ${isCopied ? 'copied' : ''}`}>
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(bookmark.id)} disabled={isDeleting}
                        title="Delete" className="btn-danger">
                        {isDeleting
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}