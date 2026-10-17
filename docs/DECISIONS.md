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

---

### Decision 18: Creator Drafts, Autosave, 5-Step Submission, Simulated Payments & Lifecycle State Machine (P5)
- **Decision**:
  1. **Creator Drafts & Autosave Semantics**:
     - `POST /campaigns` creates an empty draft owned by the authenticated user in `DRAFT` status.
     - `PATCH /campaigns/:id/draft` provides partial autosave: strictly owner-only, permitted only while in `DRAFT` or `CHANGES_REQUESTED` status. Performs safe deep-merges of JSON fields (`story`, `sources`, `adCreative`, `reach`), applies loose validation allowing incomplete drafting states while enforcing maximum field lengths (title 60, summary 160, ad headline 40). Rejects attempts to modify `status` or `raisedCents` via autosave with `BAD_REQUEST`.
     - `POST /campaigns/:id/submit`: strictly executes 5-step validation (Basics, Story, Visuals, Reach, Submit). Returns step-level error records (`errorsByStep`) on failure. On success, transitions `DRAFT`/`CHANGES_REQUESTED` -> `SUBMITTED`, logs an audit event, and notifies reviewers.
     - **Post-Publication Revision Guard**: Material edits to `story`, `sources`, `adCreative`, or `reach` on live campaigns (`FUNDING`, `PROMOTING`) divert cleanly into `pendingRevision` and require reviewer approval; the live version remains untouched until approved.
  2. **Multer File Upload Pipeline**:
     - `POST /upload` handles `image/jpeg`, `image/png`, and `image/webp` with a 5MB size limit. Uploaded files are stored in `apps/api/uploads/` and served statically via Express under `/uploads`.
  3. **Contributions & Simulated Payments**:
     - `POST /contributions`: allowed strictly when the campaign is actively in `FUNDING` status. Recalculates exact fee breakdown and estimated reach via `quote(amountCents)`. Emits a `guestReceiptToken` for unauthenticated guest backers.
     - `POST /contributions/:id/pay`: implements deterministic magic test cards:
       - `4242 4242 4242 4242`: `SUCCEEDED` (atomic database transaction updates `raisedCents`, generates unique `REC-YYYYMMDD-XXXX` receipt, triggers milestone notifications at 25/50/75/100%, and auto-transitions campaign to `FUNDING_CLOSED` at 100% funded, never directly to `PROMOTING`).
       - `4000 0000 0000 0002`: `FAILED` (`CARD_DECLINED`).
       - `4000 0000 0000 9995`: `FAILED` (`INSUFFICIENT_FUNDS`).
       - `4000 0000 0000 3220`: `PENDING` (`BANK_VERIFICATION_REQUIRED`, automatically resolves to `SUCCEEDED` in background after 15 seconds).
     - **Strict Financial Ledger & Card Security**: `Campaign.raisedCents` mathematically equals the sum of `SUCCEEDED` contributions. Card numbers are never persisted (only card brand and last 4 digits are recorded).
     - **Receipt Access & Claiming**: `GET /contributions/:id/receipt` is restricted to the authenticated donor or requests presenting the matching `x-guest-receipt-token` header. `POST /contributions/claim` allows authenticated users to claim guest contributions.
  4. **Admin Review Queue & Controlled Lifecycle Advancement**:
     - `GET /admin/queue` lists submissions awaiting initial review and approved campaigns awaiting revision approval.
     - `POST /admin/campaigns/:id/decision`: enables reviewer approval (`APPROVE`, transitioning `SUBMITTED` -> `FUNDING` and setting calculated `startsAt`/`endsAt`), rejection (`REJECT`), or revision requests (`CHANGES_REQUESTED`). For pending revisions, approval updates live fields, clears `pendingRevision`, and increments `version`.
     - `POST /admin/campaigns/:id/advance`: strictly enforces sequential lifecycle progression (`FUNDING_CLOSED` -> `DISTRIBUTION_PREP` -> `PROMOTING` -> `COMPLETED`). Verifies checklist preconditions and rejects unauthorized jumps with 409 `PRECONDITION_FAILED`.
     - `GET /campaigns/:id/report`: available only when a campaign is `PROMOTING` or `COMPLETED`. Clearly distinguishes between `ESTIMATED` and `MEASURED` reach metrics.
     - `POST /admin/reset-demo`: re-executes seed pipeline to restore database to pristine demo baseline.
  5. **Mobile Typed Client & Hooks**:
     - Updated `apps/mobile/src/api/client.ts` with multipart form-data upload support (`uploadFile<T>`) and automatic `x-guest-receipt-token` header resolution from persistent secure storage.
     - Added TanStack Query hooks in `apps/mobile/src/api/hooks/`: `useCreator` (`useMyCampaigns`, `useMyCampaign`, `useCreateDraft`, `useAutosaveDraft`, `useSubmitCampaign`, `useDeleteDraft`, `useCampaignAnalytics`, `usePostCampaignUpdate`), `useContributions` (`useCreateContribution`, `usePayContribution`, `useContributionReceipt`, `useMyContributions`, `useClaimContributions`), `useActivity` (`useNotifications`, `useMarkNotificationRead`, `useUpdateNotificationPrefs`), `useReports` (`useCampaignReport`), and `useAdmin` (`useAdminQueue`, `useAdminDecision`, `useAdminAdvance`, `useResetDemo`).
- **Rationale**: Completely enforces the campaigns state machine, ensures absolute financial ledger integrity with zero card data leakage, protects live campaigns from unreviewed edits, and provides seamless full-lifecycle testing and demo capabilities across backend and mobile.

---

### Decision 19: Expo Router App Shell, 5-Tab Navigation, Route Placeholders, Zustand Auth Store & ScreenState Architecture (P6)
- **Decision**:
  1. **Root Layout & Provider Hierarchy (`apps/mobile/src/app/_layout.tsx`)**:
     - Configured the global provider hierarchy wrapping all screens: `GlobalErrorBoundary` (recovering with friendly UI and "Try Again" action) -> `QueryClientProvider` -> `SafeAreaProvider` -> `AuthGateProvider` -> `ToastProvider` -> `OfflineBanner` -> `Stack` (`screenOptions: { headerShown: false }`).
     - Font and splash synchronization: Synchronously loads Plus Jakarta Sans (400, 500, 600, 700) and Newsreader (400, 500i, 600, 700) with `@expo-google-fonts`, holding the splash screen with `SplashScreen.preventAutoHideAsync()` and hiding it once fonts and hydration are confirmed.
  2. **Strict 5-Tab Bar (`apps/mobile/src/app/(tabs)/_layout.tsx`)**:
     - Exactly 5 tabs: Home, Explore, Create, Activity, Profile.
     - Height: 56px + safe-area insets. Active tint: `primary-600` (`#4F46E5`). Inactive tint: `text-tertiary` (`#94A3B8`). Labels always visible.
     - Create tab is visually emphasized as a 44x44 circular button filled with `primary-600` and white plus icon, maintaining exact 5-tab count without adding an extraneous 6th slot.
     - Activity tab renders an unread count badge tied directly to `useNotifications()` hook data.
     - Bottom tab bar remains persistent across all tab screens.
  3. **Universal Route Hierarchy (34 Routes)**:
     - Scaffolded full placeholder routes per Section 4 of `docs/GUIDE.md`:
       - Tabs: `/(tabs)/index`, `/(tabs)/explore`, `/(tabs)/create`, `/(tabs)/activity`, `/(tabs)/profile`.
       - Campaigns: `/campaign/[id]`, `/campaign/[id]/report`.
       - Backing Flow (5-step linear): `/back/[id]/amount`, `/back/[id]/review`, `/back/[id]/pay`, `/back/[id]/result`.
       - Creation Flow (5-step linear): `/create/voice`, `/create/[draftId]/basics`, `/create/[draftId]/story`, `/create/[draftId]/visuals`, `/create/[draftId]/reach`, `/create/[draftId]/submit`, `/create/[draftId]/preview`, `/create/[draftId]/submitted`.
       - Creator: `/creator/dashboard`, `/creator/[id]`.
       - Profile & Sub-screens: `/profile/backed`, `/profile/saved`, `/profile/payments`, `/profile/payments/[id]`, `/profile/settings`, `/profile/notifications-settings`.
       - Info & Utility: `/info/[slug]` (supporting `about`, `how-it-works`, `partners`, `faq`, `help`, `contact`, `terms`, `privacy`, `guidelines`), `/demo/control` (with simulated database reset trigger).
       - Auth: `/auth/sign-in`, `/auth/sign-up`.
       - Dev: `/dev/components`.
  4. **Shared Header with Safe Fallback Navigation (`apps/mobile/src/components/layout/SharedHeader.tsx`)**:
     - Back button with touch target $\ge 48\times 48$, title, optional right action, and optional `StepIndicator`.
     - Fallback back action: checks `router.canGoBack() ? router.back() : router.replace(fallbackRoute || '/(tabs)')`, guaranteeing zero dead ends or blank screens when users enter via deep links or cold restarts.
  5. **Zustand Auth Store & Contextual Gating (`apps/mobile/src/store/authStore.ts`, `apps/mobile/src/auth/requireAuth.tsx`)**:
     - Auth store persists session tokens in `expo-secure-store` (with web/memory fallback), hydrates on app launch, and handles silent token refresh via `/auth/refresh`.
     - `useRequireAuth` hook and `AuthGateProvider` modal: browsing requires NO account. Strictly gates stateful actions (saving/following campaigns, launching creation flow, viewing profile details, creator dashboard).
     - Renders an accessible bottom sheet modal explaining the feature, offering "Sign In", "Create Account", and "Continue as Guest" actions, preserving `returnTo` target route.
  6. **Auth Screens with Quick Fills (`apps/mobile/src/app/auth/`)**:
     - Implemented `sign-in.tsx` and `sign-up.tsx` using `react-hook-form` and shared Zod schemas (`SignInInputSchema`, `SignUpInputSchema`).
     - Features password show/hide visibility toggles, loading indicators, friendly plain-language errors, and one-tap demo quick-fill chips ("Use demo creator", "Use demo backer").
  7. **ScreenState Wrapper & Top Network Offline Banner (`apps/mobile/src/components/layout/`)**:
     - `ScreenState`: Standardized state machine wrapper switching cleanly between skeleton shimmer lists, `ErrorState` with retry callback, `EmptyState`, and screen content.
     - `OfflineBanner`: Amber status bar banner powered by `useNetworkStatus()` (supporting `@react-native-community/netinfo` and web `navigator.onLine`) that animates into view smoothly when connectivity is lost and hides when restored.
- **Rationale**: Establishes a complete, accessible, and resilient client foundation. Prevents routing loops and dead-end back navigation, guarantees graceful offline handling, enforces secure guest vs. authenticated boundaries, and provides an end-to-end connected scaffolding ready for feature-specific screen implementations.

---

