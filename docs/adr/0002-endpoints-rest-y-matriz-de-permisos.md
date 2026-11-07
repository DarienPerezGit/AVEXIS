# 0002. REST endpoints and permission matrix

- Status: accepted
- Date: 2026-11-01
- Tickets: #14 (PRD), #10

## Context

ADR 0001 left the per-case permission matrix to the REST endpoints ticket. The assignment states: "a lawyer sees their own cases and agenda; an assistant can load movements, hearings and clients for any case". It also asks for backend validation, pagination and filters on at least one listing, and correct HTTP verbs and status codes.

## Decisions

1. **The whole matrix lives in one module, `src/access/policies.ts`.** Routes only call its functions: the visible-cases filter, the agenda filter, loading a case or hearing with 404/403, economic access, and which lawyer a request may assign. The rule from the assignment is read and defended in one place, and #11 (alerts) reuses the agenda filter.
   - Rejected: role checks scattered across route handlers. Each new route would be a chance to forget one.

2. **Order of checks: authentication, role, existence (404), access to that resource (403), body (400).** A role check ("an assistant never sees fees") does not depend on the resource, so answering 403 before looking the case up reveals nothing and saves a query. A per-resource check ("this case is not yours") runs only after the 404, so nobody learns whether a case they cannot see exists. A case referenced from a request body (e.g. `POST /api/audiencias`) answers 400 when it does not exist, because it is invalid input, not a missing resource.

3. **A lawyer cannot load work onto another lawyer.** A lawyer who opens a case is its responsible lawyer, and a lawyer who schedules a hearing is its attendee; the body is ignored, also on updates. The titular assigns any lawyer to cases and hearings; the assistant (procuracion) assigns any lawyer to hearings. Delegating goes through them, as it does in a real firm.
   - Rejected: letting a lawyer assign a colleague to a hearing. The colleague would get a hearing on a case they cannot see, which breaks "a lawyer sees only their own" or needs an exception.

4. **A lawyer's agenda is the hearings they attend plus every hearing on their own cases.** The responsible lawyer answers for the whole case, even when a colleague attends. The same rule decides which hearings a lawyer may edit, so they edit exactly what they see.
   - Rejected: only the hearings they attend. The responsible lawyer would not see hearings on their own case, and could edit hearings missing from their agenda.

5. **Validation with Zod before Mongoose**, which remains the second line. Validation errors extend the error contract compatibly: `{ error: { code: 'VALIDATION_ERROR', message, details: [{ path, message }] } }`. Unknown keys are stripped, so server-controlled fields (`abogadoResponsableId` for a lawyer, `usuarioId` of movimientos and pagos, `estado` of a honorario) cannot be set from the body.

6. **Invalid input is rejected, never corrected silently.** `limit` above 100 on `GET /api/expedientes` answers 400 instead of being clamped, so a client bug shows up instead of hiding.

7. **`CEDULA` and `OFICIO` are movimiento types.** They are the core of procuracion (see `GLOSSARY.md`), the assistant's job; filing them under `OTRO` would make that work impossible to filter or count.

8. **No hard deletes**, except a client loaded by mistake: cases are archived (`ARCHIVADO`), hearings cancelled (`CANCELADA`), movimientos and pagos are immutable. `DELETE /api/clientes/:id` is titular only and answers 409 `CLIENTE_HAS_EXPEDIENTES` once the client has cases.

9. **GET responses expand references with limited fields; POST and PATCH keep answering ids (#15).** The client shows names without a request per row, and a field outside the list never reaches it. The expansion runs after the access check, which compares raw ids. One consequence is deliberate: a lawyer attending a hearing on a colleague's case sees its `numero` and `caratula`, because they must know what they attend, but still gets 403 on the case itself. The `abogadoResponsableId` that comes with it tells the agenda whether to link the case.
   - Rejected: hiding the case data on those hearings. The lawyer would have a hearing in their agenda without knowing what it is about.

10. **`GET /api/usuarios/abogados` is the only user route open beyond the titular.** The titular and the assistant assign lawyers, so they need the list, with `_id` and `nombre` only. A plain lawyer cannot assign anyone (decision 3) and gets 403.

## Status codes added

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or query; `details` lists each field |
| 400 | `INVALID_ID` | Malformed id in the path |
| 404 | `NOT_FOUND` | Unknown resource or route |
| 409 | `DUPLICATE_KEY` | Repeated DNI, CUIT, case number, or a second fee for a case |
| 409 | `CLIENTE_HAS_EXPEDIENTES` | Deleting a client that has cases |

## Consequences

- Listing the agenda for a lawyer costs one extra query (their case ids).
- Only the cases listing is paginated (`{ data, page, limit, total }`); other listings return the resource array and can adopt the same contract later.
- Tests use a single seam, HTTP: Supertest against `createApp` and an in-memory MongoDB.
