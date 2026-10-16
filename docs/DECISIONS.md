# Architecture & Design Decisions Log

This document records key design decisions and resolutions to ambiguities between `docs/BRIEF.md`, `docs/GUIDE.md`, and the web reference.

---

### Decision 1: Category Taxonomy
- **Question**: Which category taxonomy should we standardize on across the data model, seed campaigns, and filter UI?
- **Decision**: Standardize on the 10 official categories specified in `BRIEF.md` and `GUIDE.md`:
  `Environment`, `Health`, `Science`, `Education`, `Public Policy`, `Economic Policy`, `Community`, `Arts & Culture`, `Business`, `Other`.
- **Rationale**: Keeps seed campaigns, schema validations, and UI filters 100% aligned across mobile and backend.

---

### Decision 2: Guest Backer Persistence & Receipt Handling
- **Question**: How should guest backers access receipts and track backed campaigns without an account?
- **Decision**: Store guest receipt tokens securely in `SecureStore` on the mobile device, allowing immediate and persistent receipt access. On the contribution confirmation screen, display a gentle CTA: *"Create an account to link your contributions across devices"*.
- **Rationale**: Respects the zero-barrier guest backing requirement while preventing users from losing their transaction records.

---

### Decision 3: Reach Formula Alignment
- **Question**: How should reach estimates be aligned between the Home Hero illustrative callout and the backing calculation model?
- **Decision**: Use the mathematically unified formula from `GUIDE.md` (`packages/shared/src/reach.ts`) across all touchpoints:
  - CPM: $6.00
  - Platform fee: 10%
  - Average frequency: 2.2
  - Output: ~68 people reached per $1 (display range: ~48–89 people).
- **Rationale**: Avoids conflicting reach promises between hero marketing text and actual checkout calculations.

---

### Decision 4: Material Changes & Re-Review Trigger
- **Question**: What constitutes a "material change" requiring admin re-review once a campaign is published?
- **Decision**: Edits to the Story text, Sources, Ad Creatives (images, headline, CTA), or Targeting parameters create a pending revision (`version + 1`) that requires reviewer re-approval. Posting creator updates or sharing links does not disrupt live funding or active ad distribution.
- **Rationale**: Protects backers and platform integrity without paralyzing creator communication.

---

### Decision 5: Speech Recognition & AI Fallback
- **Question**: How should the voice-assisted campaign creation flow handle simulators and devices without native speech recognition?
- **Decision**: Detect native speech recognition availability at runtime. If available on physical device, use `expo-speech-recognition`. If running on simulator, Expo Go, or if mic permissions are denied, provide an interactive scripted voice demo mode with one-tap simulated audio waveforms and sample transcripts.
- **Rationale**: Ensures the prototype voice flow is fully demonstrable during hackathon review and video recording regardless of the environment.

---

### Decision 6: Admin Review & Lifecycle Demo Control Panel
- **Question**: Where should the internal reviewer / lifecycle demo control panel be exposed in the mobile app prototype?
- **Decision**: Place the reviewer control panel in `apps/mobile/app/demo/control.tsx`, accessible via a hidden gesture in Profile > Settings (tapping the app version 7 times) or when logged in as `admin@demo.com`.
- **Rationale**: Demonstrates reviewer audit trails, approval gates, and lifecycle advancement without cluttering the consumer-facing 5-tab navigation.

---

### Decision 7: Expo SDK Selection & create-expo-app
- **Decision**: Use `npx create-expo-app@latest` (current stable SDK, TypeScript + Expo Router template) and `npx expo install` so all package versions match the latest stable Expo Go app. Record the installed SDK version.
- **Rationale**: Ensures compatibility with the latest Expo Go client on test devices.

---

### Decision 8: Metro & Babel Configuration Policy
- **Decision**: Only add custom `metro.config.js` or Babel plugin configs if bundling fails without them. Rely on modern Expo's built-in monorepo resolution and Reanimated integration first.
- **Rationale**: Avoids redundant or conflicting configurations when modern Expo handles monorepo module resolution and Reanimated natively.

---

### Decision 9: ESLint 9+ Flat Configuration
- **Decision**: If ESLint 9+ is used, use flat config (`eslint.config.js` / `eslint.config.mjs`) instead of deprecated `.eslintrc.json`.
- **Rationale**: Modern ESLint compatibility.

---

### Decision 10: Shared Package TypeScript Direct Export
- **Decision**: In `packages/shared`, point `main` and `types` directly to `src/index.ts` so no pre-build step is required when consumed by `apps/mobile` and `apps/api`.
- **Rationale**: Simplifies monorepo developer experience, eliminates out-of-sync build artifacts, and provides instant type-checking.

