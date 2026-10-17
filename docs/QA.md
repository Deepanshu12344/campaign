# End-to-End Manual QA Script & Acceptance Test Runbook

This document defines the comprehensive manual QA test script, numbered checklist, and expected verification results for **Campaigns**. It covers complete end-to-end user journeys (Backer, Creator, Reviewer) and specified edge cases (offline autosave, double-tap protection, back navigation state retention, session expiration, backend latency/failures, content boundary stress testing, and accessibility viewports).

---

## 1. Test Environment & Test Fixtures

### Test Accounts (Seeded)
| Role | Email | Password | Purpose |
|---|---|---|---|
| **Backer (User)** | `backer@demo.com` | `Demo@1234` | Community backer, portfolio, payment history |
| **Creator** | `creator@demo.com` | `Demo@1234` | Creator campaigns, draft authoring, analytics |
| **Admin / Reviewer** | `admin@demo.com` | `Demo@1234` | Review queue inspection, decisions, lifecycle |

### Magic Test Cards (Simulated Payment Provider)
| Card Number | Expiry | CVC | Expected Result | Simulates |
|---|---|---|---|---|
| `4242 4242 4242 4242` | `12/28` | `123` | **SUCCEEDED** | Standard approved transaction; receipt generated immediately |
| `4000 0000 0000 0002` | `12/28` | `123` | **FAILED** (`CARD_DECLINED`) | Insufficient bank permissions or issuer block |
| `4000 0000 0000 9995` | `12/28` | `123` | **FAILED** (`INSUFFICIENT_FUNDS`) | Balance lower than contribution charge |
| `4000 0000 0000 3220` | `12/28` | `123` | **PENDING** (`VERIFICATION_REQUIRED`) | 3D Secure / bank verification in flight; auto-resolves |

---

## 2. Core User Journey Checklists

### Journey 1: Backer Journey (Discovery to Verified Receipt)

#### 1.1 Browse & Discover Campaigns
- [ ] **Step 1.1.1**: Open the app. The **Home Tab** loads with header, Hero demonstration card, Category Filter Chips, and curated campaign feed.
  - *Expected*: Zero loading spinners lingering. Hero displays *"Contributions fund ad distribution, not the cause or creator."* with `DemoDataBadge`.
- [ ] **Step 1.1.2**: Navigate to the **Explore Tab**. Tap category chips (e.g., *Health*, *Environment*).
  - *Expected*: Server-side filtered campaigns update dynamically with matching items and correct category counts.
- [ ] **Step 1.1.3**: Test search bar in Explore tab by typing `"Jackson"`.
  - *Expected*: Results filter to campaigns containing the search query in title, summary, or story.
- [ ] **Step 1.1.4**: Open Sort modal, select *"Most Funded"*, then *"Ending Soon"*.
  - *Expected*: Campaign cards re-order correctly by funding progress or deadline.

#### 1.2 Campaign Detail & Transparency Inspection
- [ ] **Step 1.2.1**: Tap on a campaign card in status `FUNDING`.
  - *Expected*: Opens Campaign Detail screen. Sticky bottom action bar displays *"Back this campaign"* and days remaining.
- [ ] **Step 1.2.2**: Inspect the *Use of Funds* section.
  - *Expected*: Explains the 10% platform fee and 90% direct ad budget split. Clarifies that funds never go to the creator.
- [ ] **Step 1.2.3**: Inspect the verified sources list.
  - *Expected*: Each source displays title, domain pill, and clickable external link.
- [ ] **Step 1.2.4**: Tap perception feedback buttons (*No* / *Somewhat* / *Yes*).
  - *Expected*: Visual feedback confirms selection; aggregate count updates without requiring login.

#### 1.3 Backing Flow: Amount & Quote Math
- [ ] **Step 1.3.1**: Tap *"Back this campaign"* button.
  - *Expected*: Step 2 (Amount) screen opens with presets ($5, $10, $25, $50, $100) and custom input field.
- [ ] **Step 1.3.2**: Tap preset chips `$25`, then `$50`, then enter custom `$75`.
  - *Expected*: Reach card recalculates in real-time matching the formula:
    - Ad Budget: 90%
    - Processing fee: 2.9% + $0.30
    - Reach range displays formatted as `~X,XXX – Y,YYY people reached · Estimate, not a guarantee`.
