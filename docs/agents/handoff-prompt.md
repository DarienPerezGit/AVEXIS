# AVEXIS handoff (2026-11-06)

Single source of truth to continue in a new chat. Section 1 is the state; section 2 is the prompt to paste.

## 1. State

### Project
- TP Final Programacion III (UTN, Prof. Larriera): legal-practice management system. Repo `DarienPerezGit/AVEXIS`, branch `main`, code in `backend/`.
- The assignment PDF in the repo root is the authoritative spec. Closed stack: MongoDB via Mongoose, Express, Node, TypeScript, React, AntD/Chakra/MUI. Supporting libraries (helmet, cors, bcryptjs...) are additions, not replacements.
- Reference only, never copy code: private repo `DarienPerezGit/sechu-szlit`. Reuse only its UX mockup and domain ideas.
- Build from scratch. Backend done; frontend in progress in `frontend/`, with a short-lived branch and a PR to `main` per ticket.

### Done (all pushed to `origin/main`)
| Commit | Content |
|--------|---------|
| `e4c1737` | Six Mongoose schemas |
| `57ed0e1` | Express skeleton, `GET /api/health`, Atlas connection, fail-fast env |
| `1746d57`, `1e3cf6d` | #9 (closed): JSON error handler, Mongoose error mapping, `AppError`, Pino `error.log` |
| `5cd62b5` | Handoff refresh |
| `ee9a07b` | #3 (closed): auth, RBAC and user management |
| `b40ca10` | #14 / #10 (closed): REST endpoints, permission matrix, Zod validation, pagination |
| `c6222c7` | #11 (closed): upcoming hearings alert `GET /api/audiencias/proximas` |
| `45b306c` | #7 (closed): `npm run seed` (demo reset) and `npm run create-titular` (production install) |
| `3379b44` | #5 (closed): OpenAPI spec and Swagger UI at `/api/docs` |
| `df1c704` | Docs: user `id` and per-status error examples |
| `b377b9e` | #8 (closed): coverage threshold 90%, versioned report, route inventory in `docs/testing.md` |
| `c7644a9`, `767cbf7` | #12 (closed): README rewritten and verified against Atlas; `server.ts` reports listen failures |

#15 (closed, PR #21): GET routes expand references (`conNombre` in `src/http/populate.ts`); POST and PATCH keep answering ids; `GET /api/usuarios/abogados` is new. ADR 0002 decisions 9 and 10.

In review, not on `main` until its PR merges: #16 on branch `feat/16-base-frontend`. Vite, React, Ant Design 6, React Router 8, session guard, login and password change. Design: ADR 0007. Agenda, expedientes, clientes and usuarios are placeholders in `src/App.tsx` (`Pendiente`).

