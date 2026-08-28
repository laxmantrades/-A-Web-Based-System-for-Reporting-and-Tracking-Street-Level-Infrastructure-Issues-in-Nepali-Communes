# MeroSadak

**"मेरो सडक" — my street.**

A web-based system where citizens in Nepal can report street-level infrastructure
problems (potholes, damaged road signs, broken streetlights, faded road markings,
damaged footpaths, blocked roadside drains) with a photo and a location, then
track what happens next. Ward officers triage and resolve reports through a
dashboard, assisted by an **AI photo check** that flags whether a photo matches
the chosen category — as a hint only; a human always decides.

> BSc (Hons) Computer Science final-year project. This is a working prototype,
> not a deployed government service.

---

## Project status

| Part | Status |
| --- | --- |
| Homepage (`client`) | ✅ Built |
| Report form, tracking view, officer dashboard | ⏳ Later sprints |
| Backend API (`server`) | 🧱 Scaffolded — models + routes stubbed |
| AI photo-validation service (Python) | ⏳ Final sprint |

## Tech stack

- **Frontend:** React (JavaScript) + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express + Mongoose (MongoDB)
- **AI service (later):** Python zero-shot image classifier (e.g. CLIP)

## Repository layout

```
.
├── client/   React single-page app (the homepage lives here)
└── server/   Express + Mongoose REST API (scaffold)
```

## Getting started

### Option A — Docker (recommended, one command)

Runs the client, the API and MongoDB together. Source folders are bind-mounted,
so editing files live-reloads the containers.

```bash
docker compose up --build      # first run
docker compose up              # after that
docker compose down            # stop
```

| Service | URL |
| --- | --- |
| Client | http://localhost:5173 |
| API health check | http://localhost:5050/api/health |
| MongoDB | mongodb://localhost:27017/merosadak |

The API is mapped to host port **5050** (container port stays 5000) because
macOS often already uses 5000. Containers restart automatically after a reboot
(`restart: unless-stopped`); run `docker compose down` to stop them for good.

### Option B — run each part directly

#### Prerequisites
- Node.js 20.19+ or 22.12+ and npm
- MongoDB running locally (only needed for the backend)

#### Frontend

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

#### Backend

```bash
cd server
npm install
cp .env.example .env    # then edit values
npm run dev             # http://localhost:5000/api/health
```

The API stays up even if MongoDB is unreachable (data routes return 500) so the
frontend can be developed independently.
# -A-Web-Based-System-for-Reporting-and-Tracking-Street-Level-Infrastructure-Issues-in-Nepali-Communes
