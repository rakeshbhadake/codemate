# Codemate deployment guide

This guide is for the project at `C:\Users\rakesh bhadake\Downloads\Codemate`.
It covers publishing the source to a public GitHub repository and deploying the
Vite frontend to Vercel. Supabase remains the separate authentication, database,
storage, and Edge Function service.

## Project and deployment settings

- **Frontend:** React 18, TypeScript/TSX, Vite 6, Tailwind CSS 4.
- **Backend:** Supabase Auth, PostgreSQL/KV storage, and a Deno/Hono Supabase
  Edge Function. The frontend calls the function slug
  `make-server-9386b22c`; `supabase/config.toml` maps that slug to the existing
  source at `supabase/functions/server/index.tsx`.
- **AI:** Gemini is called from the Supabase Edge Function. The browser does
  not need the Gemini key.
- **Build:** `npm run build` (`vite build`). Vite writes production files to
  `dist/`.
- **Vercel:** Choose the Vite preset, build command `npm run build`, and output
  directory `dist`. The checked-in `vercel.json` rewrites browser paths to
  `index.html` for SPA hosting.
- **Database schema:** This repository has no Supabase migrations. Vercel
  deploys the frontend and does not create or change database tables, Storage
  buckets, Auth settings, or Edge Function secrets. Keep the existing Supabase
  project and schema in place.

## Prerequisites

Install Git for Windows, Node.js (20 LTS or newer), and npm. Docker Desktop is
only needed if you want to run Supabase locally. The current package lockfile
is `package-lock.json`, so use npm. To check the tools in PowerShell:

```powershell
git --version
node --version
npm --version
```

Set your commit author once (replace the example values):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Install packages and run the frontend locally:

```powershell
Set-Location -LiteralPath "C:\Users\rakesh bhadake\Downloads\Codemate"
npm install
npm run dev
```

The local Vite URL is normally `http://localhost:5173`.

## Environment variables and API keys

Copy `.env.example` to `.env.local` only if you need to recreate the local
settings. `.env.local` is ignored by Git. The existing local Supabase URL and
public anon key have been moved there from the source files.

| Name | Used by | Public or secret? | Required? | Configure it in |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite browser client, API calls, and auth context | Public URL | Yes | Local `.env.local`; Vercel Production, Preview, and Development |
| `VITE_SUPABASE_ANON_KEY` | Browser Supabase client and unauthenticated API requests | Public anon/publishable key; visible in the browser bundle by design | Yes | Local `.env.local`; Vercel Production, Preview, and Development |
| `SUPABASE_URL` | `Deno.env.get()` in the Supabase Edge Function | Supabase-provided runtime value | Supabase function runtime | Supabase provides it; do not add it to Vercel |
| `SUPABASE_ANON_KEY` | User-facing Supabase client inside the Edge Function | Public anon key | Supabase function runtime | Supabase provides the legacy name used by this code; do not add it to Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations in the Edge Function | **Secret; bypasses Row Level Security** | Supabase function runtime | Supabase provides the legacy name used by this code; never expose it with `VITE_` or set it in Vercel |
| `GEMINI_API_KEY` | AI matching and chatbot routes in `supabase/functions/server/index.tsx` | **Secret** | Optional; required only for Gemini AI features | Supabase Edge Function Secrets; local `supabase/functions/.env` for local functions |
| `SUPABASE_DB_URL` | Not read by the current application code | Secret connection string | No | Do not configure unless future server code needs direct database access |

Supabase's `SUPABASE_*` function values are injected by Supabase. The source
uses the legacy anon/service-role variable names; Supabase documents these as
legacy aliases. Do not create Vercel variables for them. The service-role key
and Gemini key must never be placed in a `VITE_` variable or committed.

The anon key is a public client key, not an authorization boundary. Keep
Row-Level Security (RLS) enabled and verify the policies on the existing tables
and Storage buckets in the Supabase Dashboard.

### Vercel variables

In **Vercel Dashboard → Project → Settings → Environment Variables**, add only:

