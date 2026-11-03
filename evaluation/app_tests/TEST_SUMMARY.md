# MeroSadak backend — automated test summary

Thesis Section 4.4 Implementation Testing.

| | |
|---|---|
| Run | 2026-10-28 12:05:15 CET |
| Node.js | v22.11.0 |
| Jest | 29.7.0 (with Supertest 7.0.0, mongodb-memory-server 10.1.2) |
| Command | `cd server && npm test` (`NODE_OPTIONS=--experimental-vm-modules jest --runInBand`) |
| Raw output | `test_results.txt` · JSON: `test_results.json` |

## Results by area

| Test area | File | Tests | Passed | Failed |
|---|---|---|---|---|
| Infrastructure sanity checks | `infra.test.js` | 5 | 5 | 0 |
| A – Citizen reporting (1–5) | `citizen.test.js` | 7 | 7 | 0 |
| B – Tracking and public list (6–8) | `tracking.test.js` | 4 | 4 | 0 |
| C – Officer authentication and roles (9–13) | `auth.test.js` | 12 | 12 | 0 |
| D – Officer actions and moderation (14–17) | `officer.test.js` | 4 | 4 | 0 |
| **Total** | | **32** | **32** | **0** |

Before this work the project had no automated tests (see `existing_tests_output.txt`).

## Every test

**Infrastructure sanity checks** (`server/tests/infra.test.js`)

- ✅ PASS — health check responds
- ✅ PASS — database is the in-memory server, not Atlas
- ✅ PASS — connecting to any other database is refused
- ✅ PASS — outbound calls to real hosts are blocked
- ✅ PASS — photos live in the fake Cloudinary store and can be fetched back

**A – Citizen reporting (1–5)** (`server/tests/citizen.test.js`)

- ✅ PASS — 1. report with GPS only (no written location) is accepted and stored as GeoJSON
- ✅ PASS — 2. report with written location description only (no GPS) is accepted
- ✅ PASS — 3. report with neither GPS nor location description is rejected and not saved
- ✅ PASS — 4. citizen note longer than 200 characters is rejected and not saved
- ✅ PASS — 4b. citizen note of exactly 200 characters is accepted (boundary)
- ✅ PASS — 5a. CLIP service timeout: report is still saved and left unclassified
- ✅ PASS — 5b. CLIP service failure (HTTP 500 / unreachable): report is still saved and left unclassified

**B – Tracking and public list (6–8)** (`server/tests/tracking.test.js`)

- ✅ PASS — 6a. Email lookup returns only that email's reports (case-insensitive), never another person's
- ✅ PASS — 6b. A just-submitted report is trackable by its email at once, but stays off the public feed until an officer reviews it
- ✅ PASS — 7. Public list shows only acknowledged / in_progress / resolved / closed reports
- ✅ PASS — 8. Public list never includes citizen email addresses

**C – Officer authentication and roles (9–13)** (`server/tests/auth.test.js`)

- ✅ PASS — 9a. correct password signs in, sets a session cookie, and /me works
- ✅ PASS — 9b. wrong password is refused with 401 and no session cookie
- ✅ PASS — 10a. 5 failed attempts within 15 minutes lock the account (correct password then refused)
- ✅ PASS — 10b. failures spread over more than 15 minutes do not lock the account
- ✅ PASS — 10c. 4 failed attempts do not lock: the correct password still signs in
- ✅ PASS — 11. each failed attempt is logged in the authauditlogs collection
- ✅ PASS — 12a. officer routes return 401 with no session cookie
- ✅ PASS — 12b. officer routes return 401 with a made-up session cookie
- ✅ PASS — 12c. officer routes return 401 with an expired session (and allow a live one)
- ✅ PASS — 12d. report-changing officer routes return 401 without a valid session and change nothing
- ✅ PASS — 13a. an admin can create a staff account
- ✅ PASS — 13b. an officer is refused (403) and no account is created

**D – Officer actions and moderation (14–17)** (`server/tests/officer.test.js`)

- ✅ PASS — 14. status change is recorded in the activity log with who and when
- ✅ PASS — 15. priority change is saved and does not send a citizen email
- ✅ PASS — 16. redaction creates a different image and keeps the original while open
- ✅ PASS — 17. hiding a photo removes it from the public list

## Failing tests

**None — all tests pass.**

### Note on test 6b: corrected after the project owner clarified the requirement

- **First version:** 6b assumed, from the email hint on the citizen form ("it can only be tracked once an officer sees it", `client/src/pages/ReportIssue.jsx:246-247`), that a `submitted` report should not appear in the email lookup. It failed, because the lookup returns every report for the email.
- **Clarified requirement:** the project owner confirmed the intended behaviour:
  - a person who submitted a report can track it by email straight away;
  - a report does not appear on the public feed until an officer has reviewed it.
- **Current version:** 6b now tests this whole flow:
  1. a just-submitted report is returned by the email lookup with status `submitted`;
  2. it is absent from the public feed and its public detail page returns 404;
  3. an officer moves it to `acknowledged` through the real route;
  4. it then appears on the public feed and detail page, and the submitter's tracking view shows the new status.

  It passes, so the backend behaves as intended.