### Decision 20: Home Tab Architecture, Reach Demonstration & Feed Filtering Hierarchy
- **Question**: How should the Home tab organize hero messaging, platform transparency, featured carousels, and the core campaign feed without nested vertical scrolling performance issues?
- **Decision**:
  1. **Single FlatList Architecture**: Structure the Home tab strictly around a single outer `FlatList` with `ListHeaderComponent` (for the Hero, Disclaimer Chip, Featured Carousel, How It Works, and Category filter chips) and `ListFooterComponent` (for pagination spinners and the Footer links strip). This avoids nested vertical `ScrollView`s, eliminates gesture conflicts, and ensures smooth 60fps scrolling and native pull-to-refresh (`RefreshControl`).
  2. **Calm Indigo Gradient Hero**: Implement the hero with non-noisy SVG linear gradients (`#312E81` to `#4338CA`), Newsreader bold headlines ("Help important messages travel further."), white primary action ("Explore Campaigns"), and ghost secondary action ("Start a Campaign" gated via `useRequireAuth`).
  3. **Mathematical Reach Transparency**: Integrate the shared `quote(100)` function dynamically in the hero's "Illustrative reach per $1" card, computing the exact range (~48–89 people) from shared ad pricing config ($6.00 CPM, 2.2 frequency, 10% fee) with a modal explaining calculation mechanics and demo assumptions.
  4. **Dedicated Amplification vs. Donation Disclaimer**: Position an accessible disclaimer chip ("Contributions fund ad distribution, not the cause or creator") directly beneath the hero, opening an interactive sheet explaining the 90/10 ad budget vs platform review model.
  5. **Horizontal Peek Carousel**: Configure the featured campaigns carousel with `decelerationRate="fast"` and card width `Math.min(windowWidth * 0.84, 340)` ensuring a consistent, visible peek of the next card on screens from 360px up to tablets.
  6. **Unified Category Quick Filtering & Infinite Scroll**: Filter the feed dynamically across all 10 official categories + "All", with active query key invalidation via `useCampaigns({ category })`, animated skeletons on load, and `onEndReached` infinite pagination.
  7. **Status-Aware CampaignCard Action**: When in `FUNDING` status, the card action button routes to `/back/[id]/amount`. For non-funding states (`PROMOTING`, `COMPLETED`, `FUNDING_CLOSED`), the card displays a `StatusPill` and secondary "View Campaign" button routing to `/campaign/[id]`.
- **Rationale**: Delivers instant 5-second platform comprehension for first-time visitors, upholds the "NOT a donation" core invariant across all hero and checkout touchpoints, and maintains a responsive, high-performance feed.

---

### Decision 21: Explore Tab Server-Side Search, Complex Filter Architecture & Persistent State
- **Question**: How should the Explore tab support responsive search, multi-facet filtering (status, progress, goal, creator type), and sort orders while maintaining strict server-side truth, high frame rates, accessibility, and state retention across detail screen navigations?
- **Decision**:
  1. **Strict Server-Side Query Execution**:
     - Extended `packages/shared` schemas (`CampaignQuerySchema`) with `creatorType` (`individual`, `creator`, `nonprofit`, `business`, `community`), `progressRange` (`under_25`, `25_75`, `over_75`), and `goalRange` (`under_1000`, `1000_5000`, `over_5000`).
     - In `apps/api` (`campaign.service.ts`), all queries are executed on the database server. Progress ranges are evaluated with exact PostgreSQL integer arithmetic (`"raisedCents" * 100 < "fundingGoalCents" * 25`, etc.) avoiding floating-point rounding issues, and safely intersected with text search IDs. No results are filtered in-memory on the client.
  2. **Explore Query State Retention (`useExploreStore`)**:
     - Centralized Explore query parameters (`searchQuery`, `selectedCategory`, `sort`, `filters`, `isCompact`) in a Zustand store (`apps/mobile/src/store/exploreStore.ts`).
     - Navigating to `/campaign/[id]` or `/back/[id]/amount` and pressing the back button leaves all search text, selected categories, active filters, sort order, and compact view mode intact without re-initializing or losing scroll context.
  3. **Debounced Search & Persistent Recent Searches**:
     - 300ms debounce prevents unnecessary API requests while typing.
     - Sticky search bar contains a clear button `(✕)` and loading indicator during active queries.
     - When focused and empty, displays a persistent "Recent Searches" list loaded from `AsyncStorage` (capped at 6 items, individually removable, with a "Clear all" action).
  4. **Accessible Category Chips**:
     - Horizontally scrollable row with All + 10 official categories, displaying category icons and live API campaign counts (`categoryCounts[cat]`).
     - Selected chip is indicated with both color tokens and an explicit `Check` icon, strictly honoring the "never color-only" accessibility invariant.
  5. **Conditional Featured Strip**:
     - Featured campaigns carousel is displayed strictly when search query is empty, selected category is 'All', and no filters are active.
  6. **Interactive Sort & Filter Bottom Sheets**:
     - Sort bottom sheet provides 5 server-side options (Trending, Newest, Most funded, Ending soon, Closest to goal) with active indicator and current sort label on the trigger button.
     - Filter bottom sheet provides faceted selectors for Status, Progress, Funding Goal, and Creator Type, complete with an active filter badge, "Reset" action, and an Apply button showing live preview count ("Show X campaigns").
  7. **Removable Active Filter Chips & View Density Toggle**:
     - Active filters are rendered in a horizontal scroll of removable chips with `(✕)` icons for quick one-tap removal.
     - View mode toggle switches between standard rich campaign cards and compact feed cards (`Rows3` vs `LayoutGrid`).
  8. **Comprehensive Feed States**:
     - Loading skeleton shimmers on initial fetch.
     - Error state with retry callback on network failure.
     - Category empty state ("Nothing here yet" with a "Start a campaign" action) when a valid category contains no campaigns.
     - Query no-results state ("No campaigns found matching...") with a "Clear all filters" button and 3 suggested category chips.
- **Rationale**: Keeps server-side database indexing as the single source of truth for all multi-parameter filtering, guarantees smooth 60fps interaction on mobile, complies with universal accessibility standards, and delivers a frictionless search and discovery experience.

---

### Decision 22: Editorial Campaign Reading Architecture, Standalone StoryRenderer & Sticky Funding Panel
- **Question**: How should the Campaign Detail screen (`apps/mobile/src/app/campaign/[id].tsx`) be designed to balance editorial reading, transparent source citations, community-funded ad distribution education, and sticky funding actions without overwhelming the story?
- **Decision**:
  1. **Reusable Standalone StoryRenderer (`apps/mobile/src/components/story/StoryRenderer.tsx`)**:
     - Built as a decoupled, reusable component supporting all 6 official story block types: `heading` (levels 1–3), `paragraph` (Newsreader 18/28), `image` (caption, credit, and tap-to-zoom full-screen modal), `stat` (Newsreader value, label, and citation), `quote` (indigo border, Newsreader italic text, attribution), and `actions` (audience action checklist with success icons).
     - Integrated inline markdown parsing for bold (`**text**`), italic (`*text*`), links (`[text](url)` opening in-app via `expo-web-browser`), and bullet lists (`- item`).
     - Decoupled from screen-specific routing so that the campaign creation live preview flow can reuse it directly without duplication.
  2. **Collapsing Hero & Floating Navigation Overlay**:
     - 250px cover image with floating top circular buttons with safe area handling.
     - Back navigation with fallback to Explore (`router.canGoBack() ? router.back() : router.replace('/(tabs)/explore')`).
     - Save/bookmark toggle integrated with `useSaveCampaign(id)` and `useRequireAuth` modal gating.
     - Native share action via `Share.share` with campaign URL.
  3. **Editorial Header & Creator Metadata**:
     - Category chip, `StatusPill` for non-funding statuses, and `DemoDataBadge`.
     - Newsreader bold 27/35 headline and Plus Jakarta Sans summary.
     - Creator identity row with avatar, name, creator type badge (`individual`, `creator`, `nonprofit`, `business`, `community`), and formatted publication date.
  4. **Transparent Visible Sources Section**:
     - Clear editorial section with mandatory disclaimer: *"Sources are provided by the creator and are checked as part of our review. We do not independently verify external research or claim primary authority."*
     - Every source rendered via `SourceItem` with domain extraction, note, and in-app browser opening.
     - Strictly no independent verification claims and no synthetic trust scores.
  5. **5 Accordions (Collapsed by Default Except First)**:
     - *Use of funds* (`defaultOpen={true}`): 10% platform fee, 90% direct ad budget, dynamic goal & budget stat cards, channel budget allocation, refund threshold terms (25% minimum), unspent escrow rules, and bold non-donation statement: **"Your contribution funds the distribution of this message, not direct charitable support for the cause."**
     - *Audience & distribution*: Target locations, topics & interests, distribution channels, promotion duration schedule, and ad disclosure/privacy statement.
     - *Review & trust*: 4-step plain language review process (Creator Verification, Citation Audit, Policy Compliance, Delivery Feasibility), transparent review standards, and verified distribution partners.
     - *Updates*: Timeline of creator updates via `Timeline` or clean empty state.
     - *Backers*: Aggregate backer count and public names list strictly for backers who opted in (private by default).
  6. **Reader Perception Feedback Widget**:
     - Two questions: *"Did the visuals encourage you to keep reading?"* and *"Did this change your mind?"* (No / Somewhat / Yes).
     - Submits to `POST /campaigns/:id/feedback` via `useSubmitFeedback(id)`.
     - Device persistence via `AsyncStorage` (`@campaign_feedback_${id}`) to prevent double submissions and display a thank-you confirmation state.
  7. **Sticky Bottom Funding Panel & Expandable Details Sheet**:
     - Raised vs goal, percent funded, animated `ProgressBar`, days remaining, reach estimate, and `DemoDataBadge`.
     - Status-aware primary action button:
       - `FUNDING`: "Back This Campaign" -> `/back/${id}/amount`.
       - `FUNDING_CLOSED` / `DISTRIBUTION_PREP`: Disabled "Funding closed".
       - `PROMOTING`: "Follow progress" / "Following" (`useFollowCampaign`).
       - `COMPLETED`: "View final report" -> `/campaign/${id}/report`.
     - Tapping the panel opens an expandable `Sheet` displaying full progress details, reach math breakdown ($6 CPM, 2.2 frequency, impressions, unique audience reach formula), and Share Campaign button.
     - ScrollView bottom padding ensures sticky panel never obscures story or accordions.
  8. **Comprehensive States**:
     - Custom loading skeleton mirroring the editorial layout.
     - `ErrorState` with retry callback.
     - 404 not-found empty state with navigation back to Explore.
- **Rationale**: Elevates editorial clarity, prevents backer confusion regarding community-funded advertising versus charity, adheres to strict accessibility and design tokens, and ensures reliable performance across all platforms.

## 23. Campaign Creation Flow Architecture, Isolated Multi-Draft Engine & Step Completeness Model

