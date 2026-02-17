-- 1. Create the table
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.bookmarks enable row level security;

-- 3. Create RLS Policies

-- Policy for SELECT: Users can only see their own bookmarks
create policy "Users can view own bookmarks" 
on public.bookmarks for select 
using (auth.uid() = user_id);

-- Policy for INSERT: Users can insert bookmarks, linking them to their own user_id
create policy "Users can insert own bookmarks" 
on public.bookmarks for insert 
with check (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own bookmarks
create policy "Users can update own bookmarks" 
on public.bookmarks for update 
using (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own bookmarks
create policy "Users can delete own bookmarks" 
on public.bookmarks for delete 
using (auth.uid() = user_id);

-- 4. Enable Realtime
-- This ensures that changes to the table are broadcasted to subscribers
alter publication supabase_realtime add table public.bookmarks;

-- Note on Auth:
-- Ensure Google OAuth is enabled in Supabase Dashboard -> Authentication -> Providers.
-- Ensure the Redirect URL (e.g., https://your-vercel-project.vercel.app or http://localhost:5173) is added in Auth -> URL Configuration.