```text
VITE_SUPABASE_URL       = https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY  = your public Supabase anon/publishable key
```

Select Production, Preview, and Development as needed, then redeploy after
changing a value. Vite embeds `VITE_` values in the browser build, so these two
must be public values. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
database passwords, or access tokens to Vercel for this static frontend.

### Gemini and Supabase Edge Function secrets

Gemini is already called from the server-side Edge Function; there is no
frontend Gemini key to move. To enable AI features, add `GEMINI_API_KEY` in
**Supabase Dashboard → Edge Functions → Secrets**. Alternatively, after
installing and linking the Supabase CLI, create an ignored local file
`supabase/functions/.env` containing:

```env
GEMINI_API_KEY=your-real-gemini-api-key
```

Then upload that secret with:

```powershell
supabase secrets set --env-file supabase/functions/.env
```

For local Edge Function development, run the local Supabase stack and serve the
function with:

```powershell
supabase functions serve make-server-9386b22c --env-file supabase/functions/.env
```

Supabase documents that the local Edge Function runtime reads
`supabase/functions/.env`; it is different from Vite's `.env.local`. Never
commit either file. The production secret can also be set individually with
`supabase secrets set GEMINI_API_KEY="YOUR_REAL_KEY"` after linking the
project. Avoid putting real keys in screenshots, chat messages, source files,
or shell history.

### Supabase Edge Function deployment

The Supabase function is deployed separately from the Vercel frontend. The
configuration maps the public slug the client calls to the current source file
without moving or duplicating the handler. Install the Supabase CLI and use:

```powershell
supabase login
supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
supabase functions deploy make-server-9386b22c
```

Replace `YOUR_SUPABASE_PROJECT_REF` with the project reference in the Supabase
project URL. The configured `.tsx` entrypoint requires Supabase CLI 1.215.0 or
newer. Keep the function's JWT verification enabled; the app sends the user's
Supabase access token for authenticated requests.

## Git and public GitHub setup

Git is initialized locally on the `main` branch. The ignore rules exclude
`node_modules`, `dist`, `build`, environment files, `.vercel`, editor files,
logs, operating-system files, and caches. `.env.example` is intentionally
tracked and contains placeholders only. The local `.env.local` is ignored.

### Create the public repository

On GitHub, create a **Public** repository. Do not initialize it with a README,
license, or `.gitignore`; this project already has local files. Then run these
commands from Windows PowerShell:

```powershell
Set-Location -LiteralPath "C:\Users\rakesh bhadake\Downloads\Codemate"
git init
git add -A
git status --short
git check-ignore -v .env.local
git diff --cached --stat
git commit -m "Initial project import"
git branch -M main
git remote add origin "https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git"
git push -u origin main
```

Replace the repository URL with the URL shown by GitHub. Before committing,
confirm `.env.local` is ignored and does not appear in `git status --short`.
Git does not synchronize files automatically: each local update must be
committed and pushed.

### Reusable update workflow

Run this after editing in VS Code, Codex, or another editor:

```powershell
Set-Location -LiteralPath "C:\Users\rakesh bhadake\Downloads\Codemate"
git status --short
git add -A
git diff --cached --stat
git commit -m "Describe the change"
git push
```

If you edited files directly on GitHub, first make sure the local working tree
is clean, then pull those changes:

```powershell
git status --short
git pull --rebase origin main
```

Resolve any reported conflicts, run the build, then continue the rebase with
`git add <file>` and `git rebase --continue`. Push the resulting local commit
with `git push`.

## Deploy the frontend on Vercel

1. Create or sign in to a Vercel account.
2. Connect the GitHub account that owns the public repository.
3. Select **Add New → Project**, import the repository, and select its root
   directory.
4. Select the **Vite** framework preset. Confirm the build command is
   `npm run build`, the install command is `npm install`, and the output
   directory is `dist`.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production,
   Preview, and Development environments as appropriate.
6. Deploy. Open the generated `*.vercel.app` URL and review the build log and
   deployment status in the Vercel project.
