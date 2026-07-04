# Agent Context

This document is for future coding agents starting fresh in this repository. Read it before
making product, UI, auth, data, or deployment changes.

**After each feature or fix**, update this file and `README.md` per the **Documentation Maintenance
Loop** below. A Cursor rule at `.cursor/rules/doc-maintenance.mdc` reinforces the same requirement.

## Product

Warren is a warranty management app. The user value is not generic organization; it is making
coverage useful before something breaks. The product stores receipts, serial numbers, purchase
dates, warranty durations, provider contact details, claim history, extension purchases, and
manufacturer registration status. The authenticated warranties tab includes a suggest-only
Readiness Inbox backed by typed agent recommendations; it surfaces registration, extension, and
claim follow-up actions without mutating user data until the user chooses a CTA.

Current deploy target is web through Expo. iOS and Android should keep working from the same
React Native codebase.

## Current UX Direction

The unauthenticated entry screen is the landing/sign-in hybrid at `app/(auth)/sign-in.tsx`.
Keep it specific to warranties and claims. Prefer concrete product artifacts such as coverage
rows, receipt status, expiry reminders, claim readiness, and provider contact details.
The page uses an outcome-led hero, an embedded start-free magic-link form, a benefit ledger,
three-step workflow, and visible FAQ content. Preserve that fuller decision journey and keep the
route's title and description metadata aligned with the hero when changing landing-page copy.
Default metadata for the public root URL lives in `app/_layout.tsx`; keep it consistent too because
authentication redirects happen client-side after the static web document is generated.

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
- Landing-page benefits should read as concrete outcomes in ledger-style rows. Keep FAQ answers
  visible in the document so visitors and search engines can understand the product without interaction.

### Responsive layout

- Breakpoints live in `tailwind.config.js` (e.g. `wide: 920px` for the sign-in two-column layout).
- **Prefer NativeWind responsive classes** (`wide:flex-row`, `md:px-10`) over `useWindowDimensions()`
  for layout breakpoints. On web, JS-reported dimensions can be wrong on first paint; CSS media
  queries apply immediately.

### Visual change safety

UI polish should be **visual-only** when possible: tokens, `className`, and primitives — not hooks,
forms, Supabase queries, or navigation. Roll out in layers:

1. `global.css` + `tailwind.config.js` tokens
2. `components/ui/*` primitives
3. One screen per PR for layout-specific patterns (ledger rows, dark hero bands)

After token or primitive changes, run the UI Quality Loop on **both** sign-in and the warranties tab.

Reference: `LedgerPreview` in `app/(auth)/sign-in.tsx` is the north star for in-app list/detail styling.
For the authenticated Readiness Inbox on `app/(tabs)/index.tsx`, keep recommendation rows concrete
and action-oriented: show the warranty artifact, one clear next action, and a dismiss affordance.

## Repository map

- `app/` uses Expo Router file-based routes.
- `app/(auth)/` contains unauthenticated screens.
- `app/(tabs)/` contains the authenticated app shell.
- `app/warranties/` contains warranty create, detail, contact, and extension flows.
- `components/ui/` contains shared primitives. Prefer these before introducing one-off UI.
- `hooks/` contains TanStack Query hooks, including `use-agent-recommendations.ts` for the
  Readiness Inbox refresh/read/dismiss flow.
- `lib/supabase.ts` owns the Supabase client and configuration checks.
- Database schema lives in `supabase/migrations/` as hand-written SQL. There is no migration
  runner or Supabase CLI wired up: each numbered file must be applied **manually, in order, in
  the Supabase SQL Editor** for the change to exist in a live project. When you add or change a
  table/column, also hand-update `lib/database.types.ts` to match (it is not generated yet).
- `supabase/functions/refresh-agent-readiness/` is the server-side boundary for refreshing
  readiness recommendations. Keep model/provider secrets there, never in Expo client code.
- `services/payments/` abstracts payment behavior. Mock payments are active today.
- `services/ocr/` abstracts receipt OCR. Web uses tesseract.js (lazily loaded via
  `engine.web.ts`); native resolves `engine.ts`, which reports OCR as unsupported so the
  form falls back to manual entry. Parsing heuristics live in `lib/receipt-parser.ts` and
  warranty-term inference in `lib/warranty-terms.ts` — both pure and unit-tested.
- `lib/product-registration.ts` holds the manufacturer registration directory, the
  specificity resolver, the deep-link/prefill builder, and the reminder predicate — pure
  and unit-tested like the parser and warranty-terms modules. `hooks/use-product-registration.ts`
  persists status to the `product_registrations` table.