- **Context**: The product requires a multi-step creation flow for campaigns (Basics → Story → Visuals → Reach → Submit) with autosave, draft isolation, resume/delete draft management, offline queueing, live editorial preview, and strict validation safeguards.
- **Decision**:
  1. **Entry Screen (`apps/mobile/src/app/(tabs)/create.tsx`)**:
     - Guided choice cards: **Create Manually** (calls `POST /campaigns` to initialize a server DRAFT and navigates to `/create/[draftId]/basics`) and **Create with Your Voice** (navigates to conversational intake `/create/voice`).
     - Unauthenticated gatekeeper: Requires sign-in via `useRequireAuth` with a clear explanation and return path.
     - Saved Drafts Section: Live list from `useMyCampaigns(undefined)` filtered for `DRAFT` and `CHANGES_REQUESTED` statuses. Displays title (or "Untitled campaign"), status pill, relative timestamp, "Continue editing" button, and trash icon opening a confirmation modal (`Sheet`) with `useDeleteDraft`.
     - Zero drafts empty state prompting user to begin their first campaign.
  2. **Multi-Draft Isolated Engine (`apps/mobile/src/store/draftStore.ts`)**:
     - Zustand store persisted to `AsyncStorage` (`@campaigns_draft_store_v1`).
     - Strict isolation: All drafts indexed by `draftId`, preventing cross-contamination between different user campaigns.
     - Optimistic local state updates immediately on user input (`updateDraftField`, `updateDraftFields`), ensuring zero UI lag or typing jitter.
     - Debounced 1.5s autosave (`PATCH /campaigns/:id/draft`) sending only dirty diffs.
     - Visual sync status indicators: "Saving...", "Saved just now", "Offline - will sync", and error states.
     - Offline queue: Network failures flag drafts as `offline_pending`; reconnection or hydration automatically drains and syncs dirty fields via `syncOfflineDrafts()`.
     - Last-write-wins merge resolution respecting `updatedAt` timestamps between local and server payloads.
  3. **Strict Invariant: `fundingGoalCents` Guard**:
     - Architectural rule: Funding goal cannot be entered or updated in Steps 1 through 4.
     - `draftStore.ts` enforces `if (field === 'fundingGoalCents' && !options?.fromSubmitStep) throw new Error(...)`.
     - Step 5 (Submit) is the exclusive UI location where `fundingGoalCents` is provided by the creator.
     - Unit-tested with Vitest in `apps/mobile/src/__tests__/draftStore.test.ts`.
  4. **Shared Step Completeness & Pre-Submit Validation (`packages/shared`)**:
     - Exported `CreationStepKey`, `StepIdentifier`, and `normalizeStepKey` helpers.
     - `getStepErrors(draft, step)`: Pure function evaluating draft fields against Zod constraints for each specific step.
     - `getAllStepErrors(draft)`: Aggregates validation errors across all 5 steps for pre-submission checks.
     - `isStepComplete(draft, step)`: Boolean helper driving step checkmarks in headers and progress bars.
     - Comprehensive unit tests in `packages/shared/src/__tests__/steps.test.ts` (14 tests).
  5. **Creation Layout Shell (`apps/mobile/src/app/create/[draftId]/_layout.tsx`)**:
     - Persistent top bar with 5-step interactive `StepIndicator`, mode pill (`EDITING`, `PREVIEWING`, `SUBMITTED`), sync status indicator, "Save as Draft", and "Exit" actions with unsaved-changes confirmation.
     - Sticky bottom navigation bar with step transition triggers, autosave flush on step advance, and preview transition.
  6. **Step Screens**:
     - `basics.tsx`: Step 1 (Title max 60, Summary max 160, Creator info, Category picker).
     - `story.tsx`: Step 2 (Heading requirement, 300+ char story text, primary source).
     - `visuals.tsx`: Step 3 (Cover image URL, ad image URLs, ad headline max 40, ad description max 90, CTA).
     - `reach.tsx`: Step 4 (Target locations, channels, 100% budget allocation, duration 1-90 days).
     - `submit.tsx`: Step 5 (Funding goal input $500–$50,000, rules acceptance checkbox, "Still Needed" completeness checklist with jump-to-step buttons).
     - `preview.tsx`: Live editorial preview reusing `StoryRenderer`, ad creative mockups, reach summary, and final submit mutation (`POST /campaigns/:id/submit`).
     - `submitted.tsx`: Congratulatory submission confirmation, review status explanation, and link to Creator Dashboard.
     - `voice.tsx`: Voice intake placeholder with guided talking points and "Return to manual creation" fallback.
- **Rationale**: Provides creators with an intuitive, resilient authoring experience that prevents data loss, enforces platform rules and funding transparency, and maintains codebase modularity through shared validation logic.


## 24. Step 1 (Basics) Creation Flow, AI Draft Basics Endpoint & Media Validation

- **Context**: Step 1 (Basics) represents the initial stage of campaign creation, collecting the campaign title, category, creator/organization identity, creator type, short summary, and optional cover image. Creators also require assistance getting started (collapsible starter prompts and an AI drafting assistant powered by Gemini with deterministic fallback).
- **Decision**:
  1. **Step 1 Basics Screen (`apps/mobile/src/app/create/[draftId]/basics.tsx`)**:
     - **Title**: Required, capped strictly at 60 characters with live character counter (`n / 60`), helper text explaining that the title may be used as the default ad headline, and validation inline.
     - **Category Picker**: Required, bottom sheet selector rendering all 10 official categories (`CATEGORIES`) with Lucide icons, descriptions, and checkmark indicators.
     - **Creator Identity**: Required creator/organization name (max 80 chars) and a single-choice selector across the 5 official creator types (`individual`, `creator_influencer`, `nonprofit`, `business`, `community_group`) with icons and explanations.
     - **Short Summary**: Required, max 160 characters with live counter (`n / 160`).
     - **Cover Image**: Optional 16:9 crop picker via `expo-image-picker` (`allowsEditing: true, aspect: [16, 9]`). Validates format (`jpeg`, `png`, `webp`) and size ($\le 5\text{MB}$) with friendly inline errors. Uploads through `POST /uploads` with animated progress spinner and retry handling on failure. Existing images offer Replace and Remove actions.
     - **Starter Guidance Card**: Collapsible "Need help getting started?" card with 4 foundational prompts from the product brief (guidance only, non-blocking).
     - **Validation & Focus Handling**: Step validation registered with the creation shell via `setStepContinueHandler`. Invalid fields display inline red error messages and trigger automatic smooth scrolling and programmatic focus to the first invalid field (`titleInputRef.current?.focus()`).
     - **Save as Draft Action**: Flushes dirty fields to `draftStore.flushDraft()` and displays a "Draft saved" toast notification.
  2. **AI Drafting Endpoint (`POST /api/v1/ai/draft-basics`)**:
     - Secured by `requireAuth` and a dedicated 30 req/15min rate limiter.
     - Validated using Zod schemas in `packages/shared` (`AiDraftBasicsInputSchema` and `AiDraftBasicsResponseSchema`).
     - Invokes Gemini 2.5 Flash with structured JSON output when `GEMINI_API_KEY` is configured; applies strict 8-second timeout (`AbortSignal.timeout(8000)`).
     - Seamless deterministic fallback if API key is absent, timeout fires, or network fails. Accurately predicts matching category from title/summary tokens and returns `demo: true`.
     - Logs only operational metadata (action, latency, demo flag); never logs user content or exposes API keys.
  3. **AI Review Bottom Sheet**:
     - Shows suggestions for title, summary, category, and creator description in a review sheet.
     - Per-field granular actions: **Accept**, **Edit** (inline editing before accepting), or **Dismiss**.
     - Explicit confirmation before overwriting any non-empty user field.
     - Accepted suggestions are tagged with an "AI-suggested" badge that vanishes as soon as the creator edits the field.
     - Displays "Demo suggestions" pill when `demo: true`.
     - Graceful error state if the service fails: *"AI suggestions are unavailable. You can keep writing yourself."*
     - Never touches or generates `fundingGoalCents`.
- **Rationale**: Balances guided authoring with total creator control, provides resilient AI assistance without vendor lock-in or network fragility, prevents invalid data early in the pipeline, and maintains strict token and accessibility standards.
## 25. Step 2 (Story) Editorial Composer, AI Draft Story Endpoint & Block Management

- **Context**: Step 2 (Story) represents the primary editorial experience of campaign creation. Unlike standard crowdfunding apps with unstructured forms or plain text areas, this step must feel like authoring a high-calibre journalistic or magazine article while preserving structured block data for consistent multi-platform rendering.
- **Decision**:
  1. **Editorial Screen Architecture (`apps/mobile/src/app/create/[draftId]/story.tsx`)**:
     - **Serif Typography**: Generous editorial spacing with Newsreader serif headings and standfirst summary, evoking a quiet, focused publication environment.
     - **Mode Toggle (Edit | Preview)**: Seamless segmented switch between block editing and a real-time live preview powered directly by `StoryRenderer` (`showSources={true}`), accompanied by a "Previewing" badge.
     - **Draft Autosave & State**: Synchronized with `useDraftStore`, persisting headline, summary, story blocks, and sources with immediate local updates and debounced server sync.
  2. **Block-Based Content Composer**:
     - **Block Types**: Paragraphs, Headings (H1/H2/H3 levels), Images (16:9 crop, validation, upload, caption, credit), Statistics (value, label, citation), Quotes (quote text, speaker/attribution), and Suggested Audience Actions (up to 3 items).
     - **Block Operations**: Accessible Up and Down controls (disabled at list boundaries), Duplicate, and Delete with an Undo Toast allowing instant restoration of the deleted block at its original position.
     - **Floating Markdown Formatting Toolbar**: Automatically appears when a paragraph is focused, floating above the keyboard with Bold, Italic, Link modal insertion, and Bullet list formatting.
  3. **Verified Sources Manager**:
     - Separate dedicated card with clear disclosure: *"Sources are shown publicly on your campaign page."*
     - Add, edit, remove, and reorder sources (Title, URL with `http://` / `https://` validation, Publisher).
     - Contextual warning badge appears if the story includes statistic blocks without any verified sources.
  4. **AI Drafting & Paragraph Polish (`POST /api/v1/ai/draft-story`)**:
     - Secured by `requireAuth` and a 30 req/15min rate limiter.
     - Supports `full_story` (synthesizes headline, intro, headings, paragraphs, stats, quotes, and audience actions from basics) and `improve_paragraph` (polishes existing paragraph text for clarity, cadence, and conciseness).
     - Invokes Gemini 2.5 Flash with structured JSON output and an 8-second abort timeout.
     - Seamless deterministic fallbacks with rich multi-paragraph editorial content for all 10 categories.
     - Strict safety invariants: NEVER generates fake or fabricated URLs (only recommends source *types* to research); NEVER touches or calculates `fundingGoalCents`.
     - AI Review Bottom Sheet: Granular inspection, overwrite confirmation modal, and "AI-suggested" badges on newly inserted content that clear dynamically when the creator makes manual edits.
  5. **Validation & Quality Gates**:
     - Step validation enforced via `getStepErrors(draft, 'story')`: Requires at least 1 heading block, at least 300 written characters across text blocks, and at least 1 verified source.
     - Specific jump links and error notifications guide creators directly to deficient sections.
- **Rationale**: Elevates the content quality of campaigns to match high editorial standards, fosters credibility through explicit sourcing, accelerates authoring with resilient AI assistance, and ensures full transparency for backers.

---

## 26. Step 3 (Visuals) Campaign & Ad Creative Composer, Placement Previews & AI Ad Copy Endpoint

