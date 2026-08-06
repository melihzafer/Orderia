# Architect Report — Orderia

> **Date:** 2026-08-06
> **Scope:** Whole-codebase structural review, then the same treatment applied to `TableDetailScreen`
> **Companion documents:** [UI_UX_RENEWAL_PLAN.md](./UI_UX_RENEWAL_PLAN.md) · [UI_UX_RENEWAL_REPORT.md](./UI_UX_RENEWAL_REPORT.md)

---

## 1. What the map showed

275 source files, 50,717 lines. The folder structure was already healthy and did **not** need reorganising:

| Metric | Finding | Verdict |
| --- | --- | --- |
| Folder depth | max 4 levels | Fine |
| Files per folder | all ≤ 29, most 5–10 | Fine (two at the edge, see §5) |
| File naming | PascalCase components, camelCase modules, `.test.ts` tests | **100% consistent, zero violations** |
| Architecture pattern | feature-based (`src/features/*`) over a shared `design-system` + `domain` core | Coherent and followed |

So this was not a project that needed moving around. It had two specific structural defects.

---

## 2. Defect one — 20 circular dependencies

An import-graph pass over all 275 files found 20 cycles. **Eighteen of them were the same shape:**

```
AppNavigator → screens/index.ts → <any screen> → AppNavigator
```

Every screen imported `RootStackParamList` from `AppNavigator`, and `AppNavigator` imported every screen from the `screens` barrel. One type import, replicated 18 times, tied the entire screen layer into a knot with its own navigator.

**Fix — extract the route contract.** `src/navigation/routes.ts` now holds `RootStackParamList`, `TabParamList`, and the shared `TableListParams`/`TableFocusFilter` types. It imports nothing from screens and never will — that rule is written at the top of the file, because adding a single value import there would restore all 18 cycles at once.

The remaining two cycles were barrels dragging in more than the importer asked for:

| Cycle | Cause | Fix |
| --- | --- | --- |
| `AuthContext → observability → TelemetryIdentityBridge → AuthContext` | The barrel re-exports a React component that calls `useAuth` | `AuthContext` imports `observability/telemetry` directly |
| `OrderiaDataContext → legacy-migration → LegacyMigrationCard → OrderiaDataContext` | The barrel re-exports a card that calls `useOrderiaData` | The context imports `legacyMigration` / `legacyMigrationGateway` directly |

**Result: 20 → 0 circular dependencies.**

### The first fix was at the wrong depth

Redirecting the two contexts around their barrels worked, but a review pass made the case that it was a bandaid: the constraint lived in a comment, nothing in the build could detect a regression, and the rule was already being applied inconsistently — `OrderiaDataContext` still imported the very `observability` barrel that `AuthContext` had been rewritten to avoid.

The root cause was barrel composition, not import style. **A barrel that re-exports a component consuming a context can never safely be imported by that context.** So the components came out of the barrels instead:

- `observability/index.ts` no longer exports `TelemetryIdentityBridge`; `App.tsx` imports it directly.
- `features/legacy-migration/index.ts` no longer exports `LegacyMigrationCard`; `SettingsScreen` imports it directly.
- Both contexts went back to plain barrel imports, and the explanatory comments were deleted — the constraint is now structural rather than remembered.

**And it is now enforced.** `scripts/check-import-cycles.mjs` walks the real import graph and fails the build on any cycle; it runs as `npm run check:cycles` inside `npm run verify`. No new dependency. Before this, nothing protected the 20 cycles that had just been removed.

One detail worth recording: my analyser initially reported a lingering `AppNavigator → AppNavigator` self-cycle. It was matching an import path written inside a *comment*. The comment is gone and the count is genuinely zero — but it is a good reminder that a regex over source text is not a parser.

---

## 3. Defect two — `TableDetailScreen` at 3,271 lines

The file held six unrelated concerns in one place: the route entry, a 1,292-line container, seven presentational components, a nine-member modal family, five pure helpers, and a 435-line trilingual copy dictionary.

Split into eight modules, all under `src/features/table-workspace/` — the feature folder that already owned this domain:

| Module | Lines | What it is |
| --- | --- | --- |
| `workspaceCopy.ts` | 444 | The trilingual dictionary. Text changes no longer touch the screen. |
| `workspaceFormat.ts` | 80 | `formatMoney`, `timeOnly`, `draftLineTotal`, `clientMutationUuid`, `conflictNote` — pure, now covered by 8 tests |
| `components/WorkspaceChrome.tsx` | 220 | Header, check strip, chip |
| `components/OrderPane.tsx` | 347 | Order lines, grouping, serve actions |
| `components/PalettePane.tsx` | 261 | Product palette, scoping, search |
| `components/DraftBar.tsx` | 236 | Unsent draft strip and its sheet |
| `components/WorkspaceModals.tsx` | 458 | The modal family and its shared shell |
| `screens/TableDetailScreen.tsx` | **1,420** | Route entry + the `CloudTableWorkspace` container |

**3,271 → 1,420 lines in the screen, a 57% reduction.** The eight modules also collapsed into one import: the screen previously reached into its own feature six separate ways.

### Honest accounting

The count of files over 400 lines went **28 → 30**, because `workspaceCopy.ts` (444) and `WorkspaceModals.tsx` (458) land just over the line while `TableDetailScreen` is still 1,420. Judged by that metric alone this looks like a regression, and it would be dishonest to present it otherwise.

