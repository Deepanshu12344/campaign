# Android APK Smoke Test & Acceptance Checklist

This document provides a step-by-step verification checklist for the **Campaigns** Android APK generated with EAS Build (`preview` profile).

---

## 1. Test Environment & Device Pre-requisites

- **Target Device / Emulator**: Android phone or emulator running Android 10 (API 29) through Android 15 (API 35).
- **Architecture**: `arm64-v8a` (standard modern device) or `x86_64` (emulator).
- **Backend Environment**: Live production API at `https://campaign-admj.onrender.com/api/v1` (verify health at `https://campaign-admj.onrender.com/health`).
- **Device Setting**: "Install unknown apps" enabled for the browser (Chrome) or file manager used to install the `.apk`.

### Seeded Test Accounts
| Role | Email | Password | Primary Test Scope |
|---|---|---|---|
| **Backer** | `backer@demo.com` | `Demo@1234` | Backing campaigns, portfolio, receipts, privacy toggle |
| **Creator** | `creator@demo.com` | `Demo@1234` | 5-step campaign creation, draft autosave, analytics |
| **Admin** | `admin@demo.com` | `Demo@1234` | Review queue inspection, moderation, lifecycle advancement |

### Simulated Test Cards
| Card Number | Expiry | CVC | Expected Result | Simulates |
|---|---|---|---|---|
| `4242 4242 4242 4242` | `12/28` | `123` | **SUCCEEDED** | Approved simulated payment; generates official `REC-XXXXX` receipt |
| `4000 0000 0000 0002` | `12/28` | `123` | **FAILED** (`CARD_DECLINED`) | Issuer decline alert with retry option |
| `4000 0000 0000 9995` | `12/28` | `123` | **FAILED** (`INSUFFICIENT_FUNDS`) | Insufficient funds error with retry option |
| `4000 0000 0000 3220` | `12/28` | `123` | **PENDING** (`VERIFICATION_REQUIRED`) | Simulated 3D-Secure / bank verification flow |

---

## 2. Installation & App Identity

- [ ] **APK Installation**: Package installs cleanly without `INSTALL_FAILED_CONFLICTING_PROVIDER` or parse errors.
- [ ] **App Name & Label**: App label displays as **Campaigns** below the app icon on the home screen and app drawer.
- [ ] **Adaptive Launcher Icon**:
  - Icon displays with lime background (`#9FE870`) and centered dark megaphone mark.
  - Logo mark is fully centered and contained within the safe circular/squircle mask without edge clipping.
- [ ] **Monochrome Themed Icon (Android 13+)**:
  - On devices with dynamic theming enabled, app icon adapts to the system accent palette.
- [ ] **Splash Screen**:
  - Cold launch renders solid lime screen (`#9FE870`) with centered logo mark (`imageWidth: 160`).
  - Smooth fade-in transition into the main screen without white flashing or flickering.

---

## 3. Core Functional Smoke Tests

### Section A: Guest Browsing & Discovery
- [ ] **First Launch**: App opens to the Home tab without requiring login.
- [ ] **Home Feed**:
  - Hero card displays value proposition: *"Help important messages travel further."*
  - "Not a donation" disclaimer chip is clearly visible.
  - Illustrative reach estimate per $1 displays with disclaimer tooltip.
  - Featured campaigns carousel scrolls horizontally with smooth snap.
- [ ] **Explore Tab**:
  - Category filter chips toggle smoothly and filter campaigns dynamically.
  - Search input filters campaigns in real time (debounced).
  - Empty search / filter results display friendly no-results state with "Clear filters" action.
  - Campaign cards display cover image, title, progress bar, days remaining, and reach badge.
- [ ] **Campaign Detail Screen**:
  - Header displays cover image, creator credit, category pill, and share button.
  - Editorial story blocks render cleanly with typography and pull quotes.
  - Inline images render with credit and captions.
  - **Supporting Sources** list renders domain pills and opens source URLs in the external browser.
  - Expandable accordions work: *Use of Funds* (10% platform / 90% ad budget), *Audience & Distribution*, *Review & Trust*.
  - Perception feedback widget (*No / Somewhat / Yes*) registers taps without requiring sign-in.
  - Sticky bottom action bar displays raised progress, days remaining, and "Back this campaign" button.

---

### Section B: Authentication & Profile
- [ ] **Sign In Flow**:
  - Navigate to Profile tab; guest view offers "Sign In" or "Create Account".
  - Sign in as `creator@demo.com` with `Demo@1234`.
  - Profile updates immediately with creator name, email, and creator dashboard shortcut.
- [ ] **Session Persistence**:
  - Force quit the APK from Android recent apps and re-open.
  - Verified user remains signed in (tokens securely persisted via `expo-secure-store`).
- [ ] **Avatar Upload**:
  - In Profile, tap camera icon on avatar circle.
  - System prompts for photo library permission (`READ_MEDIA_IMAGES`).
  - Pick an image; photo uploads to storage, and avatar updates immediately.
- [ ] **Sign Out Flow**:
  - Tap "Sign out" at the bottom of Profile.
  - Session clears immediately; drafts and personal data are wiped from local memory; app returns to guest state.

---

