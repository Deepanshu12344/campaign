# Design Reference & Visual System Specification

This document records the visual system study, color sampling, geometric dimensions, typography specifications, and screen-by-screen architectural mapping derived from the reference application screenshots located in `docs/reference/`.

---

## 1. Reference Screens Analysis & Screen Mapping

| Reference Screenshot | Reference Content | Campaigns Screen Mapping | Visual & Structural Elements |
|---|---|---|---|
| `...20.49.40.jpeg` | Splash screen with lime background & centered logo | Mobile Splash Screen | Solid lime background (`#9FE870`), centered geometric mark in dark green (`#163300`) sized ~25% of screen width. Native splash hold until state/fonts load. |
| `...20.49.38(1).jpeg` | Onboarding slide ("160 COUNTRIES...") | Onboarding Slide 1 ("Create. Review. Amplify.") | Segmented progress bar (3 segments), central illustration, uppercase heavy display headline (`ArchivoBlack-Regular`), lime pill button (`#9FE870`, 52dp height) with dark green text (`#163300`). |
| `...20.49.39(1).jpeg` | Onboarding slide ("DISAPPOINT THIEVES") | Onboarding Slide 2 ("Your contribution pays to spread a message...") | Segmented progress bar (segment 2 active), central illustration, uppercase heavy display headline, full-width lime pill button. |
| `...20.49.39.jpeg` | Welcome / Auth landing screen | Welcome / Auth Landing Screen | Segmented progress bar (segment 3 active), central illustration, heavy uppercase display headline, side-by-side lime pill buttons ("Log in" and "Register"), full-width white pill button ("Continue as guest"). |
| `...20.49.41(1).jpeg` | Home feed (Avatar, action pills, promo card, calculator, list rows) | Home Tab (`/(tabs)/index.tsx`) | Sticky header outside FlatList with avatar circle (40dp), lime pill ("+ Start a campaign"), and reactive bottom divider (`scrollY > 8`). Hero uppercase display headline with soothing nature background and pill row. "Amplify vs. Donate" explainer bottom sheet with reach estimate box. Dashed border card ("Create with your voice"). Horizontal promo carousel with dark green gradient, display title, and circular lime arrow button. Bottom tab bar with 4 tabs (`Home`, `Explore`, `Create`, `Activity`). |
| `...20.49.40(1).jpeg` | Recipients screen (top action pills, title, skeleton list rows) | Explore Tab (`/(tabs)/explore.tsx`) & Activity Tab (`/(tabs)/activity.tsx`) | Top row with tinted pill "Filters" (left) and lime pill "Sort" (right). Screen title in Inter SemiBold 34/40. Rounded search input. Text-only category filter pills (`showIcon={false}`). Results list with circular thumbnails and funding progress tags. |
| `...20.49.41.jpeg` | "Choose your travel card" screen (back button, title, option cards) | Create Hub (`/(tabs)/create.tsx`) | 44dp circular surface back button with lime icon. Inter SemiBold 34/40 screen title ("Start a campaign"). Two large surface cards (24dp radius) with heavy uppercase titles ("CREATE MANUALLY", "CREATE WITH YOUR VOICE"), tag pills ("5 steps", "AI-assisted"), supporting text, and 44dp circular lime arrow buttons. "Resume a draft" list rows below. |
| Reference Layout | Profile screen (avatar, handle, account rows) | Profile Screen (`/profile`, `/(tabs)/profile.tsx`) | 44dp circular back button with lime arrow, 144dp centered avatar circle with 40dp lime camera badge, uppercase display name, "Personal account" subtext, dark surface pill (`#2A2D29`) with inline logo mark and `@handle` (tap to copy with toast), photo upload bottom sheet ("Choose photo", "Remove photo"), clean outline icon rows for account sections. |
| Reference Layout | Payments & Receipts (history list and official receipt) | Payments List (`/profile/payments.tsx`) & Official Receipt (`/profile/payments/[id].tsx`) | 32dp circular status icons (`Check`, `Clock`, `AlertCircle`, `X`, `RotateCcw`) with semantic container tint, single-line middle-ellipsis receipt numbers, 44dp circular `Share2` icon button on official receipt header. |
| Reference Layout | Campaign Detail Sticky Bar | Campaign Detail (`/campaign/[id].tsx`) | 4-layer stacked bottom bar: (1) Raised of goal on left, % funded and days left on right; (2) Lime progress bar (6dp height); (3) Projected reach row with chevron opening details sheet; (4) Full-width 52dp lime pill action button with trailing arrow icon. Scroll container bottom inset `220 + insets.bottom`. |
| `...20.49.38.jpeg` | Skeleton screen (placeholder blocks on dark background) | Universal Skeleton & Loading Screens | Surface raised blocks (`#3F423E`) with subtle shimmer animation on `#121511` dark background. Exact structural shapes matching target screens (avatar, pills, large card, list rows). |
| `...20.49.38(2).jpeg` | Notification shade (Duolingo banner) | *Ignored* | External OS notification shade; explicitly excluded from design specification per user directive. |

---

## 2. Sampled Color Tokens & Contrast Validation

Colors were sampled directly from the reference screenshots using Python Pillow across pixel clusters:

```
App Background:            #121511 (rgb: 18, 21, 17)
Card Surface:              #2A2D29 (rgb: 42, 45, 41)
Surface Raised / Skeleton: #3F423E (rgb: 63, 66, 62)
Card Inset / Input Field:  #1B1E19 (rgb: 27, 30, 25)
Line / Inset Border:       #262924 (rgb: 38, 41, 36)
Tab Bar Background:        #1F221E (rgb: 31, 34, 30)

Brand Lime (Primary):      #9FE870 (rgb: 159, 232, 112)
Lime Pressed:              #8BD65C (rgb: 139, 214, 92)
Dark Green (on-lime text): #163300 (rgb: 22, 51, 0)
Tinted Pill Background:    #163300 (rgb: 22, 51, 0)
Tinted Pill Text & Icon:   #9FE870 (rgb: 159, 232, 112)
Dark Green Promo Card:     #0C2400 to #163300 (gradient)

Text Primary (Off-white):  #F2F5EE (rgb: 242, 245, 238)
Text Secondary (Grey):     #A8ADA5 (rgb: 168, 173, 165)
Text Muted:                #70756D (rgb: 112, 117, 109)

Semantic Status (Dark UI Compliant with 16% tinted container backgrounds):
Success:                   #4ADE80 (text/icon) on #0F2E1B (bg)
Warning:                   #FBBF24 (text/icon) on #2E2305 (bg)
Danger:                    #F87171 (text/icon) on #331111 (bg)
Info:                      #38BDF8 (text/icon) on #0C2333 (bg)
```

### Contrast Checks (WCAG AA Compliance)
- **Primary Text (`#F2F5EE`) on App Background (`#121511`)**: **16.1 : 1** (Passes AAA $\ge 7:1$)
- **Primary Text (`#F2F5EE`) on Card Surface (`#2A2D29`)**: **11.4 : 1** (Passes AAA $\ge 7:1$)
- **Dark Green Text (`#163300`) on Lime Button (`#9FE870`)**: **10.8 : 1** (Passes AAA $\ge 7:1$)
- **Lime Accent (`#9FE870`) on App Background (`#121511`)**: **12.3 : 1** (Passes AAA $\ge 7:1$)
- **Secondary Text (`#A8ADA5`) on App Background (`#121511`)**: **7.9 : 1** (Passes AAA $\ge 7:1$)
- **Secondary Text (`#A8ADA5`) on Card Surface (`#2A2D29`)**: **5.6 : 1** (Passes AA $\ge 4.5:1$)

---

## 3. Dimensions, Spacing & Geometry (360dp Baseline)

Measurements taken from screenshots (716px width at 2x scale = 358dp ~ 360dp baseline):

| Dimension | Pixel Measurement | Density-Independent Pixels (dp) | Application |
|---|---|---|---|
| **Horizontal Screen Padding** | 32 px | **16 dp** | Container sides, scroll view padding |
| **Full-Width Button Height** | 104 px | **52 dp** | Primary lime pill buttons, sticky bottom CTA |
| **Compact Pill Button Height** | 80 px | **40 dp** | Action pills ("Explore Campaigns", "Invite", "Send", "Sort") |
| **Small Tag Pill Height** | 56 px | **28 dp** | Filter chips, metadata pills ("Free", "5 steps") |
| **Card Corner Radius** | 48 px | **24 dp** | Surface cards, promo cards, bottom sheet top corners |
| **Input / Inset Corner Radius** | 32 px | **16 dp** | Text fields, text areas, search inputs |
| **Pill Corner Radius** | 9999 px | **9999 dp** (`borderRadius: 9999`) | All button variants and filter chips |
| **Avatar Circle Diameter (Header)** | 80 px | **40 dp** | Header profile avatar, list item avatars |
| **Avatar Circle Diameter (Profile)** | 288 px | **144 dp** | Centered profile screen hero avatar |
| **Camera Action Badge (Profile)** | 80 px | **40 dp** | Circular lime action badge overlay on avatar |
| **Circular Icon Button** | 88 px | **44 dp** | Top-left back button, creation exit X button, circular arrow action buttons, receipt share |
| **Circular Status Icon (Payments)** | 64 px | **32 dp** | Payment history status indicator icons (Check, Clock, AlertCircle, X, RotateCcw) |
| **Small Circular Button** | 64 px | **32 dp** | Calculator swap icon, close trigger |
| **Bottom Tab Bar Height** | 120 px | **60 dp** (+ safe area) | 4-tab persistent bottom navigation bar (Home, Explore, Create, Activity) |
| **Outline Icon Stroke** | 4 px | **2 dp** (`strokeWidth: 2`) | `lucide-react-native` outline style |
| **Gaps Between Sections** | 48–64 px | **24–32 dp** | Vertical rhythm between Home and Detail sections |

---

## 4. Typography Hierarchy & Rules

| Style Role | Font Family | Size / Line Height | Properties | Application |
|---|---|---|---|---|
| **Display Headline** | `ArchivoBlack-Regular` | 32 / 32 (1.0x) | `textTransform: 'uppercase'`, `letterSpacing: -0.5` | Hero banner, onboarding headlines, large card titles |
| **Screen Title** | `Inter-SemiBold` | 34 / 40 | `letterSpacing: -0.5` | Main screen titles ("Recipients", "Explore", "Start a campaign") |
| **Section Title** | `Inter-SemiBold` | 22 / 28 | `letterSpacing: -0.3` | Section headers ("Featured", "Reach calculator", "How it works") |
| **Card Title** | `Inter-SemiBold` | 18 / 24 | Default tracking | Campaign card titles, card subtitles |
| **Body Long-Form** | `Inter-Regular` | 17 / 27 | Off-white text (`#F2F5EE`) | Story text blocks, deep campaign descriptions |
| **Body UI** | `Inter-Regular` | 15 / 22 | Off-white text (`#F2F5EE`) | Form input values, general text, list rows |
| **UI Medium / SemiBold** | `Inter-Medium` / `SemiBold` | 15 / 20 | Button text, labels | Pill buttons, sticky action bar buttons |
| **Caption / Metadata** | `Inter-Medium` | 13 / 18 | Secondary text (`#A8ADA5`) | Timestamps, tags, backer counts, fee disclosures |