---

### Decision 11: Mobile .env.example Network Guidance
- **Decision**: Explicitly document LAN IP and Android emulator IP in `apps/mobile/.env.example`: use host LAN IP (e.g. `http://192.168.x.x:4000/api/v1`) for physical devices and `http://10.0.2.2:4000/api/v1` for the Android emulator.
- **Rationale**: Prevents common networking issues where mobile devices or emulators cannot reach `localhost`.

---

### Decision 12: Minimal Prisma Schema for P1
- **Decision**: In P1, define only the `datasource` and `generator` blocks in `prisma/schema.prisma`. Full domain models will be added in P3.
- **Rationale**: Keeps P1 focused strictly on monorepo scaffolding and infrastructure.

---

### Decision 13: .gitignore Scope
- **Decision**: Ensure `.gitignore` ignores `.env` files while explicitly tracking `.env.example`, `.agent/`, and `docs/`.
- **Rationale**: Protects secrets while safeguarding agent project memory and documentation.

---

### Decision 14: Mobile App Server Output & Expo Go Connection Fix
- **Decision**: Remove `"output": "server"` and experimental `reactCompiler` from `apps/mobile/app.json`. Add `-c` (clear cache) by default to `dev:mobile` and add a `dev:mobile:tunnel` script.
- **Rationale**: The default Expo template included web server-side rendering (`"output": "server"`), which activated `@expo/server` middleware. When native mobile devices or Expo Go connected to the Metro bundler port, the server middleware attempted to SSR-render web lambdas, aborting the connection with `Metro error: This operation was aborted (http.js controller.abort())` and causing Expo Go to show "Something went wrong". Removing server output restores pure native Metro bundling.

---

### Decision 15: Design System Tokens, Font Pipeline & Component Library (P2)
- **Decision**:
  1. Font Loading: Plus Jakarta Sans (400, 500, 600, 700) and Newsreader (400, 500i, 600, 700) loaded synchronously via `@expo-google-fonts` in `RootLayout` (`apps/mobile/src/app/_layout.tsx`), holding `SplashScreen.preventAutoHideAsync()` until fonts resolve.
  2. Pure Design Tokens: Zero hard-coded hex codes or numeric dimensions outside `apps/mobile/src/theme/tokens.ts`. App background set strictly to `bg` (`#F8FAFC`).
  3. Accessibility & Ergonomics: Min 48×48 dp touch targets on all pressables (via hitSlop or minHeight), explicit `accessibilityRole` and `accessibilityLabel` attributes, status never communicated through color alone (icon + label), and smooth animation fallbacks.
  4. Component Suite (23 UI + CampaignCard):
     - `Button` (primary/secondary/ghost/danger, lg/md/sm, loading, disabled, haptic feedback, 0.98 press scale)
     - `Card` (surface, border line, radius 16, soft elevation)
     - `ProgressBar` (animated fill on mount, dynamic green success at 100%+)
     - `StatusPill` (13 lifecycle states with dedicated Lucide icons & labels)
     - `CategoryChip` (10 official categories with distinct Lucide icons, selected/unselected, count badge)
     - `Skeleton` (shimmer opacity animation)
     - `EmptyState` & `ErrorState` (purposeful iconography, informative copy, retry actions)
     - `Toast` (`ToastProvider` context + `useToast` hook with info, success, warning, danger helpers)
     - `Accordion` (animated chevron rotation & collapsible body)
     - `InfoTip` (tappable (i) trigger opening accessible bottom sheet with 6 presets: reach, fees, funds, review, cpm, promotion)
     - `Sheet` (accessible drag-handle modal with backdrop blur & safe-area insets)
     - `Segmented` (iOS-style pill selector)
     - `TextField` & `TextArea` (labels, required markers, helper text, error text, character counters, disabled state)
     - `Avatar` (expo-image or initials fallback with deterministic palette color)
     - `Stat` (headline metric, descriptive label, citation)
     - `Timeline` (vertical chronological progression with completed/current/upcoming status)
     - `StepIndicator` (5-step creation tracker: Basics → Story → Visuals → Reach → Submit; completed steps tappable)
     - `StickyActionBar` (pinned bottom bar with safe area padding, primary 52dp button, optional price breakdown)
     - `SourceItem` (citation card with publisher, domain, checked verification badge, external linking)
     - `ReachEstimateBadge` (pill displaying ~X–Y people reached + InfoTip trigger + estimate subtitle)
     - `DemoDataBadge` (distinct subtle indicator for prototype transparency)
     - `CampaignCard` (default feed, compact horizontal, featured hero, and skeleton variants)
  5. Component Showcase: Accessible at `/dev/components` and linked directly from the home screen for complete visual verification.
