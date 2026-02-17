# Smart Bookmark App

A production-ready React application for managing personal bookmarks securely using Supabase (Auth, DB, Realtime) and Tailwind CSS.

## 1. Project Explanation

This app uses a **Client-Side Rendering (CSR)** architecture typical of modern React SPAs.
- **Frontend**: React 18 with TypeScript. Tailwind CSS handles styling for a responsive, mobile-first design.
- **Backend Service**: Supabase acts as the backend-as-a-service (BaaS), handling PostgreSQL hosting, Authentication (Google OAuth), and Realtime subscriptions.
- **Security**: Row Level Security (RLS) is strictly enforced in PostgreSQL. The frontend never accesses data without an active session token, and even if it tries, the database policies reject unauthorized access.

## 2. Setup Guide

### Supabase Setup
1. Create a new Supabase project.
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Run the content of `supabase/schema.sql`. This creates the `bookmarks` table and sets up strict RLS policies.
4. Go to **Authentication > Providers** and enable **Google**.
   - You will need to set up a Google Cloud Project to get the Client ID and Secret.
5. Go to **Authentication > URL Configuration**.
   - Add your local URL (e.g., `http://localhost:3000` or `http://localhost:5173`) to "Site URL".
   - Add your Vercel production URL (e.g., `https://my-app.vercel.app`) to "Redirect URLs".

### Environment Variables
Create a `.env` file in the root directory (or set these in Vercel):

```env
# For Vite (if using Vite)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For Create React App (if using CRA)
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Deployment to Vercel
1. Push this code to a GitHub repository.
2. Log in to Vercel and "Add New Project".
3. Select your repository.
4. In **Environment Variables**, add the `SUPABASE_URL` and `SUPABASE_ANON_KEY` (using the prefix matching your build tool, e.g., `VITE_` or `REACT_APP_`).
5. Deploy.

## 3. Realtime Implementation
The app uses `supabase.channel` to listen for `postgres_changes`. 
- When you add a bookmark in one tab, the `INSERT` event is broadcast.
- Other open tabs receive this event and update their local React state via `setBookmarks`.
- This provides a seamless, "magic" sync experience without page reloads.

## 4. Security Note
RLS policies are critical. The policy `using (auth.uid() = user_id)` guarantees that no matter what the frontend requests, the database only returns rows belonging to the currently logged-in user.