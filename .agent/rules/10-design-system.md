# 10-design-system.md: Design System Tokens & Component Standards

> **UI/UX Standard for Antigravity Agents**: All frontend styling in `apps/mobile` must strictly adhere to the tokens and component specifications defined here. No inline magic numbers, no unregistered colors.

---

## 1. Aesthetic Direction & Principles
- **Visual Feel**: Premium, calm, credible, editorial. Abundant whitespace, balanced negative space, refined typography.
- **Hierarchy**: One clear primary action per screen. Keep secondary details expandable (accordions/sheets).
- **Mobile-First Ergonomics**: Designed for comfortable one-handed use, touch targets ≥ 48×48 dp, sticky action bars pinned within safe area insets.
- **Accessibility**: Minimum 4.5:1 contrast for all text. Status is never conveyed through color alone (always icon + label). Respect system Dynamic Type and reduced-motion preferences.

---

## 2. Color Tokens
All styles in `apps/mobile` must reference `theme.colors.*`.

| Token Key | Hex Value | Semantic Role & Usage |
|---|---|---|
| `primary-600` | `#4F46E5` | Primary brand indigo: CTA buttons, active tabs, progress fills, links |
| `primary-700` | `#4338CA` | Pressed / active state for primary actions |
| `primary-50` | `#EEF2FF` | Tinted indigo background, selected chip backgrounds |
| `ink-900` | `#0F172A` | Primary headings, display text, dark icons (high contrast) |
| `ink-700` | `#334155` | Primary body copy, form inputs, navigation labels |
| `ink-500` | `#64748B` | Secondary captions, helper text, timestamps, placeholders |
| `line` | `#E2E8F0` | Dividers, card borders, input borders |
| `bg` | `#F8FAFC` | Main app background (calm off-white/slate) |
| `surface` | `#FFFFFF` | Card surfaces, sheet backgrounds, elevated containers |
| `success` | `#16A34A` | Funded status, approval checkmarks (Badge bg: `#DCFCE7`) |
| `warning` | `#D97706` | Under review, changes requested, pending action (Badge bg: `#FEF3C7`) |
| `danger` | `#DC2626` | Error states, rejected, decline alerts, destructive buttons (Badge bg: `#FEE2E2`) |
| `info` | `#0284C7` | Reach estimates, educational notes, informational tips (Badge bg: `#E0F2FE`) |

---

## 3. Typography Scale & Fonts

### Font Families
- **UI & System Typography**: `Plus Jakarta Sans` (`PlusJakartaSans-Regular` [400], `Medium` [500], `SemiBold` [600], `Bold` [700])
- **Editorial Story Typography**: `Newsreader` (`Newsreader-Regular` [400], `Newsreader-MediumItalic` [500i])

### Scale
| Name | Font Family | Size (px) | Line Height (px) | Weight / Style | Primary Application |
|---|---|---|---|---|---|
| **Display** | Plus Jakarta Sans | 32 | 38 | Bold (700) | Hero headlines |
| **H1** | Plus Jakarta Sans | 26 | 32 | Bold (700) | Screen titles |
| **H2** | Plus Jakarta Sans | 20 | 26 | SemiBold (600) | Section headers |
| **H3** | Plus Jakarta Sans | 17 | 24 | SemiBold (600) | Card titles, modal headers |
| **Body** | Plus Jakarta Sans | 16 | 24 | Regular (400) / Medium (500) | Standard UI labels, inputs |
| **Small** | Plus Jakarta Sans | 14 | 20 | Regular (400) / Medium (500) | Metadata, sub-labels |
| **Caption** | Plus Jakarta Sans | 12 | 16 | Regular (400) / SemiBold (600) | Badges, timestamps, counters |
| **Story Body** | Newsreader | 18 | 28 | Regular (400) | Long-form editorial text (~60 char width feel) |

---

## 4. Spacing, Radius & Elevation Tokens

### Spacing (4-pt Grid)
`theme.spacing.*`:
- `xs`: 4
- `sm`: 8
- `md`: 12
- `base`: 16
- `lg`: 20 (standard screen side padding)
- `xl`: 24
- `2xl`: 32
- `3xl`: 40
- `4xl`: 56

### Border Radius
`theme.radius.*`:
- `input`: 12 (text fields, chips, selectors)
- `card`: 16 (campaign cards, content containers)
- `sheet`: 24 (bottom sheets, hero containers)
- `pill`: 999 (status badges, category chips, circular avatars)