- **Context**: Step 3 (Visuals) bridges the editorial world of the campaign story and the paid advertising creative that will be distributed across social and search ad networks. Creators must configure the editorial cover image, up to 5 ad creative images, ad copy (headline, description, call-to-action), and inspect how their ads will appear in diverse placements (social feeds, vertical stories, and display banners), while receiving AI assistance and validation.
- **Decision**:
  1. **Editorial Cover vs. Advertising Creative Separation**:
     - **Campaign Cover Image**: Reused from Step 1 (`draft.coverUrl`), previewed in 16:9 ratio with Replace and Remove actions, and upload via `POST /uploads` with animated progress and retry support. Clarifies that the cover represents the hero image of the published story page.
     - **Ad Creative Images**: Upload up to 5 ad images through `POST /uploads`. Aspect ratio guidance cards explain recommended formats (1:1 square, 4:5 vertical, 1.91:1 horizontal landscape). Thumbnails show remove and "Set as primary" controls (promoting the image to index 0).
     - **Image Validation**: Pure validation utility in `@campaigns/shared` (`validateImageFile`) validates file type (`jpeg`, `png`, `webp`) and size ($\le 5\text{MB}$), and returns a non-blocking resolution warning if the short edge is $< 1080\text{px}$.
  2. **Video Creative Placeholder**:
     - Clearly labelled "Video ads: coming soon" card explaining transcoding and platform review workflows currently in private preview. Avoids dead buttons while setting clear expectations for video ad support.
  3. **Ad Copy Composer**:
     - **Ad Headline**: Capped at 40 characters with live counter (`n / 40`). Defaults to the campaign title truncated cleanly to 40 characters (`deriveAdHeadlineFromTitle(draft.title)`) with an informative hint: *"Using your title as the headline"*, which dismisses automatically once edited.
     - **Ad Description**: Required, capped at 90 characters with live counter (`n / 90`).
     - **Call-to-Action Presets**: Selection chips strictly constrained to the 5 official presets (`CTA_PRESETS`: `'Learn more'`, `'Read the story'`, `'Watch now'`, `'Sign up'`, `'Get involved'`).
  4. **Multi-Format Placement Previews**:
     - Segmented control toggling between 3 standard placement formats:
       - **Social Feed Card**: 1:1 square media frame, creator avatar, sponsor tag, headline, description, and primary CTA button.
       - **Vertical Story (9:16)**: Full-bleed vertical mockup with gradient overlays, top creator attribution pill, headline, and swipe-up / CTA card.
       - **Display / Search Banner (1.91:1)**: Horizontal banner mockup with side-by-side or stacked banner creative layout.
     - Dynamically renders using the currently designated primary ad image and live ad copy.
     - Displays mandatory transparency disclaimer: *"Preview only. Final placements are set during review."*
  5. **AI Ad Copy Endpoint (`POST /api/v1/ai/ad-copy`) & Image Ideas**:
     - Authenticated via `requireAuth` and protected by `aiLimiter` (30 req/15min).
     - Validated using Zod schemas in `packages/shared` (`AiAdCopyInputSchema` and `AiAdCopyResponseSchema`).
     - Invokes Gemini 2.5 Flash with structured output and strict 8-second timeout (`AbortSignal.timeout(8000)`).
     - Deterministic category-specific fallbacks (`AD_COPY_DEMO_TEMPLATES`) for all 10 categories providing 3 distinct punchy headlines ($\le 40$ chars), 3 descriptions ($\le 90$ chars), suggested CTA preset, and creative quality tips with `demo: true`.
     - AI Review Bottom Sheet: Granular selection for headlines and descriptions, inline editing, overwrite confirmation modal for non-empty fields, and "AI-suggested" badges that disappear upon manual edits.
     - "Generate image ideas" modal: Curated creative visual concept gallery for the category, guiding creators on photo framing and visual composition without fabricating uploads.
     - Invariant: AI ad copy service NEVER touches or modifies `fundingGoalCents`.
  6. **Consolidated Top Warnings & Quality Gates**:
     - Top warning card listing all blocking issues (missing cover, missing ad image, missing/too long headline, missing/too long description, missing CTA) and non-blocking warnings (<1080px resolution).
     - Tap-to-scroll navigation smoothly brings the respective input field into focus.
     - Transforms into a green "Ready" card once all blocking requirements are satisfied.
     - Full integration with `useDraftStore`, autosave, and creation shell navigation (`setStepContinueHandler`).
- **Rationale**: Keeps editorial and marketing assets strictly demarcated, prevents common ad network rejection causes early through client-side validation, ensures realistic placement previews, and provides deterministic AI copywriting assistance that respects creator intent and safety bounds.

---

## 27. Step 4 (Reach) Targeting, Budget Allocation Rebalancing, Channels & Reviewer Demarcation

- **Context**: Step 4 (Reach) explains how a campaign is intended to find an audience across digital advertising channels, without ever guaranteeing or promising an audience size. Creators must specify geographic regions, optional demographics and thematic interests, digital advertising networks, and a budget allocation that always totals 100%, while clearly understanding which parameters are finalized by reviewers during campaign review.
- **Decision**:
  1. **Curated Geographic Locations (`TARGET_LOCATIONS`)**:
     - Standardized list of countries, regions, and major cities maintained in `@campaigns/shared/src/schemas/campaign.ts` for unified client and API validation.
     - Searchable location filter with selected locations rendered as removable chips.
     - "Worldwide" option that clears all individual locations (`toggleTargetLocation`); selecting any specific location deselects "Worldwide".
  2. **Audience Demographics & Themed Interests**:
     - Thematic interest chips grouped under 5 official themes: `Civic life`, `Health & wellbeing`, `Science & tech`, `Money & work`, and `Culture`.
     - Age range control (18 to 65+) with standard demographic presets (`18-65+`, `18-34`, `25-54`, `35-64`, `55+`).
     - Labeled explicitly with *"Where supported · optional"* badge.
  3. **Distribution Channels & Transparent Availability**:
     - Dedicated toggle cards for `Social feeds`, `Search`, `Display network`, and `Video`.
     - Available channels display green "Available" pills; `Video` displays "Coming soon" with disabled state and clear explanation: *"Video transcoding and multi-platform review workflows are currently in private preview."*
     - Validation enforces that at least one available advertising channel is selected.
  4. **Strict Integer Budget Allocation Rebalancing**:
     - Pure rebalancing utilities in `@campaigns/shared` (`rebalanceBudgetAllocation` and `adjustChannelAllocation`) guarantee integer shares that always sum to exactly 100%.
     - Adding or removing channels triggers automatic proportional rebalancing.
     - Steppers (+/- 5%) allow granular adjustments, automatically distributing the difference across remaining channels.
     - Live multi-segment visual distribution bar with channel color coding and total percentage indicator (green for 100%, red otherwise).
  5. **Ad Run Duration & Funding Window**:
     - Ad distribution duration offers segmented presets (7, 14, 30, 60 days) plus a validated custom numeric input (1 to 90 days).
     - Funding window length offers presets (14, 30, 45, 60 days) stored in `reach.fundingWindowDays`.
  6. **Audience Preview Card**:
     - Plain-language narrative generated dynamically via `formatAudienceSummary(reach)`.
     - Reuses placement preview mockups from Step 3 (Social Feed, Vertical Story, Display Banner) rendered with primary ad image, creator name, headline, description, and CTA.
     - Transparency disclaimer: *"Preview only. Final placements are set during review."*
  7. **Dual "You choose" vs. "Finalized during review" Separation**:
     - Distinct section badges separate creator choices (locations, interests, channels, allocation, duration) from reviewer calibration cards (exact publisher placements, bid pacing curves, dayparting, frequency capping, compliance).
     - Prominent `InfoTip` preset (`term="reviewProcess"`).
     - Permanent disclaimer callout: *"Reach depends on ad inventory, prices, targeting and performance. We never guarantee an audience size."*
  8. **Indicative Reach & Funding Goal Isolation**:
     - If `draft.fundingGoalCents` is already set (e.g. from returning from step 5): renders `ReachEstimateBadge` calculated from `reachAtGoal` with standard estimate disclosure.
     - If not set: displays informative card: *"Set your funding goal in the final step to see an estimate."*
     - **Strict invariant**: Step 4 never sets, suggests, or overwrites `fundingGoalCents`.
  9. **Step Validation & Smooth Scrolling**:
     - Step validation enforced via `getStepErrors(draft, 'reach')`. Invalid submissions trigger haptic error, error toast, and smooth scrolling to the first invalid field.
     - Saves draft to store and API on step transition.
- **Rationale**: Prevents unrealistic audience promises, protects ad inventory quality, enforces mathematical integrity on budget allocation, ensures transparency on reviewer-managed parameters, and prevents accidental writes to funding goals prior to Step 5.

---

## 28. Step 5 (Submit), Full Campaign Preview & Confirmation Lifecycle Flow

- **Context**: The final step of campaign creation must unite all previous steps into an auditable summary, provide the sole place where the creator deliberately sets their funding goal, ensure backer protection through plain-language policies, enforce strict creator confirmations, render an authentic campaign preview identical to the published experience, and present an 8-stage post-submission lifecycle timeline with read-only edit guards.
- **Decision**:
  1. **Expandable Summary of Previous Steps with Return Navigation**:
     - Complete review of Step 1 (Basics), Step 2 (Story & Sources), Step 3 (Visuals), Step 4 (Reach), Duration, and Policies rendered in accessible `Accordion` components.
     - Each section provides an "Edit" action navigating with `?returnTo=submit` query parameters; creation layout handles `returnTo === 'submit'` to return creators directly to Step 5 upon tapping Continue or Back.
  2. **Sole Setter Invariant for Funding Goal**:
     - `fundingGoalCents` is entered exclusively on Step 5.
     - Never generated by AI, never prefilled from earlier steps, and protected in `useDraftStore` by a hard `GUARD_VIOLATION` exception unless `{ fromSubmitStep: true }` is passed.
     - Whole-dollar numeric input with quick selection chips ($1,000, $2,500, $5,000, $10,000) for intentional goal setting.
     - Live `reachAtGoal` badge displaying estimated reach range (~low–high people reached) with standard estimate disclaimer.
     - Live 90% direct ad budget / 10% platform fee breakdown with InfoTips (`estimatedReach`, `platformFee`, `useOfFunds`).
  3. **Fees & Funding Policies Clarification**:
     - Clear, plain-language breakdown: 10% platform fee (fact-checking, compliance, infrastructure), 90% ad budget, 25% minimum threshold refund policy (full refunds if <25% funded), unspent ad budget escrow, and "not a donation" statement.
  4. **4 Required Confirmations Gate**:
     - Submission is strictly locked until all 4 creator checkboxes are checked:
       1. Content Rights (ownership / license of all story and image assets).
       2. Community Guidelines (compliance against hate speech, harassment, deceptive claims).
       3. Ad Distribution Only (acknowledgment that contributions strictly purchase ad distribution and never personal donations).
       4. Review & Verification (understanding that moderation team audits citations and may request edits).
     - Inline links open detailed terms and guidelines in a non-disruptive `Sheet` modal.
  5. **"Still Needed" Checklist**:
     - Powered by `getAllStepErrors` across all 5 steps.
     - Lists unresolved issues per step with direct "Fix" jump links.
     - Displays green checkmark banner when all requirements are satisfied.
  6. **Campaign Preview Screen (`preview.tsx`)**:
     - Mirrors the published campaign detail layout (`campaign/[id].tsx`) using draft store data.
     - Hero cover image (16:9), editorial header with CategoryChip, StatusPill (`DRAFT`), DemoDataBadge, creator avatar, and "Draft Preview" publication date.
     - Funding card showing $0 raised (0% progress), live reach estimate badge, and 90/10 ad budget/fee split.
     - `StoryRenderer` with full story blocks and verified sources (`showSources={true}`).
     - Use of Funds and Audience accordions.
     - Top notice banner: *"Preview Mode — Not Published"*.
     - Replaced action bar: NO "Back This Campaign"; clear "Back to Editing" and "Submit for Review" actions.
  7. **Submission Confirmation Screen (`submitted.tsx`)**:
     - Success hero card with checkmark animation and success haptic feedback.
     - 8-stage Status Timeline: `Submitted` (completed) -> `In Review` (current, ~1-2 business days) -> `Approved or changes requested` -> `Available for funding` -> `Funding` -> `Distribution preparation` -> `Promoting` -> `Completed`.
     - Explicit callout explaining that reaching the funding goal does NOT immediately start ads; the Distribution Preparation stage first verifies ad accounts, pixel tracking, and platform compliance.
     - Buttons for "View in Creator Dashboard", disabled "Share" with informative note, and "Create Another Campaign".
  8. **Post-Submission Read-Only Guard**:
     - In `_layout.tsx`, if the campaign status is neither `'DRAFT'` nor `'CHANGES_REQUESTED'`, edit steps automatically redirect to `submitted.tsx`.
