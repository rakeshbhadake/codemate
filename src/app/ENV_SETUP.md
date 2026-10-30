# Environment variables

The repository-level [`DEPLOYMENT_GUIDE.md`](../../DEPLOYMENT_GUIDE.md) is the
authoritative setup guide for local development, Vercel, and Supabase secrets.

The browser reads only these public Vite values from the project's ignored
`.env.local` file:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Supabase Edge Function reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from Supabase's injected runtime environment. The
service-role key is secret and bypasses Row Level Security. Gemini is optional
and uses the server-only `GEMINI_API_KEY` Supabase Edge Function secret. Do not
place either secret in a `VITE_` variable or in Vercel's frontend environment.

Do not commit `.env.local` or `supabase/functions/.env`. The tracked
`.env.example` contains placeholders only.
