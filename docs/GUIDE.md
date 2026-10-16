# Campaign Amplification Platform — Antigravity Build Guide

> Save this file in your repo as `docs/GUIDE.md` and save the hackathon brief as `docs/BRIEF.md`. Every prompt in Part B tells Antigravity to read them first.

**Contents**
- Part A — Understanding & decisions (sections 1–12)
- Part B — Prompts for Antigravity, one by one (P0–P27)
- Part C — What to feed Antigravity for maximum efficiency

---

# PART A — UNDERSTANDING & DECISIONS

## 1. What the product actually is (plain English)

**Think of it as crowdfunding for ad space, not crowdfunding for a cause.**

1. A **Creator** writes a message (a "campaign"): a short editorial story with sources, plus ad creatives.
2. A **Reviewer** (admin) checks the story, sources, visuals and targeting.
3. Once approved, **Backers** chip in money. That money pays for *advertising distribution* of the message to people outside the creator's own followers.
4. Money does **not** go to the creator or their cause. It goes (minus fees) into an ad budget the platform manages.
5. After promotion, everyone can see a **report**: spend, impressions, reach, clicks.

> **The one sentence the whole UI must keep repeating:** *"Your contribution pays to spread this message. It is not a donation to the cause or the creator."*

**UX Test from the brief (your success criterion):** a first-time user can explain what the platform does, what their money pays for, and what happens next, without help.

### Roles
| Role | What they do | Needs account? |
|---|---|---|
| Audience | Browse, read stories, inspect sources, share, give feedback (No / Somewhat / Yes) | **No** |
| Creator | Build campaign (manual or voice/AI), save drafts, submit, monitor, see reports | Yes |
| Backer | Contribute toward promotion; guest checkout allowed; public name private by default | Optional (guest OK) |
| Admin/Reviewer | Approve / request changes / reject, authorize distribution | **Not required** — build only a tiny demo version |

One account can be all three.

### Campaign lifecycle (state machine — implement on backend, enforce transitions)
```
DRAFT → SUBMITTED → (CHANGES_REQUESTED → SUBMITTED) | APPROVED
APPROVED → FUNDING  (a.k.a. "Available for Funding")
FUNDING → FUNDING_CLOSED   (goal reached OR period ended)
FUNDING_CLOSED → DISTRIBUTION_PREP → PROMOTING → COMPLETED
Exceptional: REJECTED, CANCELLED, REFUND_PENDING, FAILED
```
Rules:
- Funding complete **does not** auto-launch ads. Promotion needs approval + payment settled + budget + ad setup.
- Nothing is public or backable before APPROVED.
- Editing published content = "material change" → goes back to review.

### Money model (all numbers are demo assumptions in ONE config file)
Backer pays `contribution + processing fee`. From the contribution, a platform fee is deducted; the rest is ad budget.

| Setting | Demo value |
|---|---|
| Platform fee | 10% of contribution |
| Processing fee (shown to backer) | 2.9% + $0.30 on top |
| Ad budget share | 90% of contribution |
| Assumed CPM | $6.00 |
| Assumed avg frequency | 2.2 impressions per person |
| Reach per $1 contributed | `0.9 × (1000/6) / 2.2 ≈ 68 people` |
| Display range | ±30% → "~48–89 people per $1" |
| Min to run if period ends underfunded | 25% of goal, else refund |

Formulas (put in `packages/shared/src/reach.ts`, used by BOTH app and API):
```
adBudget       = contribution * (1 - platformFeePct)
impressions    = adBudget / cpm * 1000
estimatedReach = impressions / avgFrequency
low = reach * 0.7 ; high = reach * 1.3
```
Always label: **"Estimate based on demo assumptions. Not a guarantee."** Never show a fixed audience number as a promise.

---

## 2. Reference website findings

`https://campaign-one-pearl.vercel.app/` is a JavaScript single-page app. Fetching it returns only metadata:
- Name: **Campaigns**; tagline: *"Community-funded ad campaigns"*
- Description: *"Create your own trustworthy ad campaign. Community-funded advocacy, fact-checked and amplified to the audiences that matter."*
- Theme colour: **#4f46e5 (indigo)** → use as primary brand colour.

**Action for you (5 minutes, high value):** open the site on your laptop, and take screenshots of: home hero, campaign card, campaign detail, create flow steps, back/checkout, dashboard. Put them in `docs/reference/`. Antigravity can read images, which beats any text description. Remember the brief says *don't copy desktop screen-for-screen*; translate to mobile.

---

## 3. Tech decisions (final — don't let the agent re-debate these)

| Layer | Choice | Why |
|---|---|---|
| Mobile | **Expo (latest stable SDK) + React Native + TypeScript** | Required |
| Navigation | **Expo Router** (file-based) + bottom tabs | Stable nav, deep links, agent-friendly |
| Styling | **Plain `StyleSheet` + design tokens** (no NativeWind) | Fewer config failures, consistent look |
| Animation | `react-native-reanimated` + `expo-haptics` | Subtle, purposeful feedback |
| Images | `expo-image`, `expo-image-picker`, `expo-document-picker` | Caching, blurhash, uploads |
| Icons | `lucide-react-native` + `react-native-svg` | Consistent set |
| Fonts | `@expo-google-fonts/plus-jakarta-sans` (UI) + `@expo-google-fonts/newsreader` (story text) | Premium, editorial feel |
| Server state | **TanStack Query** | Loading/error/cache states for free |
| Client state | **Zustand** (+ AsyncStorage persist) | Draft + auth + prefs |
| Forms | **react-hook-form + zod** (schemas shared with backend) | One validation source |
| Backend | **Node.js + Express + TypeScript** | Simple, widely known by agents |
| ORM / DB | **Prisma + PostgreSQL (Supabase)** | Relational lifecycle data |
| Auth | Email+password, JWT access/refresh; guest = no token | Browse w/o account |
| Validation | zod on server for every route | Required by brief |
| AI | Gemini (or any LLM) via **backend** `/ai/*` endpoints + deterministic **demo mode fallback** | Never expose keys in app |
| Voice | `expo-speech-recognition` (needs dev/EAS build) + **scripted demo-mode fallback** | Works even if mic/AI fails |
| Payments | **Simulated checkout** (clearly labelled) with magic card numbers | Brief allows dummy provider |
| Images storage | Supabase Storage (or local `/uploads` served by API for the prototype) | Simple |
| Monorepo | npm workspaces: `apps/mobile`, `apps/api`, `packages/shared` | Shared types and zod |
| Builds | **EAS Build** (APK + iOS) and **EAS Submit** (TestFlight) | Standard Expo path |
| Backend hosting | Render / Railway / Fly (free tier) | Needs public URL for APK |

---

## 4. Navigation map (Expo Router file tree)

```
apps/mobile/app/
  _layout.tsx                      # fonts, providers, splash
  (tabs)/
    _layout.tsx                    # 5-tab bar: Home Explore Create Activity Profile
    index.tsx                      # Home
    explore.tsx
    create.tsx                     # entry: Manual / Voice / Resume drafts
    activity.tsx
    profile.tsx
  campaign/[id].tsx                # detail (story, sources, funds, trust)
  campaign/[id]/report.tsx         # final report
  back/[id]/amount.tsx             # step 2 choose contribution (step 1 = detail page)
  back/[id]/review.tsx             # step 3
  back/[id]/pay.tsx                # step 4 simulated checkout
  back/[id]/result.tsx             # step 5 confirmation / pending / failed
  create/voice.tsx
  create/[draftId]/basics.tsx
  create/[draftId]/story.tsx
  create/[draftId]/visuals.tsx
  create/[draftId]/reach.tsx
  create/[draftId]/submit.tsx
  create/[draftId]/preview.tsx
  create/[draftId]/submitted.tsx   # confirmation + status timeline
  auth/sign-in.tsx  auth/sign-up.tsx
  creator/dashboard.tsx            # tabs: Drafts, Under Review, Funding, Promoting, Completed, Requires Action
  creator/[id].tsx                 # manage one campaign + analytics
  profile/backed.tsx saved.tsx payments.tsx payments/[id].tsx(receipt) settings.tsx notifications-settings.tsx
  info/[slug].tsx                  # partners, about, how-it-works, faq, help, contact, terms, privacy, guidelines
  demo/control.tsx                 # hidden reviewer/lifecycle control panel (demo only)
```
Rules: the tab bar is always visible on tab screens; create-flow and checkout are full-screen stacks with a consistent header (back + step indicator) and a sticky bottom action bar. No dead ends; every screen has a clear back route.

