# 0003. Upcoming hearings and deadlines alert

- Status: accepted
- Date: 2026-11-02
- Ticket: #11

## Context

The assignment asks for an "agenda of hearings and deadlines tied to a case, with a warning about those about to expire". `GET /api/audiencias/proximas` returns them; this ADR records how days are counted.

## Decisions

1. **Window: today and the next 7 days by default; `dias` from 1 to 30.** A value out of range answers 400, like every other invalid input (ADR 0002, decision 6). Each item carries `diasRestantes` (0 is today) and `urgente`.

2. **Urgency is counted in calendar days: `urgente` when `diasRestantes <= 2`** (today, tomorrow, the day after). Procedural terms are counted in days, and the rule lives in the backend so every client warns the same way.
   - Rejected: exactly 48 hours using `hora`. A hearing the day after tomorrow at 09:00 would turn urgent at 09:00 today, which is hard to explain.

3. **"Today" is the calendar day in `America/Argentina/Buenos_Aires`**, a named constant: the firm's days, not the server's (deploys usually run in UTC). Argentina has no daylight saving. A hearing is past when its day is before today, so today's hearings stay listed all day; one nobody marked as held reminds someone to do it.
   - Rejected: UTC. Between 21:00 and midnight in Argentina it is already tomorrow in UTC, so today's hearings would vanish.

4. **`fecha` of a hearing accepts only a calendar day (`YYYY-MM-DD`)** and is stored as UTC midnight; the local time lives in `hora`. A full timestamp answers 400: it would store the time twice and bring in a time zone, and day arithmetic would be off by one.

5. **Within the same day, fatal deadlines come first**, then by time: a fatal deadline cannot be extended.

6. **The clock is injected: `createApp({ clock })`**, real time by default. Tests fix the day through HTTP.
   - Rejected: faking the process clock (`vi.setSystemTime`), which also moves JWT expiry and database timers; and a `?hoy=` query parameter, a test hook left open in production.

## Consequences

- The alert reuses `agendaVisible` (ADR 0002): a lawyer is warned about the hearings they attend and every hearing on their own cases.
