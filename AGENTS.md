# Campaigns Architecture & Agent Directives
1. System Rules: Follow `.agent/rules/00-project.md` for architecture, state machine, reach math, and non-negotiables.
2. Design Tokens: Follow `.agent/rules/10-design-system.md` for colors, typography, spacing, radius, and components.
3. Verification: Execute `.agent/workflows/verify.md` for typecheck, lint, API tests, and manual acceptance tests.
4. Core Principle: NOT a donation; contributions strictly fund ad distribution to spread the campaign message.
5. Monorepo Layout: Expo Router in `apps/mobile`, Express + Prisma in `apps/api`, shared schemas in `packages/shared`.
6. Code Quality: Strict TypeScript (no `any`), typed API client, shared zod validation, design tokens everywhere.
7. UX Standards: Loading skeleton, empty, error, no-results, pending, and success states on all screens; no dead buttons.
8. Creation Flow: Strictly 5 steps (Basics → Story → Visuals → Reach → Submit); funding goal entered ONLY on step 5.
9. Transparency: Visible sources, private backer names by default, simulated checkout, and labelled demo estimates.
10. Source of Truth: Consult `docs/BRIEF.md` and `docs/GUIDE.md` for full specs; never improvise core product flows.