---

## 5. Design system (give this verbatim to the agent)

**Feel:** premium, calm, credible, editorial. Lots of whitespace. One primary action per screen.

**Colours**
| Token | Hex | Use |
|---|---|---|
| primary-600 | `#4F46E5` | Primary buttons, links, progress |
| primary-700 | `#4338CA` | Pressed state |
| primary-50 | `#EEF2FF` | Tinted backgrounds, chips |
| ink-900 | `#0F172A` | Headings |
| ink-700 | `#334155` | Body |
| ink-500 | `#64748B` | Secondary text |
| line | `#E2E8F0` | Borders/dividers |
| bg | `#F8FAFC` | App background |
| surface | `#FFFFFF` | Cards |
| success | `#16A34A` / bg `#DCFCE7` | Funded, approved |
| warning | `#D97706` / bg `#FEF3C7` | Under review, needs action |
| danger | `#DC2626` / bg `#FEE2E2` | Errors, rejected |
| info | `#0284C7` / bg `#E0F2FE` | Estimates, hints |

All text ≥ 4.5:1 contrast. Status is never colour-only (icon + label).

**Typography:** UI = Plus Jakarta Sans (400/500/600/700). Story body = Newsreader 18/28, max ~60 characters per line feel via side padding.
Scale: Display 32/38 · H1 26/32 · H2 20/26 · H3 17/24 · Body 16/24 · Small 14/20 · Caption 12/16.

**Spacing:** 4-pt scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen side padding 20.
**Radius:** 12 inputs, 16 cards, 24 hero/sheets, 999 pills. **Shadow:** one soft card shadow, one elevated (sticky bars).
**Touch targets:** ≥ 48×48. Primary buttons 52 high, full width in sticky bar.
**Motion:** 150–250 ms ease-out; press scale 0.98; progress bars animate on mount; haptics on success. Respect "reduce motion".

**Reusable components (build once, reuse everywhere):**
`Button` (primary/secondary/ghost/danger, loading) · `Card` · `CampaignCard` (+ compact + featured variants) · `ProgressBar` · `StatusPill` · `CategoryChip` · `Skeleton` · `EmptyState` · `ErrorState` · `Toast` · `Accordion` · `InfoTip` (bottom-sheet explainer for unfamiliar terms) · `StepIndicator` (5 steps) · `StickyActionBar` · `Field` / `TextField` / `TextArea` (label, helper, counter, error) · `Sheet` · `Segmented` · `Avatar` · `Stat` · `SourceItem` · `Timeline` · `ReachEstimateBadge` · `DemoDataBadge`.

**Campaign card content (exact):** cover image, category chip, title (2 lines), creator name (+ type icon), 2-line summary, raised / goal, progress bar with %, "Est. reach at goal: ~X–Y people", primary button **Back This Campaign**.

**Contextual explainers (`InfoTip`)** for: Estimated reach, Platform fee, Use of funds, Review process, CPM/impressions, Funding vs promotion.

---

## 6. Data model (Prisma tables)

- `User` (id, email, passwordHash, name, avatarUrl, role[USER|ADMIN], notificationPrefs JSON, createdAt)
- `Draft` (id, userId, data JSON, step, updatedAt) — or use `Campaign` with status DRAFT; pick **one**: use `Campaign` with `DRAFT` status + `content JSON`.
- `Campaign` (id, creatorId, status, title, category, creatorName, creatorType, summary, coverUrl, story JSON[blocks], sources JSON[], adCreative JSON{images,headline,description,cta}, reach JSON{locations,interests,channels,budgetAllocation,durationDays}, fundingGoalCents, raisedCents, startsAt, endsAt, submittedAt, publishedAt, reviewNotes, version)
- `Contribution` (id, campaignId, userId?, guestEmail?, amountCents, feeCents, totalCents, status[PENDING|SUCCEEDED|FAILED|CANCELLED|REJECTED|REFUNDED], publicName?, isAnonymous default true, receiptNo, createdAt)
- `ReviewDecision` (id, campaignId, reviewerId, decision, notes, createdAt) — audit trail
- `CampaignEvent` (id, campaignId, type, payload JSON, createdAt) — audit + updates feed
- `CampaignUpdate` (id, campaignId, title, body, createdAt)
- `Notification` (id, userId, type, title, body, campaignId?, readAt?, createdAt)
- `Follow`, `SavedCampaign` (userId, campaignId)
- `Feedback` (campaignId, userId?, visualsEncouraged: NO|SOMEWHAT|YES, messageChanged: NO|SOMEWHAT|YES)
- `Report` (campaignId, fundsRaisedCents, adSpendCents, impressions, reach, reachType[ESTIMATED|MEASURED], clicks, ctr, startedAt, endedAt, isDemo)

Story block types (JSON): `heading | paragraph | image{url,caption,credit} | stat{value,label,source} | quote | actions{items[]}`.
Source: `{title, url, publisher?, note?}`.

---

## 7. API contract (REST, `/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/sign-up`, `/auth/sign-in`, `/auth/refresh`, `GET /me` |
| Public campaigns | `GET /campaigns?search=&category=&sort=trending\|newest\|most_funded\|ending_soon\|closest_to_goal&status=&minGoal=&maxGoal=&page=` · `GET /campaigns/featured` · `GET /campaigns/:id` · `POST /campaigns/:id/feedback` · `POST /campaigns/:id/save` |
| Config | `GET /config/estimates` (fees, CPM, frequency) |
| Creator | `POST /campaigns` (create draft) · `PATCH /campaigns/:id/draft` (autosave, partial) · `POST /campaigns/:id/submit` (full validation) · `GET /me/campaigns?status=` · `GET /me/campaigns/:id/analytics` |
| Backing | `POST /campaigns/:id/quote` (amount → fees, total, reach) · `POST /contributions` (creates PENDING) · `POST /contributions/:id/pay` (simulated provider) · `GET /contributions/:id` · `GET /me/contributions` · `GET /contributions/:id/receipt` |
| Activity | `GET /me/notifications` · `POST /me/notifications/read` · `PATCH /me/notification-prefs` · `POST /campaigns/:id/follow` |
| Reports | `GET /campaigns/:id/report` |
| AI | `POST /ai/draft-basics` · `/ai/draft-story` · `/ai/voice-structure` · `/ai/ad-copy` · `/ai/headline` (all with demo fallback) |
| Admin (demo) | `GET /admin/queue` · `POST /admin/campaigns/:id/decision {approve\|changes\|reject, notes}` · `POST /admin/campaigns/:id/advance` · `POST /admin/campaigns/:id/simulate-report` |

Backend must: validate with zod, check JWT + role, enforce state transitions, never return other users' contribution/payment details, never include raw backer identity on public endpoints, return consistent error shape `{error:{code,message,fields?}}`.

---

## 8. Seed data (make it credible and consistent everywhere)

Create **10–12 campaigns** across all 10 categories and creator types (individual, nonprofit, business, community group, creator/influencer). Mix of statuses so every screen has content: 6 FUNDING (varied 8%–97%), 1 PROMOTING, 1 COMPLETED (with report), 1 near deadline, plus demo-user drafts / under-review / changes-requested campaigns. Example set:

1. *Rooftop Gardens Can Cool Our Cities* — Environment — Green Roofs Collective (nonprofit) — goal $4,000
2. *What 7 Hours of Sleep Really Does* — Health — Dr. Meera Iyer (individual) — $2,500
3. *Why Open Data Makes Better Budgets* — Public Policy — Civic Ledger (nonprofit) — $6,000
4. *The Quiet Science of Soil Microbes* — Science — Field Notes Lab (creator) — $3,000
5. *Free After-School Coding for Every Kid* — Education — Lantern Learning (community group) — $5,000
6. *Small Shops, Big Shifts: Local Spending* — Economic Policy — Main Street Alliance — $7,500
7. *Block Party for a Safer Street* — Community — Maple Ave Neighbors — $1,500
8. *Lost Looms: Saving Handwoven Textiles* — Arts & Culture — Threadline Studio — $2,000
9. *Fair Pricing for Independent Bookstores* — Business — Pagewise Books — $3,500
10. *A Wildcard Idea Worth Spreading* — Other — individual — $1,000

