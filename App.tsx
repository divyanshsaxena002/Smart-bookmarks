import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';

// NOTE: While the prompt requested Next.js App Router, the mandatory output format 
// (index.html, index.tsx entry points) dictates a standard React SPA structure.
// This implementation provides the full requested functionality (Supabase, RLS, Realtime, Auth)
// within a React 18 SPA architecture compatible with Vercel deployment.

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {!session ? (
        <Auth />
      ) : (
        <Layout session={session}>
          <Dashboard session={session} />
        </Layout>
      )}
    </div>
  );
};

export default App;