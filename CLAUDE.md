# Claude Code Context — Workout App

## What This App Is
A full-stack personal fitness tracker built with Next.js 15, Prisma, PostgreSQL (Supabase), Tailwind CSS, and JWT auth.

## Deployment
- **Frontend/Backend**: Vercel (already live at hungryhippo.fit)
- **Database**: Supabase (PostgreSQL via prisma-adapter-pg)
- **Auth**: JWT tokens in httpOnly cookies, bcryptjs password hashing
- **IMPORTANT**: Supabase DB is shared with a separate CRM app (Business/Customer/Campaign/User tables). Do NOT touch those tables. Workout app only uses WorkoutUser and workout-prefixed models + Organization.

## Vercel Environment Variables (all set as of 2026-04-06)
- `DATABASE_URL` — Supabase connection string
- `JWT_SECRET` — JWT signing secret
- `RESEND_API_KEY` — Resend transactional email
- `EMAIL_DOMAIN` — `hungryhippo.fit`
- `NEXT_PUBLIC_APP_URL` — `https://hungryhippo.fit`
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN for error capture
- `SENTRY_ORG` — `hungryhippo`
- `SENTRY_PROJECT` — `javascript-nextjs`
- `ADMIN_EMAIL` — admin user email (activates /admin panel)

## Tech Stack
- Next.js 15 / React 19
- Prisma 7 (PostgreSQL)
- Tailwind CSS 4
- Recharts (charts/graphs)
- Sonner (toasts)
- Zod (validation)
- i18next (internationalization)
- bcryptjs + jsonwebtoken

## Features Built
- Workout logging: sessions, exercises (1000+), sets, RPE, notes
- Programs & templates (custom + legendary athlete programs + core programs like PPL, Starting Strength)
- Calendar view with per-month fetching and session summary strip
- Progress: heatmap, stats, PR tracking, muscle group volume charts
- Lifestyle: cardio, body measurements, nutrition, water, sleep, recovery
- Goals tracker, 1RM calculator, progressive overload assistant
- Settings: profile, rest timer, dark mode
- Data export (CSV)
- Reminder model (DB only — no UI/notifications yet)

## Known Gaps / Todo
- [x] Password reset + email verification — API routes + pages built (needs RESEND_API_KEY in Vercel env)
- [x] Rate limiting — IP-based, 10/min login, 5/min register + forgot-password (lib/api/rateLimit.ts)
- [x] Reminders — already fully built (UI + API) in 88f123f
- [x] Program editing — PUT /api/workout/programs/[id] + /workout/programs/[id]/edit page
- [x] Feedback page — /workout/feedback + POST /api/workout/feedback
- [x] Org/Team feature — full CRUD: create org, invite by email, manage roles, remove members
- [x] Superset/dropset UI — inline group picker on log page; Link2 button to assign/join groups
- [x] Data import — POST /api/workout/import, drag-and-drop UI at /workout/import, CSV parse, lb→kg, exercise name matching
- [x] Error tracking — Sentry via @sentry/nextjs, sentry.client/server/edge.config.ts, withSentryConfig in next.config.ts (needs NEXT_PUBLIC_SENTRY_DSN in Vercel)
- [ ] Tests (none exist)
- [x] Admin panel (5b00152): /admin dashboard (stats+charts), /admin/users, /admin/feedback (status management), /admin/organizations — set ADMIN_EMAIL in Vercel env to activate

## Recent Commits
- 4401696 — Add shareable summaries, water empty state, and PWA manifest
- 21c465c — Add body weight chart, 7-day streak dots, and plate calculator
- 0ecc422 — Add superset UI, Web Push notifications, and Vercel cron for reminders
- 3e221b0 — Add Sentry error tracking and CSV data import
- 5b00152 — Add admin panel (dashboard, users, feedback, organizations)
- d799e97 — Add rate limiting, program editing, and feedback
- cbec41c — Add Organization/Team feature
- 11fd5e4 — Add password reset, email verification, and CLAUDE.md context
- 57683f3 — Fix calendar 500: add lightweight summary mode to sessions API
- 9df96c8 — Fix JSX parse error: wrap PR list and hint text in fragment
- a83a21b — Improve calendar: per-month fetching, summary strip, session actions
- db37b2c — Add exercise notes carry-forward and session notes
- c3ab8ac — Add dark mode auth, BMI tracker, settings rest timer, water/sleep quick-log

## Key File Locations
- Schema: `prisma/schema.prisma`
- Auth utils: `lib/auth/token.ts`, `lib/auth/session.ts`
- Auth API: `app/api/auth/`
- Workout API: `app/api/workout/`
- Pages: `app/(app)/workout/`
- Auth pages: `app/(auth)/`
- Layout: `app/layout.tsx`, `components/layout/`

## Update Instructions
After each commit, update this file:
1. Add the new commit hash + description to "Recent Commits" (keep last 10)
2. Check off completed items in "Known Gaps / Todo"
3. Add any new gaps discovered
4. Note any architectural decisions made
