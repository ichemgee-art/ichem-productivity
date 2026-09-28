# iChem Productivity — React V3

React + Vite frontend for the existing iChem Productivity Supabase backend.

## Roles

- **Admin** (`admin`): full management of submissions, review/delete/edit, attendance, people, projects, sections, and active cycle.
- **User** (`data_entry`): view operational data and create new productivity submissions.
- **Viewer** (`viewer`): read-only fallback for legacy accounts.

UI visibility is not the security boundary. Supabase RLS/RPC authorization remains authoritative.

## Stack

- React 19
- Vite 8
- Supabase JS
- React Router
- TanStack Query
- Recharts
- Lucide React

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Vercel

This repository includes `vercel.json` for Vite SPA routing.

In Vercel:

1. Import the GitHub repository.
2. Framework preset: **Vite**.
3. Add the two Supabase environment variables.
4. Deploy. Build command and output directory are already configured.

## Historical cycles

The cycle selector reads `public.v_available_cycles`, which derives available 26→25 cycles from productivity, absence, and note records. Changing the selected cycle updates dashboard, productivity, people statistics, attendance, and cycle-based section metrics.

## Legacy frontend

The original single-file implementation remains under `ichem/index.html` on the repository and is intentionally kept as a rollback/reference version during migration.
