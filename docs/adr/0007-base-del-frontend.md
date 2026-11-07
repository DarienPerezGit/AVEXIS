# 0007. Frontend base

- Status: accepted
- Date: 2026-11-06
- Ticket: #16

## Context

The assignment asks for React with TypeScript, a UI library (AntD, Chakra or MaterialUI), environment variables in the frontend, routing across at least 5 pages, and tests for at least 30% of the frontend components. The scope of each page was decided in #6. The API keeps the session in an httpOnly, SameSite=Strict cookie (ADR 0001).

## Decisions

1. **Plain `fetch` in one module, `src/api.ts`; the session in a React Context; `useEffect` in each page.** There are seven pages and they share no data except the session, so a cache would solve no real problem.
   - Rejected: axios. Its interceptors are not needed with a cookie and a single place that handles errors.
   - Rejected: TanStack Query. It saves some code per page, but adds a dependency and concepts this size of app does not use.

2. **In development, Vite proxies `/api` to the backend**, so the browser sees one origin, as it will in production. The cookie and the default CORS policy of the API work without changes.
   - Rejected: calling the API cross-origin in development. It would need `CORS_ORIGINS` and a different cookie setup from production.

3. **The route guards in `App.tsx` decide where a user may be, led by `ControlDeSesion`.** It reads `GET /api/auth/me`: no session goes to `/login`, `debeCambiarPassword` keeps the user on `/cambiar-password` without the menu, anyone else gets the layout. Pages do not repeat this. If `/me` fails for any other reason, the session is unknown rather than over, so the app offers to retry instead of showing the login.

4. **Only a 401 `UNAUTHORIZED` ends the session in the browser.** A 401 `INVALID_CREDENTIALS` is a wrong password in a form, on login and on the password change, so it reaches the form like any other error.

5. **`permisos.ts` only hides what a role cannot use.** It is not a security check: the API enforces the permissions (ADR 0002). A permission is added there with the page that needs it.

6. **Errors are translated by `code` in `errores.ts`**, the stable contract of the API; its `message` is English text for developers. A 400 marks the fields listed in `details` with a generic Spanish text. A code without a translation, a 500, a network failure or a non-JSON answer show a generic message.

7. **Tests render the real app and replace only `fetch`**, the boundary with the API, the same idea as testing the backend through HTTP.

8. **The coverage threshold is the assignment's 40% of statements for now, and the report is versioned in `frontend/coverage/`.** The pages of #17 to #20 are still placeholders. Once they exist, the threshold rises near the real value, as in ADR 0006.

## Consequences

- Each page writes its own loading state and reload after saving.
- `VITE_` variables reach the browser, so they never hold a secret.
- The production bundle is about 800 kB, mostly Ant Design. It is accepted: this is an internal tool, not a public site.
