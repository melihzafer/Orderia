# Orderia onboarding

New accounts follow this path:

1. Sign up with email and password.
2. Choose **Waiter** or **Manager**.
3. Connect the account to a restaurant.

Managers can enter an existing restaurant code or create a restaurant. Creating
one returns an eight-character code that can be shared with waiters.

Waiters enter the code provided by their manager. The code creates an active
branch membership immediately, so the waiter can continue to the home screen
without a separate approval queue.

The restaurant code is stored on the branch and is accepted only by the
`join_restaurant` security-definer RPC. Direct inserts into organizations,
branches, and memberships remain unavailable to authenticated clients.

Existing pending signup requests remain supported for accounts created by older
versions of the app and can still be handled from the manager approval screen.