- **Rationale**: Guarantees financial isolation for ad budget goals, enforces complete editorial integrity across all steps, prevents unvetted claims from reaching community discovery, educates creators on ad preparation vs. traditional funding, and prevents post-submission state mutation.

---

## 29. Complete Backing Flow ("Core Flow 5") & Itemized Receipt Lifecycle

- **Context**: The Campaign backing flow ("Core Flow 5") represents the financial commitment and public amplification engine of the platform. Backers do not make donations to creators; their contributions strictly purchase digital advertising distribution (Meta, Google Search, YouTube) to spread verified public interest messages. The flow must provide ironclad trust, mathematical accuracy to the penny, strict financial fee transparency, credential isolation (credit card data is never stored anywhere on the device), multi-platform consistency, and permanent receipt tracking for both authenticated users and guests.
- **Decision**:
  1. **Campaign Detail Entry Guard (`campaign/[id].tsx`)**:
     - The "Back This Campaign" button is strictly rendered only when `campaign.status === 'FUNDING'`.
     - In all other lifecycle states (`FUNDING_CLOSED`, `DISTRIBUTION_PREP`, `PROMOTING`, etc.), the button shows appropriate disabled or follow states.
     - Tapping deep-links directly to `/back/${campaign.id}/amount`.
  2. **Backing Session State Machine (`backingStore.ts`)**:
     - Lightweight Zustand store managing `amountDollars`, `amountCents` (default $25 / 2500 cents), `isAnonymous` (default `true`), `publicName`, `guestEmail`, `contributionId`, `guestReceiptToken`, `previousRaisedCents`, and `previousPercentFunded`.
     - Hard Invariant: strictly excludes credit card numbers, CVV, or cardholder credentials. Card data lives purely in ephemeral React state during the simulated payment step.
     - Navigation Persistence: user-entered contribution amount is preserved when navigating backward or forward between steps.
  3. **Step 2 - Choose Amount (`back/[id]/amount.tsx`)**:
     - Mini campaign card showing thumbnail cover, title, creator attribution, current progress ($X raised of $Y goal, percent funded), and miniature progress bar.
     - Goal Remaining notice: computes dollars remaining to reach goal; triggers milestone callout if the contribution will tip the campaign to 100% funded.
     - Presets: dynamically populated from `useEstimateConfig()` ($5, $10, $25, $50, $100) alongside custom dollar input ($1 minimum, numeric keyboard, inline error states).
     - Live Reach Impact: computed via `@campaigns/shared` `quote(amountCents)` and verified against `useQuote` API hook with standard estimate disclaimer and `DemoDataBadge`.
     - "What does this pay for?" `InfoTip`: explains that 100% of net contributions buy advertising impressions and creators never receive cash payouts.
     - Sticky action bar with price summary and continue button.
  4. **Step 3 - Review & Impact (`back/[id]/review.tsx`)**:
     - Itemized transparent breakdown: 90% direct ad budget, 10% platform fee, standard payment processing fee (2.9% + $0.30), and total charged matching backend calculations to the penny.
     - Dual progress bar visualizer: renders current progress and highlights the exact progress gain from this contribution.
     - Privacy toggle: "Show my name publicly" default OFF (anonymous). If enabled, custom display name; if guest, optional receipt email.
     - Escrow and refund terms accordion: highlights all-or-nothing refund policy before goal, and delivery commitment after goal.
     - Prominent non-donation banner: *"Your contribution pays to spread this message. It is not a donation to the cause or the creator."*
     - Mandatory acknowledgement checkbox required before proceeding.
     - Proceeds via `useCreateContribution()` to generate pending contribution and store receipt token.
  5. **Step 4 - Simulated Payment (`back/[id]/pay.tsx`)**:
     - Prominent simulated checkout banner clarifying no real money is charged.
     - Formatted inputs for cardholder name, card number (spaced in 4-digit groups), expiry (MM/YY), and CVC.
     - One-tap magic test chips: Success (`4242`), Card Declined (`0002`), Insufficient Funds (`9995`), and Needs Bank Verification (`3220`).
     - Real-time outcome routing: `SUCCEEDED` routes to confirmation; `FAILED` shows actionable inline card error banner preserving user input; `PENDING` displays bank verification countdown and polls `useContribution` every 2.5 seconds until resolution.
  6. **Step 5 - Confirmation & Outcome (`back/[id]/result.tsx`)**:
     - Succeeded: celebration icon with haptics, receipt number, animated progress bar smoothly transitioning from old to new percentage using `react-native-reanimated`, share sheet with precomposed amplification message, follow campaign toggle, and guest account claim banner.
     - Pending / Failed / Cancelled: calm recovery states with polling, retry, and campaign navigation actions.
  7. **Itemized Official Receipt & History (`profile/payments/[id].tsx`, `profile/payments.tsx`, `profile/backed.tsx`)**:
     - Itemized official receipt displaying formatted timestamp, simulated payment card brand and last 4, exact ad budget allocation, and platform non-donation legal disclosure.
     - Share receipt action generating text summary.
     - Complete financial records in `profile/payments.tsx` integrating authenticated contributions and device-stored guest receipt tokens, with one-tap account claiming.
     - Backed portfolio in `profile/backed.tsx` grouping contributions by campaign with direct links to campaign updates and itemized receipts.
  8. **Guest Receipt Token Persistence (`tokens.ts`)**:
     - Multi-platform keychain storage (`expo-secure-store` with web `localStorage` fallback) storing both array of guest tokens and `campaigns_guest_token_map` mapping contribution ID to token.
     - Injected into API client `x-guest-receipt-token` headers for secure unauthenticated receipt and contribution lookup.
- **Rationale**: Establishes complete trust and radical transparency in message amplification funding, prevents sensitive credential leaks, guarantees reliable multi-platform performance, and provides a polished, delightful backing experience.

---

## 30. Activity Feed Tab, Day Grouping, Multi-Category Filtering, and Notification Preferences Autosave

- **Context**: The Activity feed (`apps/mobile/src/app/(tabs)/activity.tsx`) and Notification Preferences screen (`apps/mobile/src/app/profile/notifications-settings.tsx`) are the core communication surfaces keeping creators and backers informed on campaign progress, moderation reviews, funding milestones, ad delivery performance, and account security. The design must feel live, responsive, accessible, transparent, and uncluttered, adhering strictly to design tokens, type safety, and the platform's non-donation principle.
- **Decision**:
  1. **4 Segmented Tabs**:
     - `All`: Complete chronological feed of user notifications.
     - `Updates`: Filtered to campaign reviews, editorial drafts, promotion start/progress, completed distributions, and final reports.
     - `Funding`: Filtered to funding openings, 25/50/75/100% reach milestones, approaching deadlines, and contribution outcomes.
     - `Following`: Focused exclusively on campaigns the user follows, paired with a dedicated followed campaigns overview.
  2. **Day Grouping (`groupNotificationsByDay`)**:
     - Automatic grouping into `Today`, `Yesterday`, and `Earlier` based on calendar days, with descending chronological ordering.
     - Empty day groups are suppressed automatically so only active time buckets are rendered.
  3. **Accessible Unread Indicators (Never Color Alone)**:
     - Unread notifications feature an 8x8 brand circle dot indicator AND bolder title typography (`PlusJakartaSans-Bold` vs `PlusJakartaSans-Medium`).
     - Screen readers explicitly announce `"Unread: ..."` prefix on items.
  4. **Per-Item & Global Mark-as-Read**:
     - Dedicated checkmark button on each unread card allowing users to mark a single notification read without navigating away.
     - Global "Mark all read" button in the header enabled whenever unread count exceeds zero, triggering light haptics and confirmation toast.
  5. **Dynamic Target Deep-Linking (`getNotificationRoute`)**:
     - Automatically routes users to the relevant destination:
       - Review audits (`CHANGES_REQUESTED`, `CAMPAIGN_APPROVED`, `CAMPAIGN_REJECTED`, `SUBMISSION_RECEIVED`) -> `/campaign/:id` (or `/create/:id/submit`).
       - Final performance reports (`REPORT_READY`, `CAMPAIGN_COMPLETED`) -> `/campaign/:id/report`.
       - Contributions & receipts (`CONTRIBUTION_SUCCEEDED`, `CONTRIBUTION_FAILED`) -> `/profile/payments`.
       - Account security (`SECURITY_ALERT`) -> `/profile/settings`.
       - Status updates & milestones -> `/campaign/:id`.
  6. **Followed Campaigns Carousel & Backend Endpoint**:
     - Introduced `GET /campaigns/following` endpoint in `apps/api` with Prisma relation lookup and `toCardDto` serialization.
     - Horizontal carousel at top of Following tab rendering compact cards with cover image, status pill, percent funded, progress bar, days remaining, and quick unfollow button.
     - Helpful empty state prompt with "Discover Campaigns" button leading to Explore when no campaigns are followed.
  7. **Notification Preferences Screen (`profile/notifications-settings.tsx`)**:
     - Alert Categories: `campaignStatus`, `fundingMilestones`, `contributions`, `campaignUpdates`, and `securityAlerts`.
     - Security alerts permanently locked ON (`disabled={true}`) with explicit "Required" lock badge.
     - Delivery Channels: In-app feed locked ON ("Always Active"), email toggle wired to `emailNotifications` preference, and push notifications clearly badged "Coming soon" with disabled switch to avoid dead controls.
     - Instant autosave on toggle with optimistic UI update, success toast, and automatic rollback on network failure.
     - Accessible from both the Activity header gear icon and Profile -> Notification Preferences.
  8. **Unread Badge & Real-Time Polling**:
     - Bottom tab bar Activity icon renders a dynamic badge displaying unread count (or "99+").
     - Automated background polling every 15s and refresh on screen focus.
  9. **Signed-Out State**:
     - High-clarity welcome card explaining that an account is required to aggregate activity, alongside an explicit reminder that browsing, searching, and discovering campaigns never requires an account.
  10. **Verification & Multiplatform Bundling**:
      - 216 tests passing across monorepo (including 21 new unit tests for grouping, filtering, routing, time formatting, and preferences).
      - Strict TypeScript (0 errors, 0 `any`) and ESLint (0 errors, 0 warnings).
      - Validated production bundle export across Web (5.2MB), iOS (7.2MB), and Android (7.4MB).
- **Rationale**: Keeps backers and creators fully engaged without notification fatigue, guarantees accessibility compliance, ensures zero dead toggles, and provides instant transparency on campaign milestones and ad distribution.

---