Each: 6–10 story blocks (headings, paragraphs, 1–2 images with captions + credits, a stat or two), 2–4 real-looking sources (use plausible placeholders, mark `isDemo`), ad creative, reach settings, raised amount consistent with contributions rows and updates. Mark all figures with `DemoDataBadge` ("Demo data").
Images: use license-safe Unsplash/Pexels URLs (hotlink in seed) or generated placeholders; keep local fallbacks.

---

## 9. Priority & scope (what to cut if time runs out)

**Must (the "one connected journey" judges will watch):**
Home → Explore (working search/filter/sort) → Detail → Back (6 steps with fees, reach, simulated payment, confirmation, receipt) → Create (all 5 steps, autosave, resume, preview, submit, timeline) → Creator dashboard (tabs) → Activity → Profile.

**Should:** Voice/AI with demo-mode fallback, report screen, feedback widget, secondary info pages, demo control panel to advance lifecycle.

**Nice:** Comments, push notifications, dark mode, skeleton shimmer polish, haptics, share cards.

**Never:** buttons that do nothing. If a feature isn't built, hide it or label "Coming soon" with a purpose.

---

## 10. Delivery: APK (required) & TestFlight (important)

**APK — straightforward**
1. `npm i -g eas-cli` → `eas login` → `eas build:configure`.
2. `eas.json`:
```json
{
  "build": {
    "preview": { "distribution": "internal", "android": { "buildType": "apk" },
                 "env": { "EXPO_PUBLIC_API_URL": "https://YOUR-API.onrender.com/api/v1" } },
    "production": { "autoIncrement": true,
                 "env": { "EXPO_PUBLIC_API_URL": "https://YOUR-API.onrender.com/api/v1" } }
  },
  "submit": { "production": { "ios": { "ascAppId": "FILL_AFTER_CREATING_APP" } } }
}
```
3. `eas build -p android --profile preview` → download the `.apk`, install on a real phone, test **before** recording the demo.
4. The backend **must be publicly deployed first** (the APK cannot reach `localhost`).

**TestFlight — start this on day 1, it has external dependencies**
- Needs a paid **Apple Developer Program** account (~US$99/yr). Enrollment can take from hours to a couple of days. **Start now.** If you cannot enrol, ask the organisers whether they can add you to their team (the brief says the team may cooperate on this).
- Steps: set unique `ios.bundleIdentifier` in `app.json` (e.g. `com.yourname.campaignamp`) → create the app in **App Store Connect** → `eas build -p ios --profile production` (EAS manages certificates; log in with Apple ID when prompted) → `eas submit -p ios --latest` → wait for processing (10–30 min) → add testers under **TestFlight** (internal testers need no review; external testers need a short Beta App Review) → share the invite/public link.
- Fill the required export-compliance answers (set `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` in `app.json` to skip the prompt if you only use standard HTTPS).
- Include permission strings (`NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`, `NSPhotoLibraryUsageDescription`) or the build/review will fail.
- Avoid libraries that are not supported by Expo's managed workflow/config plugins. Test on iOS early via a development build.

**Render free-tier warning:** the backend sleeps and the first request can take 30–60 s. Before the demo, hit `/health` to wake it, and show skeleton loaders (good UX anyway).

---

## 11. Quality checklist (judges' rubric, mapped)

| Criterion | What to show |
|---|---|
| UI/UX | Consistent tokens, hierarchy, sticky action bars, InfoTips explaining reach/fees/use of funds |
| Product thinking | "Not a donation" copy on home, detail, review step, receipt; estimate labels; sources visible to audience |
| Code quality | Monorepo, shared zod, reusable components, typed API client |
| End-to-end | Create → submit → (demo admin) approve → back → progress → report |
| State handling | Loading, empty, error, no-results, pending, failed, success, validation in every flow |
| Security/privacy | Server validation, JWT roles, anonymous backers by default, no payment details exposed |

---

## 12. Copy to reuse (consistency of voice)

- Hero: **"Help important messages travel further."** Sub: *"Community-funded reach. Back a campaign and your contribution pays to show its message to people beyond the creator's own network."*
- How it works: **Create** — "Creators write a clear, sourced message." · **Review** — "We check content, sources and targeting before anything goes live." · **Amplify** — "Backers pool money to pay for ads that spread the message."
- Disclaimer chip: **"Contributions fund ad distribution, not the cause or creator."**
- Estimate label: **"Estimated reach · based on demo assumptions · not a guarantee"**


---

# PART B — PROMPTS FOR ANTIGRAVITY (run in order)

## How to run these
1. **One prompt = one session/task.** Wait for it to finish, run the app, check the acceptance criteria, **git commit**, then move on.
2. Use **Planning mode** for P0–P5, P10, P17 (architecture-heavy) and **Fast mode** for small UI tweaks and fixes. Read the agent's plan/artifacts before approving.
3. Keep `docs/BRIEF.md`, `docs/GUIDE.md` and `docs/reference/*.png` in the repo so each prompt can say "read these".
4. If something breaks, paste the **exact error + the file** and say "fix the root cause, don't add workarounds".
5. Every prompt ends with *acceptance criteria*. Make the agent verify them (run the app / call the endpoints / use the browser) and report which passed.
6. Prompts say "mobile" and "api": paths are `apps/mobile`, `apps/api`, `packages/shared`.

---

## P0 — Project memory & rules (do this first)

```text
You are the lead engineer on a hackathon project: a React Native (Expo) mobile app + Node/Express/Prisma backend called "Campaigns" — a community-funded ad/message amplification platform.

Read these files completely before doing anything: docs/BRIEF.md (the official brief), docs/GUIDE.md (decisions, design system, data model, API), and look at images in docs/reference/.

Create the project rules so you remember them in every future session:
1. Create `.agent/rules/00-project.md` (always-on) containing: product summary; the "NOT a donation" principle; roles; campaign lifecycle states and allowed transitions; money/reach formulas and demo config; tech decisions (no re-debating them); monorepo layout; code conventions (TypeScript strict, no `any`, shared zod schemas in packages/shared, API client typed, components small and reusable, no inline magic numbers — use design tokens); UX rules (loading/empty/error/no-results/success/pending states everywhere, no dead buttons, sticky primary action, touch targets >=48, readable contrast, label every estimate and every demo figure).
2. Create `.agent/rules/10-design-system.md` containing the colour tokens, typography, spacing, radius, motion and component list from section 5 of the guide.
3. Create `.agent/workflows/verify.md` (a reusable workflow) that: runs typecheck, lint, API tests, starts the Expo app, and lists the acceptance criteria to manually verify.
4. Also create a root `AGENTS.md` that points to these rule files in 10 lines.

Do not write app code yet. When done, show me a short summary of the rules you saved and anything in the brief that you think is ambiguous (list as questions, with your proposed default for each).
```
**Acceptance:** rules files exist; ambiguity list reviewed by you.

---

## P1 — Monorepo scaffold

```text
Follow the rules in .agent/rules. Scaffold the monorepo:

- Root: npm workspaces (apps/*, packages/*), tsconfig.base.json (strict), .editorconfig, .gitignore, eslint + prettier config, root scripts: `dev:api`, `dev:mobile`, `typecheck`, `lint`, `db:migrate`, `db:seed`.
- packages/shared: TypeScript lib exporting zod schemas + types for Campaign, StoryBlock, Source, AdCreative, ReachSettings, Contribution, Notification, Report, API error shape; `config/estimates.ts` (platformFeePct 0.10, processingPct 0.029, processingFixedCents 30, cpm 6, avgFrequency 2.2, rangePct 0.30, presetAmounts [5,10,25,50,100], minContribution 1); `reach.ts` implementing quote(amountCents) -> {adBudgetCents, platformFeeCents, processingFeeCents, totalCents, estimatedReachLow/Mid/High} and reachAtGoal(goalCents); `lifecycle.ts` with the status enum and an `canTransition(from,to)` function. Add unit tests (vitest) for reach.ts and lifecycle.ts.
- apps/mobile: `npx create-expo-app` with TypeScript template + Expo Router. Install: expo-image, expo-image-picker, expo-document-picker, expo-haptics, expo-font, @expo-google-fonts/plus-jakarta-sans, @expo-google-fonts/newsreader, react-native-reanimated, react-native-svg, lucide-react-native, @tanstack/react-query, zustand, @react-native-async-storage/async-storage, react-hook-form, @hookform/resolvers, zod, expo-secure-store, expo-clipboard, expo-sharing/Share API. Import the shared package via workspace alias and configure Metro for monorepo resolution.
- apps/api: Express + TypeScript (tsx for dev), zod, prisma, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, pino-http. A `/health` route. `.env.example` for both apps (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY optional, EXPO_PUBLIC_API_URL).

Make sure `npm run dev:api` serves /health and `npm run dev:mobile` boots to a blank Expo Router home screen on both Android emulator and iOS simulator (or Expo Go on a phone). Report exact commands to run.
```
**Acceptance:** both apps boot; shared tests pass; typecheck passes.

