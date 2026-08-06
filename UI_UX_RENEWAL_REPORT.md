# Orderia — UI/UX Renewal Report

> **Date:** 2026-08-04 (updated 2026-08-05)
> **Companion document:** [UI_UX_RENEWAL_PLAN.md](./UI_UX_RENEWAL_PLAN.md)

---

## 1. Summary of changes

The audit found something the brief did not anticipate: **the visual layer was not the problem.** Orderia already had a well-built design system — semantic tokens, a warm terracotta palette with light and dark variants, every colour pair gated at 4.5:1 WCAG AA by a passing test, a 4-point spacing scale, restrained elevation, and tabular figures on money. Repainting it would have been the fourth failed attempt.

The actual defect was measurable and specific. Across the entire `src/` tree:

| Pattern | Files using it, before |
| --- | --- |
| `Swipeable` / `GestureDetector` / `Gesture.*` | **0** |
| `onLongPress` | 4 |
| `expo-haptics` | 1 |
| Snackbar / undo-after-action | **0** |
| reduced-motion preference | **0** |
| `Alert.alert` | 21 |

`react-native-gesture-handler` and `expo-haptics` were installed and unused. **The app felt like a website in a phone because buttons and modal dialogs were the only interactions the codebase could express.** So this work built the missing interaction vocabulary and then spent it, rather than restyling what was already good.

Along the way two real defects were found and fixed — one blocking every quality gate, one silently breaking offline-first for every user who had not yet signed in.

---

## 2. Features repaired

**The service worker never registered before sign-in.** `PwaLifecycleBanner` owns service-worker registration, but it depends on `useOrderiaData()` and therefore sits *inside* `AuthGate`. A user who had not signed in never mounted it, so the app shell was never cached and the first offline launch failed. Fixed by extracting a headless `PwaLifecycleBridge` mounted above the auth gate; `initializePwaLifecycle` is reference-counted, so the banner keeps its own initialisation.

*Evidence:* the PWA end-to-end suite went from **2 of 6 passing to 6 of 6**, including "keeps the app shell and IndexedDB data after an offline reload" — which had been timing out on `navigator.serviceWorker.ready`.

**The quality gate was red.** 207 files carried CRLF endings against a `endOfLine: "lf"` Prettier config, producing 26,218 ESLint errors. `npm run verify` could not pass, so no gate protected any change. Normalised to LF and pinned with a new `.gitattributes` so a Windows checkout cannot reintroduce it.

**Browser dialogs inside the installed PWA.** `window.confirm` gated backup restore and local-data reset on web. No `window.confirm` remains in product code.

---

## 3. Components created

| Component | What it solves |
| --- | --- |
| `haptics.ts` | Names the app's haptic vocabulary (`selection`, `activate`, `commit`, `success`, `warning`, `error`) so "which event deserves which buzz" is decided once. No-ops on web and swallows failures — missing haptics must never drop the real operation. |
| `useReducedMotion()` + `motionDuration()` | Reads the OS preference and collapses durations to zero. Components keep one code path instead of two. |
| `ServiceSheet` | Shared sheet shell: backdrop, drag handle, safe-area inset, keyboard avoidance, drag-to-dismiss at a 96px/velocity threshold. Uses plain `Modal` to match the existing `TableOperationSheet`/`PaymentSheet` pattern. |
| `ServiceActionSheet` | The long-press contextual menu. Closes *before* running its action so two layers never stack. |
| `ServiceConfirmSheet` | Replaces `Alert.alert`/`window.confirm` for irreversible work. Not dismissible by backdrop tap — cancelling must be deliberate. Cancel sits below confirm so the thumb's closest reflex target is never the destructive one. |
| `ServiceSwipeRow` | Swipe actions on `react-native-gesture-handler`, with `activeOffsetX([-14, 14])` / `failOffsetY([-12, 12])` so vertical scrolling cannot trigger it. |
| `ServiceSnackbar` + `SnackbarProvider` | The recovery affordance the app had nowhere. Bottom-anchored above the tab bar, live-region announced, auto-retiring, with an optional **Undo**. |

**Design decision worth stating:** `ServiceSwipeRow` **reveals** actions, it does not execute them. There is no full-swipe-to-delete. In a busy service a phone goes in and out of a pocket and lists get flung; a single swipe destroying a record is not an acceptable risk. The user sees the action, then presses it.

---

## 4. Gestures added

