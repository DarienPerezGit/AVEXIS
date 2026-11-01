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
