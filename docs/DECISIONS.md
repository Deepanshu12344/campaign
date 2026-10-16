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