What actually improved is that the single worst file shrank by 1,851 lines, and each new module has one job. A 444-line dictionary and a 458-line modal family are not the same kind of problem as a 3,271-line file doing six things at once.

### What is still too big

`CloudTableWorkspace` is roughly 800 lines of state and effects plus 470 of JSX. That is the remaining god function. Extracting it into a `useTableWorkspace` hook is the obvious next move, and deliberately **not** done here: it is a behavioural refactor of the app's most complex screen, and it deserves its own pass with its own verification rather than being bolted onto a structural one.

---

## 4. `/simplify` — four review passes over the result

Four independent reviews (reuse, simplification, efficiency, altitude) ran against the new modules. Applied:

**One latent crash.** `secureUuid()` read `globalThis.crypto.randomUUID` and **threw** when it was absent. There is no crypto polyfill in `package.json`, and it minted `clientMutationId` on the **order-submit path** — the app's most important flow. Every other call site in the repo (`orderCommands`, `checkSplitCommands`, `AuthContext`, `menuCatalogGateway`) uses `react-native-uuid`. Now renamed `clientMutationUuid` and using the same library. This was pre-existing code the split merely moved, but it should not survive a review that found it.

**Two hot-path costs, both measured by the reviewer.**

- `formatMoney` / `timeOnly` constructed a fresh `Intl` formatter on **every call**, and both are called from inside list rows — roughly two constructions per order line and per product tile, so a 200-item menu scrolled end to end meant hundreds. Benchmarked at 40–87× slower than a cached formatter. Now cached in a module-level map keyed by `(language, currency)`, bounded by 3 languages × currencies in use. No call sites changed.
- `workspaceCopy(language)` rebuilt a 104-key object on every render of a screen holding ~40 `useState` hooks — so on every keystroke in the search box. The allocation was the smaller problem; the fresh object identity flowed into every child as a prop, which would defeat any future `React.memo`. Now memoised per language inside the module, so all callers get a stable shared instance without writing `useMemo`.

**Duplication removed.** `CheckSplitSheet` carried a byte-identical private `formatMoney`; it now imports the shared one. The screen's six separate imports from its own feature collapsed to one via the barrel — which the altitude review correctly noted is only safe *because* the components came out of the context-consuming barrels first.

**Split debris cleared.** Four files carried `import {} from '@gorhom/bottom-sheet';` — an empty-binding import pulling a module graph into files that never touch it — plus unused `useState` imports and a docblock duplicated across three panes. All residue of assembling the modules from a shared header.

### Deliberately not done

- **`runMutation` helper.** Seven handlers in `CloudTableWorkspace` repeat the same guard/try/reload/notify shape; a helper would remove ~60 lines. Real, but it touches the container that a `useTableWorkspace` hook should restructure anyway — better done once, together.
- **Per-row lookup maps** in `OrderPane`/`PalettePane` (O(n×m) scans inside `renderItem`). Genuine, and the right fix, but it only pays off alongside `React.memo` on the panes and memoised `visibleItems` — again, the same container pass.
- **Promoting `Chip` to the design system** and **replacing `WorkspaceModal` with `ServiceSheet`.** Both correct: `Chip` is the third private chip in the repo, and `WorkspaceModal` re-implements `ServiceSheet` while losing its keyboard avoidance, safe-area padding, and reduced-motion handling — which matters because three modals built on it contain text inputs. These change rendering behaviour, so they belong in a UI pass with visual verification, not a structural one.

---

## 5. A trap worth closing

Three times during this session the browser suite reported all 8 tests failing, and every time the cause was a **stale Expo dev server on port 8081** that Playwright silently reused. The suite was testing an hours-old bundle while I looked for a regression that did not exist.

Two changes: `reuseExistingServer: false`, so a stale server can never be silently adopted, and a **dedicated test port (8127)** so the suite does not collide with a dev server the developer legitimately has running. Both problems solved at once — the run above passed 8/8 with a dev server still listening on 8081.

---

## 6. Left alone deliberately

- **`src/screens/` (29 files)** is over the 25-file guideline. Grouping into feature folders would mean moving 29 files and rewriting their imports for a navigability gain that is small — the names are already unambiguous and depth is only 2. Not worth the churn now; worth revisiting if the count keeps climbing.
- **`src/design-system/components/` (23 files)** is flat by design. A design system is meant to be a flat, scannable catalogue.
- **`src/i18n/languages.ts` (1,890 lines)** is a translation table. Splitting per language is defensible, but a dictionary's size is not the same defect as a god module.

---

## 7. Verification

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | pass, zero errors |
| `eslint` | **0 errors, 12 warnings** (baseline before this pass: 19) |
| `prettier --check` | pass |
| `jest` | **259/259 pass** (was 251; 8 new tests cover the extracted helpers) |
| `build:web` | pass, PWA verified |
| Browser e2e | 8/8 pass |
| PWA e2e | 6/6 pass |
| Circular dependencies | **0** (was 20) — now enforced by `npm run check:cycles` in `verify` |

The split itself moved every module verbatim — only import wiring and export keywords changed. The `/simplify` pass that followed did change behaviour in two deliberate places: `clientMutationUuid` no longer throws when `crypto.randomUUID` is unavailable, and the cached `Intl` formatters and `workspaceCopy` now return shared instances rather than fresh ones. Both are covered by the suite.
