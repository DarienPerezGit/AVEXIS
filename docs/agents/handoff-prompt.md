# AVEXIS handoff (2026-11-01)

Single source of truth to continue in a new chat. Section 1 is the state; section 2 is the prompt to paste.

## 1. State

### Project
- TP Final Programacion III (UTN, Prof. Larriera): legal-practice management system. Repo `DarienPerezGit/AVEXIS`, branch `main`, code in `backend/`.
- The assignment PDF in the repo root is the authoritative spec. Closed stack: MongoDB via Mongoose, Express, Node, TypeScript, React, AntD/Chakra/MUI. Supporting libraries (helmet, cors, bcryptjs...) are additions, not replacements.
- Reference only, never copy code: private repo `DarienPerezGit/sechu-szlit`. Reuse only its UX mockup and domain ideas.
- Build from scratch, backend first, frontend later.

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
| (this commit) | #12: README rewritten and verified against Atlas; `server.ts` reports listen failures |

- Suite: 161 tests green, coverage about 95% of statements (threshold 90%) (Supertest against `mongodb-memory-server`), `npm run typecheck` clean (inside `backend/`).
- Alert design: `docs/adr/0003-alerta-de-vencimientos.md`. Days are counted in Argentina (`src/audiencias/calendario.ts`); audiencia `fecha` is `YYYY-MM-DD` only. `createApp({ clock })` injects time; tests use `createTestApp({}, { clock })`.
- Seed design: `docs/adr/0004-seed-de-demo-y-titular-inicial.md`. Demo users share `demo avexis 2026` (README section 6). `npm run seed` empties the database in `MONGODB_URI`: never run it against data you want to keep.
- API docs: `docs/adr/0005-documentacion-openapi.md`. Every new route must be added to `src/docs/openapi.ts` (and its router to the table in `src/routes.ts`); `src/docs/docs.test.ts` fails on any undocumented or invented route.
- Testing: `docs/testing.md` (route inventory) and ADR 0006. Run `npm run test:coverage` before each delivery commit to refresh the versioned `backend/coverage/` report; add a row to the inventory for any new route.
- Error contract: `{ error: { code, message, details? } }` via `AppError`; `details: [{ path, message }]` only on `VALIDATION_ERROR`.
- REST design: `docs/adr/0002-endpoints-rest-y-matriz-de-permisos.md`. The permission matrix lives only in `src/access/policies.ts` (`expedientesVisibles`, `agendaVisible`, `findExpedienteAccesible`, `findExpedienteConAccesoEconomico`, `findAudienciaAccesible`, `abogadoParaAlta`/`abogadoParaCambio`, `assertAbogadoActivo`). Validate input with `parse(schema, input)` from `src/http/validation.ts`. Check order: auth, role, 404, 403, 400. Tests: `crearEstudio()` gives one logged-in agent per matrix cell, plus `crearCliente`, `crearExpediente`.
- Auth design: `docs/adr/0001-autenticacion-y-autorizacion.md`. Domain terms: `GLOSSARY.md` (titular, procuracion...). Key points:
  - JWT `{ sub, ver }` in an `httpOnly` + `Secure` + `SameSite=Strict` session cookie, 8 h, no refresh. `authenticate` reloads the user each request; `ver` (`versionSesion`) bumps on password change/reset and ends other sessions.
  - Roles `ABOGADO` / `ASISTENTE` + `esTitular` (ABOGADO only). Only the titular manages users (`/api/usuarios`); no public sign-up. New/reset users get `debeCambiarPassword` (403 `PASSWORD_CHANGE_REQUIRED` except `/me` and `/me/password`).
  - A titular cannot change their own access (409 `CANNOT_CHANGE_OWN_ACCESS`), which keeps an active titular.
  - Use `authenticate(config)`, `authorize(...roles)`, `requireTitular` and `req.usuario` in new routes. `createApp({ auth, configure })`; tests use `createTestApp`, `crearUsuario`, `loginComo` from `src/test/factories.ts` and `useTestDatabase()`.
- Skills: the user's skills in `C:\Users\PC\.agents\skills` are linked as junctions into `C:\Users\PC\.claude\skills` (Claude Code only reads `~/.claude/skills` and `<repo>/.claude/skills`). The user's `code-review` collides with a built-in; `/review` is the same skill.

