# Agent Context

This document is for future coding agents starting fresh in this repository. Read it before
making product, UI, auth, data, or deployment changes.

## Product

Warren is a warranty management app. The user value is not generic organization; it is making
coverage useful before something breaks. The product stores receipts, serial numbers, purchase
dates, warranty durations, provider contact details, claim history, extension purchases, and
manufacturer registration status.

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

## Design System

The visual language is defined by the landing/sign-in screen at `app/(auth)/sign-in.tsx`.
Authenticated screens inherit the same palette through CSS variables in `global.css` and shared
primitives in `components/ui/`. **Prefer tokens and primitives over one-off hex values** on new
screens; the landing page may keep explicit values where it serves as the reference implementation.

### Palette (light mode)

| Token | Value | Use |
|---|---|---|
| `--background` | `#f8faf7` warm off-white | Page backgrounds (`Screen`, landing) |
| `--foreground` | slate-950 | Body text, headings |
| `--primary` | slate-950 | Primary buttons, active filters, tab tint |
| `--accent-amber` | `#fcd34d` | Sparingly — reminder stripes, progress highlights |
| `--card` | white | Card surfaces on warm background |
| `--border` | slate-200 | Card and input borders |

Semantic status colors (`success`, `warning`, `destructive`) stay saturated for clarity.
Do **not** reintroduce blue (`#2563eb`) as the primary brand color.

### Shape and surfaces

- Corner radius: **`rounded-lg`** on buttons, cards, inputs, and badges (not `rounded-2xl`).
- Cards: white surface, `border-border`, light `shadow-sm`.
- Badges: soft tinted chips (`border` + light background + colored text), not solid pill fills.
- Inputs/selects: `rounded-lg`, `bg-muted`, `border-border`.

### Content patterns (from landing)

- Uppercase micro-labels (`text-xs font-bold uppercase text-slate-500`) above section titles.
- List rows: colored status dot + text tone (see `LedgerPreview` in sign-in) rather than heavy badges alone.
- Concrete warranty artifacts in copy and previews — not abstract SaaS feature cards.

### Visual change safety

UI polish should be **visual-only** when possible: tokens, `className`, and primitives — not hooks,
forms, Supabase queries, or navigation. Roll out in layers:

1. `global.css` + `tailwind.config.js` tokens
2. `components/ui/*` primitives
3. One screen per PR for layout-specific patterns (ledger rows, dark hero bands)

After token or primitive changes, run the UI Quality Loop on **both** sign-in and the warranties tab.

Reference: `LedgerPreview` in `app/(auth)/sign-in.tsx` is the north star for in-app list/detail styling.


- `app/` uses Expo Router file-based routes.
- `app/(auth)/` contains unauthenticated screens.
- `app/(tabs)/` contains the authenticated app shell.
- `app/warranties/` contains warranty create, detail, contact, and extension flows.
- `components/ui/` contains shared primitives. Prefer these before introducing one-off UI.
- `hooks/` contains TanStack Query hooks.
- `lib/supabase.ts` owns the Supabase client and configuration checks.
- Database schema lives in `supabase/migrations/` as hand-written SQL. There is no migration
  runner or Supabase CLI wired up: each numbered file must be applied **manually, in order, in
  the Supabase SQL Editor** for the change to exist in a live project. When you add or change a
  table/column, also hand-update `lib/database.types.ts` to match (it is not generated yet).
- `services/payments/` abstracts payment behavior. Mock payments are active today.
- `services/ocr/` abstracts receipt OCR. Web uses tesseract.js (lazily loaded via
  `engine.web.ts`); native resolves `engine.ts`, which reports OCR as unsupported so the
  form falls back to manual entry. Parsing heuristics live in `lib/receipt-parser.ts` and
  warranty-term inference in `lib/warranty-terms.ts` — both pure and unit-tested.
- `lib/product-registration.ts` holds the manufacturer registration directory, the
 specificity resolver, the deep-link/prefill builder, and the reminder predicate — pure
 and unit-tested like the parser and warranty-terms modules. `hooks/use-product-registration.ts`
 persists status to the `product_registrations` table.
- `global.css` and `tailwind.config.js` define NativeWind tokens (see **Design System** above).

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
6. For token or primitive changes, spot-check sign-in **and** warranties list, detail, and new-warranty form — they should share warm background, slate-950 CTAs, and `rounded-lg` surfaces.
7. Do not introduce blue/purple gradients, blob decoration, or generic three-feature-card layouts.

### 4. Evaluation (Evals) Loop

When modifying heuristics (like `lib/receipt-parser.ts`, `lib/warranty-terms.ts`, or the
registration directory in `lib/product-registration.ts`):
1. **Never guess**. Add a test case representing the new edge case, receipt format, or brand.
2. If working with OCR, run a synthetic or real OCR output through the parser in a test in
 `lib/receipt-parser.test.ts`. For the registration directory, every brand added must come
 with an assertion in `lib/product-registration.test.ts`.
3. Run `npm test` to verify the heuristic improves the target case *without* breaking existing
 extractions or resolutions.
4. Treat the test suite as the ground-truth eval dataset for these pure modules.

### 5. Verification Loop

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run targeted tests, or `npm test` when shared logic changed.
4. If a command cannot run because of missing env or tooling, record the reason in the final handoff.

### 6. Handoff Loop

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
