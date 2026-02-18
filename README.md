# SmartMarks 🔖

A fast, secure, real-time bookmark manager built with **Next.js 15**, **Supabase**, and **Tailwind CSS**.

![SmartMarks](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)

---

## ✨ Features

- 🔐 **Google OAuth** authentication via Supabase
- 📌 **Add, view, and delete** bookmarks
- 🔍 **Real-time search** — filter by title or URL instantly
- 📋 **Copy URL** to clipboard with one click
- ⚡ **Real-time sync** — changes appear instantly across all tabs/devices
- 🌐 **Favicon auto-fetch** for each bookmark
- 🔔 **Toast notifications** for every action
- 🎨 **Dark/light theme** — dark navbar, light content area
- 📱 **Fully responsive** layout

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth & Database | Supabase |
| Styling | Tailwind CSS v3.4 |
| Language | TypeScript |
| Realtime | Supabase Postgres Changes |
| Icons | Lucide React |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/divyanshsaxena002/Smart-bookmark.git
cd Smart-bookmark
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Enable **Google OAuth** in Authentication → Providers
4. Add your redirect URL in Authentication → URL Configuration:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
Smart-bookmark/
├── app/
│   ├── auth/callback/route.ts   # OAuth callback handler
│   ├── globals.css              # Global styles + custom CSS classes
│   ├── layout.tsx               # Root layout with metadata
│   ├── not-found.tsx            # Custom 404 page
│   └── page.tsx                 # Home page (server component)
├── components/
│   ├── Auth.tsx                 # Login page (split-screen)
│   ├── Dashboard.tsx            # Bookmark grid + add form
│   └── DashboardLayout.tsx      # Navbar + page wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-side Supabase client
│   │   └── server.ts            # Server-side Supabase client
│   └── types.ts                 # TypeScript types + DB schema
└── supabase/
    └── schema.sql               # Database schema + RLS policies
```

---

## 🐛 Problems Encountered & Solutions

This project was migrated from a **React + Vite SPA** to **Next.js 15 App Router**. Here are all the issues hit along the way and exactly how each was fixed.

---

### 1. 🔴 `create-next-app` failed to initialize

**Problem:**  
Running `npx create-next-app` failed due to network/environment issues in the workspace.

**Solution:**  
Manually set up the Next.js project by:
- Writing `package.json` with all required dependencies by hand
- Creating the `app/` directory structure manually
- Running `npm install` directly

---

### 2. 🔴 Tailwind CSS v4 build error

**Problem:**  
After installing `tailwindcss@latest` (v4), the build failed with:

```
Error: PostCSS plugin tailwindcss requires PostCSS 8.
```

Tailwind CSS v4 changed its configuration format entirely and was incompatible with the standard Next.js PostCSS setup.

**Solution:**  
Downgraded to the stable **Tailwind CSS v3.4.1**:

```bash
npm install tailwindcss@3.4.1 postcss autoprefixer
```

And used the standard `tailwind.config.ts` + `postcss.config.js` setup.

---

### 3. 🔴 `@import` must precede all rules — CSS parse error

**Problem:**  
The dev server threw a Turbopack CSS parsing error:

```
@import rules must precede all rules aside from @charset and @layer statements
./app/globals.css (1147:8)
```

This happened because the Google Fonts `@import` was placed **after** the `@tailwind` directives.

**Solution:**  
Moved the `@import` to the **very first line** of `globals.css`, before all other rules:

```css
/* ✅ Correct order */
@import url('https://fonts.googleapis.com/...');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### 4. 🔴 TypeScript error — Supabase insert type inferred as `never`

**Problem:**  
When calling `supabase.from('bookmarks').insert(data)`, TypeScript threw:

```
Argument of type '{ title: string; url: string; user_id: string; }' 
is not assignable to parameter of type 'never'.
```

This was caused by Supabase's type inference being unable to resolve the `Database` generic through the `@supabase/ssr` wrapper.

