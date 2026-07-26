# Orderia Service Console — UX/UI Source of Truth

Status: provisional design ready for implementation and real-waiter validation  
Platforms: Android phone, iPhone Safari/PWA, tablet, expanded web manager console  
Primary users: waiter and manager  
Design mode: whole-app rescue (Mode C)

## 1. Verdict

The legacy UI must not be reskinned. It must be replaced by a role-adaptive
service console built around the waiter’s live shift, with manager tools moved
out of the waiter’s critical path.

The three highest risks in the existing application are:

1. False confidence in persistence and refresh. Pull-to-refresh only waits one
   second while business data is split across stores. This violates Nielsen #1
   (system status) and Walter’s Reliable layer. Severity: 4.
2. Error-prone service and payment flows. Critical actions are spread across
   nested modals and alerts, and payment closes one ticket using floating-point
   parsing. This violates error prevention and user control. Severity: 4.
3. A generic information architecture for two very different jobs. Waiters see
   menu management, analytics and settings in the same navigation used during
   service. This increases decision time under Hick’s Law. Severity: 3.

The new interface is named **Orderia Service Console**. “Console” describes a
live operational surface, not a collection of CRUD screens.

## 2. Evidence inventory

### Existing flows

- Authentication and branch selection
- Table and hall list
- Table detail and order entry
- Menu and category management
- Payment and bill sharing
- Analytics
- Local history/export
- Settings, backup/import and devices

### Existing strengths to keep

- Safe-area handling is already present on mobile.
- Light/dark mode has an existing application-level context.
- Ionicons is used consistently enough to remain the single icon family.
- Menu search and category grouping support recognition over recall.
- Price snapshots and order notes exist in the legacy domain and should be
  retained in the new model.
- Local writes feel immediate. The new local-first database preserves this
  strength while making it reliable.

## 3. Heuristic defect log

| Flow | Defect and code evidence | Principle | Severity | Buildable correction |
|---|---|---|---:|---|
| Shift board | Refresh uses a one-second timeout and does not sync | Nielsen #1, Gulf of Evaluation | 4 | Bind refresh to real push/pull state; show pending count, last sync and recovery |
| Payment | `parseFloat` and one-ticket close cannot represent partial, split or mixed payment safely | Error prevention, Walter Reliable | 4 | Integer minor units, review step, allocations and server-authoritative confirmation |
| Orders | Ticket and line deletion are destructive legacy actions | User control, auditability | 4 | Cancellation event with reason, actor and reversible short undo before server acknowledgement |
| Whole app | Business data is split across persisted Zustand stores | Walter Reliable | 4 | SQLite/IndexedDB repository as source of truth with outbox and cloud sync |
| Navigation | Waiter and manager receive the same five destinations | Hick’s Law, minimalist design | 3 | Role-adaptive navigation with three waiter destinations and manager-only modules |
| Tables | Three fixed columns, 80 px cards and 10 px labels compress live state | WCAG Perceivable, recognition | 3 | Two compact-phone columns, responsive grid, 14 px minimum labels, explicit state rows |
| Tables | Table state is largely encoded by accent border/background | WCAG: do not use color alone | 3 | Icon + state label + border pattern + color |
| Orders | Edit, delete and rename depend on undiscoverable long press | Norman Visibility and Signifiers | 3 | Visible row action affordance; swipe is an accelerator, never the only route |
| Orders | Core flow opens multiple full modals and system alerts | Gulf of Execution, efficiency | 3 | Persistent workspace with one quick-add sheet and inline confirmations |
| Orders | Add-item closes the menu after each product | Flexibility and efficiency | 3 | Multi-add draft tray; one-tap items stay in the sheet until “Send order” |
| Components | Small/medium buttons allow 36/44 px heights | WCAG Operable | 3 | Minimum 48 px; primary shift actions use 56 px |
| Accessibility | Icon actions lack reliable visible labels/accessibility labels | Robust, Understandable | 3 | Label non-universal icons, semantic roles, accessible names and hints |
| Sync | No offline, queued, conflict or rejected state in the primary UI | System status, error recovery | 3 | Global sync pill/banner and conflict recovery center |
| Receipts | History is date-grouped local data, not a searchable immutable archive | Recognition, real-world match | 3 | Search by date/time/table/check/receipt/waiter and download original snapshot |
| Layout | ScrollView and nested FlatList are mixed on the table board | Performance, usability | 2 | One virtualized responsive collection with sticky hall filter |
| Copy | “orders”, “INACTIVE” and device labels bypass localization | Consistency, real-world match | 2 | All visible copy through TR/BG/EN message catalog |
| Visual system | Branding, Tailwind, badges and PDF use competing hard-coded palettes | Consistency | 2 | One token source for native, web and generated documents |
| Empty states | Several screens show a sentence without a next action | Nielsen #10, Gulf of Execution | 2 | Icon, explanation and role-appropriate primary CTA |

