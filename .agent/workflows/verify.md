# verify.md: Project Verification Workflow

> **Workflow Command**: Run this workflow after every major task or prompt to guarantee code health, test passing, and end-to-end functionality across mobile and backend.

---

## 1. Automated Verification Commands

Run these commands in order from the repository root:

```bash
# 1. Typecheck: Verify strict TypeScript compliance across all workspaces
npm run typecheck

# 2. Linting: Verify style and code quality rules
npm run lint

# 3. Unit & Integration Tests: Run shared package and API test suites
npm run test

# 4. API Health Verification
# In terminal 1 (or background):
npm run dev:api
# Verify health endpoint:
curl -s http://localhost:4000/health | grep '"status":"ok"'

# 5. Mobile Bundling Verification
# In terminal 2:
npm run dev:mobile
# Verify Expo bundler starts cleanly with 0 TypeScript/Metro bundling errors.
```

---

## 2. Acceptance Criteria Checklist (Manual Verification)

### A. Audience & Discovery Experience
- [ ] **Guest Access**: Able to browse, explore, search, and view campaign stories without logging in or creating an account.
- [ ] **Home Page**:
  - [ ] Hero clearly communicates: *"Help important messages travel further."*
  - [ ] Illustrative reach estimate per $1 displayed with disclaimer InfoTip.
  - [ ] "Not a donation" disclaimer chip visible.
  - [ ] Featured horizontal carousel and vertical feed render campaign cards.
  - [ ] 3-step explainer (Create → Review → Amplify) is visible and clear.
- [ ] **Explore Screen**:
  - [ ] Search input filters campaigns in real time (debounced).
  - [ ] Category chips toggle and accurately filter campaigns.
  - [ ] Sort sheet (Trending, Newest, Most Funded, Ending Soon, Closest to Goal) re-orders cards.
  - [ ] Filter sheet works (status, funding progress, goal size).
  - [ ] Zero-results state appears when query matches nothing, offering "Clear filters".
- [ ] **Campaign Detail Page**:
  - [ ] Collapsing header with cover image, title, category, and creator.
  - [ ] Rich editorial story blocks render cleanly (Newsreader serif typography, block quotes, statistics).
  - [ ] Inline images render with captions and photographer/creator credits.
  - [ ] **Supporting Sources** section is fully visible to the audience (title, publisher, clickable external link).
  - [ ] Sticky bottom funding bar displays raised vs goal, %, days remaining, estimated reach, and "Back This Campaign" CTA.
  - [ ] Accordions expand: *Use of Funds* (10% fee / 90% ad budget), *Audience & Distribution*, *Review & Trust*, *Updates*.
  - [ ] Perception feedback widget functions (No / Somewhat / Yes) and submits to API.

### B. Backing & Contribution Journey (6 Steps)
- [ ] **Step 1 (Inspect)**: Detail page provides all context and disclaimers.
- [ ] **Step 2 (Amount)**: Preset chips ($5, $10, $25, $50, $100) and custom input dynamically update estimated reach range.
- [ ] **Step 3 (Review)**:
  - [ ] Transparent breakdown: contribution, processing fee, total payment.
  - [ ] Explicit "Not a donation" acknowledgement checkbox.
  - [ ] Anonymous backer toggle (ON by default).
  - [ ] Guest checkout requires email only.
- [ ] **Step 4 (Simulated Payment)**:
  - [ ] Banner clearly declares: *"Simulated checkout — no real money"*.
  - [ ] Card 4242... succeeds.
  - [ ] Card 4000...0002 triggers FAILED (declined).
  - [ ] Card 4000...9995 triggers FAILED (insufficient funds).
  - [ ] Card 4000...3220 triggers PENDING (bank verification polling).
- [ ] **Step 5 (Confirmation)**:
  - [ ] Animated progress update reflecting the new raised total.
  - [ ] Receipt number generated with link to receipt view.
  - [ ] Share campaign button.
- [ ] **Step 6 (Track)**: Contribution appears in user profile and updates activity feed.

### C. Campaign Creation Flow (5 Steps)
- [ ] **Entry Screen**: Offers "Create Manually" and "Create with Your Voice" plus "Resume Draft".
- [ ] **5-Step Flow**:
  - [ ] Persistent 5-step indicator (**Basics → Story → Visuals → Reach → Submit**).
  - [ ] Zero unnecessary setup screens inserted between the 5 steps.
  - [ ] Going back preserves all entered form data.
  - [ ] Form state autosaves continuously.
  - [ ] Quitting the app mid-draft and resuming restores the draft completely.
- [ ] **Step 1 (Basics)**: Title counter (max 60), category picker, creator info, cover image upload.
- [ ] **Step 2 (Story)**: Add, edit, delete, and rearrange story blocks; add verified sources; live editorial preview toggle.
- [ ] **Step 3 (Visuals)**: Ad image upload (1:1, 4:5, 1.91:1 guidance), ad headline (max 40) and description (max 90), CTA preset selector, live placement previews (feed card, vertical story, display banner).
- [ ] **Step 4 (Reach)**: Curated location selection, audience interests, channel toggles, 100% budget rebalancer, clear separation between "You choose" vs "Finalized during review".
- [ ] **Step 5 (Submit)**:
  - [ ] Comprehensive summary of all sections with jump-to-edit links.
  - [ ] **Creator enters funding goal here** ($500–$50,000) — verified that AI or earlier steps never touched this field.
  - [ ] Required policy confirmation checkboxes.
  - [ ] Preview Campaign button opens full unreleased preview.
  - [ ] Submission calls API, transitions status to `SUBMITTED`, and displays status timeline screen.

### D. Creator Dashboard & Lifecycle
- [ ] Dashboard displays tabs: Drafts, Under Review, Funding, Promoting, Completed, Requires Action.
- [ ] Campaign detail in dashboard displays moderation notes, version tracking, and live analytics.
- [ ] Material changes to published campaigns require re-review.
- [ ] Analytics cleanly distinguishes **Estimated Reach** from **Measured Reach** (never combined).
- [ ] Final distribution report renders complete breakdown of funds, ad spend, impressions, reach, clicks.

### E. Demo Control Panel (Reviewer Logic)
- [ ] Hidden reviewer panel accessible (`demo/control.tsx`).
- [ ] Review queue displays submitted campaigns with complete audit inspection.
- [ ] Review decisions (Approve, Request Changes with notes, Reject) persist in `ReviewDecision` and `CampaignEvent`.
- [ ] Lifecycle advancement enforced with checks: `FUNDING_CLOSED` → `DISTRIBUTION_PREP` → `PROMOTING` → `COMPLETED`.
- [ ] Verified that funding completion does NOT auto-launch advertising.

### F. UI / UX Quality & Design System Compliance
- [ ] 100% token compliance (all colors, typography, spacing, radius match `10-design-system.md`).
- [ ] Every screen implements all appropriate states: Loading skeleton, Empty, Error with retry, No-results, Pending, Success.
- [ ] Zero dead buttons (all interactive elements perform an action or display "Coming soon" with reason).
- [ ] All touch targets ≥ 48×48 dp; primary CTA buttons are 52 dp height in sticky bar.
- [ ] Text contrast ≥ 4.5:1 throughout.
- [ ] Every reach estimate displays disclaimer: *"Estimated reach · based on demo assumptions · not a guarantee."*
- [ ] Every demo figure is tagged with `DemoDataBadge`.
