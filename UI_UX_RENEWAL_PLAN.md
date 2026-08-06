# Orderia — UI/UX Renewal Plan

> **Status:** Audit complete; implementation delivered — see [UI_UX_RENEWAL_REPORT.md](./UI_UX_RENEWAL_REPORT.md)
> **Date:** 2026-08-04
> **Scope:** React Native (Expo 53) + PWA waiter/manager operations app
> **Method:** Inspect first, stabilize, then redesign interaction by interaction

---

## 1. Existing application structure

| Layer | Implementation |
| --- | --- |
| Framework | Expo SDK 53, React Native 0.79.6, React 19, TypeScript 5.8 |
| Targets | Android native client + iOS/desktop PWA (`react-native-web`, Workbox service worker) |
| Navigation | React Navigation 6 — native stack over a bottom tab navigator (`src/navigation/AppNavigator.tsx`) |
| State | Zustand stores (`src/stores/`) + React contexts (auth, theme, localization, notifications, analytics) |
| Local data | SQLite (`expo-sqlite`) on native, IndexedDB on web, behind one `LocalDatabase` contract (`src/data/contracts/`) |
| Remote data | Supabase (Postgres, Auth, Realtime), cursor-based pull sync + outbox push worker (`src/data/sync/`) |
| Domain | Pure money/state/receipt rules in `src/domain/`, framework-free and unit-tested |
| Design system | `src/design-system/` — semantic tokens, 20 `Service*` components, adaptive layout hook |
| i18n | `src/i18n/languages.ts` — Turkish, Bulgarian, English |
| Observability | Sentry + redaction layer (`src/observability/`) |
| Tests | 52 Jest suites / 227 tests, Playwright e2e + PWA suites, `supabase test db` |

**Architecture verdict: strong.** The data, sync, and domain layers are well-separated and genuinely tested. This is not a codebase that needs replacing. The problems are concentrated in the interaction layer.

---

## 2. Current functionality (verified by reading call paths)

Working end-to-end: authentication and membership scoping, branch selection, table/hall layout management, order entry and amendment, per-person and group check splitting, payment capture, table move/merge, receipt generation and PDF export, receipt archive with filters and CSV export, manager reports, offline queueing with outbox replay, legacy data migration, PWA install/update lifecycle.

---

## 3. Broken or incomplete functionality

| # | Issue | Location | Severity |
| --- | --- | --- | --- |
| B1 | **Format/lint gate is red.** 207 files carry CRLF line endings against a `endOfLine: "lf"` Prettier config, producing 26,218 ESLint errors. `npm run verify` cannot pass, so no gate protects any subsequent change. | repo-wide | Blocker |
| B2 | **Dead duplicate overlay components.** `src/components/ActionSheet.tsx` and `src/components/EnhancedBottomSheet.tsx` are never imported outside their own folder and still read the retired `constants/branding` palette instead of theme tokens. | `src/components/` | Medium |
| B3 | **Two generations of screens coexist.** `TableDetailScreen` (3,271 lines) and `LegacyTableDetailScreen` (1,477 lines) both live in the tree; `*Modern` screens sit beside the originals they replaced. | `src/screens/` | Medium |
| B4 | **`window.confirm` used for destructive confirmation on web.** Renders a browser chrome dialog inside an installed PWA. Correctly guarded for native, so not a crash — but it breaks the product's visual identity at the exact moment trust matters most. | `SettingsScreen.tsx:160,220` | Medium |

---

## 4. UX problems by screen

| Screen | Problem |
| --- | --- |
| `HallTablesScreenModern` | Every table card carries a permanent **Edit + Delete** button pair beneath it. On a 12-table hall that is 24 competing controls and a one-tap path to destroying a table. Directly violates "no permanent delete button beside every item." |
| `TablesScreenModern`, `MenuScreen` | Same permanent-action-row pattern; no swipe, no long-press, no overflow. |
| `SettingsScreen` (706 lines) | Every setting is on one flat scroll; destructive data operations sit in the same visual weight as language selection. |
| `TableDetailScreen` (3,271 lines) | Undo exists but is a button in a toolbar rather than a post-action snackbar, so the recovery affordance appears before the mistake instead of after it. |
| `AnalyticsScreen`, `HistoryScreen` | Failures surface through `Alert.alert` with raw `error.message`, exposing technical strings to waiters. |
| All list screens | 34 files use `ScrollView`, only 5 use `FlatList` — long receipt and menu lists are unvirtualized. |

---

## 5. Visual design problems

The token layer is genuinely good: a warm terracotta palette with light and dark variants, every pair gated at 4.5:1 WCAG AA by `tokens.test.ts`, a 4-point spacing scale, restrained elevation (hairline borders carry separation, not shadows), and tabular figures on money. **No repaint is warranted.**

The gap is **adoption, not definition** — legacy screens still hardcode values and reach for the retired `constants/branding` module instead of `useTheme().tokens`.

---

## 6. Navigation problems

- Five bottom tabs (Masalar, Orders, Menu, Receipts, Home) sit at the documented upper limit, and **"Home" is ordered last** — the least-expected position for a home destination.
- Nine stack routes use `presentation: 'modal'`, several for non-focused browsing tasks (`Tables`, `HallTables`, `Analytics`, `QRMenu`) that would be better as pushed screens preserving back context.
- `AdaptiveTabBar` correctly swaps to a side rail in expanded layouts — this part is right.

---

## 7. Mobile interaction problems (the core finding)

