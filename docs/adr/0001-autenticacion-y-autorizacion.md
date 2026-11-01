# 0001. Authentication and authorization

- Status: accepted
- Date: 2026-11-01
- Ticket: #3

## Context

The assignment requires JWT security (stored in localStorage, a cookie or a session), at least two roles that log in, and "registration and authentication of users with the roles of lawyer and assistant". It also states: "a lawyer sees their own cases and agenda; an assistant can load movements, hearings and clients for any case".

The system handles confidential client data, so authentication was designed as a core part of the project, not as a minimum-effort requirement. Each decision below lists the alternatives that were weighed.

## Decisions

### Token

1. **The JWT carries only the user id (`sub`) and a session version (`ver`).** `authenticate` loads the user from MongoDB on every request and reads `rol`, `esTitular` and `activo` from there. A deactivation or role change applies on the next request instead of when the token expires.
   - Changing or resetting a password bumps `versionSesion`; a token whose `ver` differs gets 401, so every session open elsewhere ends. The device that changed its own password receives a fresh token and stays logged in. A version counter was chosen over comparing the token's `iat` with a change timestamp because `iat` has one-second resolution and cannot tell apart a token issued in the same second as the change.
   - Rejected: putting the role in the token. Faster, but a deactivated user keeps working until the token expires, and the payload is readable by anyone.
2. **HS256, 8 hour lifetime, no refresh token.** One login per working day. `JWT_EXPIRES_IN` is configurable.
   - Rejected: 15 minute tokens with a refresh token. Its main benefit is revocation, which decision 1 already covers; it would add an endpoint, token rotation and storage.
3. **The token lives in an `httpOnly`, `Secure`, `SameSite=Strict` session cookie.** JavaScript cannot read it, so an XSS cannot steal it; `SameSite=Strict` blocks CSRF. The cookie has no `maxAge`: the browser drops it on close, and the token expires on its own after 8 hours.
   - Rejected: localStorage with an `Authorization: Bearer` header. Immune to CSRF but readable by any injected script.
4. **Front end and API share one origin**, which is what makes `SameSite=Strict` sufficient without an anti-CSRF token. CORS allows no other origin unless `CORS_ORIGINS` lists it. The hosting platform is decided in #13.

### Defense in depth

- `helmet` sets security headers, including a Content Security Policy.
- Login is rate limited by IP: 10 failed attempts per 15 minutes, then 429 `TOO_MANY_REQUESTS`. Successful logins do not count.
  - Rejected: locking the account after N failures. Anyone who knows an email could lock its owner out on purpose.
- Future improvement, out of scope: restrict the API to the firm's network (VPN or IP allowlist).

### Passwords

5. **`bcryptjs` with cost 12** (about 250 ms per hash). Slow on purpose, so offline brute force over a stolen database is impractical; the salt is random and stored inside the hash.
   - Rejected: native `bcrypt` and `argon2`. Argon2id is OWASP's first choice, but both need native compilation, which fails easily on Windows and serverless hosts. bcrypt remains acceptable.
6. **Policy from NIST SP 800-63B rev. 4**: 15 to 64 characters, no composition rules, at most 72 bytes because bcrypt ignores anything after that. With a single factor NIST requires at least 15 characters; composition rules are discouraged because they push users towards predictable passwords such as `Password1!`.

### Roles

7. **Two roles, `ABOGADO` and `ASISTENTE`, plus an `esTitular` flag** that only an ABOGADO may hold. The role says what a person does; `esTitular` says whether they administer the firm. Every lawyer rule applies to the titular without listing a third role everywhere.
   - Researched: MyCase (user type Attorney/Paralegal/Staff plus an Admin flag), Clio (Administrator role, billing as a separate permission) and PracticePanther (fixed Admin role plus custom roles). All three separate the job from the admin capability.
   - Rejected: a third `TITULAR` role (every lawyer check would have to list both), and configurable fine-grained roles (built for products sold to many firms; one firm with fixed rules does not need them).
8. **ASISTENTE maps to the firm's *procuración*, as a team shared across the firm.** Validated with a practicing lawyer: firms typically have the owner, lawyers who carry the cases, and *procuradores* who do the procedural legwork. In her firm each *procurador* works for one lawyer; the assignment instead lets the assistant work on any case, which matches firms with a shared team.
   - Rejected for now: a `supervisorId` hierarchy. It contradicts the assignment. Adding it later does not change any other decision.

### User management

9. **No public sign-up.** Client data is confidential, so creating users is an administrative action reserved for the titular (`POST /api/usuarios`). The first titular comes from the seed script.
10. **The titular sets the initial password and can reset it; both set `debeCambiarPassword`.** While it is set, only `GET /api/auth/me` and `PATCH /api/auth/me/password` respond; everything else answers 403 `PASSWORD_CHANGE_REQUIRED`. The block is on by default in `authenticate`, so a new route cannot forget it. Changing the password requires the current one, so an unattended open session cannot be used to take over the account. Seed users start with the flag off.
11. **The firm always keeps an active titular.** A titular cannot change their own `rol`, `esTitular` or `activo` (409 `CANNOT_CHANGE_OWN_ACCESS`). Only an active titular can edit users, and that titular always remains one, so this single rule guarantees the invariant without counting titulares. Known limit: it holds for requests that do not overlap. If two titulares deactivate each other at the same instant, both requests pass the check and the firm is left without one. Closing that gap needs a transaction that re-checks the remaining titulares, which is not worth it for a single firm's handful of owners; recovery is the seed script.
12. **Users are never deleted**, only deactivated, to preserve who did what.

### Login responses

13. **Unknown email and wrong password return the same 401** (`INVALID_CREDENTIALS`), so the API cannot be used to discover which emails exist. When the email is unknown, the password is still compared against a dummy bcrypt hash, so the response time does not reveal it either (timing attack).
14. **A deactivated user with the right password gets 403 `ACCOUNT_DISABLED`.** Only someone who knows the password learns the account is disabled. A deactivated user's existing token gets 401, like any invalid session.

## Status codes

| Status | Code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong email or password, or wrong current password on change |
| 401 | `UNAUTHORIZED` | No session cookie, invalid or expired token, or deactivated user |
| 403 | `ACCOUNT_DISABLED` | Right password, deactivated account |
| 403 | `PASSWORD_CHANGE_REQUIRED` | The user must change their password first |
| 403 | `FORBIDDEN` | Role not allowed, or not the titular |
| 409 | `CANNOT_CHANGE_OWN_ACCESS` | A titular editing their own access |
| 429 | `TOO_MANY_REQUESTS` | Too many failed logins from one IP |

## Consequences

- One database read per authenticated request. Negligible at this scale.
- A fresh install has no users until the seed script (#7) creates the first titular.- The per-case permission matrix (titular sees everything; a lawyer sees and creates only their own cases; honorarios are limited to the responsible lawyer and the titular; no hard deletes except a client without cases) is enforced in the REST endpoints ticket, using `authorize` and `req.usuario`.
- On a serverless host the rate limiter's in-memory counter is per instance; #13 decides whether to use a shared store.

## Sources

- NIST SP 800-63B rev. 4: https://pages.nist.gov/800-63-4/
- Clio, roles and permissions: https://help.clio.com/hc/articles/9200279456667
- MyCase, admin vs. regular user: https://supportcenter.mycase.com/en/articles/9369825-what-s-the-difference-between-an-admin-user-and-a-regular-user
- PracticePanther, access levels: https://support.practicepanther.com/articles/480113-access-levels-tutorial
