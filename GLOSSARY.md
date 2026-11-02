# Glossary

Domain terms for AVEXIS, the legal-practice management system. Code uses the Spanish term; this file explains it.

## People and roles

**Estudio (jurídico)**: the law firm that uses the system. One deployment serves one firm.

**Usuario**: a person who logs into the system. Every user has exactly one `rol` and may also be the `titular`.

**Rol**: what a user does at the firm. The assignment requires two:

- **ABOGADO**: a lawyer. Carries cases (`expedientes`) as the responsible lawyer and represents clients at hearings. Sees only their own cases and agenda.
- **ASISTENTE**: maps to the firm's *procuración* (see below). Loads movimientos, audiencias and clientes on any case.

**Titular**: the firm owner (or a partner). An ABOGADO with `esTitular: true`. Manages the firm's users and sees every case and agenda. A firm may have several. Not a third role: it is an administrative capability on top of the ABOGADO role.

**Procuración**: the procedural legwork of a case: serving notices (*cédulas*), official letters (*oficios*), routine filings (*escritos de mero trámite*), and checking on rulings at the courthouse. In AVEXIS the ASISTENTE role does this work as a team shared across the firm, not assigned to one lawyer. Some firms instead assign each *procurador* to one lawyer; see ADR 0001.

**Abogado responsable**: the lawyer who carries a case (`Expediente.abogadoResponsableId`).

## Access

**Desactivar**: setting `activo: false` on a user. Users are never deleted, so the history of who did what is kept. A deactivated user cannot log in and their open sessions stop working immediately.

**Debe cambiar password**: `debeCambiarPassword: true`. Set when the titular creates a user or resets their password, so the user must replace a password someone else chose before using the system.

## Cases and agenda

**Expediente**: a case the firm carries, with one abogado responsable. Never deleted: it is archived (`ARCHIVADO`).

**Movimiento**: an entry in a case's procedural history (escrito, resolución, notificación, cédula, oficio...). Immutable: a mistake is corrected with a new entry.

**Cédula / Oficio**: a court notice served on a party / an official letter to another office. Core procuración tasks, so they are their own movimiento types (`CEDULA`, `OFICIO`).

**Audiencia**: a hearing, deadline (`VENCIMIENTO`) or expert examination (`PERICIA`) with the ABOGADO who attends. Never deleted: it is cancelled (`CANCELADA`). A **vencimiento fatal** cannot be extended.

**Agenda**: the hearings a user sees. A lawyer's agenda is the hearings they attend plus every hearing on their own cases; the titular and the assistant see the whole firm's. See ADR 0002.

**Próximas / urgente**: the alert of upcoming hearings and deadlines: pending ones from today through the next 7 days, counted in the firm's calendar days (Argentina). Urgente means due today, tomorrow or the day after. See ADR 0003.

**Honorario**: the fee agreed for a case, with its pagos. Its estado (pendiente, parcial, pagado) is derived from the payments. Only the responsible lawyer and the titular see it.
