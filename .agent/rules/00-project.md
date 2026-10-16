# 00-project.md: Project Rules & Architecture Memory

> **System Memory for Antigravity Agents**: This rule file is always active. Do not deviate from these architectural decisions or re-debate them.

---

## 1. Product Summary
**Campaigns** is a community-funded advertising and message-amplification platform. Individuals, creators, nonprofits, businesses, and community groups create campaigns around messages they want amplified beyond their existing social networks. Backers pool contributions toward distribution costs (digital advertising inventory). Once approved and funded, the platform manages advertising distribution to reach external target audiences.

---

## 2. The Core "NOT A DONATION" Principle
> **Golden Rule**: A contribution pays to spread this message; it is **NOT** a direct donation to the cause, person, or organization.
> 
> Money does not go to the creator. It goes (minus platform and processing fees) directly into a dedicated advertising distribution budget managed by the platform.

### Required UI Copy & Placement:
- **Hero & Card copy**: *"Contributions fund ad distribution, not the cause or creator."*
- **Detail page**: Prominent disclaimer banner and detailed breakdown in the expandable *Use of Funds* section.
- **Backing Review & Payment screens**: Mandatory explicit notice and acknowledgement before completing checkout.
- **Receipts**: Clear line-item explanation of ad budget allocation vs platform fees.

---

## 3. User Roles & Access
| Role | Capabilities & Workflow | Account Requirement |
|---|---|---|
| **Audience** | Discovers campaigns, reads stories, inspects sources, shares, provides perception feedback (No / Somewhat / Yes). | **No account needed** (guest browsing). |
| **Creator** | Builds campaigns (manual 5-step or voice/AI), saves drafts, edits, submits for review, monitors funding, views distribution analytics and final reports. | **Account required**. |
| **Backer** | Backs campaigns toward promotion costs. Chooses preset or custom amounts. Inspects fees and estimated reach. Simulated payment. Receives receipts. | **Optional** (guest checkout supported; email only). Public name private by default. |
| **Admin / Reviewer** | Reviews submitted campaigns, checks story integrity, validates sources, audits ad creative & targeting, approves or requests changes or rejects, authorizes distribution, simulates reports. | Demo control panel / internal role-restricted views. |

*Note*: A single user account may act as an Audience member, Creator, and Backer.

---

## 4. Campaign Lifecycle State Machine
Strict state machine enforced on both API and client. Invalid transitions must return HTTP 409 Conflict.

```
DRAFT ──> SUBMITTED ──┬──> APPROVED ──> FUNDING ──> FUNDING_CLOSED ──> DISTRIBUTION_PREP ──> PROMOTING ──> COMPLETED
                      │                   │              │                     │                 │
                      ├──> CHANGES_REQ    └──> CANCELLED └──> REFUND_PENDING   └──> CANCELLED    └──> FAILED
                      │         │
                      │         └──> SUBMITTED (after creator edits)
                      │
                      └──> REJECTED
```

### Transition & Lifecycle Rules:
1. **Public Visibility**: Only campaigns in `FUNDING`, `PROMOTING`, or `COMPLETED` are publicly visible or discoverable.
2. **Backing Window**: Campaigns are backable *only* while in status `FUNDING`.
3. **Funding Goal vs Promotion**: Reaching the funding goal or closing the funding window does **not** automatically launch ads. Ads launch only after passing `DISTRIBUTION_PREP` (approvals verified, payment settled, budget allocated, ad placements configured).
4. **Content Immutability**: Once published (`FUNDING`), material edits are locked. Submitting material changes creates a revision draft and returns the campaign to `CHANGES_REQUESTED` / `SUBMITTED` review before ad changes take effect.

---

## 5. Money Model, Reach Formulas & Demo Config
All calculations must be sourced from a single shared configuration in `packages/shared/src/config/estimates.ts` and `packages/shared/src/reach.ts`.

### Demo Configuration Parameters:
- **Platform Fee**: 10% of contribution (`platformFeePct = 0.10`).
- **Processing Fee (Payment)**: 2.9% + $0.30 (`processingPct = 0.029`, `processingFixedCents = 30`).
- **Ad Budget Allocation**: 90% of contribution (`adBudgetPct = 0.90`).
- **Assumed CPM**: $6.00 per 1,000 impressions (`cpm = 6.00`).
- **Assumed Average Frequency**: 2.2 impressions per unique person (`avgFrequency = 2.2`).
- **Reach Estimate Range**: ±30% display range (`rangePct = 0.30`).
- **Reach per $1 Contributed**: `0.90 * (1000 / 6) / 2.2 ≈ 68 people` (Range: ~48–89 people).
- **Minimum Threshold to Run**: 25% of funding goal if period ends underfunded; otherwise refund.
- **Preset Contribution Amounts**: $5, $10, $25, $50, $100 (Minimum contribution: $1).

### Formulas:
```ts
adBudgetCents       = contributionCents * (1 - platformFeePct)
processingFeeCents  = Math.round(contributionCents * processingPct) + processingFixedCents
totalChargeCents    = contributionCents + processingFeeCents
impressions         = (adBudgetCents / 100) / cpm * 1000
estimatedReachMid   = Math.round(impressions / avgFrequency)
estimatedReachLow   = Math.round(estimatedReachMid * (1 - rangePct))
estimatedReachHigh  = Math.round(estimatedReachMid * (1 + rangePct))
```

