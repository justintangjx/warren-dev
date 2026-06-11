# Agent Context

This document is for future coding agents starting fresh in this repository. Read it before
making product, UI, auth, data, or deployment changes.

## Product

Warren is a warranty management app. The user value is not generic organization; it is making
coverage useful before something breaks. The product stores receipts, serial numbers, purchase
dates, warranty durations, provider contact details, claim history, and extension purchases.

Current deploy target is web through Expo. iOS and Android should keep working from the same
React Native codebase.

## Current UX Direction

The unauthenticated entry screen is the landing/sign-in hybrid at `app/(auth)/sign-in.tsx`.
Keep it specific to warranties and claims. Prefer concrete product artifacts such as coverage
rows, receipt status, expiry reminders, claim readiness, and provider contact details.

Avoid template signals:

- generic SaaS hero copy
- large blue or purple gradients
- abstract blob or orb decoration
- three generic feature cards with vague labels
- dashboard mockups that do not show warranty-specific information

Good Warren copy should feel calm, practical, and slightly exact. Example direction:

> Keep the coverage you already paid for.

## Architecture Snapshot

- `app/` uses Expo Router file-based routes.
- `app/(auth)/` contains unauthenticated screens.
- `app/(tabs)/` contains the authenticated app shell.
- `app/warranties/` contains warranty create, detail, contact, and extension flows.
- `components/ui/` contains shared primitives. Prefer these before introducing one-off UI.
- `hooks/` contains TanStack Query hooks.
- `lib/supabase.ts` owns the Supabase client and configuration checks.
- `services/payments/` abstracts payment behavior. Mock payments are active today.
- `global.css` and `tailwind.config.js` define NativeWind tokens.

Authentication is magic-link based through Supabase. The protected router in `app/_layout.tsx`
redirects unauthenticated users to `/(auth)/sign-in` and authenticated users back to tabs.

## Environment

Required public env vars are listed in `.env.example` and README:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `EXPO_PUBLIC_PAYMENTS`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`

`EXPO_PUBLIC_*` values are bundled into client JavaScript. Do not add secrets there.

## Commands

- `npm run web` starts Expo web.
- `npm run typecheck` runs TypeScript checks.
- `npm run lint` runs Expo lint.
- `npm test` runs Jest.
- `npm run build:web` exports the web build to `dist/`.

## Agent Loops

### 1. Orientation Loop

1. Run `git status --short`.
2. Read this file, `README.md`, and the files you plan to touch.
3. Identify whether the task affects auth, data, payments, UI, or deployment.
4. If the worktree has unrelated changes, leave them alone.
5. State the intended scope before editing.

### 2. Implementation Loop

1. Make the smallest coherent change that solves the request.
2. Follow existing route, hook, and UI primitive patterns.
3. Keep cross-platform behavior in mind, even when improving web.
4. Do not expose secrets, bypass RLS assumptions, or move payment logic into UI components.
5. Prefer focused components over broad refactors.

### 3. UI Quality Loop

1. Start the web app and inspect the changed route in a browser.
2. Check mobile and desktop widths.
3. Verify text does not overlap, truncate awkwardly, or create layout shifts.
4. Confirm forms remain usable with keyboard input and disabled states.
5. For landing work, check that the first viewport clearly says what Warren is and why it exists.

### 4. Verification Loop

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run targeted tests, or `npm test` when shared logic changed.
4. If a command cannot run because of missing env or tooling, record the reason in the final handoff.

### 5. Handoff Loop

1. Summarize changed files and behavior.
2. List verification commands and outcomes.
3. Call out any remaining risks or follow-up work.
4. Keep the final response concise and specific.

## Safety Notes

- Supabase security depends on Row Level Security, not hiding anon keys.
- Do not commit `.env.local`.
- Do not reset or discard user changes unless explicitly asked.
- Do not hand-roll payment provider behavior in screens; use `services/payments/`.
- Keep analytics optional. The app should work when PostHog is not configured.
