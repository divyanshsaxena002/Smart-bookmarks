import { createClient } from '@/lib/supabase/server';
import Auth from '@/components/Auth';
import Dashboard from '@/components/Dashboard';
import DashboardLayout from '@/components/DashboardLayout';

export default async function Home() {
    const supabase = await createClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return <Auth />;
    }

    return (
        <DashboardLayout session={session}>
            <Dashboard session={session} />
        </DashboardLayout>
    );
}