- Frontend: 41 tests green, coverage about 97%, threshold 40% until every page exists, then raise it near the real value (ADR 0007). Tests render the real app with `renderApp(ruta)` and replace only `fetch` with `simularApi` (`src/test/`). Add a permission to `permisos.ts` and a row to the frontend table of `docs/testing.md` with each page. `camposConError` in `errores.ts` has no caller yet: the forms of #18 to #20 must use it with `form.setFields`.
- Backend suite: 170 tests green, coverage about 95% of statements (threshold 90%) (Supertest against `mongodb-memory-server`), `npm run typecheck` clean (inside `backend/`).
- Alert design: `docs/adr/0003-alerta-de-vencimientos.md`. Days are counted in Argentina (`src/audiencias/calendario.ts`); audiencia `fecha` is `YYYY-MM-DD` only. `createApp({ clock })` injects time; tests use `createTestApp({}, { clock })`.
- Seed design: `docs/adr/0004-seed-de-demo-y-titular-inicial.md`. Demo users share `demo avexis 2026` (README section 6). `npm run seed` empties the database in `MONGODB_URI`: never run it against data you want to keep.
- API docs: `docs/adr/0005-documentacion-openapi.md`. Every new route must be added to `src/docs/openapi.ts` (and its router to the table in `src/routes.ts`); `src/docs/docs.test.ts` fails on any undocumented or invented route.
- Testing: `docs/testing.md` (route inventory) and ADR 0006. Run `npm run test:coverage` before each delivery commit to refresh the versioned `backend/coverage/` report; add a row to the inventory for any new route.
- Error contract: `{ error: { code, message, details? } }` via `AppError`; `details: [{ path, message }]` only on `VALIDATION_ERROR`.
- REST design: `docs/adr/0002-endpoints-rest-y-matriz-de-permisos.md`. The permission matrix lives only in `src/access/policies.ts` (`expedientesVisibles`, `agendaVisible`, `findExpedienteAccesible`, `findExpedienteConAccesoEconomico`, `findAudienciaAccesible`, `abogadoParaAlta`/`abogadoParaCambio`, `assertAbogadoActivo`, `listarAbogadosAsignables`). Validate input with `parse(schema, input)` from `src/http/validation.ts`. Check order: auth, role, 404, 403, 400. Tests: `crearEstudio()` gives one logged-in agent per matrix cell, plus `crearCliente`, `crearExpediente`.
- Auth design: `docs/adr/0001-autenticacion-y-autorizacion.md`. Domain terms: `GLOSSARY.md` (titular, procuracion...). Key points:
  - JWT `{ sub, ver }` in an `httpOnly` + `Secure` + `SameSite=Strict` session cookie, 8 h, no refresh. `authenticate` reloads the user each request; `ver` (`versionSesion`) bumps on password change/reset and ends other sessions.
  - Roles `ABOGADO` / `ASISTENTE` + `esTitular` (ABOGADO only). Only the titular manages users (`/api/usuarios`); no public sign-up. New/reset users get `debeCambiarPassword` (403 `PASSWORD_CHANGE_REQUIRED` except `/me` and `/me/password`).
  - A titular cannot change their own access (409 `CANNOT_CHANGE_OWN_ACCESS`), which keeps an active titular.
  - Use `authenticate(config)`, `authorize(...roles)`, `requireTitular` and `req.usuario` in new routes. `createApp({ auth, configure })`; tests use `createTestApp`, `crearUsuario`, `loginComo` from `src/test/factories.ts` and `useTestDatabase()`.
- Skills: the user's skills in `C:\Users\PC\.agents\skills` are linked as junctions into `C:\Users\PC\.claude\skills` (Claude Code only reads `~/.claude/skills` and `<repo>/.claude/skills`). The user's `code-review` collides with a built-in; `/review` is the same skill.

### Next steps, in order
1. Merge the #16 PR. The backend is final, apart from small fixes.
2. #17 agenda, then #18 expedientes, #19 clientes, #20 usuarios. Scope and components are in each ticket; #6 is closed.
3. Update the README with the frontend commands. Close #4 and update map #1.
4. #13 deploy only if time remains: it is optional in the PDF. The backend does not serve the frontend yet, and a proxy needs `trust proxy` for the login limiter.
5. Before delivery: `npm run test:coverage`, re-run the seed, rotate the Atlas password and move off the `atlasAdmin` user.

### Frontend scope (decided in the #6 grilling)
- Seven pages: login, cambiar-password, agenda (home), expedientes list, expediente detail, clientes, usuarios (titular).
- The UI hides what a role cannot use; the API enforces security. One `permisos.ts`, one `errores.ts` that translates by `code`.
- Only 401 `UNAUTHORIZED` redirects to `/login`. 401 `INVALID_CREDENTIALS` is a form error, on login and on password change.
- `Audiencia.fecha` is a day stored as UTC midnight: read its first 10 characters. `new Date()` shows the day before in Argentina.
- The expedientes search uses `$text` on `caratula` only: whole words, no `numero`. Accepted as is, to avoid extra work.
- The mockup is `C:/Users/PC/Proyectos/Szlit/szlit-app (14).html`, outside the repo. Reference for UX only; it holds real email addresses that must never be copied.
- Out of scope: daily agenda email, manual notices, liquidaciones, empleadores, actas, carpetas.
- The assignment requires tests for at least 30% of frontend components and environment variables in the frontend.

### Deadline
The user has less than a month, and the repo link goes to the teacher at least a week before the oral exam. Keep it simple, no over-engineering. If time runs short, drop the deploy first, then simplify the calendar view; never drop the required tests.

