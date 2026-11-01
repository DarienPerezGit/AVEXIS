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

- Suite: 82 tests green (Supertest against `mongodb-memory-server`), `npm run typecheck` clean (inside `backend/`).
- Error contract: `{ error: { code, message } }` via `AppError`.
- Auth design: `docs/adr/0001-autenticacion-y-autorizacion.md`. Domain terms: `GLOSSARY.md` (titular, procuracion...). Key points:
  - JWT `{ sub, ver }` in an `httpOnly` + `Secure` + `SameSite=Strict` session cookie, 8 h, no refresh. `authenticate` reloads the user each request; `ver` (`versionSesion`) bumps on password change/reset and ends other sessions.
  - Roles `ABOGADO` / `ASISTENTE` + `esTitular` (ABOGADO only). Only the titular manages users (`/api/usuarios`); no public sign-up. New/reset users get `debeCambiarPassword` (403 `PASSWORD_CHANGE_REQUIRED` except `/me` and `/me/password`).
  - A titular cannot change their own access (409 `CANNOT_CHANGE_OWN_ACCESS`), which keeps an active titular.
  - Use `authenticate(config)`, `authorize(...roles)`, `requireTitular` and `req.usuario` in new routes. `createApp({ auth, configure })`; tests use `createTestApp`, `crearUsuario`, `loginComo` from `src/test/factories.ts` and `useTestDatabase()`.
- Skills: the user's skills in `C:\Users\PC\.agents\skills` are linked as junctions into `C:\Users\PC\.claude\skills` (Claude Code only reads `~/.claude/skills` and `<repo>/.claude/skills`). The user's `code-review` collides with a built-in; `/review` is the same skill.

### Next steps, in order
1. **#10 REST endpoints** with the permission matrix agreed in #3 (ADR 0001, "Consequences"):
   - Titular sees all expedientes/agendas; ABOGADO only own (`abogadoResponsableId` / `Audiencia.abogadoId`); ASISTENTE sees all expedientes.
   - ABOGADO creates expedientes with `abogadoResponsableId = req.usuario.id` (ignore body); titular creates for anyone and reassigns; ASISTENTE does not create/edit expedientes.
   - Movimientos and audiencias: titular all, ABOGADO own expedientes, ASISTENTE any. Clientes: all roles.
   - Honorarios/pagos: responsible ABOGADO + titular only; ASISTENTE no access.
   - No hard deletes: usuarios deactivate, expedientes ARCHIVADO, audiencias CANCELADA (PATCH); movimientos/honorarios immutable. Exception: `DELETE /clientes/:id` titular only, 409 if it has expedientes.
   - Plus Zod validation, pagination and filters. Read with `gh issue view 10`, confirm TDD seams with the user before tests.
2. Then #11 deadlines alert, #7 seed (must create the first titular with `debeCambiarPassword: false`), #5 Swagger, #8 coverage, #12 README, #6 UI, #13 deploy (Vercel vs Render vs Railway; same origin; serverless traps: file log, rate-limit store, `trust proxy`, Atlas connection reuse).
3. Housekeeping: update GitHub dependency edges and map issue #1.
4. At the end: rotate the Atlas DB password and use a non-admin user.

### Environment facts and traps
- `gh auth status` must show `DarienPerezGit` active (a broken `atlasonecontact` account also appears; ignore it).
- The sandbox blocks local sockets, network and writes to `.git`: run tests, `npm install`, git and `gh` with the sandbox bypass.
- Always run `npm`/`npx` inside `backend/`. Never `npm install` from the repo root or `C:\Users\PC` (that `package.json` belongs to another project; don't touch it).
- The PDF filename has decomposed accents; copy it to the scratchpad with an ASCII name to read it.
- Engram needs `project=tp-final`. Topics: `handoff/avexis-backend-mvp`, `decision/avexis-auth-design`, `handoff/avexis-error-core`.
- `backend/.env` is local and git-ignored. The user should set `JWT_EXPIRES_IN=8h` there. Never write the Atlas password anywhere.

### User preferences
- Reply in Spanish, short, one question at a time. Verify before agreeing with claims. Warn before touching anything unprotected.
- **Pedagogical mode:** the user must defend every decision at the oral exam. For each design question give the concept, options, a recommendation and a one-line "para defenderla". Grilling before implementing.
- Conventional commits, no AI attribution. Code, comments and docs in English.

## 2. Prompt to paste in the new chat

```text
Continua el desarrollo del backend de AVEXIS (TP Final Programacion III, UTN). Responde en espanol, corto, una pregunta a la vez; codigo, commits y docs en ingles. Commits convencionales, sin atribucion de IA. Modo pedagogico: tengo que defender cada decision en el oral, asi que en cada pregunta de diseno explicame el concepto, las opciones, tu recomendacion y una linea "para defenderla".

Contexto: lee docs/agents/handoff-prompt.md (seccion 1), docs/adr/0001-autenticacion-y-autorizacion.md y GLOSSARY.md, y las observaciones de Engram handoff/avexis-backend-mvp y decision/avexis-auth-design (mem_search con project=tp-final). El PDF del enunciado en la raiz es la especificacion.

Estado: modelos, errores (#9) y autenticacion/RBAC (#3) terminados y publicados (ee9a07b), 82 tests en verde.

Haz esto, en orden:
1. Verifica: git status -sb, git log --oneline -5, y dentro de backend/ npm run typecheck y npm test (esperado: 82 tests verdes). gh auth status debe mostrar DarienPerezGit activo.
2. Toma "Endpoints REST" (#10): leelo con gh issue view 10, reclamalo con gh issue edit 10 --add-assignee "@me". Aplica la matriz de permisos acordada en #3 (seccion 1 del handoff). Si el ticket deja decisiones abiertas, haz grilling conmigo primero. Antes de escribir tests, propone los seams y espera mi confirmacion. Usa los skills tdd y code-review.
3. Al terminar: typecheck, suite completa, code-review, commit, actualizar Engram y este handoff.

Reglas: corre tests, npm install, git y gh sin sandbox. npm/npx siempre dentro de backend\, nunca npm install desde la raiz. En PowerShell cita "@me". Nunca escribas la password de Atlas. No toques C:\Users\PC\package.json.
```