## 4. Problem definition

### Primary problem statement

A waiter in a noisy, high-tempo restaurant needs to capture and correct a
table’s order one-handed without stopping eye contact with the guest, because
every extra decision and hidden action costs time and creates disputes; today
the app mixes management tools with service work and does not make persistence
or ownership visible.

Success looks like:

- Median table-to-first-item time at or below 4 seconds
- Median five-item batch entry at or below 8 seconds
- At least 95% unaided completion for the primary order task
- Wrong-table or wrong-item rate below 2%, with recovery below 10 seconds
- At least 90% of test participants correctly explaining whether an offline
  order is safe and when it will sync

### Secondary problem statement

A multi-branch manager needs a live, trustworthy view of service, receipts,
staff and menu configuration across authorized branches, because disputes and
operational decisions require immutable history rather than device-local
snapshots.

## 5. Provisional personas

### Deniz — “Rush-hour power waiter”

- Role/context: experienced waiter, Android phone, standing and moving
- Goals: open the correct table, add several items quickly, see what is unpaid
- Pains: small targets, modal hopping, losing place, unclear sync
- Tech comfort: power user
- Key scenario: six tables change within two minutes
- Retention win: one-handed entry with recent items and reliable offline queue

### Elif — “New or temporary waiter”

- Role/context: knows restaurant work but not this venue’s menu
- Goals: find products by the names guests use, avoid expensive mistakes
- Pains: hidden gestures, ambiguous table state, remembering category locations
- Tech comfort: intermediate
- Key scenario: guest changes one modifier after the batch was entered
- Retention win: visible actions, plain copy, safe undo and searchable menu

### Murat — “Multi-branch manager”

- Role/context: checks a laptop/tablet between floor visits
- Goals: see live service, resolve disputes, manage catalog, compare staff
- Pains: local-only history, mixed operational/configuration screens
- Tech comfort: intermediate
- Key scenario: retrieves Table 4’s receipt from 13:00 last week and sees who
  added each item
- Retention win: one reliable console across all authorized branches

These personas are provisional until the validation protocol is completed.

## 6. Product strategy

Orderia wins through operational trust and speed, not feature density. The
waiter experience optimizes the three repeated actions: choose a table, add an
item, confirm/send. Manager capabilities remain comprehensive but move to an
expanded navigation layer. This applies Hick’s Law by reducing choices in the
service context without removing expert capabilities.

## 7. Information architecture

### Compact waiter navigation

```text
Orderia
├─ Service
│  ├─ Shift board
│  ├─ Table workspace
│  ├─ Quick add
│  └─ Payment
├─ Receipts
│  ├─ Recent receipts
│  ├─ Search/filter
│  └─ Receipt detail/download
└─ Profile
   ├─ Active branch
   ├─ Sync/device status
   └─ Sign out
```

Primary navigation: Service · Receipts · Profile

Three destinations keep every shift-critical location one tap away while
meeting Hick’s Law. Menu, reports and configuration never appear to waiters.

### Compact manager navigation

```text
Orderia Manager
├─ Service
├─ Menu
├─ Reports
└─ More
   ├─ Receipts
   ├─ Team & devices
   ├─ Branch settings
   └─ Organization settings
```

### Expanded manager navigation

```text
Persistent 240 px rail
├─ Live service
├─ Menu
├─ Receipts
├─ Reports
├─ Team & devices
└─ Settings
```

Expanded layout uses a rail because labels stay visible and the viewport can
hold a live secondary panel. Compact layouts use a bottom bar because it
occupies the reachable thumb zone. The two patterns do not appear together.

## 8. Core user flows

### Flow A — Open a table and send five items