| Input | Meaning |
| --- | --- |
| Tap | Open the primary target |
| Long press | Contextual action sheet, with `haptic('activate')` |
| Swipe left | Reveal row actions, with `haptic('commit')` at the threshold |
| Overflow button | The visible equivalent of long press, for grid cards where swipe does not fit |
| Undo snackbar | Follows reversible destruction |
| Confirm sheet | Gates irreversible operations only |

Every gesture has a visible alternative. No action is reachable only by gesture.

---

## 5. Screens redesigned

**`HallTablesScreenModern`** — the clearest offender. Every table card carried a permanent **Edit + Delete** pair beneath it; a twelve-table hall meant twenty-four competing controls and a one-tap path to destroying a table. That row is gone. Tap opens the table; long press or a single overflow control opens the action sheet; delete routes through a confirm sheet. "Delete" is shown disabled with its reason when the table is open, rather than failing into an error dialog after the tap.

**`AddCategoryScreenModern`** — same permanent-delete-per-row pattern, but a list, so it got the swipe treatment: swipe left to reveal delete, long press for the full action sheet, confirm sheet before the deletion lands.

**`EditTableScreenModern`** — `Alert` destructive confirm → confirm sheet; success and failure → snackbars.

**`SettingsScreen`** — backup restore restructured so picking and validating a file is separate from writing it, with the confirm sheet in between. Local-data reset likewise. Both previously used `window.confirm` on web.

**`MenuScreen`** — already used long-press and an explicit bulk-selection mode, which was sound. Converted its error `Alert` to a snackbar and added haptics. On success it deliberately shows *no* snackbar: the availability pills visibly flip, and stacking a message on top would occupy the bottom of the screen for nothing.

---

## 6. Accessibility improvements

- Reduced-motion preference is now read and honoured; it was previously ignored everywhere.
- Snackbar messages announce through `accessibilityLiveRegion="polite"` plus an explicit `announceForAccessibility` call. The role sits on the message text, not the container — putting it on the container would have swallowed the Undo button as a separate control for screen-reader users.
- The overflow control on each table card is labelled `"<table name> — More actions"` rather than a bare icon.
- Sheets set `accessibilityViewIsModal` and respect safe-area insets.
- New `moreActions` string added across all three languages (Turkish, Bulgarian, English). No hardcoded user-visible strings were introduced.

---

## 7. Tests

**15 new tests** in `src/design-system/__tests__/interactions.test.tsx`, covering: confirm-sheet cancel/confirm/busy paths, action-sheet ordering and disabled actions, swipe-row actions reachable as labelled buttons, the long-press path, undo delivery, live-region announcement, auto-dismissal, and reduced-motion duration collapse.

**Suite: 227 → 242 tests, 52 → 53 suites, all passing.**

While writing these I isolated a pre-existing quirk in this repo's vendored test renderer: **a second `fireEvent.press` inside one `it` block corrupts the renderer, and every later test in that file sees an empty tree.** Two-step flows are therefore split across tests, and the constraint is documented at the top of the file so the next person does not lose an hour to it.

Gate status:

| Gate | Result |
| --- | --- |
| `prettier --check` | pass (was failing on 207 files) |
| `eslint --max-warnings=80` | pass — 0 errors, 20 warnings (was 26,218 errors) |
| `tsc --noEmit` | pass |
| `jest` | 251/251 pass |
| `build:web` | pass — PWA verified |
| Browser e2e | **8/8 pass** (was 0/8 with a local `.env`) |
| PWA e2e | **6/6 pass** (was 2/6) |

---

## 8. Dependencies

**None added or removed.** Every primitive is built on packages already in `package.json` — `react-native-gesture-handler` and `expo-haptics` were present and unused.

## 9. Data migrations

**None.** No schema, storage, or sync contract was touched.

---

## 10. Known limitations

**Two browser end-to-end tests still fail**, and I did not fix them:

- `app-shell.spec.ts:41` — "quick actions navigate to real destinations"
- `app-shell.spec.ts:104` — "supports adding an order, long-press actions, splitting and editing cash payment"

Both assert against `NewOrderScreen` and the tables flow — files this work never touched. They fail because the working tree contains an **unfinished screen refactor that predates this session**: `TablesScreen`, `ShiftBoardScreen`, and `QRMenuScreen` are deleted, `*Modern` replacements are in place, and the e2e specs still describe the older navigation. Rewriting those specs would mean pinning expectations to half-migrated screens, which is the refactor owner's call, not mine.

