'use client';

import React from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
    session: Session;
    children: React.ReactNode;
}

export default function DashboardLayout({ session, children }: DashboardLayoutProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    const userEmail = session.user.email ?? '';
    const userAvatar = session.user.user_metadata?.avatar_url;
    const userName = session.user.user_metadata?.full_name ?? userEmail.split('@')[0];

    return (
        <div className="min-h-screen bg-slate-100">

            {/* ── Dark Navbar ── */}
            <nav className="navbar sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">

                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                                <Bookmark className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">
                                Smart<span className="text-indigo-400">Marks</span>
                            </span>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {/* Live sync pill */}
                            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
                                <div className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="text-xs font-medium text-emerald-400">Live sync</span>
                            </div>

                            {/* User pill */}
                            <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5">
                                {userAvatar ? (
                                    <img className="h-7 w-7 rounded-full ring-2 ring-indigo-400/50" src={userAvatar} alt={userName} />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-bold text-indigo-300">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium text-white/80">
                                    {userName}
                                </span>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 transition-all hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Light Main Content ── */}
            <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
