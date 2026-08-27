# MeroSadak — API (server)

Express + Mongoose REST API. **Scaffold stage:** the app boots, connects to
MongoDB, and exposes the route shape. Read endpoints are sketched; write
endpoints return `501 Not Implemented` with a TODO pointing at the sprint that
will build them.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

## Layout

```
src/
├── index.js                  entry point: connect DB, start server
├── app.js                    builds the Express app (importable by tests)
├── config/db.js              Mongoose connection helper
├── middleware/errorHandler.js  notFound + errorHandler + asyncHandler
├── models/
│   ├── User.js               signed-in users (citizen | officer)
│   └── Report.js             the core model: category, photo, GeoJSON
│                             location, lifecycle status + audit trail,
│                             advisory aiValidation subdocument
├── routes/reportRoutes.js    /api/reports
└── controllers/reportController.js  request handlers
```

## Endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/health` | Liveness check | ✅ |
| GET | `/api/reports` | List/filter reports (`?ward=&status=&category=`) | ✅ (needs DB) |
| GET | `/api/reports/:id` | One report + audit trail | ✅ (needs DB) |
| POST | `/api/reports` | Citizen creates a report (photo upload) | ⏳ 501 |
| PATCH | `/api/reports/:id/status` | Officer advances the lifecycle | ⏳ 501 |

## Issue lifecycle

```
submitted ─▶ acknowledged ─▶ in_progress ─▶ resolved
     └───────────────┴───────────────┴────▶ rejected / duplicate
```

Every transition appends a `statusEvent { status, note, changedBy, changedAt }`
to `report.statusHistory` — that array is the audit trail.

## AI photo check (later)

A separate Python service will compare the uploaded photo against the chosen
category and return one of `match | unsure | mismatch`. The API stores it in
`report.aiValidation`. It is advisory: shown to officers only, never changes a
status by itself, and is never shown to citizens.