**These tests only run in device-only mode.** With a real `.env` present the app correctly requires sign-in, so the suite lands on the welcome screen and all 8 tests fail. Verification above was done with `.env` moved aside; it was restored immediately afterward.

**`LegacyTableDetailScreen` is live code, not a duplicate.** An earlier draft of this report listed it as a removal candidate on the strength of its name and the presence of a newer `TableDetailScreen`. That was wrong. `TableDetailScreen:104-112` renders it whenever the app is not in cloud mode, or has no session, or no device id — which is exactly device-only operation, the festival/offline scenario `PLAN.md` names as the primary use case, and the mode the end-to-end suite runs in. Deleting it would have removed the table-detail flow for offline use. It stays.

**Dead components removed (8 files).** Every one had zero references outside its own file and the barrel, verified across `src/`, `App.tsx`, `e2e/`, `e2e-pwa/`, and `index.js`:

`ActionSheet.tsx`, `DeliveryTimePicker.tsx`, `EnhancedBottomSheet.tsx`, `FloatingActionButton.tsx`, `NotificationCenter.tsx`, `PrimaryButton.tsx`, `ProductSearch.tsx`, `StatusBadge.tsx`

Several were superseded by the design system (`PrimaryButton` → `ServiceButton`, `StatusBadge` → `ServiceStatusPill`, `ActionSheet`/`EnhancedBottomSheet` → `ServiceActionSheet`/`ServiceSheet`) and still read the retired `constants/branding` palette. `src/components/` now holds only what is live:

| File | Used by |
| --- | --- |
| `AuthGate.tsx` | `App.tsx` |
| `LanguageSelector.tsx` | 6 references |
| `QuantityStepper.tsx` | 10 references |
| `SurfaceCard.tsx` | `LegacyMigrationCard` |

`@gorhom/bottom-sheet` remains a dependency — `App.tsx` still mounts `BottomSheetModalProvider`. All files were tracked in git, so any removal is recoverable via `git checkout`.

**Not addressed in this pass:**

- 34 files still use `ScrollView` where `FlatList` would virtualise; receipt and menu lists remain unvirtualised.
- Remaining `Alert.alert` sites outside the flows above (notification centre, analytics, history, device management) still use platform dialogs.
- Navigation structure is unchanged: five bottom tabs with "Home" ordered last, and nine `presentation: 'modal'` routes several of which would read better as pushed screens.

---

## 11. One-handed speed pass

A second round targeted the stated goal: bigger targets, thumb reach, and fewer taps during service.

**Touch-target scale.** Added `sizing.heroTarget` (64) for the one primary action per screen, and `sizing.chipTarget` (48) to replace hardcoded 44s that sat below Android's own baseline. `tableCardMinimumHeight` went 104 → 124. `ServiceButton` gained `size="hero"`. The `ServiceTableCard` test now asserts against the token instead of a magic `104`, so the scale can grow without a test edit.

**`TablesHomeScreen` — the waiter's home screen.** Three changes, in order of impact:

1. **The status filters moved from the top of the screen to a sticky bar at the bottom.** They are the most-touched control during service and they were sitting in the hardest place to reach one-handed. The bar also carries the hero "New order" button, so both frequent actions now sit in the thumb's natural arc.
2. **The grid now uses `ServiceTableCard`.** The screen had been rendering its own thinner `TableTile` that showed only a label and a status pill — while `ServiceTableCard`, already built and tested in `features/service-board`, was used nowhere in production. It shows **the outstanding total, check count, duration, waiter initials, and pending-sync count**. The waiter can now triage a hall without opening a single table. The duplicate `TableTile` was removed.
3. **Search collapsed behind a toggle.** It was permanently occupying a row above the grid for something used rarely mid-service.

Long-press or the overflow button on any table opens a contextual sheet: open the table, narrow to its hall, or narrow to your own tables — the last two being noticeably shorter than walking back up to the filters.

**`QuantityStepper` — hold to repeat.** This is the most-repeated gesture in the whole app, and it was one tap per unit. Holding `+` now repeats and accelerates, so eight of something is one held finger instead of eight taps. Buttons went 44/48 → 48/56 with larger glyphs. `ServiceStepper` in the design system got the same treatment plus a `size="large"`.

