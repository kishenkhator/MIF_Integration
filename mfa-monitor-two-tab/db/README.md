# Database

`maximo_integration` exists on the Linux host. No application tables are created by this repository.

Finalize the schema after the two-tab Work Order UI is approved. Add versioned SQL migrations under `db/migrations/`, then test them locally before enabling outbound persistence.

The current API code expects a future `maximo_events` table with `id`, `received_at`, and `payload` (JSON). This is only an API contract; no SQL migration is included yet.