1. Service board → tap Table 4
2. Empty table workspace → tap “Start table” or directly “Add items”
3. Quick Add opens with cursor in search and recent/frequent items visible
4. Tap products; each tap:
   - adds one draft item immediately
   - gives pressed state and optional haptic feedback
   - updates the draft count and total
   - exposes Undo for the last item
5. Required modifier opens inline before that item enters the draft
6. Tap “Send 5 items”
7. Workspace shows the new batch with “Saved on device” or “Synced”

Offline branch: the same flow completes locally. Confirmation reads
“5 items saved on this device; they will sync automatically.” It never claims
cloud confirmation.

### Flow B — Correct “I did not order this”

1. Table workspace → visible row menu on the disputed item
2. “Item history” shows creator, time, original table, price snapshot and notes
3. Choose “Cancel item”
4. Choose a branch-defined reason; manager approval appears only if required
5. Review consequence and confirm
6. Row remains in context as cancelled, excluded from totals

The row is not deleted. This preserves user control and makes the dispute
explainable.

### Flow C — Split and partially pay

1. Sticky action bar → “Pay”
2. Choose “By item”, “By person”, “Equal split” or “Custom amount”
3. Select items/quantities or enter amount; remaining balance is always visible
4. Choose cash/card; cash shows tendered amount and exact change
5. Review allocation, method, paid amount and remaining amount
6. Confirm; server result returns confirmed or clearly pending
7. Return to table with paid items marked and unpaid balance prominent

### Flow D — Retrieve a historical receipt

1. Receipts → search/filter
2. Select date range, around 13:00, Table 4
3. Result row shows receipt number, table, check, amount, issue time and waiter
4. Receipt detail renders immutable snapshot
5. Download/share the stored PDF; adjustment receipts link both directions

## 9. Annotated compact wireframes

### Screen: Shift board · Goal: choose the correct table in one glance

```text
┌──────────────────────────────────────┐
│ Branch A ▾       18:42       ● Synced│  56 px top bar
│ Good evening, Deniz                  │
├──────────────────────────────────────┤
│ [Search table or waiter…          🔍]│  48 px search
│ [All] [Terrace] [Inside] [Bar]       │  horizontal hall chips
│                                      │
│ ┌──────────────┐ ┌──────────────┐    │
│ │ Table 4   ●2 │ │ Table 5      │    │  two-column compact grid
│ │ OPEN · 18m   │ │ AVAILABLE    │    │
│ │ €42.50       │ │ 4 seats      │    │
│ │ AD  MK       │ │              │    │
│ └──────────────┘ └──────────────┘    │
│ ┌──────────────┐ ┌──────────────┐    │
│ │ Table 6   !  │ │ Table 7      │    │
│ │ PAYMENT      │ │ SYNC ISSUE   │    │
│ │ €18.00 left  │ │ 2 queued     │    │
│ └──────────────┘ └──────────────┘    │
├──────────────────────────────────────┤
│ Service        Receipts       Profile│  64 px bottom navigation
└──────────────────────────────────────┘
```

Annotations:

- Table cards are at least 104 px tall; the full card is the target.
- State is communicated by icon, word and border treatment, never color alone.
- Amount, age and participant initials answer “what needs attention” without
  opening the table (Gulf of Evaluation).
- Long press may open expert actions but the overflow action remains visible.
- Manager compact mode adds an “All branches” selector; waiter mode does not.

### Screen: Table workspace · Goal: act without losing table context

```text
┌──────────────────────────────────────┐
│ ‹ Service  Table 4      OPEN · 18m  ⋯│
│ 3 guests · Deniz + Ayşe              │
│ [Main €28] [Guest 2 €14.50] [+ Check]│
├──────────────────────────────────────┤
│ 18:31 · Deniz sent                    │
│ 2× Burger · Cheese                   │
│    no onion · €18.00               ⋯ │
│ 1× Fries · Large           ORDERED ⋯ │
│                                      │
│ 18:36 · Ayşe sent                     │
│ 2× Cola                    SERVED   ⋯ │
│                                      │
│ [ + Add items ]                       │  56 px primary action
│                                      │
├──────────────────────────────────────┤
│ Total €42.50     Unpaid €42.50 [Pay] │  sticky action bar
└──────────────────────────────────────┘
```

Annotations:

- The selected check, total and table identity remain visible through all order
  actions (recognition over recall).
