# MeroSadak

**"मेरो सडक" means "my street".**

MeroSadak is my final-year project for BSc (Hons) Computer Science. It is a
website where people in Nepal can report problems on their street, like a
pothole or a broken streetlight, and then check what is happening with their
report. Staff at the ward office get their own dashboard where they look at the
reports and update them.

The full project title is *A Web-Based System for Reporting and Tracking
Street-Level Infrastructure Issues in Nepali Communes*.

> This is a student prototype. It works, but it is not a real government
> service, so please don't use it to report real problems.

---

## What it does

**For citizens (no account needed):**

- Report a problem with a photo. You pick one of six types: pothole, damaged
  road sign, broken streetlight, faded road markings, damaged footpath, or
  blocked roadside drain.
- Say where it is. You can press **"Use my location"** or type a description
  like *"Ward 6, near Shree Ganesh Temple"*.
- Get a reference number (something like **#42**) and use it to track your
  report.
- Browse reports that other people have made on the public reports page.

**For ward staff (login needed):**

- See a queue of new reports and move each one through the steps:
  *Needs Review → In Review → In Progress → Resolved → Closed* (or *Rejected*).
- See the place on a map if the citizen shared their location.
- Black out faces and number plates in a photo before it goes public.
- Look at simple analytics, manage staff accounts, and add notes.

**The AI photo check:**

When someone submits a photo, a small AI model called
[CLIP](https://openai.com/research/clip) looks at it and guesses whether it is
a real street photo or spam (for example a picture of a chair, a selfie, or a
screenshot of a trading chart). Staff see one of three labels: **Looks
genuine**, **Unsure** or **Likely spam**. It is only a hint. A person always
makes the final decision, and citizens never see the label.

---

## What it's built with

| Part | Tech | Folder |
| --- | --- | --- |
| Website (frontend) | React, Vite, Tailwind CSS, React Router | `client/` |
| API (backend) | Node.js, Express, Mongoose | `server/` |
| Database | MongoDB Atlas (in the cloud) | n/a |
| Photo storage | Cloudinary | n/a |
| AI photo check | Python, FastAPI, CLIP (`openai/clip-vit-base-patch32`) | `classifier/` |
| Maps | Leaflet with OpenStreetMap | n/a |

---

## Folder layout

```
.
├── client/        the React website (citizen pages + staff dashboard)
├── server/        the Express API, database models and tests
├── classifier/    the Python service that runs the CLIP photo check
├── evaluation/    my thesis evaluation: app test reports + the AI photo check test (see evaluation/README.md)
└── docker-compose.yml   starts everything with one command
```

---

## How to run it

The easiest way is with **Docker**, because it starts all three parts
(website, API and AI service) together, so you don't have to install Node or
Python yourself.

### 1. Things you need first

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) database
- A free [Cloudinary](https://cloudinary.com/) account (this is where photos
  are saved)

### 2. Make the settings file

Create a file called `server/.env` and put your own values in it:

```bash
# Required
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/merosadak
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

# Optional: for sending real emails (otherwise emails are just printed in the logs)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="MeroSadak <you@gmail.com>"
```



### 3. Start everything

```bash
docker compose up --build    # the first time (it takes a while to download things)
docker compose up            # every time after that
docker compose down          # to stop it
```

The first start of the AI service is slow because it downloads the CLIP model
(about 600 MB). After that it is cached.

### 4. Open it

| What | Where |
| --- | --- |
| Website | http://localhost:5173 |
| Staff login | http://localhost:5173/officer/login |
| API health check | http://localhost:5050/api/health |
| AI service health check | http://localhost:8000/health |

The API uses port **5050** on your computer instead of 5000, because on a Mac
port 5000 is often already used by AirPlay.

### 5. Make some staff accounts to log in with

```bash
docker compose exec server node scripts/seedOfficers.js
```

This makes two demo accounts:

| Email | Password | Role |
| --- | --- | --- |
| `officer@ward.gov.np` | `officer1234` | Ward officer (asks you to change the password on first login) |
| `admin@ward.gov.np` | `admin123456` | Admin |

If you want some example reports to play with as well:

```bash
docker compose exec server node scripts/seedTrackingDemo.js
```

---

## Putting it online

The website goes on Vercel, the API on Render and the AI photo check on
Hugging Face Spaces (all free). Step-by-step guide: [DEPLOY.md](DEPLOY.md).

---

## Running the tests

The backend has automated tests written with Jest. They use a temporary
in-memory database, so they don't touch your real data.

```bash
cd server
npm install
npm test
```

You can also test the AI photo check live: send it one photo, or re-run the
whole thesis evaluation against the running classifier. The steps are in
[evaluation/README.md](evaluation/README.md#running-the-tests-yourself).

---

## Running without Docker (if you want to)

You need Node.js 20.19+ (or 22.12+). Open two terminals:

```bash
# terminal 1: the API
cd server
npm install
npm run dev        # http://localhost:5000

# terminal 2: the website
cd client
npm install
npm run dev        # http://localhost:5173
```

Without the Python service running, the API uses a made-up AI result while
you're developing, so the dashboard still has something to show. To run the AI
service yourself you need Python 3.11. See `classifier/Dockerfile` for the
packages it installs.

---

## Some things I learned / problems I hit

- **Docker port 5000 on Mac:** it clashed with AirPlay, which is why the API is
  on 5050.
- **New files in Docker:** if I added a new route or controller file, I
  sometimes had to run `docker compose restart server` before it worked.
- **New npm packages in Docker:** after adding a package I had to rebuild with
  `docker compose up -d --build -V server`.
- **The AI is not perfect:** dark or blurry road photos are harder for it,
  which is why it only gives a hint and never rejects a report by itself.

---

## Privacy notes

- Citizens don't need an account. Their email is only used to send updates.
- Faces and number plates can be blacked out by staff before a photo is shown
  publicly.
- The raw AI score is saved for my evaluation, but it is never shown on any
  page or returned by the API.

---

*Made by Laxman Giri as a final-year project.*