### Mandatory Labeling Rule:
- Always label reach estimates: **"Estimated reach · based on demo assumptions · not a guarantee."**
- Never display fixed audience numbers as guarantees.
- Always display `DemoDataBadge` on demonstration data.

---

## 6. Technology Decisions (Non-Negotiable)
- **Monorepo**: npm workspaces (`apps/mobile`, `apps/api`, `packages/shared`).
- **Mobile Client**: Expo (latest stable SDK) + React Native + TypeScript.
- **Mobile Navigation**: Expo Router (file-based navigation) with stable 5-tab bar.
- **Styling**: Vanilla `StyleSheet` + typed design tokens. **No NativeWind/Tailwind**.
- **Animation & Haptics**: `react-native-reanimated` + `expo-haptics`.
- **Media**: `expo-image` (caching/blurhash), `expo-image-picker`, `expo-document-picker`.
- **Icons**: `lucide-react-native` + `react-native-svg`.
- **Typography**: `@expo-google-fonts/plus-jakarta-sans` (UI) and `@expo-google-fonts/newsreader` (Editorial story body).
- **Client State**: Zustand with AsyncStorage persistence for drafts, preferences, auth state.
- **Server State**: TanStack Query (React Query) for caching, pagination, optimistic updates.
- **Forms & Validation**: `react-hook-form` + `zod` schemas imported from `packages/shared`.
- **Backend API**: Node.js + Express + TypeScript (`tsx` for dev runtime).
- **Database & ORM**: PostgreSQL (Supabase / local Docker) + Prisma ORM.
- **Authentication**: Email + password, bcrypt, JWT access tokens (15m) + refresh tokens (7d). Guest access allowed for browsing and guest backing.
- **AI Integration**: Backend-only `/ai/*` routes communicating with Gemini LLM; structured JSON output with strict fallback demo mode. API keys never exposed in mobile client.
- **Voice Creation**: `expo-speech-recognition` with guaranteed scripted demo fallback mode.
- **Payments**: Simulated dummy payment provider with magic test card numbers (success, declined, insufficient funds, pending 3DS verification, cancelled).
- **Media Uploads**: Local API `/uploads` with Multer (or Supabase Storage).
- **Build & Distribution**: EAS Build (Android APK preview profile, iOS production profile) & EAS Submit.

---

## 7. Monorepo Structure
```
/
├── apps/
│   ├── mobile/             # React Native (Expo Router) app
│   └── api/                # Express + Prisma REST API
├── packages/
│   └── shared/             # Shared TypeScript types, Zod schemas, reach & lifecycle logic
├── docs/                   # BRIEF.md, GUIDE.md, reference screenshots, QA.md, DEPLOY.md
├── .agent/
│   ├── rules/              # 00-project.md, 10-design-system.md
│   └── workflows/          # verify.md
└── package.json            # npm workspaces root
```

---

## 8. Code & Quality Conventions
1. **Strict TypeScript**: `strict: true`, `noImplicitAny: true`. Absolutely **no `any`** types—use `unknown`, proper generics, or Zod-inferred types.
2. **Single Source of Truth**: All domain entities, DTOs, Zod schemas, and lifecycle enums live in `packages/shared`.
3. **Typed API Client**: Mobile app consumes API through a strongly-typed fetch wrapper with normalized error handling (`{ error: { code, message, fields? } }`).
4. **Small Reusable Components**: Follow the component library in `10-design-system.md`. Build once, reuse everywhere.
5. **No Magic Numbers**: Never hardcode colors, padding, margins, font sizes, or radii inline. Always import design tokens (`src/theme/tokens.ts`).
6. **Documentation Integrity**: Preserve existing comments and docstrings.

---

## 9. UX Rules & Standards
1. **Comprehensive State Handling**: Every screen, query, and mutation must handle 6 essential states:
   - `Loading` (skeleton shimmer placeholder)
   - `Empty` (purposeful illustration/icon, message, clear CTA)
   - `Error` (human-readable message with retry button)
   - `No-results` (search/filter zero results with clear-filters CTA)
   - `Pending` (in-flight network action indicator)
   - `Success` (subtle animation, toast or confirmation)
2. **No Dead Buttons**: Every touchable element must trigger a real action. If a secondary feature is out of prototype scope, it must be hidden or clearly badged "Coming soon" with an explanation.
3. **Sticky Primary Action Bar**: Campaign detail, 5-step creation, and backing checkout must have a sticky, safe-area-aware bottom action bar.
4. **Touch Target Size**: Minimum 48x48 dp touch target on all interactive elements. Primary action buttons must be 52 dp height.
5. **Readable Contrast**: Text-to-background contrast must satisfy WCAG AA (≥ 4.5:1). Status indicators must never rely on color alone (must include icon + text label).
6. **Creation Flow Purity**: Strict 5-step flow: **Basics → Story → Campaign & Ad Visuals → Reach → Submit**. No extraneous setup screens between steps. Funding goal is set **only** by creator on Step 5 (never auto-filled by AI).
7. **Draft Resilience**: Form state preserved on backward navigation; debounced autosave to local store and server; drafts resumable after app reload.
