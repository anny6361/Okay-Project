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

Business documents must reference their parent entity using IDs, not display names. For procurement this means:

- `PROJECT_ID` is the primary context.
- Budget and account codes are referenced by IDs/codes.
- Vendor and employee references use stable IDs.
- Display names are presentation values and must not be used as joins.

## Draft vs issued

Draft records resolve current master data when rendered.

Once a document is issued/finalized, values needed to reproduce the issued document must be snapshotted into the issued record. This prevents later vendor/project/master-data edits from changing historical documents.

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