7. After the frontend deploys, deploy the Supabase Edge Function separately
   and add its `GEMINI_API_KEY` secret if AI features are needed.

Because the GitHub repository is connected to Vercel, a push to `main` creates
a new production deployment. Pushes to other branches create preview
deployments. Check **Vercel Dashboard → Project → Deployments → Build Logs** if
a deployment fails. Each Vercel deployment uses the environment variables
assigned to its environment at build time.

### Supabase Auth redirect URLs

The current signup code does not pass a custom `emailRedirectTo`, so Supabase
uses its configured Site URL for confirmation emails. In **Supabase Dashboard
→ Authentication → URL Configuration**:

- Set **Site URL** to the production origin, for example
  `https://YOUR_PROJECT.vercel.app/`.
- Add `http://localhost:5173/**` for local development.
- Add the exact production URL, for example
  `https://YOUR_PROJECT.vercel.app/**`.
- For preview deployments, add a pattern matching your Vercel team, such as
  `https://*-YOUR_VERCEL_TEAM_SLUG.vercel.app/**`; verify it against the actual
  preview URL format shown in your Vercel account.
- When adding a custom domain, add `https://your-domain.example/**` and set the
  Site URL to the canonical production domain.

This project handles the email verification callback from the URL hash. The
current UI/code does **not** implement a password-reset request or completion
flow, so adding redirect URLs alone will not make password reset available.
That feature would need a UI and a `resetPasswordForEmail` flow before it can be
verified.

### Custom domain, DNS, and HTTPS

In Vercel, open **Project → Settings → Domains**, add the domain, and follow the
exact DNS instructions Vercel shows for that project. Typically an apex domain
uses an A record and a subdomain such as `www` uses a CNAME; do not substitute
generic DNS values if Vercel displays project-specific records. Wait for Vercel
to verify DNS and issue HTTPS, then set the canonical domain as the Supabase
Site URL and add it to Supabase's Redirect URLs.

### Production verification checklist

- Open the Vercel production URL and confirm a production build is deployed.
- Check browser DevTools for failed requests or missing `VITE_SUPABASE_*`
  settings.
- Sign up, confirm the email, sign in, and sign out using a test account.
- Exercise profile, feed, messaging, storage upload, and other app operations
  that use the Supabase Edge Function.
- Verify the Supabase function logs and confirm the function uses the expected
  project and environment.
- Test AI matching/chatbot only after setting `GEMINI_API_KEY` in Supabase.
- Verify RLS policies and Storage permissions in Supabase; those are not
  created by this Vercel project.
- Password reset cannot be verified until its frontend flow is implemented.

## Common deployment errors

| Symptom | Check |
| --- | --- |
| Build reports missing Supabase values | Add both `VITE_SUPABASE_*` variables to the correct Vercel environments and redeploy. |
| Direct URL returns 404 | Confirm `vercel.json` is present and deployed; it provides the Vite SPA fallback. |
| Supabase request returns 401 | Confirm the URL/key match the Supabase project, JWT verification remains enabled, and authenticated requests use the current session token. |
| Edge Function returns 404 | Deploy the configured slug `make-server-9386b22c`; check the Vercel build is using the same `VITE_SUPABASE_URL`. |
| AI features say not configured | Set `GEMINI_API_KEY` in Supabase Edge Function Secrets, not Vercel, then inspect the function logs. |
| Email confirmation returns to localhost or an old domain | Update Supabase Site URL and Redirect URLs, then request a new confirmation email. |
| Database or Storage operation is denied | Check existing schema, RLS policies, bucket policies, and the Edge Function logs; Vercel does not create these resources. |
| Vercel reports a missing build output | Use `npm run build` and set output directory to `dist`. |

## Official references

- [Vite on Vercel, including SPA rewrites](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Git deployments](https://vercel.com/docs/git)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Adding a Vercel custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase function routing](https://supabase.com/docs/guides/functions/routing)
- [Supabase function configuration](https://supabase.com/docs/guides/functions/function-configuration)
- [Deploying Supabase Edge Functions](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
