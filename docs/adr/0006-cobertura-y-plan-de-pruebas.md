# 0006. Coverage threshold and test plan

- Status: accepted
- Date: 2026-11-03
- Ticket: #8

## Context

The assignment asks for "minimum coverage of 40% (statements), coverage report delivered with the repo; integration tests (supertest) of at least 50% of the backend routes". When this was decided the suite already reached about 95% of statements, because every feature was built test first.

## Decisions

1. **The coverage threshold is 90% of statements and lines, 85% of branches and functions**, not the 40% minimum. Coverage says which code runs during the tests, not whether it is well tested (that is the job of the assertions), so the threshold is an alarm, not a goal: close to the real value, `npm run test:coverage` fails as soon as code lands without tests, while leaving room for code that is hard to test, such as the scripts that connect to Atlas.
   - Rejected: 40%. Half the suite could disappear without the alarm going off.
   - Rejected: the exact current value. Any trivial untested line would break it.

2. **The coverage report is versioned in `backend/coverage/`**, because the assignment asks for it delivered with the repo. It holds the HTML and lcov reports only (the JSON summary reporter is off because it writes absolute local paths). It is regenerated with `npm run test:coverage` before each delivery commit, marked as generated in `.gitattributes` so it stays out of diffs and language statistics.
   - Rejected: generating it only by script. Whether that counts as "delivered with the repo" would be up to the reviewer.

3. **Only the tests and their helpers are excluded from coverage.** `server.ts` and the CLI scripts count even though they are not tested, so the number is not inflated by leaving hard code out.

4. **The route inventory is a hand-written table in `docs/testing.md`**: each route, its test file, and its happy and error cases. Two automatic checks keep it honest: the documentation contract test fails on an undocumented route, and the coverage threshold fails on untested code.
   - Rejected: generating the inventory. Knowing which test covers which route would need annotations in every test.
