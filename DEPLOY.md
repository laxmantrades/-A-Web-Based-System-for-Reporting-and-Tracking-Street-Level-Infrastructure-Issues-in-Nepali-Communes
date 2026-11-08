# Putting MeroSadak online

There are three parts, and each one goes to a different host:

| Part | Host | Why there |
|---|---|---|
| Website (`client/`) | **Vercel** (free) | made for React/Vite sites |
| API (`server/`) | **Render** (free) | runs a normal Node server that stays on (Vercel can't, my rate limiter and caches live in memory) |
| AI photo check (`classifier/`) | **Google Cloud Run** (free tier, needs a billing card) | CLIP needs about 2 GB of memory, which free plans like Render's (512 MB) can't give. Cloud Run sleeps when unused, so light use stays inside the free tier. |

The database (MongoDB Atlas) and photos (Cloudinary) are already in the cloud.

```
Browser → Vercel ──/api/*──→ Render (API) ──→ Google Cloud Run (classifier)
                                 ├─→ MongoDB Atlas
                                 └─→ Cloudinary
```

Do the steps **in this order**, because each one needs the URL from the one
before.

---

## 0. Push the code to GitHub

Render and Vercel both deploy straight from GitHub, so commit and push first.

## 1. AI classifier → Google Cloud Run

The build files for this step are kept on my laptop, not in this repo, so this
section records what is running. Check it with:

```bash
curl https://<service-url>/health
# {"ok":true,"model":"openai/clip-vit-base-patch32","version":"clip-spam-v3"}
```

**Live now (5 Nov 2026):** project `tokyo-analyst-441810-u7`, region
`europe-north1`, service `merosadak-classifier`:
`https://merosadak-classifier-1056206524523.europe-north1.run.app/classify`

Its settings:
- 2 GB of memory, because CLIP needs about that much.
- Minimum 0 copies: it sleeps when nobody uses it, so it costs nothing while idle.
- Maximum 1 copy, which keeps the cost low even if someone floods it.
- Extra CPU while starting up, so it wakes faster.
- Public access: Render can call it without a Google login (see "Important" below).

> After a quiet period it has to wake up first, which took about 40 seconds when
> I measured it. So on Render `CLASSIFIER_TIMEOUT_MS` must be `60000`. Without it
> my API only waits 8 seconds and the report shows **Not checked**. The report
> is still saved, and an officer can press **Re-classify**.

## 2. API → Render

1. Make a free account at https://render.com and connect GitHub.
2. **New → Blueprint** → pick this repo. Render reads `render.yaml` and sets up
   a service called `merosadak-api`.
3. It asks for the secret values. Copy them from your `server/.env`:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | same as in `server/.env` |
   | `CLOUDINARY_URL` | same as in `server/.env` |
   | `CLASSIFIER_URL` | the `/classify` URL from step 1 |
   | `CLIENT_ORIGIN` | leave as `http://localhost` for now, fixed in step 4 |
   | `MAIL_FROM` | `MeroSadak <you@gmail.com>`, your own Gmail address |
   | `GMAIL_*` | from step 2b (leave empty for now, emails are only logged until then) |

4. Deploy, then check:
   ```bash
   curl https://merosadak-api.onrender.com/api/health
   # {"status":"ok","service":"merosadak-api"}
   ```
   (Your URL may have extra letters, copy it from the Render dashboard.)

**MongoDB Atlas:** Render's free plan has no fixed IP, so in Atlas go to
**Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**.
The database password still protects it.

> The free plan sleeps after 15 minutes with no visitors. The first request
> after that takes about a minute; just refresh.

## 2b. Email → Gmail API

Render's free plan blocks SMTP, so the App Password from `server/.env` can't
send email there. The Gmail API still sends from my Gmail address, but over
HTTPS. My laptop keeps using SMTP.

**In Google Cloud** (https://console.cloud.google.com, any project):

1. **APIs & Services → Library** → search **Gmail API** → **Enable**.
2. **Google Auth Platform → Branding**: fill in an app name and your email.
3. **Audience**: choose **External**, keep the status on **Testing**, and under
   **Test users** add my Gmail address. Publishing asked for a domain, and
   `vercel.app` isn't accepted. In Testing, Google cancels the token after
   **7 days**, so email stops until I renew it (see below).
4. **Clients → Create client** → type **Desktop app**. Keep the client ID and
   client secret for the next step.

**On my laptop**, get the refresh token (the server's packages must be installed):

```bash
cd server
GMAIL_CLIENT_ID="paste-id" GMAIL_CLIENT_SECRET="paste-secret" node scripts/gmailRefreshToken.js
```

Open the link it prints and sign in with the Gmail account that should send the
emails. Google warns that the app isn't verified, which is normal for my own
project: press **Advanced → Go to (app name)** and allow it. The terminal then
prints the refresh token.

**On Render** → **Environment**, add these and save:

| Key | Value |
|---|---|
| `GMAIL_CLIENT_ID` | the client ID |
| `GMAIL_CLIENT_SECRET` | the client secret |
| `GMAIL_REFRESH_TOKEN` | the token from the script |
| `MAIL_FROM` | `MeroSadak <you@gmail.com>` |

After it restarts, the Render logs should say `[mail] Gmail API ready`. If it
says `Gmail API check failed`, one of the three values is wrong or the token
was cancelled. Changing my Google password also cancels it, so then I run the
script again and update `GMAIL_REFRESH_TOKEN`.

**Renewing every 7 days:** run the script again with the same client ID and
secret, then replace `GMAIL_REFRESH_TOKEN` on Render and save. Renew it before
any demo or viva, so it can't expire on the day.

These values let an app send email as me, so they only go in Render, never in
git or a chat.

## 3. Website → Vercel

1. Open `client/vercel.json` and replace `YOUR-BACKEND.onrender.com` with your
   Render URL from step 2. Commit and push.
2. Make a free account at https://vercel.com, then **Add New → Project** → import
   this repo.
3. Set **Root Directory** to `client`. Vercel finds Vite by itself
   (build `npm run build`, output `dist`). Deploy.

`vercel.json` does two things:
- sends every `/api/...` request on to Render, so to the browser the API looks
  like the same website and the officer login cookie just works
- sends every other URL to `index.html`, so refreshing a page like `/track`
  doesn't give a 404

## 4. Tell the API where the website is

On Render → `merosadak-api` → **Environment**, set `CLIENT_ORIGIN` to your
Vercel URL (for example `https://merosadak.vercel.app`, no `/` at the end). It
is used for CORS and for the links in invite and rejection emails. Save, and
Render restarts the API.

## 5. Check everything

- [ ] Website opens, homepage loads
- [ ] Submit a report with a photo, you get a number like #43
- [ ] Staff login works (`/officer/login`)
- [ ] The new report shows an AI result (not UNCLASSIFIED) after a few seconds
- [ ] Track by email works
- [ ] The confirmation email arrives after submitting a report (check spam too)
- [ ] Forgot password sends a code to a staff email

**Rate limiter check.** Requests pass through two proxies (Vercel, then
Render), which is why `TRUST_PROXY` is `2`. To check it: on your phone (mobile
data) do 9 email lookups on the track page in one minute. The 9th should say
"Too many attempts". Then do one lookup on your laptop (wifi): it should still
work. If the laptop is blocked too, everyone is sharing one counter. Change
`TRUST_PROXY` on Render to `3` and try again.

## Important before sharing the link

- **Change the demo passwords.** The README lists `admin@ward.gov.np` /
  `admin123456`, and the online site uses the same Atlas database as my laptop,
  so those accounts exist online. Log in and change them (or make new staff
  accounts and deactivate the demo ones).
- The classifier URL is public. It only downloads images from Cloudinary, so it
  can't be used to attack other sites, but anyone could send it photos.
  The one-copy limit and the budget alert keep the cost of that low.
- Same database as local: reports you make locally show up online too. To keep
  them apart, make a second database in Atlas (for example `merosadak-prod`)
  and use that in `MONGODB_URI` on Render.