### Decision 31: Profile Tab, Creator Dashboard, Campaign Management Hub with Analytics & Final Performance Report Architecture
- **Question**: How should the Profile tab, Creator Dashboard, Campaign Management Hub, and Final Performance Report be structured to guarantee strict reach separation, transparent fund tracking, accessible creator lifecycle actions, and audited public reporting?
- **Decision**:
  1. **Profile Tab (`(tabs)/profile.tsx`)**:
     - **Dynamic Role Chips**: Computes account roles dynamically: `Audience` (always shown), `Creator` (if `myCampaigns.length > 0`), and `Backer` (if `contributions.length > 0`).
     - **Live Portfolio Metrics Strip**: Displays aggregate created, backed, and saved campaign counts with one-tap deep navigation.
     - **Integrated Help & Support Sheet**: Built-in modal sheet containing plain-language guidance for 8 canonical topics: How Campaigns Works, FAQs, Guidelines, Terms, Privacy, About, Partners, and Contact Support. Accessible even when signed out.
     - **7-Tap Easter Egg Gesture**: Tapping the version label 7 times within 3.5 seconds activates reviewer access and navigates directly to `/demo/control`.
     - **Signed-Out State**: Welcoming card emphasizing that browsing, exploring, and backing ad distribution never require an account, while signing in enables creator campaign management and cross-device sync.
  2. **Account Settings (`profile/settings.tsx`)**:
     - **Profile & Display Name**: Name editing with validation, unsaved change tracking, loading states, and backend sync via `PATCH /me`.
     - **Security & Password Modal**: In-app password change modal validating 8+ characters, matching confirmations, and verifying current password via `POST /auth/change-password`.
     - **Demo Account Deletion**: Clear confirmation dialog explaining prototype sandbox behavior (clearing session tokens and signing out to guest mode).
     - **Sign Out Action**: Graceful sign-out dialog with session teardown.
  3. **Creator Dashboard (`creator/dashboard.tsx`)**:
     - **Summary Strip**: Top portfolio summary calculating Total Raised across all campaigns, Active Campaigns count (`FUNDING` + `PROMOTING`), and aggregate supporter count.
     - **6 Filter Tabs with Live Count Badges**: `Drafts`, `Under Review`, `Published/Funding` (grouping `APPROVED`, `FUNDING`, `FUNDING_CLOSED`, `DISTRIBUTION_PREP`), `Promoting`, `Completed`, and `Requires Action`.
     - **Strict Requires Action Isolation**: Isolates campaigns strictly in `CHANGES_REQUESTED` and `REJECTED` states with amber highlight indicators; normal in-flight reviews (`SUBMITTED`) remain in `Under Review`.
     - **Contextual Action Rows**: Campaign cards displaying thumbnail, `StatusPill`, progress bar (% and $ raised / $ goal), days remaining, reach estimate, and contextual action button (`Edit draft` for drafts, `View feedback` for requires action, `Manage & Share` for funding, `View distribution` for promoting, `View report` for completed).
     - **Empty & Loading States**: Filter-specific empty states with quick "Start a Campaign" button, skeleton shimmer lists, error retry, and pull-to-refresh.
  4. **Campaign Management Hub (`creator/[id].tsx`)**:
     - **8-Stage Lifecycle Timeline**: Draft -> Submitted (Review) -> Approved -> Funding -> Funding Closed -> Distribution Prep -> Promoting -> Completed. Special states (`CHANGES_REQUESTED`, `REJECTED`) map to the review stage with status badges.
     - **Moderation Feedback Block**: Visible for `CHANGES_REQUESTED` and `REJECTED`, presenting reviewer notes, specific bulleted changes required, a "Fix and Resubmit" button routing back to creation, and an expandable read-only decision history audit trail.
     - **Controlled Editing Notice**: Explicit notice for published campaigns: *"Changes to your story, sources, ad creative or targeting go back to review before your ads are updated. Posting updates doesn't."* Displays active `pendingRevision` status when revisions are pending reviewer verification.
     - **Campaign Update Composer**: Allows creators to publish updates (title & message) directly to the public campaign page via `usePostUpdate`.
     - **Live Promotion Tracking**: Displays ad budget delivery progress bar and spend metrics when in `PROMOTING`.
  5. **Analytics Block & Strict Reach Isolation**:
     - **Ad Budget Transparency**: 10% platform fee and 90% ad budget allocation clearly broken down alongside budget spent so far.
     - **STRICT REACH SEPARATION (Card 1 vs Card 2)**:
       - **Card 1 (Estimated Reach)**: Pre-distribution statistical projection based on benchmark CPM models, with `InfoTip` explaining calculation mechanics.
       - **Card 2 (Measured Reach)**: Dedicated separate card with `DemoDataBadge` and `InfoTip`. Before active ad running, displays *"Not available yet - ads haven't run"*. When promoting or completed, displays verified deduplicated audience reached.
       - **Strict Rule**: Estimated and measured reach numbers are NEVER summed, averaged, or combined in the same stat card.
     - **Impressions, Clicks & CTR**: Displays total impressions, clicks, and CTR with a plain-language explanation of click-through rate.
     - **Backer Privacy Rule**: Creator analytics show aggregate backer counts, average contribution amount, and duration, but never disclose individual backer names or emails.
  6. **Final Performance Report (`campaign/[id]/report.tsx`)**:
     - **Canonical 8 Sections in Strict Order**:
       1. Funds raised
       2. Platform fee
       3. Ad budget and spend
       4. Impressions
       5. Reach (Estimated projection & Delivered measured reach in separate subcards)
       6. Clicks and CTR
       7. Duration
       8. Notes
     - **Plain-Language Definitions**: Each section includes an explicit plain-language definition ensuring public transparency.
     - **Public Access & Not-Available State**: Accessible to creators, backers, and public for `COMPLETED` campaigns; displays an informative "Report not available yet" state for campaigns in earlier lifecycle stages.
  7. **Verification & Multiplatform Export**:
     - 20 unit tests in `apps/mobile/src/__tests__/creator-analytics-dashboard.test.ts` validating filter categorization, summary calculations, reach isolation rules, and report sequence.
     - Complete monorepo test suite (156 passing tests across api and mobile).
     - Strict TypeScript (0 errors) and ESLint (0 errors, 0 warnings).
     - Verified production Expo export across Web (5.3MB), iOS (7.3MB), and Android (7.5MB).
- **Rationale**: Ensures complete institutional trust, upholds non-negotiable reach isolation principles, safeguards supporter privacy, and provides creators with transparent campaign lifecycle controls.

---

### Decision 32: Reviewer Demo Console, Editorial Inspection Suite & Post-Funding Lifecycle Simulator
- **Question**: How should the reviewer/admin console (`demo/control.tsx`) and full editorial inspection screen (`demo/review/[id].tsx`) be designed to demonstrate review governance, lifecycle advancement rules, strict checklist gating, and audit logging while maintaining role security?
- **Decision**:
  1. **Strict Non-Tab Hidden Route & Role Gating**:
     - Not registered in bottom tabs navigation (`(tabs)/_layout.tsx`). Accessible solely via the 7-tap gesture on the app version in Profile, or direct navigation when authenticated as an administrator.
     - Mobile UI check gates the console to `user?.role === 'ADMIN'`. Non-admin or guest users receive a polite "Reviewer Console Not Available" card with explanations, API endpoint metadata, and a quick-action button to sign in with pre-seeded reviewer demo credentials (`admin@demo.com`).
     - The Express backend (`apps/api/src/routes/admin.routes.ts`) enforces `requireAuth` and `requireRole('ADMIN')` on all queue inspection, review decision, lifecycle advancement, simulation, and reset endpoints.
  2. **Prominent Reviewer Demo Banner**:
     - Every administrative screen (`demo/control.tsx` and `demo/review/[id].tsx`) features a persistent, top-level warning-toned header banner: `ReviewerBanner` (`"INTERNAL - REVIEWER DEMO"`).
  3. **3-Segmented Reviewer Console (`demo/control.tsx`)**:
     - **Review Queue**:
       - Displays campaigns in `SUBMITTED` status and active campaigns with a `PENDING_REVISION`.
       - Each queue card displays title, category, creator, submitted date, funding goal, review type badge (`NEW_SUBMISSION` vs `PENDING_REVISION`), and an "Inspect & Review" button linking to `/demo/review/[id]`.
       - Friendly empty state: *"Nothing waiting for review."*
     - **Lifecycle Controls**:
       - Filters campaigns across post-funding states: `FUNDING`, `FUNDING_CLOSED`, `DISTRIBUTION_PREP`, `PROMOTING`, `COMPLETED`.
       - Policy callout: *"Funding completion does not automatically start advertising. Campaigns advance deliberately through post-funding stages: payment settlement, creative verification, network delivery, and verified reach reporting."*
       - For `FUNDING` campaigns: Helper "Simulate funding to goal" creates a demo contribution for the missing amount, sets status to `FUNDING_CLOSED`, records event log, and notifies creator.
       - For post-funding states (`FUNDING_CLOSED`, `DISTRIBUTION_PREP`, `PROMOTING`): Evaluates prerequisite checks (`getAdvanceChecks`) with visual green checkmarks or red failure crosses and explanatory details. The advance button is disabled until all checks pass, explaining why advancement cannot proceed.
       - For `PROMOTING` & `COMPLETED` campaigns: Helper "Simulate delivery report" generates measured impressions, clicks, spend, and reach, maintaining strict separation from pre-campaign benchmark projections.
       - Quick-access "Audit Log" modal inspecting complete decision and event logs.
     - **Demo Utilities**:
       - "Reset Demo Data" button protected by a confirmation dialog explaining that newly created campaigns and mock contributions will be erased while seed fixtures are restored.
       - System Diagnostics: Displays API base URL, authenticated account, app build (`1.0.0-demo (build 42)`), and PostgreSQL runner port.
  4. **Dedicated Review Inspection Suite (`demo/review/[id].tsx`)**:
     - Comprehensive inspection layout displaying: Story (`StoryRenderer`), Sources (`SourceItem` with verified badges and web browser links), Cover & Ad visual gallery, Ad Copy (headline, description, call-to-action), Audience targeting chips (locations, interests, channels, age range), and Creator-set funding goal with 90% ad budget / 10% fee breakdown.
     - **4-Item Reviewer Checklist (`isChecklistComplete`)**:
       1. Editorial & Truthfulness Standards
       2. External Sources & Evidence
       3. Ad Visuals & Copy Compliance
       4. Audience & Channel Targeting
     - **Mandatory Approval Guard**: The "Approve" button is strictly disabled until all 4 checklist items are confirmed.
     - **3 Governed Actions with Confirmation Modals**:
       - **Approve**: Transitions campaign to `FUNDING` (or applies pending revision), logs event, notifies creator.
       - **Request Changes**: Requires non-empty reviewer notes, sets status to `CHANGES_REQUESTED`, notifies creator with feedback.
       - **Reject**: Requires non-empty justification reason, sets status to `REJECTED`, dispatches notification.
     - **Immutable Audit Trail**: Read-only log of reviewer decisions and lifecycle events.
  5. **Verification & Quality Standards**:
     - 12 unit tests in `apps/mobile/src/__tests__/admin-reviewer-control.test.ts` verifying checklist completion rules, advance checks for all lifecycle phases, and use of funds math.
     - Complete test suite passing across monorepo (248 tests across shared, api, and mobile).
     - Strict TypeScript (0 errors, 0 `any`) and ESLint (0 errors, 0 warnings).
     - Multiplatform production export verified across Web (5.4MB), iOS (7.3MB), and Android (7.5MB).
