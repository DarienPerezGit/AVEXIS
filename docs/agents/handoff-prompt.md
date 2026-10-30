# AVEXIS handoff (2026-10-30, updated)

Single source of truth to continue in a new chat. Section 1 is the state; section 2 is the prompt to paste.

## 1. State

### Project
- TP Final Programacion III (UTN, Prof. Larriera): legal-practice management system. Repo `DarienPerezGit/AVEXIS`, branch `main`, code in `backend/`.
- The assignment PDF in the repo root is the authoritative spec. Closed stack: MongoDB via Mongoose only, Express, Node, TypeScript, React, AntD/Chakra/MUI. No equivalents.
- Reference only, never copy code: private repo `DarienPerezGit/sechu-szlit` (violates 8 rubric items). Reuse only its UX mockup `szlit-app (14).html` and domain ideas.
- Decision: build from scratch, backend first, frontend later.

### Done (local commits on `main`)
| Commit | Content |
|--------|---------|
| `e4c1737` | Six Mongoose schemas with 41 tests |
| `57ed0e1` | Express skeleton: `GET /api/health`, Atlas connection, fail-fast env loader |
| `1746d57` | Ticket #9: JSON error handler, Mongoose error mapping, JSON 404, Pino logging to `<LOG_DIR>/error.log` |
| `1e3cf6d` | Ticket #9: `AppError(status, code, message)` handled by the error handler |

- Suite: 48 tests green, `npm run typecheck` clean (run inside `backend/`).
- Error contract: `{ error: { code, message } }`. Codes: `VALIDATION_ERROR` 400, `INVALID_ID` 400, `DUPLICATE_KEY` 409, `NOT_FOUND` 404, `INTERNAL_ERROR` 500 (never exposes the stack; only 5xx are logged).
- `createApp({ logDir, configure })`: `configure(app)` registers routes before the 404 and error handlers. New routers must be mounted there or in `createApp` before the 404 handler.
- Code review of #9 done (Spec + Standards). Only finding was missing `AppError` usage, already fixed.

### Not pushed / not closed
- Local `main` is 2 commits ahead of `origin/main` (`1746d57`, `1e3cf6d`). Nothing from #9 is on GitHub yet.
- Issue #9 is open and assigned to `DarienPerezGit`.
- `docs/agents/handoff-prompt.md` (this file) is untracked until committed.

### Next steps, in order
1. Commit this handoff file (`docs: refresh agent handoff`), push `main`, comment on #9 and close it.
2. Next ticket: **"Autenticacion propia con JWT, hash y RBAC" (#3, `priority:3`, type `wayfinder:grilling`)**: it is a grilling ticket, so run its design decisions with the user first (token strategy, hash library, role matrix), then implement. Read it with `gh issue view 3`. `env.ts` already provides `jwtSecret` and `jwtExpiresIn`; the `Usuario` model exists. Before writing any test, agree the TDD seams with the user. Later tickets by number: #10 REST endpoints (`priority:4`), #11 deadlines alert (`priority:5`), #7 seed (`priority:6`), #5 API contract and Swagger (`priority:7`), #8 tests and coverage (`priority:8`), #12 README (`priority:9`), #6 UI scope with Ant Design (`priority:10`), #4 tooling (only the `seed` script is missing).
3. Then REST endpoints per entity with RBAC, Zod validation, pagination and filters.
4. Then upcoming hearings and deadlines alert, seed script, Swagger, tests and coverage, README, UI.
5. Housekeeping: update GitHub dependency edges and the map issue #1, which still reflect the old order.
6. At the end: rotate the Atlas DB password and use a non-admin user (`readWriteAnyDatabase`).

### Environment facts and traps
- Issue tracker: GitHub via `gh` (see `docs/agents/issue-tracker.md`). `gh auth status` must show `DarienPerezGit`; if the token is invalid, the user runs `gh auth login --web`.
- The Windows sandbox blocks local sockets and writes to `.git`: run `npm test`, `npx vitest`, `git add/commit/push` and `gh` with `BypassSandbox: true`.
- The command cwd is the repo root. Always `Set-Location <repo>\backend` before `npm`/`npx`. Never run `npm install` from the root: a past mistake added a `pino` line to `C:\Users\PC\package.json`, which belongs to another of the user's projects (created 26/04/2026, has `ethers` and `puppeteer`). Do not delete anything there; optional cleanup is `npm uninstall pino` run inside `C:\Users\PC`, not blocking.
- PowerShell 5.1: quote `"@me"` in `gh` commands, parse JSON with `ConvertFrom-Json` (no jq), treat git/gh stderr as non-errors, pass `[long]` for GitHub database ids.
- Engram needs `project=tp-final` explicitly (the repo remote resolves to `avexis`). Topics: `handoff/avexis-backend-mvp`, `handoff/avexis-error-core`.
- `backend/.env` is local and git-ignored; `backend/.env.example` is the template. Never write the Atlas password in any file, issue or commit.
- `.gitignore` carries a stray `.atl/` line from another tool; harmless.

### User preferences
Reply in Spanish, short answers, one question at a time. Verify before agreeing with claims. Warn before touching anything unprotected. Conventional commits, no AI attribution. Code, comments and docs in English.

## 2. Prompt to paste in the new chat

```text
Continua el desarrollo del backend de AVEXIS (TP Final Programacion III, UTN) desde donde quedo la sesion anterior. Responde en espanol, corto, una pregunta a la vez; codigo, commits y docs en ingles. Commits convencionales, sin atribucion de IA.

Contexto: lee docs/agents/handoff-prompt.md (seccion 1) y la observacion de Engram handoff/avexis-backend-mvp y handoff/avexis-error-core (mem_search con project=tp-final). El PDF del enunciado en la raiz es la especificacion y su stack es cerrado.

Estado: backend/ con modelos Mongoose, esqueleto Express y el nucleo de errores (ticket #9) implementados y commiteados en local (1746d57, 1e3cf6d), 48 tests en verde. Falta publicarlo.

Haz esto, en orden:
1. Verifica: git status -sb, git log --oneline -5, y dentro de backend/ npm run typecheck y npm test (esperado: 48 tests verdes). gh auth status debe mostrar DarienPerezGit; si el token es invalido, pidele al usuario gh auth login --web.
2. Commitea docs/agents/handoff-prompt.md (docs: refresh agent handoff), haz push de main, comenta en el ticket "Nucleo de errores y logging a archivo" (#9) con los commits y cierralo.
3. Toma el siguiente ticket: "Autenticacion propia con JWT, hash y RBAC" (#3, tipo grilling): primero resuelve con el usuario las decisiones de diseno (estrategia de token, libreria de hash, matriz de roles ABOGADO / ASISTENTE), luego implementa. Leelo con gh issue view 3, reclamalo con gh issue edit 3 --add-assignee "@me", y usa los skills implement, tdd y code-review (C:\Users\PC\.agents\skills\). Antes de escribir cualquier test, propone los seams al usuario y espera su confirmacion.
4. Al terminar cada ticket: typecheck, suite completa una vez, code-review, commit, actualizar Engram y este handoff.

Reglas: la sandbox bloquea sockets locales y escrituras en .git, asi que corre tests, git y gh con BypassSandbox. El cwd es la raiz del repo: haz Set-Location a backend\ antes de npm/npx y nunca npm install desde la raiz. En PowerShell cita "@me" y parsea JSON con ConvertFrom-Json. Nunca escribas la password de Atlas en archivos, issues ni commits. No toques C:\Users\PC\package.json.
```