---

## P2 — Design system & component library

```text
Read .agent/rules/10-design-system.md. In apps/mobile build the design system:

1. `src/theme/` : tokens (colors, typography, spacing, radius, shadows, motion), a `useTheme` hook, font loading with splash screen hold in app/_layout.tsx (Plus Jakarta Sans + Newsreader).
2. `src/components/ui/` : Button (primary/secondary/ghost/danger, sizes, loading, disabled, pressed scale, haptic), Card, ProgressBar (animated), StatusPill (icon+label for every lifecycle status), CategoryChip, Skeleton (shimmer), EmptyState, ErrorState (with retry), Toast (provider + hook), Accordion (animated), InfoTip (opens a bottom sheet with plain-language explanation), Sheet, Segmented, TextField/TextArea (label, helper, error, character counter, required marker), Avatar, Stat, Timeline, StepIndicator (5 steps: Basics, Story, Visuals, Reach, Submit; states done/current/todo; tappable for completed steps), StickyActionBar (safe-area aware), ReachEstimateBadge, DemoDataBadge.
3. `src/components/campaign/CampaignCard.tsx` with variants: default (feed), compact (list), featured (horizontal carousel). Must show: cover image, category chip, title (2 lines), creator name + creator-type icon, 2-line summary, raised/goal, progress bar + %, "Est. reach at goal ~X–Y people", and a **Back This Campaign** button. Include a skeleton variant.
4. A hidden dev screen `app/dev/components.tsx` showing every component in all states, so I can review visually.

Quality bar: premium, calm, lots of whitespace, consistent. Accessibility: accessibilityRole/Label on all pressables, min 48dp touch, contrast >= 4.5:1, support Dynamic Type scaling reasonably, respect reduce-motion.
Run the app and screenshot the dev screen. Fix anything that looks off before reporting.
```
**Acceptance:** dev gallery looks polished on small (360×640) and large phones.

---

## P3 — Database, Prisma schema, seed data

```text
In apps/api implement the Prisma schema per section 6 of docs/GUIDE.md (User, Campaign with status enum + JSON columns for story/sources/adCreative/reach, Contribution, ReviewDecision, CampaignEvent, CampaignUpdate, Notification, Follow, SavedCampaign, Feedback, Report). Use PostgreSQL (Supabase connection string via DATABASE_URL; also support a local Postgres via docker-compose.yml). Create the migration.

Then write `prisma/seed.ts` per section 8: 10–12 credible campaigns across all 10 categories and all creator types, with realistic editorial stories (6–10 blocks each: headings, paragraphs, images with captions and credits, stats, suggested actions), 2–4 sources each, ad creatives, reach settings, funding goals, and statuses (6 FUNDING at 8%–97%, 1 PROMOTING, 1 COMPLETED with a Report, 1 ending soon). Also seed: demo users (creator@demo.com / backer@demo.com / admin@demo.com, password `Demo@1234`), contributions that EXACTLY sum to each campaign's raisedCents, campaign updates, notifications for demo users, and for the creator demo user: one DRAFT (step 2 complete), one SUBMITTED (under review), one CHANGES_REQUESTED with reviewer notes.
Image URLs: use licence-safe Unsplash/Pexels links that actually exist; add a fallback placeholder field.
Everything must be consistent: numbers on feed, detail, dashboard and report must match because they come from the same rows. Mark seeded figures `isDemo`.

Verify with `npm run db:migrate && npm run db:seed` and print a table of campaigns (title, category, status, raised, goal, %) to confirm.
```
**Acceptance:** seed runs repeatedly (idempotent); totals match.

---

## P4 — API: auth, config, public campaign endpoints

```text
In apps/api implement with zod validation, layered structure (routes -> controllers -> services), centralized error handler returning {error:{code,message,fields?}}, request logging, rate limiting, helmet, CORS.

1. Auth: sign-up, sign-in, refresh, GET /me. bcrypt, JWT access (15m) + refresh (7d). Middleware `optionalAuth` (guests allowed) and `requireAuth` and `requireRole('ADMIN')`.
2. GET /config/estimates (from packages/shared).
3. GET /campaigns with real server-side search (title, summary, creator, category, story text), category filter, status filter (only public statuses: FUNDING, PROMOTING, COMPLETED for the public), sort (trending, newest, most_funded, ending_soon, closest_to_goal), min/max goal filter, pagination (cursor or page). Return card DTOs including computed percentFunded, daysLeft, reachAtGoal low/high.
4. GET /campaigns/featured, GET /campaigns/:id (full story, sources, use-of-funds summary, review summary, audience settings, updates, feedback aggregate). Never include private backer info; only show recent backers if public & non-anonymous.
5. POST /campaigns/:id/feedback, POST/DELETE /campaigns/:id/save, follow/unfollow (auth).
6. POST /campaigns/:id/quote (guest allowed): amount -> fees, total, estimated reach using shared reach.ts.
Add integration tests (supertest + vitest) for search, filters, sort, and that DRAFT/SUBMITTED campaigns are NOT visible publicly.
Add a typed client generator or hand-write `apps/mobile/src/api/client.ts` with fetch wrapper (base URL from EXPO_PUBLIC_API_URL, auth header, timeout, error normalization, retry on network error) and TanStack Query hooks: useCampaigns, useFeatured, useCampaign, useQuote.
```
**Acceptance:** tests pass; curl examples work; mobile hooks typed.

---

## P5 — API: creator, drafts, submission, lifecycle, contributions, activity, reports, admin-demo

```text
Continue in apps/api. Implement:

1. Creator: POST /campaigns (create draft), PATCH /campaigns/:id/draft (partial autosave, owner only, only while DRAFT or CHANGES_REQUESTED, merges JSON safely, bumps updatedAt), POST /campaigns/:id/submit (full zod validation of ALL five steps, requires creator-set fundingGoal and accepted-rules flag; transitions DRAFT/CHANGES_REQUESTED -> SUBMITTED; writes CampaignEvent + Notification "Submission received"), GET /me/campaigns?status=, GET /me/campaigns/:id/analytics.
2. Server-side enforcement of lifecycle using shared `canTransition`; reject illegal transitions with 409. Material edits on published campaigns create a pending revision and return to review (store `version`).
3. Contributions (simulated payment provider in `services/payments/simulated.ts`):
   - POST /contributions {campaignId, amountCents, guestEmail?, publicName?, anonymous default true} -> PENDING, only if campaign is FUNDING.
   - POST /contributions/:id/pay {cardNumber|method, ...}: magic cards: 4242 4242 4242 4242 = SUCCEEDED; 4000 0000 0000 0002 = FAILED (declined); 4000 0000 0000 9995 = FAILED (insufficient funds); 4000 0000 0000 3220 = PENDING (bank verification, auto-resolves to SUCCEEDED after 15s via a job); card entry cancelled -> CANCELLED. Never store card numbers; store only last4/brand.
   - On SUCCEEDED: update raisedCents transactionally, create receipt number, notification, milestone notifications at 25/50/75/100%, and if goal reached move to FUNDING_CLOSED (NOT promoting).
   - GET /contributions/:id, GET /me/contributions, GET /contributions/:id/receipt (owner or guest token only).
4. Activity: GET /me/notifications, POST read, PATCH prefs (categories: campaign status, funding milestones, contributions, updates, security), dedupe so users don't get repetitive notifications.
5. Reports: GET /campaigns/:id/report returns funds raised, platform fee, ad spend, impressions, reach (with reachType ESTIMATED vs MEASURED clearly separated), clicks, CTR, duration, isDemo.
6. Admin/demo: GET /admin/queue, POST /admin/campaigns/:id/decision (approve -> APPROVED then FUNDING; changes -> CHANGES_REQUESTED with notes; reject), POST /admin/campaigns/:id/advance (FUNDING_CLOSED -> DISTRIBUTION_PREP -> PROMOTING -> COMPLETED), POST /admin/campaigns/:id/simulate-report. Every decision writes ReviewDecision + CampaignEvent (audit trail) and notifies the creator. Approval requires required checks flags to be true.
7. Role-based permission tests and a lifecycle test that walks DRAFT -> COMPLETED.
Also add mobile query/mutation hooks for all of the above.
```
**Acceptance:** an API-only run-through works via the test script; illegal transitions rejected.

