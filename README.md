# Warren

A warranty management app — track product warranties, file claims, and extend coverage in one place.

> **Status**: MVP in development. Web is the current deploy target; iOS/Android share the same codebase and ship later.

## What it does

- **Track warranties** for any product — brand, model, serial, purchase date, duration
- **Scan receipts** (web) — snap a photo and Warren extracts the retailer, date, product, and price, then suggests a warranty term from a brand/category lookup table
- **Register products** with the manufacturer — Warren resolves the brand's registration page, surfaces the details to enter, deep-links you out, and tracks status with a time-boxed reminder
- **File claims** against a tracked warranty when something fails
- **Extend warranties** before they expire (mock payment flow today; Stripe behind the same interface tomorrow)
- **Magic-link sign-in** — no passwords, one email, RLS-enforced
- **Clear public product guide** — the landing page explains the core benefits, three-step workflow,
  and common questions before asking visitors to start
- **Cross-platform from one codebase** — web today, iOS/Android tomorrow, no rewrite

## Tech stack

- **[Expo](https://expo.dev) SDK 54** + **React Native 0.81** + **React 19** (with React Compiler enabled)
- **[expo-router](https://docs.expo.dev/router/introduction/)** for file-based routing across platforms
- **[NativeWind v4](https://www.nativewind.dev/)** — Tailwind for React Native; same classnames on web and native
- **[Supabase](https://supabase.com)** — Postgres + auth + Row Level Security (every row scoped to `auth.uid()`)
- **[TanStack Query](https://tanstack.com/query)** for server state
- **[React Hook Form](https://react-hook-form.com)** + **[Zod](https://zod.dev)** for form state and validation
- **[PostHog](https://posthog.com)** — analytics + error tracking (no-ops without an API key)
- **[tesseract.js](https://tesseract.projectnaptha.com/)** — client-side OCR for receipt scanning (web; loaded lazily, native fallback is manual entry)
- **[Jest](https://jestjs.io) + [jest-expo](https://github.com/expo/expo/tree/main/packages/jest-expo)** for unit tests

## Local setup

Requires Node 20 (see `.nvmrc`).

```bash
git clone https://github.com/<your-username>/warren-dev.git
cd warren-dev
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | yes | from your Supabase project settings |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | the anon/public key, **not** service-role |
| `EXPO_PUBLIC_PAYMENTS` | no | `mock` (default) or `stripe` |
| `EXPO_PUBLIC_POSTHOG_KEY` | no | leave empty to disable analytics |
| `EXPO_PUBLIC_POSTHOG_HOST` | no | `https://us.i.posthog.com` (default) or EU |

### Database setup

Run the files in `supabase/migrations/` **in order** in your Supabase project's SQL Editor (Project → SQL → New query → paste → Run):

1. `0001_init.sql` — creates the three tables (warranties, claims, extended_warranty_purchases) and the RLS policies that scope every row to its owner.
2. `0002_receipt_ocr.sql` — adds the optional `retailer` and `purchase_price_cents` columns used by receipt scanning.
3. `0003_product_registration.sql` — adds the `product_registrations` table (one row per warranty) plus RLS and an `updated_at` trigger.

### Run it

```bash
npm run web       # browser
npm run ios       # iOS simulator (requires Xcode on macOS)
npm run android   # Android emulator
```

## Project layout

```
app/                   expo-router file-based routes
  (auth)/              unauthenticated screens (sign-in)
  (tabs)/              main app tabs (warranties, claims, profile)
  warranties/          warranty detail, new, extend, contact flows
components/ui/         primitives (Button, Input, Screen, Text, etc.) — see AGENTS.md Design System
hooks/                 React Query hooks for warranties, claims, extend-warranty, product-registration
lib/                   pure utilities, types, schemas, supabase + analytics clients (incl. product-registration directory)
providers/             React context: auth, query client, posthog
services/payments/     payment provider interface + mock impl (Stripe TBD)
services/ocr/          receipt scanning abstraction (tesseract.js web, native fallback)
supabase/migrations/   DB schema + RLS policies
__mocks__/             Jest manual mocks
```

## Scripts

| Command | What it does |
|---|---|
| `npm run web` | Dev server (browser) |
| `npm run ios` / `npm run android` | Dev server (simulator/emulator) |
| `npm run build:web` | Production web build → `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm test` | Jest |
| `npm run check:docs` | Verify eval test files are listed in `AGENTS.md` and this file |

## Testing

Unit tests cover pure utilities, Zod schemas, and receipt parsing — the layers most prone to silent regressions.
When you add or change an eval module, update this list and the eval table in `AGENTS.md` (see **Documentation Maintenance Loop** there).


- `lib/utils.test.ts` — date math, currency formatting, expiration calculations
- `lib/schemas.test.ts` — form validation edge cases (ISO dates, length bounds, required fields)
- `lib/receipt-parser.test.ts` — OCR text heuristics (retailer, date formats, totals, brand/product detection)
- `lib/warranty-terms.test.ts` — warranty-term inference precedence (brand + category → brand → category → default)
- `lib/product-registration.test.ts` — registration directory resolution, link/prefill building, and reminder-window logic

Hook tests (with mocked Supabase client) are next on the roadmap.

```bash
npm test
npm test -- --watch
```

CI runs `typecheck` → `lint` → `test` → `check:docs` on every push and PR (see `.github/workflows/ci.yml`).
Pull requests use `.github/pull_request_template.md`, including a documentation checklist.

## Deployment

**Web**: deployed via [Cloudflare Pages](https://pages.cloudflare.com) on push to `main`.

- Build command: `npm run build:web`
- Output directory: `dist`
- Environment variables: same as `.env.example` (set in Cloudflare dashboard, not committed)

**Native (iOS/Android)**: deferred until product validation. The codebase already supports both — release will be packaging work, not rewriting work.

## Architectural notes

- **Visual design** follows the landing page palette (warm off-white background, slate-950 primary, restrained amber accent). Its public content journey pairs an outcome-led hero with a benefit ledger, three-step workflow, visible FAQ, and route-specific web metadata. Tokens live in `global.css`; conventions and rollout rules are in `AGENTS.md` → Design System.
- **`EXPO_PUBLIC_*` vars are public.** They're bundled into shipped JS by design. The Supabase anon key is meant to be public; security comes from RLS policies, not from hiding the key. The `service_role` key is **never** committed and never used client-side.
- **Payments are abstracted behind `services/payments/`.** Today: a mock provider that simulates 95% success. Tomorrow: a `StripePaymentProvider` swap-in (web → Stripe.js, native → `@stripe/stripe-react-native`) without touching call sites.
- **Analytics no-op without a PostHog key.** Set `EXPO_PUBLIC_POSTHOG_KEY` to enable. Web/native session replay deferred (web needs `posthog-js`, native needs a custom dev client off Expo Go).

## License

TBD. Until a `LICENSE` file is added, default copyright applies (read welcome, copy/redistribute not granted).