- **Rationale**: Establishes a rock-solid, production-grade foundation for all subsequent mobile screens (P4–P7) with 100% type safety and zero design divergence.

---

### Decision 16: Database Layer, Schema Architecture & Seeding Integrity (P3)
- **Decision**:
  1. **Dual URL Configuration**: Configured Prisma datasource with both `DATABASE_URL` (pooled connection for runtime queries) and `DIRECT_URL` (direct connection for migrations and DDL operations) to support Supabase/Neon connection poolers seamlessly.
  2. **Local PostgreSQL Support**: Added `docker-compose.yml` for local containerized development and embedded PostgreSQL 18.4 runner (`apps/api/scripts/db-runner.ts`) as an automated fallback when Docker or system-level PostgreSQL is unavailable.
  3. **Official Categories Enum**: Modeled the 10 official categories as a PostgreSQL `Category` enum with `@map(...)` to align 1:1 with `@campaigns/shared` TypeScript union types and preserve display formatting.
  4. **Strict Financial Ledger Integrity**: Enforced that `Campaign.raisedCents` mathematically equals `sum(contributions.amountCents)` where `status = SUCCEEDED`. Added `apps/api/scripts/check-db.ts` (`npm run db:check`) to validate and assert this invariant across all database rows.
  5. **Idempotent Seed Pipeline**: Built `apps/api/prisma/seed.ts` using deterministic UUIDs, upserts, and clean cascading resets. Seeded 13 campaigns across all categories and creator types, demo credentials (`creator@demo.com`, `backer@demo.com`, `admin@demo.com`, password `Demo@1234`), review decisions, campaign events, updates, notifications, and completed report data.
- **Rationale**: Prevents financial reconciliation errors between the campaign feed and contribution receipts, satisfies all acceptance criteria, and guarantees zero database drift across test runs.

---

### Decision 17: REST API Layer, Authentication, Query Pipeline & Typed Mobile Client (P4)
- **Decision**:
  1. **Layered API Architecture**: Built `apps/api` following a strict `routes -> controllers -> services` separation mounted under `/api/v1`, while maintaining `/health` at root for platform monitoring.
  2. **Standardized Error Handling**: Unified all HTTP error responses to `{ error: { code, message, fields? } }` using custom `AppError` subclasses (`BadRequestError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `CampaignNotFundingError`).
  3. **JWT Authentication & Role Middleware**: Implemented bcrypt password hashing (cost factor 10), short-lived JWT access tokens (15 minutes), and long-lived refresh tokens (7 days). Provided `optionalAuth` (gracefully sets `req.user` if valid token present while permitting guests), `requireAuth` (rejects unauthenticated requests with 401), and `requireRole` (rejects insufficient permissions with 403).
  4. **Server-Side Search & Privacy Invariants**:
     - Real server-side text search across campaign `title`, `summary`, `creatorName`, `category`, and JSON `story` blocks.
     - Public listing enforcement: non-public states (`DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `REJECTED`) are strictly excluded from public queries. Individual non-public campaigns return 404 to anonymous users and non-owners.
     - Privacy rule: `GET /campaigns/:id` completely redacts private backer email, user ID, and identity, listing only aggregate backer counts and public names where `isAnonymous === false`.
  5. **Funding State Guard on Quotes**: `POST /campaigns/:id/quote` validates that the campaign is actively in `FUNDING` status, returning a clear `CAMPAIGN_NOT_FUNDING` error code otherwise.
  6. **Typed Mobile Client & TanStack Query Hooks**: Built `apps/mobile/src/api/client.ts` with cross-platform token persistence (`expo-secure-store` with web/memory fallback), 10-second timeout, typed `ApiError` normalization, single retry on network failure, and automatic token refresh on 401. Implemented typed TanStack Query hooks: `useCampaigns` (infinite query), `useFeatured`, `useCampaign`, `useQuote`, `useEstimateConfig`, and mutations (`useSignIn`, `useSignUp`, `useSignOut`, `useSaveCampaign`, `useFollowCampaign`, `useSubmitFeedback`).
- **Rationale**: Guarantees complete end-to-end type safety between backend and frontend without duplicating schemas, enforces critical privacy and financial invariants at the API boundary, and provides seamless offline-aware network resilience on mobile.