- [ ] **Step 1.3.3**: Enter invalid amount `$0.50` (under $1.00 minimum).
  - *Expected*: Inline validation warning appears: *"Minimum contribution is $1.00"*. Continue button is disabled.

#### 1.4 Review & Simulated Payment
- [ ] **Step 1.4.1**: Select `$25` and tap *"Continue to Review"*.
  - *Expected*: Step 3 (Review) displays fee breakdown, net ad spend, and privacy toggle (anonymous by default).
- [ ] **Step 1.4.2**: Toggle privacy from Anonymous to Public, enter name `"Jordan Reed"`.
  - *Expected*: Input saves to backing store.
- [ ] **Step 1.4.3**: Tap *"Proceed to Payment"*.
  - *Expected*: Step 4 (Pay) renders simulated payment form with prepopulated magic card buttons.
- [ ] **Step 1.4.4**: Tap *"Declined Test Card"* (`...0002`) and submit.
  - *Expected*: Payment fails with user-friendly alert: *"Card declined by issuer"*. Card form remains active for retry.
- [ ] **Step 1.4.5**: Tap *"Success Test Card"* (`4242...`) and submit.
  - *Expected*: Progress indicator displays during settlement, followed by instant transition to Confirmation / Result screen.

#### 1.5 Official Receipt & Claiming
- [ ] **Step 1.5.1**: On the confirmation screen, inspect receipt summary.
  - *Expected*: Displays official `REC-XXXXX` receipt number, contribution amount, breakdown, and card brand/last4.
- [ ] **Step 1.5.2**: If backing as a guest, tap *"Save Receipt"* or link to account.
  - *Expected*: Guest token is persisted in device `SecureStore` (or `localStorage` on web), accessible in Payment History.
- [ ] **Step 1.5.3**: Sign in as `backer@demo.com` and open `Profile > Payments`.
  - *Expected*: Receipt displays in transaction history with full line-item details.

---

### Journey 2: Creator Journey (5-Step Creation to Review Submission)

#### 2.1 Creation Initiation & Step 1: Basics
- [ ] **Step 2.1.1**: Sign in as `creator@demo.com`. Navigate to **Create Tab**.
  - *Expected*: Displays Create Hub with options: *"Start 5-Step Campaign"* or *"Interactive Voice Flow"*.
- [ ] **Step 2.1.2**: Tap *"Start 5-Step Campaign"*.
  - *Expected*: Newly spawned draft opens at Step 1: Basics. `fundingGoalCents` initializes to 0 (isolated until Step 5).
- [ ] **Step 2.1.3**: Enter title (max 60 chars), select category (*Environment*), creator name, and summary (max 160 chars).
  - *Expected*: Character countdown indicators update with green/amber/red indicators. Autosave indicator confirms *"Saved"*.
- [ ] **Step 2.1.4**: Tap *"Generate Ideas with AI"*.
  - *Expected*: AI generates draft title and summary suggestions without setting or overwriting the funding goal.

#### 2.2 Step 2: Story & Verified Sources
- [ ] **Step 2.2.1**: Tap *"Continue to Story"* in the StepIndicator.
  - *Expected*: Step 2 loads with story block builder and source link manager.
- [ ] **Step 2.2.2**: Add heading block and 300+ characters of content.
  - *Expected*: Story character counter turns green when minimum 300 characters is reached.
- [ ] **Step 2.2.3**: Add at least one verified source with title and valid URL (`https://...`).
  - *Expected*: Source item displays with domain tag and verified checkmark.

#### 2.3 Step 3: Visuals & Ad Creative
- [ ] **Step 2.3.1**: Advance to Step 3: Visuals.
  - *Expected*: Upload zones for Cover Image and Ad Creative Assets appear.
- [ ] **Step 2.3.2**: Upload an image or select a preset unsplash photo.
  - *Expected*: Aspect ratio preview renders correctly in 16:9 (Cover) and 1:1 / 4:5 (Ad Creative).
- [ ] **Step 2.3.3**: Enter Ad Headline (max 40 chars), Description (max 90 chars), and select CTA button (*"Learn More"*).
  - *Expected*: Live Social Ad Preview renders real-time composite ad mockups across Meta and Google formats.

#### 2.4 Step 4: Audience & Reach Targeting
- [ ] **Step 2.4.1**: Advance to Step 4: Reach.
  - *Expected*: Location search, channel selection chips, budget allocation sliders, and duration picker appear.