Measured across `src/`:

| Pattern | Files using it | Verdict |
| --- | --- | --- |
| `Swipeable` / `GestureDetector` / `Gesture.*` | **0** | `react-native-gesture-handler` is installed and completely unused for interaction |
| `onLongPress` | 4 | Almost no contextual actions |
| `expo-haptics` | 1 | Installed, effectively unused |
| `Alert.alert` | 21 | Desktop-style modal dialogs are the default feedback channel |
| Snackbar / undo-after-action | 0 | No recovery affordance anywhere |
| `useSafeAreaInsets` | 2 | Safe-area handling is inconsistent |
| reduced-motion preference | **0** | Accessibility preference unread |

**This is the heart of why previous attempts felt like "a website in a phone."** The visual layer was modernized; the interaction grammar never was. Users get buttons and modal dialogs because that is all the codebase can currently express.

---

## 8. Accessibility problems

Good: 47 files set `accessibilityRole`, 34 set `accessibilityLabel`, touch targets are tokenized (`minimumTarget: 48`, `primaryTarget: 56`), contrast is test-enforced, `fontScale` is exposed by `useAdaptiveLayout`.

Gaps: no reduced-motion support; icon-only controls in legacy screens lack labels; `Alert.alert` error text is not screen-reader friendly when it contains raw exception strings.

---

## 9. Performance problems

- Unvirtualized `ScrollView` lists for receipts and menu items (unbounded row counts).
- `TableDetailScreen` at 3,271 lines rerenders broadly on every draft mutation.
- `HallTablesScreenModern` recomputes ticket totals inline per card on every render.

---

## 10. Proposed design system

**Keep the token layer as-is.** Add the missing interaction primitives it never grew:

| Primitive | Purpose |
| --- | --- |
| `haptics.ts` | Thin `expo-haptics` wrapper; no-ops on web and when unavailable |
| `useReducedMotion()` | Reads the OS preference; every animation consults it |
| `ServiceSnackbar` + `SnackbarProvider` | Bottom-anchored transient feedback with an optional **Undo** action; the recovery affordance for destructive work |
| `ServiceActionSheet` | Long-press contextual menu, safe-area aware, destructive actions tinted |
| `ServiceConfirmSheet` | Bottom-sheet confirmation for irreversible operations, replacing `Alert.alert` |
| `ServiceSwipeRow` | Gesture-handler swipe actions with a threshold that will not fire during vertical scroll, haptic at the commit point |

## 11. Proposed interaction model

One grammar, applied everywhere:

| Input | Meaning |
| --- | --- |
| **Tap** | Open or activate the primary target |
| **Long press** | Open the contextual action sheet (haptic on activation) |
| **Swipe left** | Reveal destructive/secondary actions on list rows |
| **Overflow button** | The discoverable equivalent of long press, for grid cards where swipe does not fit |
| **Undo snackbar** | Follows every reversible destruction |
| **Confirm sheet** | Gates only irreversible operations |

Every gesture has a visible alternative. No gesture is the only path to an action.

---

## 12. Screen-by-screen redesign plan

| Screen | Change |
| --- | --- |
| `HallTablesScreenModern` | Remove the permanent Edit/Delete row. Tap opens the table; long press or a single overflow control opens the action sheet; delete routes through confirm sheet → undo snackbar. |
| `TablesScreenModern` | Same treatment. |
| `MenuScreen` | Swipe-left on item rows for edit/delete; long press for the full action sheet. |
| `AddCategoryScreenModern`, `EditTableScreenModern`, `AddHallScreenModern` | `Alert.alert` destructive confirms → `ServiceConfirmSheet`; success `Alert`s → snackbars. |
| `SettingsScreen` | `window.confirm` → `ServiceConfirmSheet` on both web and native; group destructive operations into their own section. |
| `HistoryScreen`, `AnalyticsScreen` | Error `Alert`s → snackbars carrying user-readable copy; raw `error.message` stays in telemetry only. |

## 13. Implementation order

1. **Stabilize** — normalize line endings, pin with `.gitattributes`, get `verify` green.
2. **Foundation** — build the six primitives above with unit tests.
3. **Destructive flows** — confirm sheet + undo snackbar across management screens.
4. **Gestures** — swipe and long-press on list surfaces.
5. **States and copy** — snackbar-based error/success feedback.
6. **Verify** — full gate run, then `UI_UX_RENEWAL_REPORT.md`.

## 14. Risks and migration considerations

- **The line-ending fix touches 207 files.** It is mechanical (Prettier only, no semantic edits) but will dominate any diff. Kept as its own isolated step so review can skip it.
- **No data migration is required.** Nothing in this plan alters schema, storage, or sync contracts.
- **Gesture/scroll conflict** is the main functional risk. Swipe activation uses an explicit horizontal-dominance threshold with `activeOffsetX`/`failOffsetY`, so vertical scrolling cannot trigger it.
- **Dead code is being left in place, not deleted** (`ActionSheet.tsx`, `EnhancedBottomSheet.tsx`, legacy screens) pending explicit sign-off.

## 15. Acceptance criteria

- `npm run verify` (format → lint → typecheck → test → web build) passes.
- No destructive action is reachable in a single tap.
- Every reversible deletion is followed by an undo affordance.
- Every gesture-only action has a visible alternative.
- No `window.confirm` remains in product flows.
- New primitives carry unit tests; the existing 227 tests stay green.
- Animation respects the reduced-motion preference.