---

## P6 — App shell: navigation, auth state, global states

```text
In apps/mobile build the shell with Expo Router:
- app/_layout.tsx providers (QueryClient, Theme, Toast, Auth store hydration from SecureStore), splash/fonts, global error boundary.
- (tabs)/_layout.tsx: 5-tab bottom bar (Home, Explore, Create [emphasised centre action], Activity [unread badge], Profile) with lucide icons, labels always visible, 56px high, safe-area aware, active indicator in primary-600.
- Placeholder screens for every route in section 4 of docs/GUIDE.md so navigation never hits a missing route.
- Auth: browsing needs NO account. Auth gating only for: saving/following, creating campaign (prompt sign-in with a sheet that explains why, and returns to the same place after), profile, dashboard. Sign-in/up screens with validation, demo-account quick-fill chips ("Use demo creator", "Use demo backer"), show/hide password.
- Consistent header component (back button, title, optional right action) and consistent back behaviour (always returns to the previous logical screen; never to a blank state).
- Offline/network error banner and a reusable `ScreenState` wrapper that renders skeleton / error / empty / content.
Verify every tab and route navigates without crashes.
```

---

## P7 — Home screen

```text
Build `(tabs)/index.tsx` for the Home tab, according to the brief ("Core Flow 1") and docs/GUIDE.md.

Sections in order:
1. Hero (gradient indigo, calm, not noisy): headline "Help important messages travel further.", short explanation of community-funded reach, primary **Explore Campaigns** and secondary **Start a Campaign** buttons, and the "Illustrative reach per $1" card pulling from GET /config/estimates (~48–89 people per $1) with InfoTip: "Estimate based on demo assumptions. Not a guarantee."
2. A one-line disclaimer chip: "Contributions fund ad distribution, not the cause or creator."
3. Featured campaigns: horizontal snap carousel of featured CampaignCards.
4. How it works: Create -> Review -> Amplify as a 3-step visual with icons and plain-language copy; "Learn more" link to info/how-it-works.
5. Campaign feed: vertical list of CampaignCards with infinite scroll/pagination; category quick chips above the feed that filter it.
6. Trust footer strip: links to Partners, About, FAQs, Community Guidelines.
Include skeletons while loading, error state with retry, empty state. Pull-to-refresh. Tapping a card opens campaign/[id]; the Back button on a card goes straight to the amount screen if campaign is FUNDING, else shows the status.
Test on a 360×640 screen and a large screen. Screenshot and iterate until it feels premium.
```

---

## P8 — Explore screen

```text
Build `(tabs)/explore.tsx`:
- Sticky search bar with debounce (300ms), clear button, recent searches (persisted), and live results from the API.
- Horizontally scrollable category chips for all 10 categories (+ All) with counts.
- "Featured" strip when no search/filter active.
- Sort control (bottom sheet): Trending, Newest, Most funded, Ending soon, Closest to goal.
- Filter sheet: status (Funding / Promoting / Completed), funding progress ranges, goal size range, creator type; shows active filter count and a "Clear all" action; Apply button shows result count.
- Results as compact/default CampaignCards with pagination.
- States: skeleton list, error with retry, empty ("No campaigns yet in this category" with a CTA to create), and no-results ("No results for 'xyz'" with suggestions + clear filters).
- Filters and search must really change results (server-side) and persist while navigating back from a detail page (keep scroll position + query).
Add tests or a manual checklist proving each filter and sort changes the visible list.
```

---

## P9 — Campaign detail page

```text
Build `campaign/[id].tsx` — an editorial reading page (brief "Core Flow 4"). Priorities: readability, context, visible sources.

- Collapsing header with cover image, back button (returns to previous screen / Explore), share action (native Share with deep link), save/bookmark. Show category, title, creator/org (with type), publication date, StatusPill when relevant.
- Story renderer for block types: heading, paragraph (Newsreader 18/28), image with caption + credit (inline in context, tap to zoom), stat (large number + label + source), quote, suggested audience actions. Comfortable margins.
- **Sources** section visible to audiences: title, publisher, URL (opens in-app browser), with an explanation "Sources are provided by the creator and checked as part of review." Do NOT claim independent verification or invent trust scores.
- Sticky funding panel (bottom, compact): raised/goal, % bar, days left, est. reach, and **Back This Campaign** button; expands into a sheet with full progress, Share Campaign. It must never cover the story text.
- Accordions: **Use of funds** (platform fee 10%, ad share 90%, allocation policy, refund conditions, unspent funds treatment, and the bold statement "Your contribution funds distribution of this message, not direct charitable support for the cause."), **Audience & distribution** (who, locations, channels/placements, privacy and advertising disclosures), **Review & trust** (review process steps, sources, verification info — honest wording, distribution partners), **Updates** (creator updates timeline), **Backers** (aggregate counts only; named only if public).
- Feedback widget: "Did the visuals encourage you to keep reading?" and "Did this change your mind?" with No / Somewhat / Yes; posts to API; thank-you state.
- Status-aware CTA: FUNDING -> Back; PROMOTING -> "Follow progress"; COMPLETED -> "View final report"; else disabled with explanation.
- Label all sample figures with DemoDataBadge.
Skeleton + error + not-found states. Verify on 3 campaigns of different statuses.
```

---

## P10 — Campaign creation: entry, draft engine, shell

```text
Build the foundation for the 5-step creation flow (brief "Core Flow 3").

1. `(tabs)/create.tsx`: two large option cards — **Create Manually** (guided form + full preview) and **Create with Your Voice** (describe aloud, answer guided questions) — plus **Resume a saved draft** list (from API, showing title, step progress, last saved time, delete draft). Require sign-in via sheet.
2. A draft engine: Zustand store `useDraftStore` persisted to AsyncStorage + server sync: every field change updates local state immediately, and a debounced (1.5s) PATCH autosaves to the API; show a subtle save indicator ("Saving…", "Saved just now", "Offline - will sync"); on app reopen the draft restores; navigating back preserves all form state; conflict-safe (last write wins with updatedAt).
3. Creation layout `create/[draftId]/_layout.tsx`: persistent header with StepIndicator (Basics → Story → Campaign & Ad Visuals → Reach → Submit — exactly this order, exactly five steps, NO setup screens in between), back button with unsaved-changes safety, a "Save as Draft" action in a header menu, and a sticky bottom bar (Back / Save as Draft / Continue). Distinguish clearly editing vs previewing vs submitting (a mode label).
4. A per-step completeness model (`getStepErrors(draft, step)`) using shared zod schemas that powers validation messages, step checkmarks, and the "Requires: ..." list on the Submit step.
Create placeholder step screens that prove navigation, back-state preservation, and autosave work. Verify by killing the app mid-draft and resuming.
```

---

## P11 — Step 1: Basics

