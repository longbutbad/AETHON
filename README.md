# Aethon

A gamer-focused realtime messaging app. This repo is the **Next.js rewrite** of
the original single-file prototype (`reference/aethon-prototype.html`).

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (neon cyberpunk UI ported from the prototype)
- **Backend:** Supabase (auth, Postgres, storage, realtime)

## What's built so far

This first cut covers **auth + profile**:

- Email + password signup with 6-digit email OTP verification
- Magic-link sign in
- Profile setup (name, username, date of birth, avatar upload)
- Protected dashboard
- Account settings (edit profile / avatar, sign out)

Realtime DMs (user search, conversations, messages) exist in the prototype and
are the planned next pass — the Supabase schema for them is already deployed.

## Prerequisites

- **Node.js** — already installed for this project at `C:\Users\ASUS\nodejs`
  (v22 LTS) and added to your user PATH. **Restart any open terminal / VS Code
  window** so they pick up the new PATH, then verify:

  ```bash
  node --version   # v22.x
  npm --version    # 10.x
  ```

  If you ever set this project up on another machine, grab the LTS installer
  from <https://nodejs.org> (or `winget install OpenJS.NodeJS.LTS`).

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

### Environment

`.env.local` is already seeded with the prototype's Supabase project so it runs
out of the box. To point at your own project, copy `.env.local.example` and fill
in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

(Anon keys are public by design — row-level security protects the data.)

## Supabase setup

If you're standing up a fresh project:

1. Run `supabase/setup.sql` in the Supabase SQL editor (profiles, conversations,
   messages, RLS policies, the `avatars` storage bucket, and realtime).
2. **Auth → Providers → Email:** enable email signups and "Confirm email".
3. **Auth → URL Configuration:** add `http://localhost:3000/auth/callback` (and
   your production equivalent) to the redirect allow-list — the magic-link flow
   redirects there.
4. **Auth → Email Templates:** the prototype's templates are in
   `supabase/email-templates/` if you want to match the brand.

## Project layout

```
src/
  app/
    page.tsx              # redirects to /dashboard or /login
    login/                # magic-link sign in
    signup/               # email+password -> OTP -> profile setup
    dashboard/            # protected home (profile + stats)
    settings/             # protected profile editor
    auth/callback/        # magic-link code exchange
  components/             # NeonShell, BackgroundCanvas, ProfileForm, UI primitives
  lib/
    supabase/             # browser + server clients, session middleware
    profile.ts            # Profile type + name/dob helpers
  middleware.ts           # refreshes the session + guards protected routes
```

## Notes

- Auth state is managed with `@supabase/ssr` (cookie-based) so Server Components
  can read the signed-in user and middleware can refresh sessions.
- The neon look (animated canvas background, HUD frame, angled buttons) is a
  Tailwind reimplementation of the prototype's inline CSS.