- `lib/agent-readiness.ts` holds the pure typed recommendation engine for the Readiness Inbox.
  It is suggest-only: the output is a typed action payload, not an autonomous executor.
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

Server-side Supabase Function secrets:

- `AGENT_MODEL_API_KEY` — optional future model provider key for server-side wording/ranking only.
  Do not expose it as an `EXPO_PUBLIC_*` variable.

`EXPO_PUBLIC_*` values are bundled into client JavaScript. Do not add secrets there.

## Commands

- `npm run web` starts Expo web.
- `npm run typecheck` runs TypeScript checks.
- `npm run lint` runs Expo lint.
- `npm test` runs Jest.
- `npm run check:docs` verifies every `lib/*.test.ts` is listed in this file and `README.md`.
- `npm run build:web` exports the web build to `dist/`.

## Agent Loops

### 1. Orientation Loop

1. Run `git status --short`.
2. Read this file, `README.md`, and the files you plan to touch.
3. Identify whether the task affects auth, data, payments, UI, or deployment — and which doc
   sections the **Documentation Maintenance Loop** will need (loop 6).
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

**Eval modules** — pure logic with unit tests that act as the ground-truth dataset:

| Module | Test file |
|---|---|
| `lib/receipt-parser.ts` | `lib/receipt-parser.test.ts` |
| `lib/warranty-terms.ts` | `lib/warranty-terms.test.ts` |
| `lib/product-registration.ts` | `lib/product-registration.test.ts` |
| `lib/agent-readiness.ts` | `lib/agent-readiness.test.ts` |
| `lib/schemas.ts` | `lib/schemas.test.ts` |
| `lib/utils.ts` | `lib/utils.test.ts` |

When modifying any eval module (or adding a new one):

1. **Never guess**. Add a test case representing the new edge case, receipt format, or brand.
2. If working with OCR, run a synthetic or real OCR output through the parser in a test in
   `lib/receipt-parser.test.ts`. For the registration directory, every brand added must come
   with an assertion in `lib/product-registration.test.ts`.
3. Run `npm test` to verify the heuristic improves the target case *without* breaking existing
   extractions or resolutions.
4. **Update docs** — add the module to the table above and to the Testing section in `README.md`
   (see Documentation Maintenance Loop).

### 5. Verification Loop

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run targeted tests, or `npm test` when shared logic changed.
4. Run `npm run check:docs` when you add or rename `lib/*.test.ts` files (CI runs this too).
5. If a command cannot run because of missing env or tooling, record the reason in the final handoff.

### 6. Documentation Maintenance Loop

**Run this on every feature, fix, or refactor** before handoff — not only when the user asks.
Skip only for trivial edits with zero behavioral or structural impact (typo in a string, comment-only).

Use this trigger table to decide what to update:

| If you changed… | Update `AGENTS.md` | Update `README.md` |
|---|---|---|
| User-facing behavior or product scope | **Product** or **Current UX Direction** | **What it does** |
| Tokens, breakpoints, UI patterns | **Design System** (incl. responsive rules) | **Architectural notes** (if user-visible) |
| New route, hook, service, or lib module | **Repository map** | **Project layout** |
| New Supabase migration | **Repository map** (manual-apply note) | **Database setup** (numbered list) |
| New env var or npm script | **Environment** or **Commands** | env table or **Scripts** |
| New eval module or heuristic | **Evals Loop** table | **Testing** bullet list |
| New agent workflow lesson (bug class, verification step) | Relevant **Agent Loop** section | — |

Concrete rules:

1. **Same PR / same session** — doc updates belong with the code change, not a follow-up task.
2. **Be specific** — name files, routes, and commands; do not write vague "updated docs" notes.
3. **Do not duplicate** — `AGENTS.md` holds agent workflows and conventions; `README.md` holds
   human onboarding (setup, features, scripts). Cross-link rather than paste the same paragraph twice.
4. **Evals are docs** — a new heuristic without a test case and a README Testing bullet is incomplete.

### 7. Handoff Loop

1. Run the **Documentation Maintenance Loop** (step 6) when applicable.
2. Summarize changed files and behavior.
3. List verification commands and outcomes.
4. Call out doc updates made (`AGENTS.md`, `README.md`) or explicitly state why none were needed.
5. Call out any remaining risks or follow-up work.
6. Keep the final response concise and specific.

## Safety Notes

- Supabase security depends on Row Level Security, not hiding anon keys.
- Do not commit `.env.local`.
- Do not reset or discard user changes unless explicitly asked.
- Do not hand-roll payment provider behavior in screens; use `services/payments/`.
- Keep analytics optional. The app should work when PostHog is not configured.