- **Rationale**: Demonstrates institutional review rigor, enforces prerequisite verification before advertising dollars are committed, guarantees backer transparency, and allows reviewers to simulate the complete post-funding distribution cycle without external ad network dependencies.

---

### Decision 33: Informational, Editorial & Legal Pages Architecture, Live FAQ Search, and Privacy-Safe Support Submission
- **Question**: How should the platform information, editorial guidelines, legal agreements, FAQ search, and contact support pages be architected to ensure total message clarity, rigorous non-donation education, strict backer privacy, and seamless cross-flow navigation?
- **Decision**:
  1. **Canonical Multi-Slug Route (`apps/mobile/src/app/info/[slug].tsx`)**:
     - Single dynamic route supporting 9 canonical slugs: `how-it-works`, `about`, `partners`, `faqs`, `help`, `contact`, `terms`, `privacy`, and `community-guidelines`.
     - **Slug Alias Resolution**: Automatically resolves common variations (`faq` -> `faqs`, `guidelines` -> `community-guidelines`) without broken links or unnecessary redirects.
     - **Graceful 404 Recovery**: Unrecognized slugs render a clean, polite "Page Not Found" screen explaining the unknown route with quick-action links back to How It Works, FAQs, and Home.
     - **Standard Editorial Chrome**: Full-screen layout utilizing `SharedHeader` with back navigation, UI fonts for headers, Newsreader serif body typography for narrative sections, and comfortable reading margins.
  2. **Plain-Language Editorial Content (`apps/mobile/src/data/infoData.ts`)**:
     - **How It Works (`how-it-works`)**:
       - 3-step visual workflow: *Create* (compose narrative & citations) -> *Review* (independent editorial & truthfulness audit) -> *Amplify* (automated ad distribution to target audiences).
       - Plain-language sections detailing what contributions fund, exact 10% fee breakdown, why reach estimates are mathematical projections rather than guarantees, automatic refunds when under 25% at deadline, and the post-funding lifecycle.
       - Highlights non-donation core principle: *"Your contribution pays to spread this message. It is not a donation to the cause or the creator."*
       - Prominent dual CTAs: **Start a Campaign** and **Explore Campaigns**.
     - **About (`about`)**:
       - Transparent overview of the platform mission: democratizing media amplification for grassroots causes, civic campaigns, and investigative journalists.
       - Four core pillars: *Visible Sources*, *Distribution-Only Funds*, *Pre-Publication Review*, and *Default Privacy*.
       - Prototype disclosure highlighting simulated ad placement and mock checkout sandbox.
     - **Distribution Partners (`partners`)**:
       - Programmatic ad network overview explaining real-time bidding across search, social feeds, streaming video, and open display networks.
       - Partner cards explicitly badged `"Demo partner"` (Global Ad Exchange Network, Civic Media Display Registry, Digital Stream & Feed Syndication, Civic Audio & Podcast Network).
       - Prominent non-endorsement disclaimer clarifying no official brand affiliations or endorsements are claimed in the demo.
     - **FAQs (`faqs` / `faq`)**:
       - 14 comprehensive Q&As categorized into *Basics*, *Backing & Payments*, *Creating & Editing*, *Reach & Reports*, and *Privacy & Security*.
       - Live interactive search bar filtering across questions, answers, and category names in real time.
       - Clean empty search state with a one-tap "Clear search" button restoring the full FAQ accordion list.
     - **Help Center (`help`)**:
       - Problem-oriented troubleshooting cards for top user challenges (payment decline, receipt lookup, reviewer revision requests, content flagging, campaign creation).
       - Contextual deep links directly to relevant screens (`/profile/payments`, `/creator/dashboard`, `/info/community-guidelines`, etc.).
       - Primary CTA button routing directly to the Contact Support form.
     - **Contact Support (`contact`)**:
       - Full-featured inquiry form: Full Name, Email Address, Topic Dropdown selector (General, Backing, Creation, Verification, Technical, Refund, Other), and Message text area with live character counter.
       - Client-side validation (`validateContactInput`) and shared schema validation (`ContactInputSchema`).
       - Submits to `POST /contact` via typed API client with loading spinners and haptic feedback.
       - Success state reveals a unique support ticket ID (`TICK-XXXXXXXX-XXXXXX`) with return-home actions.
     - **Terms, Privacy & Community Guidelines (`terms`, `privacy`, `community-guidelines`)**:
       - Readable, structured legal documents clearly labeled with warning banners: `"Prototype Document — Not Legal Advice"`.
       - Emphasizes non-donation legal nature, escrow terms, zero payment card storage, local encrypted guest receipt tokens, and zero tolerance for hate speech, harassment, medical disinformation, and commercial scams.
  3. **Privacy-Safe Backend Contact Endpoint (`apps/api/src/routes/contact.routes.ts`)**:
     - Mounted at `POST /contact` protected by `express-rate-limit` (10 requests per 15 minutes per IP).
     - Validates payload using shared Zod schema `ContactInputSchema`.
     - Generates unique ticket ID and dispatches acknowledgment.
     - **Strict Privacy Logging**: Logs only operational metadata (`ticketId`, `topic`, `messageLength`). Personal identifying data (`name`, `email`, message text) is strictly omitted from server logs to prevent PII exposure.
  4. **Monorepo Cross-Flow Navigation & Linking**:
     - **Profile Tab (`(tabs)/profile.tsx`)**: Help & Support sheet items now provide direct links to full info pages, and a persistent "Open Help & Support Center" action routes to `/info/help`.
     - **Home Tab Footer Strip (`(tabs)/index.tsx`)**: Upgraded informational footer strip with links to How It Works, Partners, About, FAQs, Terms, Privacy, and Community Guidelines.
     - **Campaign Detail (`campaign/[id].tsx`)**: Links in *Use of Funds* to How It Works (`/info/how-it-works`) and Distribution Terms (`/info/terms`); link in *Review & Trust* to Community Guidelines (`/info/community-guidelines`).
     - **Creation Step 5 Submit (`create/[draftId]/submit.tsx`)**: Policy sheet and terms checkboxes include direct links to `/info/terms` and `/info/community-guidelines`.
     - **Backing Review Step (`back/[id]/review.tsx`)**: Non-donation disclosure banner includes direct links to Distribution Terms (`/info/terms`) and Refund Policy (`/info/how-it-works`).
  5. **Verification & Quality Standards**:
     - 21 unit tests in `apps/mobile/src/__tests__/info-pages.test.ts` covering FAQ searching, category grouping, text compliance, slug resolution, alias normalization, and contact validation.
     - 5 automated API tests in `apps/api/src/__tests__/contact.test.ts` verifying ticket creation, rate limits, Zod validation, and asserting zero PII in server logs.
     - Complete monorepo test suite passing (194 tests across api and mobile).
     - Strict TypeScript (0 errors, 0 `any`) and ESLint (0 errors, 0 warnings).
     - Verified multiplatform production Expo export across Web (5.4MB), iOS (7.4MB), and Android (7.6MB).
- **Rationale**: Eliminates confusion surrounding the platform's non-donation message distribution model, offers comprehensive self-service guidance and troubleshooting, guarantees absolute backer data privacy, and fulfills all product transparency commitments.

---

### Decision 34: Comprehensive Mobile App UX & Design Quality Audit, Token Harmonization, Accessibility, and State Matrix Enforcement
- **Question**: How should the application be systematically audited and remediated against the brief's "Design & UX Guidelines" and project rules across all 32 screens, ensuring consistent design tokens, complete lifecycle states, bulletproof keyboard avoidance, and accessible responsiveness without introducing extraneous features?
- **Decision**:
  1. **Full 32-Screen $\times$ 11-State Audit Matrix (`docs/UX_AUDIT.md`)**:
     - Produced an exhaustive audit table evaluating every mobile screen across 11 critical UX dimensions: Skeleton Loading, Empty State, Error with Retry, No-Results State, Success State, Pending State, Validation Feedback, One Clear Primary Action, Safe-Area Handling, Back/Fallback Behavior, and Zero Dead Buttons.
     - Documented initial findings, remediated all failing states, and verified 100% compliance with all 32 screens marked PASS.
  2. **Interactive Voice Intake Completion (`create/voice.tsx`)**:
     - Upgraded the voice intake route from a static placeholder into a full-featured dictation interface.
     - Features an animated soundwave visualizer powered by `react-native-reanimated`, preset prompt inspiration chips ("Save the Community Garden", "Independent River Audit", "Youth Robotics Sponsorship"), editable transcript with live character counter, keyboard avoidance, and a primary CTA that seeds the draft via `useCreateDraft()` and `useAiDraftBasics()`.
  3. **Universal Design Token Enforcement (`tokens.ts`, `tokens.colors`)**:
     - Added missing semantic palette tokens to `apps/mobile/src/theme/tokens.ts` (`black`, `white`, `primary200`-`500`, `emerald50`-`900`, `rose50`-`900`, `amber50`-`900`, `red50`, `red200`, `purple50`, `sky200`, `slate50`-`900`).
     - Replaced inline and ad-hoc hex values across screens (`auth/sign-in.tsx`, `auth/sign-up.tsx`, `back/[id]/amount.tsx`, `back/[id]/pay.tsx`, `back/[id]/result.tsx`, `back/[id]/review.tsx`, `campaign/[id].tsx`, `create/[draftId]/basics.tsx`, `create/[draftId]/reach.tsx`, `create/[draftId]/submit.tsx`, `(tabs)/_layout.tsx`, `(tabs)/explore.tsx`, `(tabs)/index.tsx`, `(tabs)/activity.tsx`, `profile/saved.tsx`).
     - Replaced hardcoded hex strings in `StatusPill.tsx` with semantic border tokens (`emerald100`, `sky200`, `amber200`, `red200`, `primary200`).
  4. **Reduced Motion & Accessibility Compliance**:
     - Integrated `useReducedMotion()` from `react-native-reanimated` in `ProgressBar.tsx`. When system reduced-motion is active, animations snap immediately to value without delay.
     - Touch targets strictly maintain $\ge 48\times 48$ dp sizing or explicit `hitSlop={8}` padding.
     - Enforced `minHeight` instead of rigid fixed `height` on buttons and text fields to prevent clipping under 130% Dynamic Type text scaling.
     - Maintained $\ge 4.5:1$ contrast across all text and icon pairings.
  5. **Keyboard Avoidance Across Form Surfaces**:
     - Wrapped input flows in `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`) and `keyboardShouldPersistTaps="handled"` on `auth/sign-in.tsx`, `auth/sign-up.tsx`, `back/[id]/amount.tsx`, `back/[id]/pay.tsx`, `create/[draftId]/basics.tsx`, and `profile/settings.tsx`.
     - Hardened `draftStore.updateDraftField` against race conditions when child components mount before store hydration.
  6. **Media Performance & Uniform Caching**:
     - Converted legacy React Native `Image` tags across saved campaigns, activity carousels, and reach channel previews to `expo-image` with content caching and 200ms crossfade transitions.
  7. **Core Product Transparency Assertions**:
     - Verified all 4 core transparency principles across the app:
       1. *"Not a donation"*: Visible on Home disclaimer chip, Campaign Detail Use of Funds, Backing Review card, Receipt, and Submit Step 5.
       2. *"Estimate, not a guarantee"*: Present on all reach projections including Final Report Subcard 5A.
       3. *Sources visible*: Primary citations displayed prominently with active external links on campaign detail.
       4. *Default backer privacy*: Backer contributions marked private by default.
  8. **Headless 360×640 Baseline Verification & Screenshots**:
     - Captured and embedded headless 360×640 screenshots into the audit report for: Home (`/(tabs)`), Campaign Detail (`/campaign/:id`), Amount (`/back/:id/amount`), Review (`/back/:id/review`), and Submit (`/create/:id/submit`).
  9. **Verification Suite**:
     - Monorepo automated test suite: 274 tests passing across 20 test files in `@campaigns/shared`, `mobile`, and `api` (100% pass rate).
     - Clean `npm run typecheck` across all workspaces with zero TypeScript errors.
     - Clean `npm run lint` with zero ESLint warnings and zero errors.
     - Clean production web build via `npx expo export -p web`.
