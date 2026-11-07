# Testing

How the backend is tested, and which test covers each route. Decisions: ADR 0006.

## Running

Inside `backend/`:

| Command | What it does |
|---|---|
| `npm test` | Runs every test once |
| `npm run test:coverage` | Runs every test and writes the coverage report to `backend/coverage/` (HTML and lcov). **Fails if statements drop below 90%** (or branches/functions below 85%) |

The assignment asks for at least 40% of statements. The project's threshold is 90%, close to the real value (about 95%), so it works as an alarm: it fails as soon as code lands without tests. Open `backend/coverage/index.html` to browse the report file by file. Regenerate it with `npm run test:coverage` before each delivery commit.

## How the tests work

- **Supertest against the real Express app** (`createApp`), with a **fresh in-memory MongoDB** per test file (`mongodb-memory-server`), emptied after each test. **No test touches the Atlas database.**
- Tests check only what a client observes: status code, body, and the effect seen in a later request. They do not query the database to verify, except the seed's idempotency test, whose output is the database itself.
- `crearEstudio()` logs in one user per cell of the permission matrix: the titular, a lawyer, another lawyer, and an assistant.
- Time-dependent tests inject a fixed clock (`createTestApp({}, { clock })`), so they never depend on the real date.
- Two contract tests guard the API documentation: every real route must be documented and vice versa, and every documented operation must answer a documented status (`src/docs/docs.test.ts`).

## Route inventory

Every route has a Supertest test for its happy case, and 26 of the 28 also for an error response. The two without one are logout, which is public and always answers 204, and the documentation pages. That is well above the 50% the assignment requires.

Paths are relative to `backend/src/`. Cross-cutting tests in `app.routes.test.ts` also check 401 without a session, 403 `PASSWORD_CHANGE_REQUIRED`, and 400 `INVALID_ID` on the domain routes.