- Batches are grouped by time and waiter using Gestalt proximity.
- Row overflow is visible. Swipe left is only an accelerator.
- Cancelled rows remain collapsed with actor/reason; they never disappear.
- “Pay” is disabled while a required conflict is unresolved and explains why.

### Sheet: Quick Add · Goal: add multiple products with minimum travel

```text
┌──────────────────────────────────────┐
│ Add to: Main                    Close│
│ [Search product…                 🔍] │
│ Recent: [Fries] [Cola] [Burger]      │
│ [Popular] [Food] [Drinks] [Dessert] │
│ ┌──────────────┐ ┌──────────────┐    │
│ │ Fries        │ │ Burger       │    │
│ │ €4.00     +  │ │ €8.00     +  │    │
│ └──────────────┘ └──────────────┘    │
│ ┌──────────────┐ ┌──────────────┐    │
│ │ Cola         │ │ Water        │    │
│ │ €2.50     +  │ │ €1.50     +  │    │
│ └──────────────┘ └──────────────┘    │
├──────────────────────────────────────┤
│ 5 draft · €24.50       [Send 5 items]│
└──────────────────────────────────────┘
```

Annotations:

- Search is immediately focused when opened from a hardware keyboard, but does
  not force the software keyboard over popular items on phone.
- Product tap target is at least 72 px high. Price and availability are visible.
- The sheet remains open for multi-add. This removes repeated modal travel.
- Required modifiers use an inline sub-sheet with explicit min/max constraints.

### Screen: Payment · Goal: prevent allocation mistakes

```text
┌──────────────────────────────────────┐
│ ‹ Table 4                 Pay €42.50 │
│ [By item] [Equal] [Custom] [Person]  │
├──────────────────────────────────────┤
│ Main check                           │
│ [✓] 2× Burger                €18.00  │
│ [✓] 1× Fries                  €4.00  │
│ [ ] 2× Cola                   €5.00  │
│ Selected                    €22.00   │
│ Remaining                   €20.50   │
│                                      │
│ [Cash] [Card]                        │
│ Cash received [ 30.00 ]              │
│ Change                         €8.00  │
├──────────────────────────────────────┤
│ [Review payment · €22.00]            │
└──────────────────────────────────────┘
```

The final action first opens a review state. Confirmation is never coupled to
an external printer or PDF request.

## 10. Expanded manager wireframes

### Screen: Live service · Goal: oversee all tables and exceptions

```text
┌───────────────┬────────────────────────────────────┬───────────────────┐
│ ORDERIA       │ Branch A ▾  Live service  ● Synced│ Attention         │
│               ├────────────────────────────────────┤ 2 payment waits   │
│ Live service  │ [All][Terrace][Inside] [Search…]  │ 1 sync conflict   │
│ Menu          │                                    │                   │
│ Receipts      │ ┌──────┐ ┌──────┐ ┌──────┐        │ Activity          │
│ Reports       │ │ T4   │ │ T5   │ │ T6   │        │ 18:36 Ayşe…       │
│ Team/devices  │ │€42.5 │ │Free  │ │Pay   │        │ 18:35 Deniz…      │
│ Settings      │ └──────┘ └──────┘ └──────┘        │                   │
│               │ ┌──────┐ ┌──────┐ ┌──────┐        │ [Open audit]      │
│ Murat · Admin │ │ T7   │ │ T8   │ │ T9   │        │                   │
└───────────────┴────────────────────────────────────┴───────────────────┘
```

- Left rail is 240 px and collapses to 72 px only when labels can be exposed by
  tooltip and accessible name.
- The attention panel contains exceptions, not vanity metrics.
- Selecting a table opens the right panel on wide screens; it navigates on
  medium/compact screens.

### Screen: Menu workspace · Goal: configure without affecting open orders

```text
┌───────────────┬───────────────────────┬───────────────────────────────┐
│ manager rail  │ Categories            │ Product editor                │
│               │ [Search…]             │ Patates Kızartması            │
│               │ Snacks (12)           │ €4.00 · EUR · available       │
│               │ Mains (28)            │ Modifiers                     │
│               │ Drinks (34)           │ Cheese: none / cheese / extra │
│               │                       │ Allergens: Unknown ⚠          │
│               │ [+ Category]          │ [Ask AI] [Save draft]         │
└───────────────┴───────────────────────┴───────────────────────────────┘
```

AI always fills a reviewable draft. It cannot publish, set a confirmed allergen
claim or change existing open-order snapshots.