### Section C: Simulated Backing Journey
- [ ] **Step 1 (Amount)**:
  - From Campaign Detail, tap "Back this campaign".
  - Tap preset chips ($10, $25, $50, $100) or enter custom amount.
  - Estimated reach dynamically recalculates in real-time.
  - Entering an amount below $1.00 disables the button with an inline validation message.
- [ ] **Step 2 (Review & Privacy)**:
  - Transparent fee breakdown renders: 90% direct ad budget, 10% platform, processing fee.
  - Anonymous backer toggle defaults to ON.
  - Toggle off to enter a public display name.
  - Mandatory "Not a donation" acknowledgement checkbox must be checked to proceed.
- [ ] **Step 3 (Simulated Payment)**:
  - Yellow simulation banner displays: *"Simulated checkout — no real money"*.
  - Tap "Declined Test Card" (`...0002`) and pay: verify card decline message is shown, form remains editable.
  - Tap "Success Test Card" (`4242...`) and pay: loading indicator appears during processing.
- [ ] **Step 4 (Receipt & Confirmation)**:
  - Instant transition to Confirmation screen.
  - Official `REC-XXXXX` receipt code is displayed with breakdown.
  - Transaction immediately appears in Profile > Backed Campaigns.

---

### Section D: 5-Step Campaign Creation Flow
- [ ] **Entry**: Sign in as `creator@demo.com`, tap Create tab.
- [ ] **Step 1: Basics**:
  - Title input with 60-character counter.
  - Category selector (Environment, Education, Health, etc.).
  - Creator type selector (Individual, Nonprofit, Community).
  - Summary input with 160-character counter.
  - Cover image upload opens system image picker.
  - AI Suggestion Sheet opens and suggests draft titles/summaries (verifying it does NOT set a funding goal).
- [ ] **Voice Creation (expo-speech-recognition)**:
  - Tap voice creation icon/button.
  - System prompts for microphone permission (`RECORD_AUDIO`).
  - Speak into device; spoken transcript fills title/summary fields.
- [ ] **Step 2: Story**:
  - Story character count validates minimum 300 characters before enabling continue.
  - Add at least one verified source URL with publisher name.
  - Editorial preview toggle previews reader presentation.
- [ ] **Step 3: Visuals**:
  - Ad image upload with aspect ratio guidelines (1:1 feed, 4:5 vertical, 1.91:1 banner).
  - Ad headline (max 40 chars) and description (max 90 chars).
  - Call-to-action preset selector.
  - Live preview tabs render simulated Feed Card, Vertical Story, and Web Banner.
- [ ] **Step 4: Reach & Distribution**:
  - Curated location selection and audience interests tags.
  - Channel distribution toggles (Social Feed, Stories, Video, Display).
  - 100% budget rebalancer: adjusting sliders maintains exact 100% total.
- [ ] **Step 5: Submit & Goal**:
  - **Funding goal is entered ONLY on Step 5** ($500 minimum to $50,000 maximum).
  - Full campaign summary with quick edit links to previous steps.
  - Mandatory policy confirmation checkboxes.
  - Tap "Submit for Review"; campaign transitions to `SUBMITTED` status and displays review timeline.
- [ ] **Draft Autosave & Resilience**:
  - Edit draft on Step 2, close app completely, re-open app.
  - Open Create tab; tap "Resume Draft"; verify all fields, blocks, and sources are fully restored.

---

### Section E: Hidden Reviewer Console & Navigation Security
- [ ] **Normal Navigation Check**:
  - Logged out or logged in as `backer@demo.com`: confirm there is **NO** visible link to `/demo/control` or `/dev/components` anywhere in tabs, home, or profile menus.
- [ ] **7-Tap Easter Egg Activation**:
  - In Profile tab, scroll to the bottom version text `"Campaigns v1.0.0 (1)"`.
  - Rapidly tap the version string 7 times within 3.5 seconds.
  - App navigates directly to `/demo/control` (Reviewer Control Panel).
- [ ] **Reviewer Console Verification**:
  - Top header displays red/amber warning banner: *"INTERNAL - REVIEWER DEMO"*.
  - Submitted campaign appears in the "Pending Review" queue.
  - Inspect campaign details, audit checklist, and moderation tools.
  - Decision options work: Approve, Request Changes (with feedback note), Reject.
  - Component gallery shortcut in demo panel opens `/dev/components` successfully.

---

### Section F: Android Hardware & System Polish
- [ ] **Hardware Back Button**:
  - Tapping Android system back button closes open modals, sheets, and drawers before navigating back a screen.
  - Pressing back on root tabs does not crash the application.
- [ ] **Dark UI Theme**:
  - `userInterfaceStyle: "dark"` is enforced; dark backgrounds (`#0D1117`, `#161B22`) and light text (`#F0F6FC`) remain consistent regardless of Android system light/dark mode setting.
  - Android status bar icons remain legible in light tone.
- [ ] **Keyboard Handling**:
  - Opening inputs on Step 1, Step 2, or Backing flow smoothly scrolls content above the soft keyboard without hiding buttons.
- [ ] **Network Error States**:
  - Turn on Airplane mode; pull-to-refresh or tap search.
  - Clean error banner / offline state displays with a "Retry" button.
  - Turn off Airplane mode and tap "Retry"; data resumes loading seamlessly.