The repeat logic lives in `holdRepeat.ts` rather than inside the component, because `fireEvent` cannot reach a `Pressable`'s internal `onPressIn` — the behaviour would have been untestable through the component. As a pure unit it carries **8 tests**, including the one that matters: React Native fires `onPressOut` *before* `onPress`, so a naive implementation adds one extra step every time the finger lifts after a hold. `consumeRepeated()` exists specifically to prevent that, and a test pins it.

**Suite: 242 → 251 tests, all passing.** Device-only end-to-end held at 6 of 8 — the same two pre-existing failures, no regression from the rewrite.

---

## 12. Follow-through pass

The remaining items from the previous "next steps" list were worked to completion.

**`OrdersFlowScreen`.** Carried the same inferior inline table tile as the tables screen; it now uses `ServiceTableCard`, so totals and check counts are visible before opening anything. A hall strip was added at the bottom, in the thumb's arc, so switching halls no longer means stepping back up the hierarchy. Long press and overflow open the same contextual sheet. The deliberate two-step hall → table flow was preserved — the screen's own doc comment says that is intentional, and it is.

**Search now works before you pick a hall.** "Find by name" from the home quick actions landed on the hall step, where no search field existed — the control simply was not there. Searching now spans every hall, which is the point: you search precisely because you do not know which hall the table is in.

**Every `Alert.alert` is gone from product code** — 21 sites across 14 files, replaced by snackbars for messages and `ServiceConfirmSheet` for the destructive ones (hall delete, device revocation, legacy migration apply, order delete). Two comment references remain, both explaining why the pattern was retired.

Three notes on that conversion:

- Error snackbars carry the screen's own human copy ("PDF failed", "Reopen failed") rather than the raw exception string. Where a fitting telemetry event already existed, the exception now goes there instead — receipt PDF failures report as `receipt_render_failure`.
- `qrService.ts` no longer talks to the user at all. A service module returning a result and letting the screen speak is the right split; it was reaching for `Alert` from inside a data layer.
- **One conversion caused a regression, which is worth recording.** `Alert.alert` is a silent no-op on react-native-web, so the notification-permission warning had never appeared on web. Turning it into a snackbar made it fire on first paint — greeting the user with a permission nag before they had done anything, and tripping axe on contrast mid-fade. Startup registration is now silent; the message appears only when the user actively switches notifications on.

**Navigation.** "Home" moved from the far-right edge to the centre of the tab bar — it is a launcher, and the centre is the easiest reach for either thumb. `Masalar` stays first so the landing screen is unchanged. Four browsing routes (`Tables`, `HallTables`, `Analytics`, `QRMenu`) were demoted from `presentation: 'modal'` to pushed screens, so they keep back context. The seven routes still modal are all genuine focused create/edit flows.

**Focus rings are now real outlines.** The design system signalled keyboard focus by growing a border from 1px to 3px, which shifted layout by 2px every time focus moved and which browsers and audit tools do not read as a focus indicator. `focusRing()` emits a true `outline` on web and keeps the border on native. Applied across `ServiceButton`, `ServiceIconButton`, `ServiceListRow`, `ServiceStepper`, and `AdaptiveTabBar`.

**The menu list is virtualised.** `MenuScreen` rendered every catalog item at once inside a `ScrollView`; it is now a `FlatList` with the header, footer, and empty state moved into the list's own slots, and a column count that follows the layout mode. The receipt archive was already virtualised.

**The end-to-end suite runs for anyone now.** It exercises device-only mode, but a developer with a real Supabase project in `.env` got the sign-in screen and all eight tests failed — which is why they had been red. `playwright.config.ts` now blanks the two Supabase variables for its web server; dotenv will not override an already-defined key, so the suite is deterministic regardless of local configuration.

**End-to-end: 8 of 8 passing, verified with `.env` in place.** Both tests called out as unfixable in the previous section are green: the order flow test now selects a hall first, and the quick-actions test expects the new-order picker it actually opens.

---

## 13. Recommended next steps

1. `TableDetailScreen` is the last screen that has not had a thumb-zone pass. It is also where order entry actually happens, and at 3,271 lines it needs its own dedicated effort rather than being folded into a broader sweep.
2. Split `TableDetailScreen` while doing so — its size is the reason it rerenders broadly on every draft mutation.
3. Give the two remaining lint warnings in `orderTimerService.ts` a look; the unused locals suggest an unfinished calculation.