### Next steps, in order
1. #6 UI, #13 deploy (Vercel vs Render vs Railway; same origin; serverless traps: file log, rate-limit store, `trust proxy`, Atlas connection reuse).
3. Housekeeping: update GitHub dependency edges and map issue #1.
4. At the end: rotate the Atlas DB password and use a non-admin user.

### Environment facts and traps
- `gh auth status` must show `DarienPerezGit` active (a broken `atlasonecontact` account also appears; ignore it).
- The sandbox blocks local sockets, network and writes to `.git`: run tests, `npm install`, git and `gh` with the sandbox bypass.
- Always run `npm`/`npx` inside `backend/`. Never `npm install` from the repo root or `C:\Users\PC` (that `package.json` belongs to another project; don't touch it).
- The PDF filename has decomposed accents; copy it to the scratchpad with an ASCII name to read it.
- Engram needs `project=tp-final`. Topics: `handoff/avexis-backend-mvp`, `decision/avexis-auth-design`, `handoff/avexis-error-core`.
- `vitest.config.ts` raises the test timeout to 30 s: every domain test logs in four users through bcrypt cost 12 while files run in parallel.
- Heredocs through the Bash tool can collapse `\\` into `\`; write files with regexes or escaped quotes using the Write/Edit tools.
- On Windows, killing a background `npm run dev` by its shell pid leaves the `tsx` child alive and holding the port; stop it through the listening process and its parent.
- `backend/.env` is local and git-ignored. The user should set `JWT_EXPIRES_IN=8h` there. Never write the Atlas password anywhere.

### User preferences
- Reply in Spanish, short, one question at a time. Verify before agreeing with claims. Warn before touching anything unprotected.
- **Pedagogical mode:** the user must defend every decision at the oral exam. For each design question give the concept, options, a recommendation and a one-line "para defenderla". Grilling before implementing.
- Conventional commits, no AI attribution. Code, comments and docs in English.

## 2. Prompt to paste in the new chat

```text
Continua el desarrollo del backend de AVEXIS (TP Final Programacion III, UTN). Responde en espanol, corto, una pregunta a la vez; codigo, commits y docs en ingles. Commits convencionales, sin atribucion de IA. Modo pedagogico: tengo que defender cada decision en el oral, asi que en cada pregunta de diseno explicame el concepto, las opciones, tu recomendacion y una linea "para defenderla".

Contexto: lee docs/agents/handoff-prompt.md (seccion 1), docs/adr/0001-autenticacion-y-autorizacion.md, docs/adr/0002-endpoints-rest-y-matriz-de-permisos.md, docs/adr/0003-alerta-de-vencimientos.md, docs/adr/0004-seed-de-demo-y-titular-inicial.md, docs/adr/0005-documentacion-openapi.md, docs/adr/0006-cobertura-y-plan-de-pruebas.md, docs/testing.md y GLOSSARY.md, y Engram handoff/avexis-backend-mvp (mem_search con project=tp-final). El PDF del enunciado en la raiz es la especificacion.

Estado: modelos, errores (#9), autenticacion/RBAC (#3) endpoints REST (#14/#10) alerta de vencimientos (#11), seed (#7), Swagger (#5), cobertura (#8) y README (#12) terminados y publicados, 161 tests en verde.

Haz esto, en orden:
1. Verifica: git status -sb, git log --oneline -5, y dentro de backend/ npm run typecheck y npm test (esperado: 161 tests verdes). gh auth status debe mostrar DarienPerezGit activo.
2. Toma la UI (#6): leela con gh issue view 6 y reclamala. Si el ticket deja decisiones abiertas, haz grilling conmigo primero. Antes de escribir tests, propone los seams y espera mi confirmacion. Usa los skills tdd y code-review.
3. Al terminar: typecheck, suite completa, code-review, commit, actualizar Engram y este handoff.

Reglas: corre tests, npm install, git y gh sin sandbox. npm/npx siempre dentro de backend\, nunca npm install desde la raiz. En PowerShell cita "@me". Nunca escribas la password de Atlas. No toques C:\Users\PC\package.json.
```
