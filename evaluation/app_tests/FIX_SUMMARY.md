# Fix summary — CLIP score storage + wording fixes

Date: 2026-10-28
Full Jest output: [`fix_test_results.txt`](fix_test_results.txt)

## Result

| | Before | After |
|---|---|---|
| Test suites | 5 passed / 5 | **6 passed / 6** |
| Tests | 32 passed / 32 | **39 passed / 39** (32 existing + 7 new) |
| Failed | 0 | **0** |

## Changes

### A. Store the raw CLIP score (not displayed)

| File | Change |
|---|---|
| `server/src/lib/classifier.js` | `callClassifierOnce` now also returns the service's `score` (when it is a finite number, else `null`). `runClassification` saves it as `report.classifier.score` on every run and re-run. It stays `null` when the classifier is disabled or both attempts fail. Bucketing (`bucketFromScore`), thresholds and the audit entry are unchanged. |
| `server/src/models/Report.js` | `classifierSchema` gains `score: { type: Number, default: null, select: false }`. |

`select: false` was added after the review (see below). It keeps the score out of every query, and so out of every API response, unless code asks for it with `.select('+classifier.score')`. To read the scores for evaluation:

```js
Report.find({}).select('referenceId classifier +classifier.score').lean()
```

The score is not shown on any page, and no API returns it. The CLIP prompts, the scoring in `classifier/` and the thresholds in `ClassifierConfig.js` were not changed.

### B. Out-of-date "How it works" text

| File | Change |
|---|---|
| `client/src/data/steps.js` | Step 1 now reads: "Add a photo, choose what kind of problem it is, and use your location or describe where it is. It takes about a minute." It is used on the confirmation page (`ConfirmationPage.jsx`) and the homepage (`HowItWorks.jsx`). |

### C. "Blur" wording (redaction draws solid black boxes)

| File | Change |
|---|---|
| `client/src/pages/officer/OfficerStaff.jsx:37` | "Blur faces and number plates, add notes" → "Black out faces and number plates, add notes" |
| `client/src/pages/officer/OfficerRedact.jsx:86` | "The public now sees the blurred photo." → "The public now sees the redacted photo." |

Other "blur" matches in the client are unrelated to redaction and were left unchanged:
- Tailwind `backdrop-blur` CSS classes: `Navbar.jsx:32`, `Hero.jsx:163`, `Hero.jsx:192`, `OfficerAnalytics.jsx:295`, `OfficerReportDetail.jsx:458`
- The classifier spam label "a blank or very blurry image": `officerReports.js:100`
- SVG blur filters in `client/public/favicon.svg`

## New tests — `server/tests/classifierScore.test.js`

All tests use the existing fetch stub for the CLIP service (`setClassifier`, `classifierCalls`) and the existing helpers. No existing test, helper, mock or setup file was changed.

| Test | What it checks |
|---|---|
| C1 | After submission and classification, `classifier.score` in the database equals the score the mocked CLIP service returned (0.8123). |
| C2 | After an officer clicks "Re-classify" and the mock returns 0.0412 with spam type "chart", the stored score is updated to 0.0412 and the result is LOW. |
| C3 | The score does not appear in the officer queue, officer report detail, officer state-change response, officer list (In Review), public list, public report detail, citizen email lookup, or re-classify response. The check fails on any key containing "score" anywhere in the JSON, and on the values 0.8123 / 0.0412 appearing anywhere in the response text. |
| C4 ×3 | If CLIP times out, returns HTTP 500, or is unreachable on both attempts, the report is still saved (201), its status is `submitted`, and `classifier.score` and `classifier.result` stay `null`. |
| C5 | The older officer-only routes `GET /api/reports` and `GET /api/reports/:id`, which return the raw database document, do not include the score, and a default query leaves it out. Removing `select: false` makes this test fail, which confirms it catches the leak. |

## Independent review

The review was done by a separate subagent that made none of the changes. It compared the files against a snapshot of the working tree taken just before the changes, because the repo already had a lot of uncommitted work.

**First review**

| Check | Verdict |
|---|---|
| Only the listed files changed | PASS. The 6 files are `steps.js`, `OfficerRedact.jsx`, `OfficerStaff.jsx`, `classifier.js`, `Report.js` and the new test file. |
| CLIP prompts, scoring and thresholds unchanged | PASS. There is no diff in `classifier/` or `ClassifierConfig.js`, and the bucket result is identical for every input. |
| Score not exposed | **ISSUE.** `GET /api/reports` and `GET /api/reports/:id` (`reportController.js:146` and `:160`) return the raw Mongoose document, so the score appeared in their responses. Both routes are officer-only, and the client does not call them. The first version of the tests did not cover them. |
| No existing test weakened or removed | PASS. All existing tests, helpers, mocks and setup files are byte-identical. |

**Fix:** `select: false` was added to the schema field. The tests now read the score with `+classifier.score`, and test C5 was added.

**Re-review of the fix**

| Check | Verdict |
|---|---|
| Score excluded from queries, `res.json(doc)` and `toJSON` | PASS. This was checked with a separate experiment as well as with C5. The three aggregation pipelines do not apply `select: false`, but none of them project the score; they use only `classifier.result` or status. |
| Writes not broken | PASS. The classifier writes the score. Other saves (status changes, redaction, photo retention) load the report without the score and do not wipe it. |
| Changed files and protected files | PASS. The same 6 files changed, and the existing tests are byte-identical. |
| Test suite | PASS. 39 of 39 tests pass. |

**Remaining note from the reviewer:** no automated test checks that the score survives a later status change. The reviewer confirmed this by experiment only. The risk is low.
