# 0008. Agenda page

- Status: accepted
- Date: 2026-11-07
- Ticket: #17

## Context

The agenda is the home page. The assignment asks for an "agenda of hearings and deadlines tied to a case, with a warning about those about to expire". The API already returns the agenda each user may see (ADR 0002) and the upcoming items with their urgency (ADR 0003). A hearing's `fecha` is a calendar day stored as UTC midnight.

## Decisions

1. **One `GET /api/audiencias` feeds the calendar and the list; the list filters in the browser.** A firm's agenda is small and already loaded whole, so filtering it again in the API would cost a request per change and solve nothing. The listing with filters and pagination the assignment asks for is the expedientes one (ADR 0002).

2. **A day is never turned into a `Date`.** The page reads the first 10 characters of `fecha`; `new Date(fecha)` would be 21:00 of the day before in Argentina. The form uses the browser's native date and time inputs, whose values are already `YYYY-MM-DD` and `HH:mm`, the API's format. "Today" comes from the browser's local clock (`dayjs()`), never from `toISOString()`, which after 21:00 is already tomorrow in UTC.
   - Rejected: Ant Design's DatePicker and TimePicker. They hold a date object, which means a conversion on every save and a chance to bring the time zone back.

3. **A pending hearing is closed with two buttons: held, or cancelled after confirming.** A hearing is never deleted (GLOSSARY), so the user needs a way to close it, or today's would stay in the alert forever. A cancellation asks first because the page offers no way back.
   - Rejected: editing date, time and lawyer. Another form for little gain: a new date is a cancelled hearing plus a new one.

4. **One alert, red when anything is urgent or a fatal deadline, yellow otherwise, hidden when nothing is coming.** Urgency comes from the API, so every client warns the same way.

5. **The case field offers up to 100 cases**, the API's page cap (ADR 0002). A lawyer only gets their own cases back, which matches what they may load hearings on.

6. **The carátula links to its case only when the user can open it** (`puedeVerExpediente`, the same rule as the API). A lawyer attending a colleague's hearing sees what it is about but gets no link that would answer 403.

## Consequences

- A firm with more than 100 cases could not pick the older ones in the form; that would need a search in the field.
- Until the case page exists (#18), the link to a case falls back to the agenda.
- The agenda tests fix the date and the time zone (`docs/testing.md`), so the off-by-one-day bug fails on any machine.
- Role queries skip the hidden-element check in tests (`configure({ defaultHidden: true })` in `src/test/setup.ts`). With Ant Design's styles under jsdom that check took seconds per query and made the agenda tests run for minutes.