- [ ] **Step 2.4.2**: Select target locations (e.g. *"Austin, TX"*).
  - *Expected*: Location chips added.
- [ ] **Step 2.4.3**: Select channels: *Meta Feed* and *Google Search*. Adjust slider to 60% / 40%.
  - *Expected*: Sum validates to exactly 100%. If unbalanced, *"Rebalance equally"* button snaps sum to 100%.

#### 2.5 Step 5: Funding Goal & Mandatory 4 Confirmations Gate
- [ ] **Step 2.5.1**: Advance to Step 5: Submit.
  - *Expected*: **Funding Goal input appears for the first and only time**.
- [ ] **Step 2.5.2**: Select goal preset `$2,500` or enter custom `$1,000`.
  - *Expected*: Reach projection recalculates with 90% ad budget ($900) and 10% platform fee ($100).
- [ ] **Step 2.5.3**: Attempt to tap *"Submit Campaign"* before checking confirmation boxes.
  - *Expected*: Submit button is disabled; checklist highlights the 4 required checkboxes.
- [ ] **Step 2.5.4**: Check all 4 checkboxes:
  1. *Content ownership & rights confirmed*
  2. *Compliance with platform community guidelines*
  3. *Acknowledgement that funds strictly purchase ad distribution*
  4. *Agreement to reviewer feedback and editorial changes*
  - *Expected*: Submit button activates with haptic feedback.
- [ ] **Step 2.5.5**: Tap *"Submit Campaign for Review"*.
  - *Expected*: Draft transitions to `SUBMITTED`. Confirmation screen displays queue status and estimated review timeline.

---

### Journey 3: Reviewer & Lifecycle Progression Journey

#### 3.1 Accessing Reviewer Demo Console
- [ ] **Step 3.1.1**: Sign in as `admin@demo.com`. Navigate to `Profile > Settings`.
  - *Expected*: Displays *"Reviewer Demo Console"* navigation button (or tap app version 7 times).
- [ ] **Step 3.1.2**: Tap *"Reviewer Demo Console"*.
  - *Expected*: Opens `demo/control.tsx` badged with permanent banner: *"Internal - reviewer demo"*.

#### 3.2 Review Inspection & Decisions
- [ ] **Step 3.2.1**: Select the newly submitted campaign from the queue.
  - *Expected*: Opens detailed Review Inspection Suite showing Story, Sources, Ad Creative, Targeting, and Goal.
- [ ] **Step 3.2.2**: Test *Request Changes* decision: Enter note *"Please add a medical journal source"* and submit.
  - *Expected*: Campaign status transitions to `CHANGES_REQUESTED`. Creator receives in-app notification.
- [ ] **Step 3.2.3**: Test *Approve* decision: Tap *"Approve Campaign"* with notes.
  - *Expected*: Campaign transitions `SUBMITTED -> APPROVED -> FUNDING`. Starts date/time is stamped. Campaign becomes publicly visible in Explore and Home feeds.

#### 3.3 Post-Funding Lifecycle Progression
- [ ] **Step 3.3.1**: In Demo Console, tap *"Simulate Full Funding Goal"*.
  - *Expected*: Campaign funding reaches 100%. Status automatically transitions to `FUNDING_CLOSED` (**never directly to PROMOTING**).
- [ ] **Step 3.3.2**: Tap *"Advance to Distribution Prep"*.
  - *Expected*: Preconditions checklist validates funds settlement and targeting parameters. Transitions to `DISTRIBUTION_PREP`.
- [ ] **Step 3.3.3**: Tap *"Launch Ad Promotion"*.
  - *Expected*: Status transitions to `PROMOTING`. Creator and backers receive notification *"Ad Distribution Active"*.
- [ ] **Step 3.3.4**: Tap *"Complete Campaign Distribution"*.
  - *Expected*: Status transitions to `COMPLETED`. Performance report is finalized with `reachType: 'MEASURED'`.
- [ ] **Step 3.3.5**: Open Public Performance Report (`campaign/[id]/report`).
  - *Expected*: Shows delivered impressions, measured reach, click-through rate, and clear distinction between initial estimate vs measured delivery.

---

## 3. Resilience & Edge Cases Checklist

