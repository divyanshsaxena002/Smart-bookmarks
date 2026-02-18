import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Auth from '@/components/Auth';
import Dashboard from '@/components/Dashboard';
import DashboardLayout from '@/components/DashboardLayout';

export default async function Home() {
    const supabase = await createClient();

    // Use getUser() instead of getSession() for secure server-side auth
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return <Auth />;
    }

    // Build a minimal session-like object for client components
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return <Auth />;
    }

    return (
        <DashboardLayout session={session}>
            <Dashboard session={session} />
        </DashboardLayout>
    );
}
