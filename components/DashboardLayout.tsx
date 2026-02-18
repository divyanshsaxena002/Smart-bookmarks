'use client';

import React from 'react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
    session: Session;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ session, children }) => {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    const userEmail = session.user.email;
    const userAvatar = session.user.user_metadata.avatar_url;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex items-center">
                            <div className="flex flex-shrink-0 items-center gap-2">
                                <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-sm">
                                    <Bookmark className="h-5 w-5" />
                                </div>
                                <span className="hidden text-xl font-bold text-gray-900 sm:block">SmartMarks</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 rounded-full bg-gray-50 px-3 py-1.5 ring-1 ring-gray-900/5">
                                {userAvatar ? (
                                    <img
                                        className="h-8 w-8 rounded-full border border-gray-200"
                                        src={userAvatar}
                                        alt="User Avatar"
                                    />
                                ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                                    {userEmail}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                                title="Sign out"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