| Route | Test file | Happy case | Error case |
|---|---|---|---|
| `GET /api/health` | `health.test.ts`, `app.test.ts` | 200 ok with the database connected | 503 degraded while disconnected |
| `POST /api/auth/login` | `auth/auth.test.ts` | 200 with the user and an httpOnly session cookie | 401 same body for unknown email and wrong password; 403 `ACCOUNT_DISABLED`; 429 after too many failures |
| `POST /api/auth/logout` | `auth/auth.test.ts` | 204, the next request is unauthenticated | — (public, always 204) |
| `GET /api/auth/me` | `auth/auth.test.ts` | Returns the user without the password hash | 401 without cookie, expired or forged token, or deactivated user |
| `PATCH /api/auth/me/password` | `auth/auth.test.ts` | Changes it, clears the forced-change flag, ends other sessions | 401 wrong current password; 400 weak new password |
| `GET /api/usuarios` | `usuarios/usuarios.test.ts` | Lists every user without hashes | 403 for a non-owner |
| `GET /api/usuarios/abogados` | `usuarios/usuarios.test.ts` | Owner and assistant get active lawyers by name, only `_id` and `nombre` | 403 plain lawyer; the assistant stays out of every other user route |
| `POST /api/usuarios` | `usuarios/usuarios.test.ts` | Creates a user who must change the password | 403 non-owner; 409 duplicate email; 400 weak password or assistant as owner |
| `PATCH /api/usuarios/:id` | `usuarios/usuarios.test.ts` | Updates role, owner status and active status | 409 owner changing own access; 400 invalid combination; 404 unknown user |
| `POST /api/usuarios/:id/reset-password` | `usuarios/usuarios.test.ts` | Sets a new initial password and ends the user's sessions | 404 unknown user; 400 weak password; 403 non-owner |
| `GET /api/clientes` | `clientes/clientes.test.ts` | Lists to any role; searches by name, DNI or CUIT, regex characters matched literally | 400 when `q` is not a single text value |
| `POST /api/clientes` | `clientes/clientes.test.ts` | Individual (DNI) and company (CUIT) clients | 400 with one detail per field; 409 duplicate DNI or CUIT |
| `GET /api/clientes/:id` | `clientes/clientes.test.ts` | Returns the client | 404 unknown; 400 malformed id |
| `PATCH /api/clientes/:id` | `clientes/clientes.test.ts` | Corrects contact details, identity fields ignored | 400 invalid email |
| `DELETE /api/clientes/:id` | `clientes/clientes.test.ts` | 204 for a client without cases (owner) | 409 `CLIENTE_HAS_EXPEDIENTES`; 403 lawyer and assistant |
| `GET /api/expedientes` | `expedientes/expedientes.test.ts` | Role visibility; pagination with total; combined filters; client and lawyer names | 400 `limit` above 100 or `page` below 1 |
| `POST /api/expedientes` | `expedientes/expedientes.test.ts` | Lawyer's case is always theirs; owner assigns anyone | 403 assistant; 400 unknown client or non-lawyer in charge; 409 duplicate number |
| `GET /api/expedientes/:id` | `expedientes/expedientes.test.ts` | Own case; assistant sees any; client and lawyer names | 403 another lawyer's case; 404 unknown |
| `PATCH /api/expedientes/:id` | `expedientes/expedientes.test.ts` | Updates and archives; owner reassigns | 403 other lawyer and assistant; 404 unknown; 400 invalid estado or non-lawyer |
| `GET /api/expedientes/:id/movimientos` | `movimientos/movimientos.test.ts` | Newest first, to whoever can access the case; names who loaded each entry | 403 another lawyer's case |
| `POST /api/expedientes/:id/movimientos` | `movimientos/movimientos.test.ts` | Assistant on any case, signed by the session | 403 another lawyer's case; 400 unknown tipo; 404 unknown case |
| `GET /api/expedientes/:id/honorario` | `honorarios/honorarios.test.ts` | Responsible lawyer and owner see it with paid amount and balance; names who recorded each payment | 403 other lawyer and assistant; 404 while there is no fee |
| `POST /api/expedientes/:id/honorario` | `honorarios/honorarios.test.ts` | Agrees the fee, ignoring an `estado` in the body | 409 second fee; 400 negative amount; 403 assistant |
| `POST /api/expedientes/:id/honorario/pagos` | `honorarios/honorarios.test.ts` | Payments signed by the session; estado and balance derived | 404 without a fee; 400 non-positive amount; 403 assistant |
| `GET /api/audiencias` | `audiencias/audiencias.test.ts`, `app.routes.test.ts` | Lawyer: attended plus own cases, never another lawyer's; owner and assistant: all, by date; case data and attendee name | 401 without a session; 403 `PASSWORD_CHANGE_REQUIRED` |
| `POST /api/audiencias` | `audiencias/audiencias.test.ts` | Assistant picks the lawyer; a lawyer is pinned to themselves; fatal deadline | 403 another lawyer's case; 400 non-lawyer or inactive attendee, unknown case, bad hour, timestamp as fecha |
| `GET /api/audiencias/proximas` | `audiencias/proximas.test.ts` | Days left, urgency, fatal first, today in Argentina, role visibility; case data and attendee name | 400 `dias` out of 1–30 |
| `PATCH /api/audiencias/:id` | `audiencias/audiencias.test.ts` | Reschedule, mark held, cancel; assistant reassigns; a lawyer's reassignment is ignored | 403 another lawyer; 404 unknown; 400 timestamp as fecha |
| `GET /api/docs`, `/api/docs/openapi.json` | `docs/docs.test.ts` | Swagger UI and the OpenAPI document are served; contract tests compare them with the real routes | — (static pages) |

Besides routes: `seed/seed-demo.test.ts` and `usuarios/titular-inicial.test.ts` cover the seed and the initial-owner scripts, `errors.test.ts` covers the error handler and the error log file, and the `models/*.test.ts` files cover schema validation.
