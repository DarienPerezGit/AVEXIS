# 0004. Demo seed and initial titular

- Status: accepted
- Date: 2026-11-02
- Ticket: #7
- Amends: ADR 0001 (where the first titular comes from)

## Context

The assignment asks for "some initial data migration so the system works", and the defense must run without loading anything by hand. ADR 0001 left the first titular to "the seed script", but the ticket also forbids running the seed in production.

## Decisions

1. **`npm run seed` resets the database to a known demo state.** It empties every collection and loads a small Argentine firm (titular, two lawyers, an assistant, clients, cases in every state, movimientos, hearings and fees). Running it twice leaves the same data, and hearings are dated relative to the run, so the alert of upcoming hearings always has something to show at the defense.
   - Rejected: upserting by natural keys. It keeps hand-loaded data, but movimientos and hearings have no natural key, and stale hearing dates would need their own update logic.
   - Rejected: skipping when data exists. Hearing dates would go stale.

2. **The seed refuses `NODE_ENV=production`**, where the data is real, and prints which database it targets (hosts and database name, never the credentials) before touching it.

3. **The first real titular comes from `npm run create-titular`**, a separate script that is safe in production: it creates one owner from `TITULAR_NOMBRE`, `TITULAR_EMAIL` and `TITULAR_PASSWORD`, deletes nothing, does nothing once an active titular exists, and sets `debeCambiarPassword` so the temporary password is replaced on first login. It is also the recovery path if a firm is ever left without an active titular (ADR 0001, decision 11).
   - Rejected: a `--force` flag on the seed. The script that empties the database would then be one flag away from production.

4. **Demo users share one documented password** (`demo avexis 2026`, within the 15–64 character policy) and start without `debeCambiarPassword`, so the defense can log in with every role right away.

5. **Both scripts are thin wrappers** around `seedDemo({ nodeEnv, now })` and `crearTitularInicial(...)`, which are tested against an in-memory database and observed through HTTP. The seed test is the one place that counts documents directly, because the seed's output is the database itself.
