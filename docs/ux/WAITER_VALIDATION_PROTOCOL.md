# Orderia Service Console — Real Waiter Validation Protocol

Status: not yet run  
Required sample: 3–5 current restaurant waiters  
Recommended devices: at least two Android phones and one iPhone Safari/PWA  
Session length: 25–35 minutes per participant

## Purpose

Validate whether the new Service Console is faster and safer under realistic
restaurant pressure. This is a usability test, not a feature presentation.
Do not coach the participant through the primary tasks.

## Participant criteria

- Currently works as a waiter or floor manager
- Uses a phone during a shift or has used a digital order pad
- Mix of experienced and newer staff
- At least one participant who is not fluent in the prototype’s default
  language, to exercise TR/BG/EN discoverability

Do not record guest, payment-card or production restaurant data. Use the seeded
demo branch only.

## Test setup

- Seed 12 tables across Inside and Terrace
- Table 4 is open with one existing check and another waiter present
- Menu contains Burger, Fries, Cola, Water and required/optional modifiers
- Table 6 has a payment pending
- Table 7 has two queued offline changes
- Historical archive contains Table 4 at 13:05 seven days ago
- Test once online and once with connectivity disabled

## Tasks

### Task 1 — Rapid order

Prompt:

> Table 4 orders two cheeseburgers without onion, one large fries and two
> colas. Enter it and send the order.

Observe:

- Time to select Table 4
- Time to first item
- Total time to send
- Mis-taps, backtracks and hesitation
- Whether the participant notices the active check and other waiter

Success:

- First item ≤ 4 seconds median
- Complete batch ≤ 8 seconds median after table opens
- No wrong-table write

### Task 2 — Wrong item and dispute

Prompt:

> The guest says they never ordered the fries. Find who added it and correct
> the bill using “Customer changed mind.”

Observe:

- Can the participant find item history without long-press instruction?
- Do they understand cancellation versus deletion?
- Can they explain the new total?

Success:

- Completion ≤ 10 seconds
- Actor and timestamp correctly identified
- Cancelled item remains visible and excluded from total

### Task 3 — Split and partial payment

Prompt:

> Guest A pays both burgers by card. Guest B pays €10 cash now and leaves the
> rest open.

Observe:

- Whether selection and remaining balance are understood
- Any confusion between tendered, paid and change
- Whether the participant tries to close the whole table

Success:

- No allocation beyond selected items
- Remaining balance correctly stated without calculation help
- Participant recognizes both confirmed payments

### Task 4 — Offline confidence

Disable connectivity and prompt:

> Add one water to Table 4 and continue working.

Ask:

> Is the order saved? Has the other device received it? What happens next?

Success:

- Participant says it is safe on this device
- Participant does not claim cloud/other-device confirmation
- Participant can find queued count and retry/conflict detail

### Task 5 — Historical receipt

Prompt:

> Find Table 4’s receipt from around 13:00 one week ago and download it.

Success:

- Completion ≤ 20 seconds
- Correct immutable receipt selected
- Participant can identify waiter, issue time and amount

## Measurements

| Metric | Target |
|---|---:|
| Primary rapid-order completion | ≥ 95% unaided |
| Table-to-first-item median | ≤ 4 s |
| Five-item batch median | ≤ 8 s |
| Wrong table/item rate | < 2% |
| Wrong-item recovery | ≤ 10 s |
| Correct offline mental model | ≥ 90% |
| Receipt retrieval | ≤ 20 s |
| Post-test SUS | ≥ 80 |

Capture task time, completion, errors, backtracks and one direct participant
quote per task. Do not collect identifying personal data.

## Interview questions

1. What did each table state mean to you?
2. Which action felt slowest?
3. What would you expect a swipe on an order row to do?
4. When offline, what made you trust or distrust the save?
5. What information would resolve a customer dispute fastest?
6. What do you use most often that is still missing?

## Findings log

Fill one row per material observation.

| Participant | Task | Observation | Severity 0–4 | Design change | Retest |
|---|---|---|---:|---|---|
| — | — | Validation not yet scheduled | — | — | — |

## Decision rule

- Any severity 4 finding blocks implementation rollout.
- Severity 3 findings must be fixed and retested.
- Repeated severity 2 findings become a required change.
- Cosmetic preference without task impact remains backlog.
- Update `ORDERIA_SERVICE_CONSOLE.md` when a validated behavior differs from the
  provisional design.