## 11. Responsive behavior

| Breakpoint | Width | Navigation | Table board | Workspace |
|---|---:|---|---|---|
| Compact | `< 600` | Bottom bar, max 4 items | 2 columns | Single pane + sheets |
| Medium | `600–1023` | Navigation rail 72 px or bottom bar by orientation | 3–5 columns | List + optional side sheet |
| Expanded | `≥ 1024` | 240 px labeled rail | Fluid grid | Split view, 58/42 |

Rules:

- Use `useWindowDimensions`; never branch once at startup.
- Respect safe-area insets on all four edges for standalone PWA.
- At 200% text size, compact cards grow vertically and never clip.
- A fixed bottom action bar includes bottom safe-area padding.
- Hover is additive on web. No operation depends on hover.
- Keyboard users receive a logical focus order and visible 3 px focus ring.

## 12. Surface design and tokens

The visual tone is calm, precise and operational. Large areas use neutral
surfaces; color is reserved for action and state. This supports Walter’s
Pleasurable layer only after reliability and usability.

### Light colors

| Token | Value | Use |
|---|---|---|
| `color.primary` | `#0F766E` | Primary action and selected navigation |
| `color.accent` | `#C2410C` | Urgent service action, sparingly |
| `color.ink` | `#101828` | Primary text |
| `color.background` | `#F4F7F6` | App background |
| `color.surface` | `#FFFFFF` | Cards, sheets |
| `color.surfaceRaised` | `#EAF0EE` | Selected/secondary surfaces |
| `color.textMuted` | `#475467` | Secondary text |
| `color.border` | `#D0D5DD` | Boundaries |
| `color.onPrimary` | `#FFFFFF` | Primary button text |
| `color.onAccent` | `#FFFFFF` | Accent button text |

Measured contrast:

- White on primary: 5.47:1
- White on accent: 5.18:1
- Ink on white: 17.75:1
- Muted text on white: 7.69:1

### Dark colors

| Token | Value | Use |
|---|---|---|
| `color.primary` | `#2DD4BF` | Primary action |
| `color.onPrimary` | `#062D29` | Primary action text |
| `color.accent` | `#FB923C` | Urgent service action |
| `color.onAccent` | `#3B1604` | Accent action text |
| `color.background` | `#0B1114` | App background |
| `color.surface` | `#111A1F` | Cards and panels |
| `color.surfaceRaised` | `#182329` | Raised panels |
| `color.ink` | `#F5F7F6` | Primary text |
| `color.textMuted` | `#B4C0BC` | Secondary text |
| `color.border` | `#34433E` | Boundaries |

Measured contrast:

- Ink on surface: 16.38:1
- Muted on surface: 9.41:1
- On-primary on primary: 7.97:1
- On-accent on accent: 7.12:1

### Semantic colors

Semantic meaning is always paired with icon and text.

- Success: light `#15803D`; dark `#4ADE80`
- Warning: light `#B45309`; dark `#FBBF24`
- Error: light `#B42318`; dark `#FDA29B`
- Info: light `#175CD3`; dark `#84ADFF`

### Type

- Family: platform system font; `system-ui` on web
- Numeric values: tabular figures
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 32
- Body: 16/24, regular 400
- Label: 14/20, medium 600
- Title: 24/30, bold 700
- Critical money: 32/38, bold 700
- Never use 10 px for operational text

### Spacing, radius, elevation and motion

- Grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Minimum interactive target: 48×48
- Primary shift target: 56 px high
- Product/table card minimum: 72/104 px high
- Radius: 8 / 12 / 16 / full
- Elevation: border-first; shadows only for sticky bars, sheets and modals
- Press feedback: 80 ms
- State change: 160 ms
- Sheet transition: 240 ms
- Reduced motion: replace transforms with immediate opacity/state change

## 13. Core component specifications

### ServiceTableCard

- Purpose: select a table and evaluate its state at a glance
- Anatomy: label, explicit state, elapsed time, amount/remaining, participants,
  optional exception icon
- States: available, open, payment pending, sync issue, conflict, pressed,
  keyboard focus, skeleton
- Size: 104 px minimum compact; 120 px expanded
- Accessibility label example:
  “Table 4, open 18 minutes, 42 euro 50, two waiters”
- Color never carries state alone

### QuickProductTile