- **Form wording fixed afterwards:** the form hint used to say the report "can only be tracked once an officer sees it", which contradicted the intended behaviour. After all tests had been run, and at the project owner's request, it was changed in `client/src/pages/ReportIssue.jsx:247` to: "Use this email to track your report. It appears on the public feed once a ward officer has reviewed it." This is a text-only change in the frontend; the backend under test is unaffected and the results above still apply.

## Independent reviewer's findings

A separate subagent that wrote none of the tests reviewed the first version of the suite: 30 tests, with 29 passing and 1 failing (6b) in two identical runs. The changes made after the review are listed in the table below.

**Check 1 – no application code changed: PASS.** A SHA-256 baseline of 107 app files (`server/src`, `server/scripts`, `client/src`, `classifier`, `server/package.json`) was taken before any test work. Afterwards only `server/package.json` differs. That diff is just the `test` script and the `devDependencies` block; runtime dependencies are unchanged. No new files were added under app folders. The same checksum check was repeated after the follow-up changes below, with the same result.

**Check 2 – tests really test the behaviour: PASS, with issues.**

- **What is solid:**
  - There are no skipped, focused or empty tests, no `expect(true)`, and no swallowed or conditional assertions.
  - Tests use the real Express app, routes, Mongoose, MongoDB engine and sharp; only external services are faked.
  - The negative tests check that nothing was saved, not just the status code.
  - Background classification and emails are awaited.
  - The rate limiters and the public-list cache are handled so tests cannot affect each other.
- **Issues raised, and what was done (test code only; no app code changed):**

| # | Reviewer's issue | Action |
|---|---|---|
| 1 | 6b over-interprets one sentence of form text that conflicts with the server design and other UI copy | **Resolved.** The project owner confirmed the intended behaviour (track by email at once; public feed only after officer review). 6b was rewritten to test exactly that, and it passes. The misleading form hint was later reworded at the owner's request (see above). |
| 2 | 5a simulated the *result* of a timeout, so it would still pass if the app had no timeout | **Fixed.** A new `hang` classifier mode never answers and only settles when the app's own abort signal fires. 5a now waits out the app's real 8 s timeout twice (first try and retry, about 17 s) and asserts both requests were aborted with `TimeoutError`. Without `AbortSignal.timeout` the test cannot finish. It also asserts the citizen's response arrives in under 2 s. |
| 3 | Tests 3 and 4 accepted any 4xx with any message | **Fixed.** They now require exactly `400` and the specific message (location rule; "note under 200 characters"). |
| 4 | 10a only had an upper bound on the lock, and nothing showed 4 failures don't lock | **Fixed.** 10a asserts that after 4 failures there is no lock, and that the lock lasts exactly 15 min from the 5th failure (both bounds). New test **10c**: 4 failures, then the correct password still signs in. |
| 5 | 12 covered only 5 read/logout routes | **Fixed.** New test **12d** covers 8 report-changing routes (state, priority, reject, notes, photo hide, redact, remove redaction, reclassify) and 4 officer-only reads (including `GET /api/reports`), each with no cookie and with a forged cookie. All return 401, and the report, its audit log and the outbox are verified unchanged. |
| 6a | 16 didn't check what the public sees | **Fixed.** 16 now also checks that `GET /api/reports/public/:ref/photo` serves the redacted image (box area black), not the original. |
| 6b | 13a used a fixed 50 ms sleep | **Fixed.** It now uses `waitFor`. |
| 6c | 17's interpretation should be stated | Interpretation: "removes it from the public list" = the report card stays, `photoUrl` is null, and both public photo endpoints return 404. |

- **Also noted (from subagent C, test 11):** a failed sign-in is logged with the attempted email, IP, reason and time, but the user id is left empty even when the account exists (`officerController.js:101`). Only the `account_locked` entry carries the user id.

**Check 3 – no real external services or database: PASS.**

- `.env` is never loaded, `MONGODB_URI` is unset, and connecting to an Atlas URI is refused (proved by an infrastructure test).
- `nodemailer` and `cloudinary` are mapped to fakes.
- `fetch` is stubbed before any app code runs and blocks real hosts.
- The only download was the one-off `mongod` binary for the in-memory database engine.

## How the tests are isolated

- **Database:** each test file starts its own `mongodb-memory-server` and wipes every collection before each test. `mongoose.connect` is wrapped so that any URI other than the local in-memory server throws, and `server/.env` is never loaded.
- **Email:** `nodemailer` is replaced by an in-memory fake (`tests/mocks/nodemailer.js`); tests can inspect the outbox.
- **Cloudinary:** the `cloudinary` SDK is replaced by an in-memory image store (`tests/mocks/cloudinary.js`), so the redaction code still runs for real on real JPEG bytes.
- **CLIP classifier and Nominatim:** a global `fetch` stub (`tests/mocks/network.js`) answers the classifier, with switchable modes: score, hang, timeout, down, HTTP 500, invalid payload. It also answers Cloudinary image reads and Nominatim. Any other non-local host is refused, and the test fails. The server itself never calls Nominatim (geocoding happens in the browser), so that stub is only a safeguard.
- **Shared helpers:** `tests/helpers.js` creates staff accounts, sessions, reports and test JPEGs, submits citizen reports, and waits for background classification to finish.
- **Only change outside `server/tests`:** `server/package.json` and `server/package-lock.json` gained the three devDependencies and the `test` script. `server/jest.config.js` is new.
