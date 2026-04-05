# Claude Code Context — Workout App

## What This App Is
A full-stack personal fitness tracker built with Next.js 15, Prisma, PostgreSQL (Supabase), Tailwind CSS, and JWT auth.

## Deployment
- **Frontend/Backend**: Vercel (already live)
- **Database**: Supabase (PostgreSQL via prisma-adapter-pg)
- **Auth**: JWT tokens in httpOnly cookies, bcryptjs password hashing
- **IMPORTANT**: Supabase DB is shared with a separate CRM app (Business/Customer/Campaign/User tables). Do NOT touch those tables. Workout app only uses WorkoutUser and workout-prefixed models + Organization.

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
- [ ] Rate limiting on auth endpoints
- [ ] Reminders UI and actual push/email notification delivery
- [ ] Program editing (currently delete-only after creation)
- [ ] Superset/dropset UI (model supports supersetGroup, no UI)
- [ ] Data import (export exists, import does not)
- [ ] Error tracking (no Sentry or equivalent)
- [ ] Tests (none exist)
- [ ] Org/Team feature — DB columns exist (organizationId, orgRole on WorkoutUser, Organization table) but ZERO app code built yet

## Recent Commits
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
