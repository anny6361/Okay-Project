# OKAY Project — Database Contract

## Authoritative storage

Firestore is authoritative. `localStorage` may cache values for resilience but must never be treated as a second source of truth.

## Current compatibility collections

The current application already uses these logical areas:

- `users`
- `employees`
- `departments`
- `expenseRequests`
- `advanceRequests`
- `advanceClearings`
- `auditLogs`
- `masterData`
- `companySettings`
- `notifications`

The existing compatibility mapping in `src/lib/firestore-sync.ts` must remain stable during refactoring.

## Canonical record rules

Every persistent business record should have:

- `id` — immutable unique identifier
- `created_at` — creation timestamp
- `updated_at` — last modification timestamp
- `created_by` — creator user ID where applicable
- `status` — controlled workflow status where applicable
- `version` — optional optimistic concurrency/version marker for high-risk records

## Parent-child references

Business documents must reference the existing parent business record using its existing stable ID. Display names must not be used as joins.

Do not introduce a replacement project schema, project allocation table, or additional budget/account-code structure merely to support a new document screen.

## Draft vs issued

Draft records may resolve current master data when rendered.

Once a document is issued/finalized, values needed to reproduce the issued document should be snapshotted into the issued record. This prevents later master-data edits from changing historical documents.

## Persistence boundary

The target rule is:

```text
Component -> service -> data gateway -> Firestore/server
```

Avoid:

```text
Component -> arbitrary Firestore collection
Component -> localStorage as database
Component -> duplicate schema
```

## Future database migration

A future Supabase migration should implement the same logical service contract. UI components should not need to know whether persistence is Firestore or Supabase.