### Elevation & Shadows
- **Card Shadow (Soft)**:
  `shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2`
- **Elevated Sticky Bar Shadow**:
  `shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8`

---

## 5. Motion, Haptics & Interaction
- **Transition Duration**: 150ms – 250ms ease-out.
- **Button Press Feedback**: Scale transform to `0.98` with subtle opacity transition (`0.9`).
- **Progress Bars**: Smoothly animate percentage width from `0` to target on mount using Reanimated.
- **Haptic Feedback**: Trigger `expo-haptics` (`notificationAsync(Success)` or `impactAsync(Light)`) on key milestones (contribution success, draft save, step completion).
- **Reduced Motion**: Fall back to instant opacity or static layouts when `AccessibilityInfo.isReduceMotionEnabled` is true.

---

## 6. Reusable Component Specifications
All components live in `apps/mobile/src/components/ui/` and must be built for reusability.

1. **`Button`**:
   - Variants: `primary`, `secondary`, `ghost`, `danger`.
   - Sizes: `lg` (52dp height, full-width in sticky bar), `md` (44dp), `sm` (36dp).
   - Props: `loading`, `disabled`, `iconLeft`, `iconRight`, `onPress`.
2. **`Card`**: Base container with `surface` background, `radius.card` (16), and soft card shadow.
3. **`CampaignCard`**:
   - Variants: `default` (standard vertical feed card), `compact` (horizontal list card), `featured` (large hero card for carousels).
   - Exact Contents: Cover image, Category chip, 2-line title, Creator name with creator-type icon, 2-line editorial summary, Amount raised / Funding goal, Animated progress bar with percentage, "Est. reach at goal: ~X–Y people", Primary action button ("Back This Campaign").
4. **`ProgressBar`**: Smooth animated progress bar with background `line` and fill `primary-600` (or `success` when 100%+).
5. **`StatusPill`**: Combined icon and text label for all campaign lifecycle states (`Draft`, `Under Review`, `Changes Requested`, `Funding`, `Promoting`, `Completed`, `Rejected`, `Failed`).
6. **`CategoryChip`**: Icon + label pill for the 10 categories, toggling between unselected (`bg`, border `line`) and selected (`primary-50`, text `primary-600`).
7. **`Skeleton`**: Subtle shimmering placeholder component with animated opacity for loading states.
8. **`EmptyState`**: Purposeful icon, clear headline, explanatory body copy, and a primary CTA button.
9. **`ErrorState`**: Clear error icon, friendly explanation, and a "Try Again" retry action.
10. **`Toast`**: Context-driven ephemeral notification banner (success, info, warning, error) with auto-dismiss.
11. **`Accordion`**: Expandable card section with chevron rotation and height animation.
12. **`InfoTip`**: Tappable `(i)` icon opening a bottom-sheet modal with plain-language explanations for unfamiliar terms:
    - *Estimated Reach*
    - *Platform Fee*
    - *Use of Funds*
    - *Review Process*
    - *CPM & Frequency*
    - *Funding vs Promotion*
13. **`StepIndicator`**: 5-step horizontal tracker (**1 Basics → 2 Story → 3 Visuals → 4 Reach → 5 Submit**). States: `completed`, `current`, `upcoming`. Allows tapping on previously completed steps.
14. **`StickyActionBar`**: Fixed bottom bar with safe-area padding, top border or elevated shadow, containing primary CTA button and optional secondary action.
15. **`Field` / `TextField` / `TextArea`**: Complete input wrapper with label, required asterisk, helper text, character counter, and inline validation error text.
16. **`Sheet`**: Accessible bottom sheet container with backdrop, drag handle, and dismiss gesture.
17. **`Segmented`**: iOS-style segmented pill selector for switching tabs or views.
18. **`Avatar`**: Circular user/creator image with initials fallback.
19. **`Stat`**: High-impact statistic display: large value, descriptive label, and optional source citation.
20. **`SourceItem`**: Clean external link card displaying source title, publisher, URL domain, and verified review indicator.
21. **`Timeline`**: Vertical chronological progression component used for review history and campaign updates.
22. **`ReachEstimateBadge`**: Informative pill displaying `~X–Y people reached` accompanied by an InfoTip trigger.
23. **`DemoDataBadge`**: Distinct subtle badge stating `Demo data` to ensure complete transparency across prototype screens.
