# OKAY Project — Central Architecture

## Purpose

This document defines the target architecture for `Okay-Project`. The goal is to keep one source of truth, reduce duplicated business logic, and make future maintenance possible from a single controlled layer.

## Source of truth

1. **Firestore** is the persistent application database.
2. **Firebase Admin / server API** is the trusted server-side access path for operations that require server authority.
3. React components must not become independent database implementations.
4. `localStorage` is a temporary offline/cache fallback only. It is never the authoritative source.
5. PDF files and generated documents are outputs of application data, not independent master records.

## Layering

```text
User
  |
  v
React UI / Components
  |
  v
Application Services / Data Gateway
  |
  +--------------------+
  |                    |
  v                    v
Server API          Firebase client sync
  |                    |
  v                    v
Firebase Admin       Firestore
  |                    |
  +---------+----------+
            v
         Firestore
```

## Rules

### UI

Components render data and emit user actions. They should not contain duplicated Firestore collection mapping or independent persistence rules.

### Application service layer

Business operations belong in reusable service modules. Examples:

- requests
- approvals
- budgets
- users/employees
- accounting
- documents/PDF
- notifications
- audit logs

### Database layer

Collection names, persistence, caching, synchronization, and serialization belong in the database layer. A feature should not invent its own Firestore schema without updating the central contract.

### Documents

Every business document must have a stable document ID and, when applicable, a reference to its parent business entity such as `PROJECT_ID`.

Issued documents should preserve a snapshot of values used at issuance time. Draft documents may resolve current master data.

## Procurement direction

The procurement system will use `PROJECTS` as the central business context.

```text
PROJECTS
  |
  +-- budget allocations
  +-- account allocations
  +-- vendor
  +-- TOR
  +-- request / approval
  +-- announcement
  +-- result report
  +-- PO
  +-- attachments
  +-- audit trail
```

One project may have multiple budget codes and multiple account codes. Each allocation must be explicit rather than inferred from a display label.

## Migration policy

Do not migrate to Supabase while the current Firestore model is still being normalized. First stabilize the contracts and service boundaries. A future database migration must replace the persistence adapter without rewriting every React component.

## Change policy

- Work on a feature branch first.
- Do not modify `main` directly for architecture refactors.
- Keep each refactor buildable.
- Prefer small, reversible commits.
- Run type checking/build before merging.
- AI Studio may sync from GitHub after the branch/PR is reviewed.
