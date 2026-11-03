# 0005. API documentation with OpenAPI

- Status: accepted
- Date: 2026-11-02
- Ticket: #5

## Context

The assignment asks for API documentation (Swagger/OpenAPI or a Postman/Insomnia collection) with the main endpoints, HTTP verbs and correct status codes. The ticket asked for a Bearer JWT security scheme and the "Authorize" button, but ADR 0001 keeps the session in an `httpOnly` cookie.

## Decisions

1. **Document the real authentication: an `apiKey` in the `token` cookie, not Bearer.** In Swagger UI, `POST /api/auth/login` run with "Try it out" sets the cookie, and the browser sends it with every later call because the UI is served from the same origin. "Authorize" is not needed.
   - Rejected: accepting Bearer tokens only for Swagger. It would open a second way in and bring back the XSS exposure ADR 0001 avoids.
   - Rejected: documenting Bearer anyway. The documentation would describe an API that does not exist.

2. **The spec is a TypeScript module (`src/docs/openapi.ts`) and request schemas come from the routes' own Zod schemas** through `z.toJSONSchema` (input side, OpenAPI 3.0 target). A field added to a schema shows up in the docs by itself. Roles, status codes and descriptions are written per operation in that one file. Served with `swagger-ui-express` at `/api/docs`, raw document at `/api/docs/openapi.json`.
   - Rejected: a hand-written YAML file or JSDoc annotations, which duplicate every body schema.
   - Known gap: the auth and user-management routes predate Zod and validate by hand, so their bodies are written by hand in the spec.

3. **A test compares real routes with documented ones in both directions.** Express 5 does not keep mount paths, so `src/routes.ts` mounts every router from one table; the test rebuilds the full route list from it and requires it to equal the documented list. Another test calls every documented operation without a session and requires the status it gets to be documented. The 403, 404 and 409 of each route are covered by that route's own tests, not re-checked here.

4. **A malformed JSON body answers 400 `INVALID_JSON`**, found while checking that documented codes are real; it used to fall through to a 500.

## Status codes added

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_JSON` | The request body is not valid JSON |