### 3.1 Offline Autosave & Sync Resilience
- [ ] **Test 3.1.1**: While editing a draft in Step 1 or Step 2, toggle airplane mode (or disconnect network).
- [ ] **Test 3.1.2**: Continue editing the title, summary, or story blocks.
  - *Expected*: Status badge switches to `Offline (pending sync)`. Changes are saved locally to `AsyncStorage`.
- [ ] **Test 3.1.3**: Re-enable network connectivity.
  - *Expected*: Within 5 seconds, background autosave automatically triggers, sending dirty fields to `PATCH /campaigns/:id/draft`. Status badge transitions to `All changes saved`.

### 3.2 Double-Tap & Rapid Tap Protection
- [ ] **Test 3.2.1**: On the Backing Payment screen, rapidly double-tap or triple-tap the *"Pay $25.00"* button.
  - *Expected*: Button disables immediately upon first press; in-flight spinner activates. Exactly one payment request is sent; no duplicate contribution or double-charge occurs.
- [ ] **Test 3.2.2**: On Step 5 (Submit), rapidly double-tap *"Submit Campaign"*.
  - *Expected*: Button locks with `isSubmitting: true`. Only one submission event is recorded.

### 3.3 Back Navigation Amount Retention
- [ ] **Test 3.3.1**: On Backing Step 2 (Amount), enter a custom amount: `$175.00`.
- [ ] **Test 3.3.2**: Tap *"Continue to Review"*. Review screen shows `$175.00`.
- [ ] **Test 3.3.3**: Tap the top-left **Back button** (`< Back`) to return to Amount screen.
  - *Expected*: The Amount screen retains `$175.00` in the input field and displays matching quote math. Does not reset to $25 default.

### 3.4 Expired Session Graceful Recovery
- [ ] **Test 3.4.1**: Simulate an expired access token (e.g., fast-forward time or tamper token). Make an API call.
  - *Expected*: HTTP 401 triggers token refresh using the stored refresh token. Request retries transparently.
- [ ] **Test 3.4.2**: If refresh token is also expired, user is prompted with sign-in sheet without discarding locally buffered draft changes.

### 3.5 Slow / Down Backend Resilience
- [ ] **Test 3.5.1**: Simulate network failure or 500 error on campaign list or detail queries.
  - *Expected*: UI renders `ScreenState` error view with friendly icon, message: *"Unable to connect to server"*, and active *"Try Again"* button. No white-screen crash.
- [ ] **Test 3.5.2**: Restore server and tap *"Try Again"*.
  - *Expected*: Screen seamlessly refetches and displays content.

### 3.6 Content Boundaries: Long Titles & 15+ Story Blocks
- [ ] **Test 3.6.1**: Create a campaign with a maximum length 60-character title:
  `"Neighborhood Solar Community Microgrid Clean Renewable Energy"`
  - *Expected*: Wraps cleanly on 2 lines on mobile without truncation or overflow into adjacent icons.
- [ ] **Test 3.6.2**: Add 15 rich story blocks (alternating headings, long paragraphs, callouts, and stats).
  - *Expected*: Detail screen and StoryRenderer scroll smoothly at 60fps with zero layout jitter.

### 3.7 Small Screen Viewport (360x640)
- [ ] **Test 3.7.1**: Test screens on a 360x640 viewport (Android compact phone).
  - *Expected*:
    - All primary buttons have minimum 48dp touch targets and 52dp height.
    - Sticky bottom bars stay docked above navigation chrome.
    - No horizontal scrolling or text clipped off-screen.

### 3.8 Large Text Size (130% Dynamic Type Font Scaling)
- [ ] **Test 3.8.1**: Scale system font size to 130%.
  - *Expected*:
    - Button text wraps or scales without clipping.
    - Form inputs use `minHeight: 48` rather than rigid fixed height.
    - Modal sheets remain readable and scrollable.

---

## 4. Verification Execution Commands

To execute the automated regression test suites backing this QA runbook:

```bash
# 1. Run full monorepo test suites (API, Mobile, Shared)
npm test

# 2. Run API test suite individually
npm test --workspace=apps/api

# 3. Run Mobile test suite individually
npm test --workspace=apps/mobile

# 4. Run Shared package test suite individually
npm test --workspace=packages/shared

# 5. Typecheck all workspaces
npm run typecheck

# 6. Lint all workspaces
npm run lint
```
