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

**Live version:**

- Website: <https://merosadak-an.vercel.app/>
- API: <https://a-web-based-system-for-reporting-and.onrender.com>

The API is on Render's free plan, so it goes to sleep when nobody is using it.
If the website is slow the first time, wait up to a minute and refresh.

---

## Table of contents

**About the project**

1. [What it does](#what-it-does)
2. [The AI photo check](#the-ai-photo-check)
3. [How it fits together](#how-it-fits-together)
4. [What it's built with](#what-its-built-with)
5. [Folder layout](#folder-layout)
6. [Privacy notes](#privacy-notes)

**Running it yourself**

7. [Before you start](#before-you-start)
8. [Option A: from the submitted zip](#option-a-from-the-submitted-zip)
9. [Option B: from GitHub](#option-b-from-github)
10. [Running the AI photo check locally](#running-the-ai-photo-check-locally)
11. [Staff accounts](#staff-accounts)
12. [Useful addresses](#useful-addresses)
13. [If something goes wrong](#if-something-goes-wrong)
14. [Running the tests](#running-the-tests)
15. [Putting it online](#putting-it-online)

---

# About the project

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

- See a queue of new reports and move each one through the steps shown
  below.
- See the place on a map if the citizen shared their location.
- Black out faces and number plates in a photo before it goes public.
- Look at simple analytics, manage staff accounts, and add notes.

The steps a report goes through. Staff can only reject a report while it is
still in Needs Review or In Review.

```mermaid
flowchart LR
    A([Needs Review]) --> B([In Review]) --> C([In Progress]) --> D([Resolved]) --> E([Closed])
    A -.-> R([Rejected])
    B -.-> R
```

## The AI photo check

When someone submits a photo, a small AI model called
[CLIP](https://openai.com/research/clip) looks at it and guesses whether it is
a real street photo or spam (for example a picture of a chair, a selfie, or a
screenshot of a trading chart). Staff see one of three labels: **Looks
genuine**, **Unsure** or **Likely spam**. It is only a hint. A person always
makes the final decision, and citizens never see the label.

This is how the three labels look on the staff dashboard:

<img src="evaluation/demo/screenshots/fig_ai_photo_check_states.png" alt="The three AI photo check labels on the staff dashboard" width="480">

I tested it on 114 photos it had never seen before (54 real street photos and
60 spam photos):

| Result | Count |
| --- | --- |
| Correct, when it gave a clear answer | 113 of 113 |
| Real street photos marked as spam | 0 of 54 |
| Spam marked as genuine | 0 of 60 |
| Said "Unsure" | 1 of 114 |

It still finds dark or blurry road photos harder, which is why it only gives a
hint and never rejects a report by itself. The full evaluation and how to
re-run it are in [evaluation/README.md](evaluation/README.md).

## How it fits together

```mermaid
flowchart LR
    U[Browser] --> W[Website<br/>React on Vercel]
    W -- "/api" --> S[API<br/>Express on Render]
    S --> DB[(MongoDB Atlas<br/>cloud database)]
    S --> C[Cloudinary<br/>photos]
    S --> AI[AI photo check<br/>CLIP on Cloud Run]
    S --> M[Gmail<br/>emails]
```

**The database is in the cloud.** All reports and staff accounts are stored
in a **MongoDB Atlas** database online, not on your computer. You don't need
to install MongoDB to run the project. The API connects to Atlas over the
internet using the `MONGODB_URI` setting. Photos are stored online the same
way, in Cloudinary.

This also means the live website and a copy running on your computer share
the same data. A report you make on one shows up on the other.

## What it's built with

| Part | Tech | Folder |
| --- | --- | --- |
| Website (frontend) | React, Vite, Tailwind CSS, React Router | `client/` |
| API (backend) | Node.js, Express, Mongoose | `server/` |
| Database | MongoDB Atlas (cloud) | n/a |
| Photo storage | Cloudinary (cloud) | n/a |
| AI photo check | Python, FastAPI, CLIP (`openai/clip-vit-base-patch32`) | `classifier/` |
| Maps | Leaflet with OpenStreetMap | n/a |

## Folder layout

```
.
├── client/        the React website (citizen pages + staff dashboard)
├── server/        the Express API, database models and tests
├── classifier/    the Python service that runs the CLIP photo check
├── deploy/        Cloud Run build settings for the classifier
└── evaluation/    my thesis evaluation: app test reports + the AI photo check test
```

## Privacy notes

- Citizens don't need an account. Their email is only used to send updates.
- Faces and number plates can be blacked out by staff before a photo is shown
  publicly.
- The raw AI score is saved for my evaluation, but it is never shown on any
  page or returned by the API.

---

# Running it yourself

The easiest way to see the project is the [live website](https://merosadak-an.vercel.app/).
Nothing needs installing. If you want to run it on your own computer, follow
the steps below.

## Before you start

You need:

- [Node.js](https://nodejs.org/) version 20.19 or newer (the "LTS" download
  is fine). Check it with `node -v`.
- An internet connection, because the database (MongoDB Atlas) and photo
  storage (Cloudinary) are online.

You **don't** need to install MongoDB. The commands below are the same on
Windows, macOS and Linux.

There are two ways to get the code:

| | Option A: submitted zip | Option B: GitHub |
| --- | --- | --- |
| Who it's for | Markers and my supervisor | Anyone else |
| Settings file (`server/.env`) | Already included | You make it yourself |
| Database | Connects to my MongoDB Atlas database | Your own free MongoDB Atlas database |

## Option A: from the submitted zip

1. Download the zip and unzip it.
2. The settings file `server/.env` is already inside, so there is nothing to
   set up. It connects to my MongoDB Atlas database and Cloudinary account.
3. Open a terminal in the unzipped folder and start the API:

   ```bash
   cd server
   npm install
   npm run dev
   ```

   Leave it running. It should say it is listening on port 5050 and connected
   to MongoDB.

4. Open a **second** terminal in the same folder and start the website:

   ```bash
   cd client
   npm install
   npm run dev
   ```

5. Go to <http://localhost:5173> in your browser.

The first `npm install` takes a few minutes. The zip copy doesn't send real
emails: reset codes and report updates are printed in the API terminal
instead.

## Option B: from GitHub

### 1. Get the code

Clone it with git:

```bash
git clone https://github.com/laxmantrades/-A-Web-Based-System-for-Reporting-and-Tracking-Street-Level-Infrastructure-Issues-in-Nepali-Communes.git MeroSadak
cd MeroSadak
```

Or on the GitHub page press **Code → Download ZIP** and unzip it. Either way
you get the same files.

### 2. Make your own cloud database and photo storage

The GitHub copy has no settings file, so you need your own free accounts:

- **MongoDB Atlas** (database): sign up at <https://www.mongodb.com/atlas>,
  create a free cluster, add a database user, and in **Network Access** allow
  your IP address. Then press **Connect → Drivers** and copy the connection
  string. It looks like
  `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/merosadak`.
- **Cloudinary** (photos): sign up at <https://cloudinary.com/> and copy the
  "API environment variable" from **Settings → API Keys**. It looks like
  `cloudinary://<api_key>:<api_secret>@<cloud_name>`.

### 3. Make the settings file (`server/.env`)

The API reads its passwords and keys from `server/.env`. This file is **not**
on GitHub (it is git-ignored) because it holds real secrets.

Create `server/.env` and fill in your own values:

```bash
# Required
PORT=5050
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/merosadak
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
CLIENT_ORIGIN=http://localhost:5173

# Optional: the AI photo check. Leave out to use a made-up result.
CLASSIFIER_URL=http://localhost:8000/classify

# Optional: for sending real emails (otherwise emails are just printed in the logs)
# Option A: Gmail SMTP with an App Password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="MeroSadak <you@gmail.com>"
# Option B: Gmail API (used on Render, where SMTP is blocked).
# Get the refresh token with: node scripts/gmailRefreshToken.js
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

A few rules for the file:

- One setting per line, written as `NAME=value`, with no spaces around `=`.
- Put quotes around a value only if it has spaces in it, like `MAIL_FROM`.
- Never commit `.env` or paste it into an issue or chat. Before you push,
  `git status` should not list it.
- If you change `.env`, restart the API so it picks up the new values.

The website (`client/`) does not need a `.env`. In development it sends
`/api` requests to `http://localhost:5050`. If your API runs somewhere else,
start it with `API_TARGET=<url> npm run dev`.

### 4. Start it

Same as Option A, in two terminals:

```bash
# terminal 1: the API
cd server
npm install
npm run dev

# terminal 2: the website
cd client
npm install
npm run dev
```

Then go to <http://localhost:5173>. Your database starts empty, so to get
some example reports run this in the `server` folder:

```bash
node scripts/seedTrackingDemo.js
```

To see them, look up `demo@merosadak.local` on the tracking page.

Your new database has no staff accounts, so the staff dashboard won't have a
login yet.

## Running the AI photo check locally

This is optional for both options. Without it, the API uses a made-up AI
result so the dashboard still has something to show. To run the real one you
need Python 3.11. In a third terminal:

```bash
cd classifier
python3.11 -m venv .venv
.venv/bin/pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --port 8000
```

On Windows, use `.venv\Scripts\pip` and `.venv\Scripts\uvicorn` instead of
`.venv/bin/...`.

Then add `CLASSIFIER_URL=http://localhost:8000/classify` to `server/.env` and
restart the API. The first start is slow because it downloads the CLIP model
(about 600 MB). After that it is cached.

## Staff accounts

My database already has two staff accounts:

| Email | Role |
| --- | --- |
| `officer@ward.gov.np` | Ward officer |
| `admin@ward.gov.np` | Admin |

Their passwords are not in this repo. Markers get them with my submission.
Log in at <http://localhost:5173/officer/login>.

## Useful addresses

| What | Where |
| --- | --- |
| Website | http://localhost:5173 |
| Staff login | http://localhost:5173/officer/login |
| API health check | http://localhost:5050/api/health |
| AI service health check (if it's running) | http://localhost:8000/health |

## If something goes wrong

| Problem | Fix |
| --- | --- |
| `npm` or `node` not found | Install Node.js, then open a new terminal |
| Website loads but shows no reports / errors | Make sure the API terminal is still running |
| `EADDRINUSE` / port already in use | Close whatever is using port 5050 or 5173, or restart the computer |
| API says it can't connect to MongoDB | Check your internet connection. Some university networks block MongoDB's port 27017, so try another network. With your own Atlas database (Option B), also check your IP is allowed in **Network Access** |

## Running the tests

The backend has automated tests written with Jest. They use a temporary
in-memory database, so they don't touch the real data in Atlas.

```bash
cd server
npm install
npm test
```

You can also test the AI photo check live: send it one photo, or re-run the
whole thesis evaluation against the running classifier. The steps are in
[evaluation/README.md](evaluation/README.md#running-the-tests-yourself).

## Putting it online

The website goes on Vercel and the API on Render (both free), the AI photo
check on Google Cloud Run (free tier, needs a billing card), and the database
stays on MongoDB Atlas. Step-by-step guide: [DEPLOY.md](DEPLOY.md).

---

*Made by Laxman Giri as a final-year project.*