```text
Build `create/[draftId]/basics.tsx` per the brief (Step 1 — Basics).
Fields: Campaign title (required, max 60 with live counter and helper: "The start of your title may be used as the ad headline if you don't supply a custom one."), Category (required, bottom-sheet picker with 10 categories + icons), Creator/organization name (required) + creator type (individual, creator/influencer, nonprofit, business, community group), Short summary (max 160 chars with counter), Optional cover image (image picker with preview, crop 16:9, remove/replace, file type/size validation), plus guidance prompts that reflect the brief: what's it about, who should it reach, why it matters, what evidence supports it (shown as collapsible "Need help getting started?" tips, not required fields).
Buttons: Save as Draft (toast "Draft saved"), Continue (validates; scroll to and focus first error; inline messages in plain language).
An optional "Suggest with AI" button that calls /ai/draft-basics using what the user typed, then shows suggestions (title, summary, category, creator description) as a review sheet where each suggestion can be accepted, edited, or dismissed individually. AI must never overwrite existing input without confirmation. If the AI service errors, show a clear message and keep manual path ("Demo mode suggestions" fallback).
Upload images through `POST /uploads` (implement in the API: multer, size limit 5MB, jpeg/png/webp only, returns URL).
```

---

## P12 — Step 2: Story composer

```text
Build `create/[draftId]/story.tsx`: an editorial, block-based composer that feels like writing an article, not filling a business form.

- Top: Headline + intro text fields in large serif type.
- Blocks list: paragraph, heading, image (upload + preview + caption + credit), statistic (value, label, source), quote, suggested audience action. "Add block" bottom sheet with icons. Each block has inline controls: move up / move down (accessible rearranging, with haptics), duplicate, delete (with undo toast).
- Simplified formatting toolbar for paragraphs: bold, italic, link, bullet list (stored as lightweight markdown; renderer shared with the detail page).
- **Sources manager**: add source (title, URL validated, publisher optional), edit, remove, reorder. Warn if the story has stat blocks but no sources. Message: "Sources are shown publicly on your campaign page."
- Suggested audience actions editor (e.g. "Read the report", "Share with a friend", "Contact your representative") up to 3.
- **Live preview**: a toggle (Edit | Preview) that renders the exact same StoryRenderer used on the campaign detail page, so the creator sees the published look.
- Validation: minimum story length (e.g. >= 300 chars), at least 1 source, at least 1 heading. Autosave on every block change.
- "Improve with AI" per paragraph and "Draft story from my basics" using /ai/draft-story, always shown as a suggestion the creator can accept/edit/discard.
Reuse StoryRenderer from `src/components/story/`, and refactor the detail page to use it if needed so they're guaranteed identical. Test with 15+ blocks for performance (use FlatList-friendly structure).
```

---

## P13 — Step 3: Campaign & Ad Visuals

```text
Build `create/[draftId]/visuals.tsx` (Step 3 — Campaign & Ad Visuals). Keep editorial story assets visually separate from advertising creative.

- Campaign cover image (reuse from Step 1, editable).
- Ad images: upload up to 5 (aspect ratios 1:1, 4:5, 1.91:1 guidance), preview, remove, set primary; basic validation (type, size <= 5MB, minimum resolution warning) with clear errors.
- Video creative: optional upload (mp4, <= 30s, <= 50MB) with a "where supported" note and validation; if not feasible, show a clearly labelled "Video: coming soon" disabled state with explanation (no dead button).
- Ad headline (max 40 chars, counter; prefilled from title start but editable; "Using title as headline" hint), Ad description (max 90), CTA text (select from presets: Learn more, Read the story, Watch now, Sign up, Get involved).
- **Placement previews** with a Segmented control: Social feed card, Story/vertical, Search/Display banner — each rendering the actual images/headline/description/CTA live.
- "Generate image ideas" button: calls /ai/ad-copy for copy suggestions and (demo mode) offers a gallery of placeholder generated images; label as AI-generated.
- Warnings list (non-blocking where appropriate): missing ad image (blocking at submit), headline too long, low resolution, no CTA.
- Optional "Get creative feedback" button returning demo feedback (clarity, contrast, text-to-image ratio) via /ai/ad-copy; clearly optional.
Autosave all fields; preserve state when going back.
```

---

## P14 — Step 4: Reach

```text
Build `create/[draftId]/reach.tsx` (Step 4 — Reach). Explain how the campaign will find an audience, without promising audience size.

- Target locations: searchable multi-select (countries/regions/cities from a small curated list) with chips.
- Audience interests/characteristics: multi-select chips grouped by theme + age range slider (18–65+) where supported.
- Distribution channels: toggles for Social feeds, Search, Display network, Video (each with a short description and an "Available / Coming soon" indicator).
- Advertising budget allocation across selected channels: sliders or percentage steppers that always total 100%, with automatic rebalance and validation.
- Duration: segmented 7 / 14 / 30 / 60 days + custom, plus funding window length.
- **Audience preview card**: "Who this is intended to reach" summary and how the ad may appear (reuse placement preview from Step 3).
- Clearly separate two groups with labels: **"You choose"** (locations, interests, channels, allocation, duration) and **"Finalized during review"** (exact placements, bids, delivery schedule, targeting adjustments). Add InfoTip and a persistent note: "Reach depends on ad inventory, prices, targeting and performance. We never guarantee an audience size."
- Show an indicative reach range from the shared estimate model for the *current* funding goal if one exists, else "Set your funding goal in the final step to see an estimate."
Autosave, validation (at least 1 location and 1 channel), back-state preserved.
```

---

## P15 — Step 5: Submit, preview, confirmation, status timeline

```text
Build `create/[draftId]/submit.tsx`, `preview.tsx`, `submitted.tsx`.

Submit step:
- Complete summary in expandable sections with an "Edit" link per section that jumps to the right step and returns here after: title/summary/creator, story + sources, campaign and ad visuals, audience and distribution settings, duration, fees and funding policies.
- **Funding goal input is set ONLY here by the creator** (min $500, max $50,000, quick chips). It must never be filled or overwritten by AI or earlier steps — add a test/guard. Show live "Estimated reach at goal ~X–Y people" using shared reach.ts, with the estimate disclaimer, and the fee breakdown at goal (platform fee, ad budget).
- Required confirmations (checkboxes): I have the right to use all content; campaign follows Community Guidelines; I understand contributions fund ad distribution, not me or my cause, and funds are managed for ads; I understand review may request changes. Links to Terms, Guidelines.
- A checklist of blocking issues ("Add at least one source — go to Story").
- Actions: Back, Save as Draft, **Preview Campaign** (opens `preview.tsx` — renders the real CampaignDetail with the draft and a "Preview — not published" banner and mode label), **Submit for Review** (disabled until valid, loading state, error handling, calls API submit).
Confirmation screen `submitted.tsx`: success animation (subtle), "Submitted for review", a **status timeline**: Submitted (done) → In review (current) → Approved or changes requested → Available for funding → Funding → Distribution preparation → Promoting → Completed, with plain-language descriptions and expected timing (demo). Buttons: View in dashboard, Share (disabled with note until approved), Create another.
After submission: the draft can't be edited unless changes are requested; creator dashboard shows "Under Review".
```
**Acceptance:** the whole 5-step flow, back-and-forth, killed-app resume, submit → appears in Under Review.

---

## P16 — Voice & AI-assisted creation (with fallback)