**Solution:**  
Used `as any` cast on the insert payload as a targeted workaround, while keeping the `Database` generic on the client factory to preserve type safety everywhere else:

```ts
await supabase.from('bookmarks').insert({ title, url, user_id } as any);
```

---

### 5. 🔴 TypeScript errors — implicit `any` in server Supabase client

**Problem:**  
In `lib/supabase/server.ts`, the `setAll` cookie handler had implicit `any` type errors:

```
Parameter 'cookiesToSet' implicitly has an 'any' type.
```

**Solution:**  
Added explicit type annotations to the cookie parameters:

```ts
setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
  cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) =>
    cookieStore.set(name, value, options)
  );
}
```

---

### 6. 🔴 Leftover Vite files causing build failures

**Problem:**  
After migrating to Next.js, the old Vite files (`App.tsx`, `index.tsx`, `index.html`, `vite.config.ts`) were still present and caused conflicts during the Next.js build.

**Solution:**  
Deleted all Vite-specific files:
- `App.tsx` → replaced by `app/page.tsx`
- `index.tsx` → replaced by `app/layout.tsx`
- `index.html` → handled by Next.js automatically
- `vite.config.ts` → replaced by `next.config.ts`

---

### 7. 🟡 Security warning — `getSession()` on server

**Problem:**  
The console showed a warning on every page load:

```
Using the user object as returned from supabase.auth.getSession() 
could be insecure! Use supabase.auth.getUser() instead.
```

`getSession()` reads directly from cookies without verifying the token with Supabase Auth servers, making it potentially spoofable.

**Solution:**  
Changed `app/page.tsx` to use `getUser()` for the auth check (which contacts the Supabase Auth server to verify the token), and only called `getSession()` afterwards to get the session object needed by client components:

```ts
// ✅ Secure: verifies token with Supabase Auth server
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return <Auth />;

// Then get session for client component props
const { data: { session } } = await supabase.auth.getSession();
```

---

### 8. 🟡 ESLint errors — unescaped entities in JSX

**Problem:**  
Next.js build failed with ESLint errors:

```
Error: `'` can be escaped with `&apos;`  react/no-unescaped-entities
Error: `"` can be escaped with `&quot;`  react/no-unescaped-entities
```

This happened when using `'` and `"` directly inside JSX text content.

**Solution:**  
Replaced all unescaped characters in JSX text with HTML entities:

```tsx
{/* ❌ Before */}
<p>The page you're looking for doesn't exist.</p>
<h3>No results for "{searchQuery}"</h3>

{/* ✅ After */}
<p>The page you&apos;re looking for doesn&apos;t exist.</p>
<h3>No results for &quot;{searchQuery}&quot;</h3>
```

---

### 9. 🟡 ESLint error — `<a>` tag for internal navigation

**Problem:**  
Next.js ESLint threw:

```
Error: Do not use an `<a>` element to navigate to `/`. 
Use `<Link />` from `next/link` instead.
```

**Solution:**  
Replaced the `<a href="/">` in `not-found.tsx` with Next.js's `<Link>` component:

```tsx
import Link from 'next/link';

// ❌ Before
<a href="/">← Back to SmartMarks</a>

// ✅ After
<Link href="/">← Back to SmartMarks</Link>
```

---

### 10. 🟡 `.next/` build artifacts committed to git

**Problem:**  
The repository had no `.gitignore`, so the entire `.next/` build cache (hundreds of files, several MB) was being committed on every build, bloating the repository.

**Solution:**  
Created a proper `.gitignore` that excludes build artifacts:

```gitignore
.next/
out/
node_modules/
.env.local
*.tsbuildinfo
next-env.d.ts
.vercel
```

---

## 📜 Database Schema

```sql
create table public.bookmarks (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  url        text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Row Level Security
alter table public.bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on public.bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.bookmarks;
```

---

## 🌐 Deployment (Vercel)

1. Push your code to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add your Vercel domain to Supabase → Authentication → URL Configuration

---

## 📄 License

MIT — feel free to use, modify, and distribute.