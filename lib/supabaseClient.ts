import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Access environment variables or use provided fallbacks.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://idtuktckaguheryzyesm.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdHVrdGNrYWd1aGVyeXp5ZXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDE4NjUsImV4cCI6MjA4NjkxNzg2NX0.Js3zFKAUmbhCn3UbTDamWBEaLXMKYHbuCZm2h0K6Gyw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Key are missing. Please check your environment variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});