```text
Build `create/voice.tsx` and `/ai/*` endpoints.

Voice flow:
1. Intro screen: what will happen, microphone permission explanation, and an always-visible "Prefer typing? Create manually" link.
2. Guided questions one at a time (large type, progress dots): What is your campaign about? Who should it reach? Why does it matter? What evidence or sources support it? Which category fits? Who are you / your organization?
3. For each question: big record button with waveform animation, live transcript via `expo-speech-recognition`; allow edit of the transcript text, re-record, skip.
4. **Demo mode** (toggle, and automatic when mic permission is denied, recognition unavailable, or AI errors): pre-scripted sample transcript per question that the user can tap to "speak" so the flow always works in the demo video.
5. Send all answers to POST /ai/voice-structure (Gemini via the backend when GEMINI_API_KEY exists; otherwise deterministic template-based fallback) returning draft basics + story outline + sources suggestions + suggested audience actions. Never set funding goal.
6. Land on an **editable draft**: create the draft, show a "Review your AI draft" screen listing what was filled with an "AI-suggested" tag on each field; then open Basics step. Everything remains editable/deletable; show a banner "Review everything — AI can be wrong."
Backend: rate limit, timeouts (8s), strict JSON schema output validated with zod, never expose keys, log only metadata.
Add app.json permissions strings for microphone and speech recognition (iOS + Android).
```

---

## P17 — Back a campaign: the 6-step contribution journey

```text
Build the backing flow per brief "Core Flow 5" — trust and clarity first.

Step 1 (Inspect) = campaign detail page (already built). Ensure the Back button deep-links into the flow.
`back/[id]/amount.tsx` (Step 2): preset amounts (from config), custom amount input with validation (min/max), live estimated reach range animated as the amount changes (from /quote or local shared function), mini campaign card on top, remaining-to-goal hint, "What does this pay for?" InfoTip. Sticky "Continue".
`back/[id]/review.tsx` (Step 3): contribution amount, processing fee, platform fee info, **total payment**, estimated reach for this contribution, campaign funding progress (current and after-contribution preview), terms + refund information in an accordion, the bold statement that this is for campaign amplification not direct support of the cause, a required acknowledgement checkbox, optional public-name toggle (anonymous ON by default, helper: "Your name stays private by default. Payment records remain accurate."), guest email field if not signed in (only email, nothing else required).
`back/[id]/pay.tsx` (Step 4): clearly labelled **"Simulated checkout — no real money"** banner; card number/expiry/CVC/name with formatting and validation; helper chips "Use test card: success / declined / insufficient funds / needs verification"; Pay button with loading; handle states: SUCCEEDED, FAILED (retry or change method), PENDING (bank verification polling with progress and "You can leave this screen"), CANCELLED (back button/cancel), REJECTED.
`back/[id]/result.tsx` (Step 5): success with animation + haptic: payment confirmation, amount, campaign title, receipt number with "View receipt" (receipt screen in profile/payments/[id]) and "Share receipt/Share campaign", **updated funding progress** animating from old to new value, and a Follow campaign toggle. Distinct designs for pending, failed, cancelled.
Step 6 (Track): "Track this campaign" CTA leads to the campaign page with Updates/Report; the contribution appears in Profile > Backed and Activity.
Make sure raisedCents increments on the server, and every list and screen then reflects it (invalidate queries). Guest contributions work without sign-in. Back navigation within the flow is consistent and never loses the entered amount.
```
**Acceptance:** all 5 outcomes can be reproduced with test cards; numbers consistent on feed, detail, dashboard.

---

## P18 — Activity & notifications

```text
Build `(tabs)/activity.tsx`:
- Segmented tabs: All, Updates, Funding, Following.
- Notification list grouped by day (Today / Earlier), icons per type, unread dot, tap navigates to the right screen (campaign, report, dashboard item, receipt), swipe or menu to mark as read, "Mark all read".
- Events supported: submission received, approved/rejected/changes requested, available for backing, funding milestone (25/50/75/100%), deadline approaching, contribution successful/failed, promotion begins, meaningful distribution progress, campaign completed, final report available, new update/comment, account security event.
- "Followed campaigns" section with mini progress cards for relevant campaigns.
- Notification preferences screen (profile/notifications-settings) with category toggles and delivery preference (in-app only / email placeholder), persisted via API; avoid noisy notifications by collapsing repeated ones server-side.
- Unread badge on the tab; polling every 30s or on focus.
- Empty state ("You're all caught up") and error state.
Optional: expo-notifications local notification when a pending payment resolves.
```

---

## P19 — Profile, creator dashboard, analytics, reports

```text
Build:
1. `(tabs)/profile.tsx`: header (avatar, name, role chips), sections: Created campaigns, Backed campaigns, Saved campaigns, Payment history (with receipts), Notification preferences, Account settings (name, email, password change, sign out, delete account demo), Help & support (FAQs, Contact, Terms, Privacy, Community Guidelines, About, Partners, How it works). Guest state: friendly sign-in prompt, with a note that browsing needs no account.
2. `creator/dashboard.tsx`: tabs/filter chips with counts: Drafts, Under Review, Published/Funding, Promoting, Completed, Requires Action. Each row: thumbnail, title, StatusPill, funding progress, goal, deadline, estimated reach, and contextual action (Edit draft / View feedback / Share / View report). Empty state per tab.
3. `creator/[id].tsx` (manage a campaign): moderation feedback & required changes (with "Fix and resubmit" that returns to the right step), preview, share link, funding milestones + campaign updates composer (post an update), promotion progress, lifecycle timeline, controlled editing rule notice for published campaigns ("Material changes will return to review before ads are updated").
4. Analytics block: amount raised, funding progress, contributions count and backer activity (aggregate, private by default), ad budget allocated vs spent, estimated vs measured reach in clearly separate cards with definitions (InfoTip), impressions, clicks, CTR, duration, final results. Never mix estimates with measured stats; label demo data.
5. `campaign/[id]/report.tsx`: final distribution report with sections Funds raised -> Fees -> Ad spend -> Impressions -> Reach (estimated vs measured) -> Clicks -> Notes, plus a "Share report" action.
Backers also see the report for campaigns they backed.
```

---

## P20 — Secondary pages (info)

```text
Implement `info/[slug].tsx` with a clean, readable layout and the following content (write real, concise copy consistent with the product; no lorem ipsum): How It Works, About, Partners (placeholder partner logos as text chips, labelled demo), FAQs (accordion, 12 questions including "Is this a donation?", "What do fees pay for?", "What if a campaign doesn't reach its goal?", "How is reach estimated?", "What happens to unspent funds?", "How are campaigns reviewed?"), Help, Contact (form that validates and shows success; no backend needed or POST to API stub), Terms, Privacy, Community Guidelines. Link them from Profile, Home footer, and the detail page where relevant. Include a search box in Help that filters FAQs.
```

---

## P21 — Demo control panel (reviewer logic, minimal)

```text
Admin is not part of the assignment, but I need to demonstrate the review logic. Build `demo/control.tsx` (reachable from Profile > Settings > Developer / tapping the version 7 times; only for ADMIN or in demo builds) with:
- Review queue of SUBMITTED campaigns: open one to inspect story, sources, visuals, targeting, proposed budget, then buttons Approve / Request changes (notes required) / Reject (reason required). Show the audit trail (ReviewDecision + CampaignEvent).
- Lifecycle controls: Advance FUNDING_CLOSED -> DISTRIBUTION_PREP -> PROMOTING -> COMPLETED with checks (approval done, payments settled, budget set, ad setup confirmed). Block with explanation if checks fail; show that funding completion does not auto-launch ads.
- "Simulate delivery report" button generating impressions/clicks/spend so Reports and analytics have data.
- A "Reset demo data" button (re-seed) for recording the video again.
Every action triggers the right notifications for the creator/backers. Mark the screen clearly "Internal — reviewer demo".
```

---

## P22 — State polish & UX audit pass

```text
Do a systematic UX audit of the whole app against the brief's "Design & UX Guidelines" and .agent/rules.
1. Walk every screen. For each, verify and fix: loading skeleton, empty, error (with retry), no-results, success, pending, validation states; one clear primary action; sticky bar safe areas; back behaviour; no dead buttons; no placeholder text; consistent spacing/typography via tokens (search for hard-coded colours/sizes and replace).
2. Accessibility: labels/roles, focus order, contrast, touch targets >= 48, Dynamic Type at 130%, screen reader pass on Home, Detail, Back flow.
3. Performance: memoized list items, image caching/blurhash, no unnecessary re-renders, FlatList for feeds, startup time.
4. Micro-interactions: press feedback, animated progress, haptics on success, shared transitions where simple, toasts for save/submit/back/status change.
5. Content: make sure "not a donation" and "estimate, not guarantee" messages appear on Home, Detail, Review step, Receipt, Reach step.
6. Test on small (360x640), medium, large phones, and iOS + Android.
Produce a checklist table (screen x state) showing pass/fail and fix everything that fails.
```

---

## P23 — End-to-end QA script & tests

```text
Create `docs/QA.md` with a manual end-to-end script, and automate what's practical:
- API: vitest + supertest suites for auth, public visibility, search/filter/sort, draft autosave, submit validation (including: funding goal must be provided by the creator), lifecycle transitions, contributions (all 5 outcomes), milestones, receipts privacy, role checks.
- Mobile: a few jest/RTL tests for reach calculation display, StepIndicator, draft store persistence, validation messages.
- Manual script covering: guest browse -> sign in -> create (manual) -> kill app -> resume -> submit -> admin approve -> back as guest with test cards -> check progress everywhere -> advance to promoting/completed -> view report -> notifications.
Run everything, fix failures, and report coverage + known issues.
```

---

## P24 — Deploy the backend

```text
Prepare and document deployment of apps/api:
- Production Dockerfile (or Render/Railway build config), `npm run build` + `start`, `prisma migrate deploy` on release, health check at /health, env var list, CORS config allowing the app, trust proxy, logging.
- Supabase Postgres connection (pooled URL for runtime + direct URL for migrations).
- Seed the production DB once.
- Write `docs/DEPLOY.md` with exact step-by-step instructions for Render (or Railway), including how to set DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, and how to keep the service warm before demos.
- Add a script `scripts/smoke.sh` that curls health, /config/estimates, /campaigns and a sign-in to verify the deployed API.
Do not hard-code secrets. Tell me exactly what I need to click/paste and what to send back to you (the URL).
```

---

## P25 — Android APK build

```text
Configure EAS for Android: app.json (name "Campaigns", slug, scheme, android.package `com.<mine>.campaignamp`, adaptive icon, splash, permissions only those needed), eas.json with `preview` profile producing an APK and EXPO_PUBLIC_API_URL pointing to the deployed API. Generate a proper app icon and splash consistent with the brand (indigo). Remove console logs and dev-only screens from release (keep demo control). Run `npx expo-doctor` and fix issues. Then guide me through `eas build -p android --profile preview` and installing the APK on a device. Provide a smoke-test checklist to run on the installed APK (the API reachable, images load, fonts load, deep links, voice permission prompt, payments flow).
```

---

## P26 — iOS build & TestFlight

```text
Configure iOS release for TestFlight: app.json `ios.bundleIdentifier`, `buildNumber`, `infoPlist` (NSMicrophoneUsageDescription, NSSpeechRecognitionUsageDescription, NSPhotoLibraryUsageDescription, NSCameraUsageDescription if used, ITSAppUsesNonExemptEncryption false), eas.json `production` profile with autoIncrement and env vars, and `submit.production.ios`. Verify no unsupported native modules. Provide a precise step list for me: Apple Developer account check, creating the app in App Store Connect (name, bundle id, SKU), `eas build -p ios --profile production`, `eas submit -p ios --latest`, handling App Store Connect processing and encryption compliance, adding Internal testers, and creating an External public link (Beta App Review notes: test credentials creator@demo.com / Demo@1234, no real payments, simulated checkout). Include a troubleshooting section for common failures (provisioning, missing icon, privacy strings, export compliance). Ask me only for what you cannot do yourself.
```

---

## P27 — Demo video script & recording checklist

```text
Write `docs/DEMO_SCRIPT.md`: a 6–8 minute demo video script and shot list that proves every requirement in the brief, in this order: (1) 20s pitch — "contributions pay for distribution, not donation"; (2) Home (hero, reach estimate, how it works); (3) Explore — search, category, sort, filter, no-results state; (4) Campaign detail — story, sources, use of funds, trust, feedback; (5) Back a campaign as a guest — preset, custom, review fees, simulated checkout with a failed then successful card, confirmation + progress update + receipt; (6) Create — manual flow through all 5 steps with autosave, leave and resume, preview, set funding goal, submit, timeline; (7) Voice/AI creation in demo mode; (8) Creator dashboard tabs; (9) Demo control: approve -> funding -> advance to promoting -> completed -> report; (10) Activity notifications and settings; (11) Profile, payment history, info pages; (12) tech summary slide (stack, architecture, security). For each segment give: exact taps, what to say, approximate seconds, and what could go wrong. Include a pre-recording checklist (wake API, reset demo data, airplane-mode off, notifications cleared, battery, screen recording settings).
```

---

# PART C — WHAT ELSE TO GIVE ANTIGRAVITY (for maximum efficiency)

## 1. Files to put in the repo before prompt P0
| File | Why |
|---|---|
| `docs/BRIEF.md` | The official problem statement; single source of truth |
| `docs/GUIDE.md` | This file; decisions so the agent doesn't improvise |
| `docs/reference/*.png` | Screenshots of the reference site (home, card, detail, create, checkout, dashboard) and 3–5 mobile apps you admire (Substack, Kickstarter, Airbnb, Linear, Monzo) for visual direction |
| `docs/seed-copy.md` (optional) | Hand-written story text & sources for 3 flagship campaigns; real writing makes the demo feel credible |
| `assets/` | Logo/wordmark, app icon 1024×1024, splash, a few brand-safe images |
| `.env.example` | Shows required variables without secrets |

## 2. Accounts and keys you need (get them early)
- **Expo account** (EAS), **Apple Developer Program** (for TestFlight — *start day 1*), **Google Play Console not required** for APK
- **Supabase** project (Postgres URL; pooled + direct)
- **Render/Railway** account for the backend
- **Gemini API key** (optional; fallback works without)
- A **physical Android phone** and, ideally, an iPhone for testing

## 3. Antigravity features worth using (names may differ slightly in your version — check Settings)
- **Rules** (`.agent/rules/`) for always-on project memory; **Workflows** (`.agent/workflows/`) for repeatable procedures like `/verify`, `/deploy-check`.
- **Planning mode** for architecture-heavy tasks; read the **plan artifact** and correct it before execution. **Fast mode** for small edits.
- **Browser/agent verification & screenshots:** have it run the Expo web preview (`npx expo start --web`) to screenshot layouts, but still validate on a real device/simulator because web ≠ native.
- **MCP servers** if available: Supabase MCP (inspect DB), Figma/Stitch-style design tools if you create mockups, GitHub MCP for commits/PRs.
- **Skills:** if you have a frontend-design or mobile-UI skill, attach it for P2, P7–P9, P22.
- **Parallel agents:** the API prompts (P3–P5) and design system (P2) are independent; run them in parallel workspaces/branches, then merge. UI screens that need the API should wait for P4/P5.
- Choose the strongest available model for P0, P5, P10, P17; a faster one for repetitive screens.

## 4. Habits that save hours
1. **Commit after every prompt** (`git commit -m "P7 home"`); tag good states so you can roll back.
2. **Never accept a giant "build everything" run.** Small, verified steps beat one big broken app.
3. **Make it prove it:** ask "run it, show screenshots/logs, list which acceptance criteria pass".
4. **Fix root causes:** when stuck, paste the exact error, the file, and "do not add workarounds or suppress the error".
5. **Keep a `docs/DECISIONS.md`** where the agent logs deviations. Review it before recording the demo.
6. **Pin versions** after the first successful install (`package-lock.json` committed); don't let the agent upgrade packages mid-project.
7. **Expo gotchas to warn it about:** use `expo install` for native packages (version-matched); reanimated plugin must be last in babel config; Metro monorepo config; don't import Node-only libs in the app; speech recognition and some modules need a **dev build/EAS build**, not Expo Go.
8. **Keep consistency:** after any visual change, ask for a "token compliance sweep" (no hard-coded colours).
9. **Give design feedback with specifics:** "increase card title to 17/24, reduce vertical padding to 12, move reach estimate under progress bar" beats "make it prettier".
10. **Reserve the last 20% of time** for P22–P27 (polish, QA, deploy, builds, video). Builds and TestFlight processing take real wall-clock time.

## 5. Suggested timeline (adapt to your deadline)
| Block | Prompts |
|---|---|
| Day 0 (hours) | Enrol Apple Developer, create Expo/Supabase/Render accounts, screenshots, P0–P1 |
| Foundation | P2, P3, P4, P5 (parallel where possible) |
| Core journey | P6–P9, P10–P15, P17 |
| Differentiators | P16, P18–P21 |
| Finish | P22–P27, first APK early (after P9) to catch build issues, TestFlight upload early (after P17) |

**Tip:** do a throwaway "hello world" EAS Android build and iOS TestFlight upload right after P1. If signing or account issues exist, you find out on day 1, not on submission night.

## 6. Final submission checklist
- [ ] APK installs on a clean device and works against the deployed API
- [ ] TestFlight build processed; invite/public link works (or organiser cooperation arranged)
- [ ] Demo video covers the full journey (script in P27), under the time limit
- [ ] Demo accounts and test cards listed in the submission message
- [ ] Submitted to the Telegram group: video + APK + TestFlight link
- [ ] Remember: source code is **not** required; the build and video are what's judged

