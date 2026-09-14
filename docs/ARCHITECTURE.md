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

Business documents should reference the existing business record that they belong to. Do not create a replacement master-data model merely to support a document feature.

## Procurement

The previous proposed procurement/project-allocation model has been removed.

No new `Project Allocation`, `Project Master`, multiple-budget-code-per-project, or multiple-account-code-per-project model is part of this architecture.

When procurement document work is started again, the existing project data already present in the application must remain the source of truth. New document-specific context must be added around that existing data rather than replacing or restructuring it.

## Migration policy

Do not migrate to Supabase while the current Firestore model is still being normalized. First stabilize the contracts and service boundaries. A future database migration must replace the persistence adapter without rewriting every React component.

## Change policy

- Work on a feature branch first.
- Do not modify `main` directly for architecture refactors.
- Keep each refactor buildable.
- Prefer small, reversible commits.
- Run type checking/build before merging.
- AI Studio may sync from GitHub after the branch/PR is reviewed.