### Environment facts and traps
- `gh auth status` must show `DarienPerezGit` active (a broken `atlasonecontact` account also appears; ignore it).
- The sandbox blocks local sockets, network and writes to `.git`: run tests, `npm install`, git and `gh` with the sandbox bypass.
- Always run `npm`/`npx` inside `backend/` or `frontend/`, and vitest from that folder: from `frontend/src` every test fails in 1 ms because it misses the config. Never `npm install` from the repo root or `C:\Users\PC` (that `package.json` belongs to another project; don't touch it).
- The PDF filename has decomposed accents; copy it to the scratchpad with an ASCII name to read it.
- Engram needs `project=tp-final`, also on `mem_get_observation`. Topics: `handoff/avexis-backend-mvp`, `decision/avexis-auth-design`, `handoff/avexis-error-core`, `decision/avexis-frontend-scope`, `decision/avexis-audiencia-populate`, `decision/avexis-frontend-auth-flow`, `decision/avexis-frontend-usuarios`, `decision/avexis-frontend-errors`.
- `vitest.config.ts` raises the test timeout to 30 s: every domain test logs in four users through bcrypt cost 12 while files run in parallel.
- To try the app without touching Atlas: start `mongodb-memory-server` on a fixed port from `backend/`, set `MONGODB_URI` to it in the shell (dotenv does not override it), check the resolved URI is local before `npm run seed`, and set `COOKIE_SECURE=false`. `agent-browser` worked once, then hung on `open` and could not reach its daemon (os error 10060) after its processes were stopped; `timeout` does not kill it on Windows, so run it in a `Start-Job` with a limit.
- A request in flight during a password change can get a stale `UNAUTHORIZED`, since the change bumps `versionSesion`, and that ends the browser session. Harmless while the password page makes no other calls: watch it if a page polls.
- Heredocs through the Bash tool can collapse `\\` into `\`; write files with regexes or escaped quotes using the Write/Edit tools.
- On Windows, killing a background `npm run dev` by its shell pid leaves the `tsx` child alive and holding the port; stop it through the listening process and its parent.
- `backend/.env` is local and git-ignored. The user should set `JWT_EXPIRES_IN=8h` there. Never write the Atlas password anywhere.

### User preferences
- Reply in Spanish, short, one question at a time. Links open in the same browser tab; the user does not want many tabs open. Verify before agreeing with claims. Warn before touching anything unprotected.
- **Pedagogical mode:** the user must defend every decision at the oral exam. For each design question give the concept, options, a recommendation and a one-line "para defenderla". Grilling before implementing.
- Conventional commits, no AI attribution. Code, comments and docs in English.

## 2. Prompt to paste in the new chat

```text
Continua AVEXIS (TP Final Programacion III, UTN). Responde en espanol, corto, una pregunta a la vez; codigo, commits y docs en ingles, README en espanol. Commits convencionales, sin atribucion de IA. Modo pedagogico: tengo que defender cada decision en el oral, asi que en cada pregunta de diseno explicame el concepto, las opciones, tu recomendacion y una linea "para defenderla". Tengo menos de un mes: simple y funcional, sin sobreingenieria. Avisame si algo puede romperse.

Contexto: lee docs/agents/handoff-prompt.md (seccion 1), GLOSSARY.md y los ADR de docs/adr/ que toque el ticket. En Engram (project=tp-final) busca decision/avexis-frontend-scope, decision/avexis-audiencia-populate, decision/avexis-frontend-auth-flow, decision/avexis-frontend-usuarios y decision/avexis-frontend-errors. El PDF del enunciado en la raiz es la especificacion.

Estado: backend terminado; base del frontend (#16) en PR, rama feat/16-base-frontend; #6 cerrado con el alcance del frontend; tickets #17 a #20 creados. Faltan las paginas de agenda, expedientes, clientes y usuarios.

Haz esto, en orden:
1. Verifica: git status -sb, git log --oneline -5, y dentro de backend/ y de frontend/ npm run typecheck y npm test. gh auth status debe mostrar DarienPerezGit activo.
2. Confirma que el PR del #16 este mergeado y actualiza main. Toma el #17 (gh issue view 17). Crea la rama feat/17-agenda desde main antes del primer commit. Nunca commitees directo a main: cada ticket lleva rama corta y PR a main.
3. Antes de escribir tests, propone que probar y espera mi confirmacion. Usa los skills tdd y code-review.
4. Al terminar: typecheck, suite completa, cobertura, code-review, PR, y actualiza Engram y este handoff. Despues sigue con el #18.

Reglas: npm/npx siempre dentro de backend/ o frontend/, nunca npm install desde la raiz ni desde C:/Users/PC, y no toques C:/Users/PC/package.json. npm run seed vacia la base: no lo corras contra datos que quieras conservar. Nunca escribas la password de Atlas ni imprimas la URI. sechu-szlit y la maqueta son solo referencia: no copies codigo ni los emails reales de la maqueta. En PowerShell cita "@me".
```
