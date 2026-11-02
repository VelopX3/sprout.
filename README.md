# Sprout

A responsive family money garden for children to practice saving and everyday choices with a grown-up. This project includes a working local demo and optional Supabase email authentication and JSON-backed family data.

## Run the demo

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. The dashboard starts in demo mode with sample data. Goal changes, practice purchases, allowance, lessons, challenges and approvals save to this browser. They are learning simulations; the app does not connect to banks or make payments.

## Optional Supabase setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor to create the private family data table and row-level security policies.
3. Restart the Next.js dev server. Signup and login use Supabase Auth; each signed-in family’s app data syncs to its own `family_data` row.

Without both environment values, the signup and login screens use a local demo identity and do not save passwords.

## Checks

```bash
npm run lint
npm test
npm run build
```