- Purpose: one-tap draft addition
- Anatomy: name, price, availability, modifier signifier, add feedback
- States: default, pressed, just-added, unavailable, required-modifier,
  skeleton, focus
- Minimum: 72 px tall and 48 px action area
- Long names wrap to two lines; the full name is available to assistive tech

### OrderLine

- Anatomy: quantity, snapshot name/modifiers, price, status, creator, visible
  actions
- Accelerators: swipe quantity/cancel on touch, keyboard shortcut on web
- Every accelerator has a visible equivalent
- Cancelled state remains readable and excluded from totals

### SyncIndicator

- States:
  - Synced
  - 4 pending
  - Syncing 2/4
  - Offline — saved on device
  - 1 conflict — action required
  - Sync error — retry
- Uses icon + short label + accessible live announcement
- Tapping opens details; it never blocks the entire UI

### StickyActionBar

- One primary action maximum
- Shows the running total and remaining balance
- Minimum 64 px plus safe-area inset
- Disabled state always includes a nearby reason

## 14. State matrix

| Surface | Loading | Empty | Offline | Conflict | Error |
|---|---|---|---|---|---|
| Shift board | Preserve last board; shimmer only missing cards | “No tables configured” + manager CTA; waiter asks manager | Board remains usable; queued count banner | Affected card gets “Needs review”; global count | Inline retry; never replace known local data |
| Table workspace | Existing items stay visible; new remote rows skeleton | “No items yet” + Add items | Draft and send locally; show device-safe confirmation | Preserve both versions; block only affected action | Keep input/draft; retry or export recovery |
| Quick Add | Category/tile skeleton after 1 s | “No matching products”; clear search | Full cached menu works | Not applicable to browsing | Retry catalog pull; cached products remain |
| Payment | Review stays visible while confirming | No payable balance → return to table | Branch policy decides; explicit “cloud confirmation pending” | No auto-merge; query idempotency status | Never create a second payment; check existing status |
| Receipts | Result skeleton | “No receipts match” + clear filters | Cached receipts open; uncached result explains network need | Adjustment link, not overwrite | Preserve filters and offer retry |
| Reports | Metric skeleton with date range fixed | Explain no data for range | Show last sync age | Manager action card | Partial panels name unavailable source |

No screen uses an infinite spinner. No error exposes raw SQL, HTTP or sync codes.

## 15. Accessibility contract

- Body contrast ≥ 4.5:1; large text and component boundaries ≥ 3:1
- Meaning never depends only on color
- All targets ≥ 48×48
- Keyboard access for every web action
- Visible focus ring, logical reading/focus order and Escape behavior
- Modal/sheet focus is trapped and returned to its trigger on close
- Dynamic sync/toast/payment confirmation uses an appropriate live region
- Text survives 200% zoom/system font
- Inputs have visible labels; placeholder is not a label
- Numeric fields request numeric keyboards but accept locale decimal input
- Screen reader and keyboard-only checks are release requirements

## 16. Self-validation

### Nielsen/Norman pass

- System status: sync, payment and local-save states are always visible.
- Real-world match: table, check, item, batch, payment and receipt vocabulary.
- Control/freedom: undo for recent draft actions; cancellation instead of delete.
- Consistency: one token and component system on native/web.
- Error prevention: review payments, constrained modifiers, manager approvals.
- Recognition: persistent table/check/total context and visible actions.
- Efficiency: recent products, one-tap draft and expert accelerators.
- Minimalism: waiter navigation contains no configuration/report clutter.
- Recovery: plain-language error plus next action; input is preserved.
- Help: contextual, task-level guidance appears in empty/rejected states.

### Remaining human validation gate

The design has not yet been tested with real waiters. No synthetic review can
truthfully satisfy that requirement. Use
`docs/ux/WAITER_VALIDATION_PROTOCOL.md` before pilot rollout. Findings must be
recorded in that file and severity 3–4 problems must be fixed before the design
PR is marked ready.

## 17. Assumptions

- Most waiter sessions use a phone in portrait orientation.
- The waiter may have only one free hand and may work in bright/noisy spaces.
- Manager work is more likely on tablet or desktop but remains available on
  phone.
- Kitchen display/printer dispatch is not the initial product’s source of truth.
- TR, BG and EN remain required.
- Offline order entry is allowed; offline payment remains a branch policy.
- Existing production data must be migrated, not silently discarded.