- **Rationale**: Eliminates design inconsistencies, guarantees bulletproof UX across all possible edge states, ensures full accessibility and keyboard ergonomics, and validates that every screen adheres strictly to the product architecture and brief guidelines.

---

### Decision 35: Comprehensive Quality Assurance, Test Automation, Defect Resolution, and Verification Protocol
- **Question**: How should the application be systematically tested, hardened, and verified across both backend and frontend layers to guarantee zero feature drift, verify all security and invariant rules, provide automated test coverage for critical paths, and document a repeatable manual QA runbook?
- **Decision**:
  1. **Strict Funding Goal Initialization Guard**:
     - Updated `createDraft` in `apps/api/src/services/creator.service.ts` to initialize `fundingGoalCents: 0` (previously defaulted to 50000).
     - Enforces the architectural rule that *"submit fails without a creator-set funding goal, and funding goal entered ONLY on step 5"*. Newly spawned drafts require the creator to explicitly select or enter their goal on Step 5.
  2. **API Test Suite Expansion (`apps/api/src/__tests__`)**:
     - *Authentication (`auth.test.ts`)*: Tested expired JWT access tokens (`expiresIn: -10`) returning 401 Unauthorized with `'Invalid or expired authentication token'`; tested expired refresh tokens returning 401; tested non-existent email sign-in returning 401 `INVALID_CREDENTIALS`.
     - *Public Visibility (`campaigns.test.ts`)*: Explicitly verified that campaigns in `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, and `REJECTED` never appear in the public campaign list, return `{ items: [], total: 0 }` when requested anonymously via `?status=...`, and return `404 Not Found` when requested by ID by unauthenticated users or non-owner backers.
     - *Search, Filters & Sort Orders (`campaigns.test.ts`)*: Tested every sort (`trending`, `newest`, `most_funded`, `ending_soon`, `closest_to_goal`), every filter (`category`, `creatorType`, `progressRange`, `goalRange`, `minGoal`/`maxGoal`, `status`), and pagination metadata.
     - *Draft Autosave & Submission (`creator.test.ts`)*: Tested draft deep-merging of JSON fields, 403 ownership protection against cross-user edits, 400 rejection of forbidden fields (`status`, `raisedCents`), step-level validation failure when funding goal is unassigned, and successful 5-step submission transitioning to `SUBMITTED`.
     - *Uploads API (`creator.test.ts`)*: Tested `POST /api/v1/uploads` authentication requirement (401), non-image mime type rejection (400), 5MB file size limit rejection (400), and valid image upload returning URL and metadata (201).
     - *AI Route Guardrails (`ai.test.ts`)*: Asserted that `/ai/draft-basics`, `/ai/draft-story`, and `/ai/ad-copy` never accept, write, or return `fundingGoalCents`.
     - *Lifecycle & Transitions (`lifecycle-admin.test.ts`)*: Tested invalid transitions (e.g., advancing from DRAFT or FUNDING returns 400); verified funding completion transitions to `FUNDING_CLOSED` and explicitly NOT `PROMOTING`; verified material edits on active campaigns divert to `pendingRevision`; tested creator updates without triggering re-review; verified role-based access control blocks non-admins (403) and unauthenticated users (401) on all 8 admin endpoints.
     - *Contributions & Settlements (`contributions.test.ts`)*: Tested all 4 magic test cards (`4242...` success, `...0002` declined, `...9995` insufficient funds, `...3220` verification pending); tested idempotent payment avoiding double-settlement; tested milestone notifications (25%, 50%, 75%, 100%) firing exactly once with deduplication; asserted financial invariant `campaign.raisedCents == sum(SUCCEEDED contributions)`; verified receipt privacy denying non-owner access (403).
  3. **Mobile Logic & Unit Tests (`apps/mobile/src/__tests__/pure-logic.test.ts`)**:
     - *Reach & Quote Math*: Verified preset and custom contribution quotes match shared formulas and financial splits (10% platform fee, 90% ad budget, 2.9% + $0.30 processing fee); verified `reachAtGoal` and UI display string formatting.
     - *StepIndicator States*: Tested 5-step sequence, active (`isCurrent`), completed (`isDone`), and upcoming states; verified accessibility labels and navigation guard (only completed steps are tappable).
     - *Channel Allocation Rebalancing*: Tested `rebalanceBudgetAllocation` for 1, 2, 3, and 4 channels, custom weights, and proportional adjustments ensuring sum strictly equals 100%.
     - *Step Errors*: Tested `getStepErrors` across all 5 steps validating character limits, required blocks, sources, cover image, ad copy, targeting, funding goal, and rules acceptance.
     - *Notification Grouping & Unread Count*: Tested `groupNotificationsByDay` (Today, Yesterday, Earlier), unread count calculation (`readAt === null`), and tab filtering (`All`, `Updates`, `Funding`).
  4. **Manual QA Script (`docs/QA.md`)**:
     - Authored an exhaustive, numbered manual QA runbook covering end-to-end Backer, Creator, and Reviewer journeys, alongside edge case stress tests: offline autosave resilience, double-tap protection, back navigation amount retention, expired session recovery, slow/down backend resilience, content boundary stress testing (60-char titles, 15+ story blocks), small screen (360x640) safe areas, and 130% Dynamic Type text scaling.
  5. **Verification Suite**:
     - Full monorepo test suite: **315 tests passing across 24 test files** (80 in `@campaigns/shared`, 121 in `apps/mobile`, 114 in `apps/api`) with 100% pass rate.
     - Monorepo typecheck: 0 errors across all workspaces.
     - Monorepo lint: 0 warnings and 0 errors across all workspaces.
- **Rationale**: Guarantees zero regression and feature purity while leaving behind reproducible, automated verification suites and a complete manual QA checklist.

---

### Decision 36: Production Deployment Architecture, Bundling, Storage, and Resilience
- **Question**: How should `apps/api` and the full-stack infrastructure be prepared, bundled, hardened, containerized, documented, and verified for reliable production deployment on Render and Docker?
- **Decision**:
  1. **Self-Contained Production Bundling (`build.mjs`)**:
     - Configured `esbuild` to compile `apps/api/src/index.ts` to `apps/api/dist/index.js` targeting Node 20/22 CommonJS.
     - Inlined `@campaigns/shared` source directly into the bundle while externalizing standard package dependencies (`@prisma/client`, `bcryptjs`, `express`, etc.).
     - Solves monorepo symlink and uncompiled TypeScript resolution issues in production containers, enabling standalone execution via `npm start` (`node dist/index.js`) without workspace link dependencies.
  2. **Security & Production Hardening**:
     - Configured `trust proxy` (level 1) for accurate client IP identification and rate limiting behind reverse proxies (Render, Cloudflare).
     - Configured production CORS with `ALLOWED_ORIGINS` environment variable, allowing originless requests (mobile applications, curl, server-to-server) while disallowing wildcards (`*`) with credentials in production.
     - Sanitized centralized error handling (`error.middleware.ts`): internal 500 error messages and stack traces are never exposed in production (`NODE_ENV === 'production'`).
     - Maintained Helmet security headers and rate limiting (500 requests per 15 minutes).
  3. **Fail-Fast Environment Validation (`apps/api/src/config/env.ts`)**:
     - Validates presence of `DATABASE_URL` and `JWT_SECRET` at server boot.
     - Prints a prominent, clear diagnostic error banner and exits with status 1 if required environment variables are absent.
     - Automatically loads local `.env` via native `process.loadEnvFile()` in development and test environments while respecting cloud-injected environment variables.
  4. **Dual-Driver Storage Service (`storage.service.ts`)**:
     - Integrated Supabase Storage support using `@supabase/supabase-js`.
     - When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided, uploads campaign media directly to Supabase Storage bucket (`campaign-uploads`) and returns public CDN URLs.
     - When unconfigured, transparently falls back to local disk storage (`/uploads`), ensuring offline tests and local development function without requiring cloud credentials.
  5. **Resilient Background Worker (`jobs.service.ts`)**:
     - Runs as an embedded idempotent worker inside the Express process, avoiding the cost and complexity of a separate worker service on Render free tier.
     - **Boot Recovery Sweep**: Immediately scans and settles any dangling `PENDING` contributions older than 15 seconds on startup.
     - **Periodic Payment Sweep**: Runs every 30 seconds to settle pending card payments.
     - **Deadline Reminders**: Runs every 15 minutes to inspect active campaigns in `FUNDING` status ending within 24 hours, idempotently dispatching `DEADLINE_APPROACHING` notifications and audit events without duplicate delivery.
  6. **Safe Production Database Seeding (`prisma/seed.ts`)**:
     - Added `npm run db:seed:prod` (`tsx prisma/seed.ts --prod`).
     - Automatically detects existing campaigns and users in the database; refuses to overwrite or delete real records unless `--force` is explicitly provided.
     - Integrated in-process `seedDatabase({ force: true })` into `admin.service.ts`, ensuring the "Reset demo data" admin action works reliably in production without shelling out to external processes.
  7. **Multi-Stage Dockerfile & Render Blueprint**:
     - Authored `apps/api/Dockerfile`: multi-stage Alpine build with `node:22-alpine`, non-root user `node`, health check probe (`/health`), and dumb-init signal forwarding.
     - Authored `render.yaml`: Blueprint declaring the `campaigns-api` web service with build command (`npm install && npm run build --workspace=apps/api && npm run db:migrate:prod --workspace=apps/api`), start command (`npm run start --workspace=apps/api`), health check (`/health`), and complete environment variable definitions.
  8. **Mobile Client Cold-Start UX & Timeout Resilience**:
     - Extended mobile API client default timeout to 60 seconds (`DEFAULT_TIMEOUT_MS = 60000`) to tolerate Render free-tier cold starts (30–60s).
     - Added `ServerWakeUpBanner.tsx` in `apps/mobile/src/components/layout/`: listens to `apiClient.onServerWakeUp` and renders an informative non-blocking notice after 8 seconds of latency while skeletons remain visible.
     - Updated `apps/mobile/.env.example` and created `apps/mobile/eas.json` with build profiles pointing `EXPO_PUBLIC_API_URL` to production.
  9. **Smoke Test Automation (`scripts/smoke.sh`)**:
     - Created executable bash smoke test suite verifying `/health`, `/api/v1/config/estimates`, `/api/v1/campaigns`, auth sign-in, campaign detail by ID, and contribution quote calculations.
- **Rationale**: Delivers a production-ready, secure, resilient backend deployment on Render with zero secret leakage, safe database migrations and seeding, automatic upload persistence, and graceful mobile cold-start UX.
