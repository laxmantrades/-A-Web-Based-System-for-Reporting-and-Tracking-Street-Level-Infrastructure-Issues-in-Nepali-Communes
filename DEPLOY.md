# Putting MeroSadak online

There are three parts, and each one goes to a different free host:

| Part | Host | Why there |
|---|---|---|
| Website (`client/`) | **Vercel** | made for React/Vite sites |
| API (`server/`) | **Render** | runs a normal Node server that stays on (Vercel can't, my rate limiter and caches live in memory) |
| AI photo check (`classifier/`) | **Hugging Face Spaces** | free 16 GB RAM, CLIP needs about 2 GB |

The database (MongoDB Atlas) and photos (Cloudinary) are already in the cloud.

```
Browser → Vercel ──/api/*──→ Render (API) ──→ Hugging Face (classifier)
                                 ├─→ MongoDB Atlas
                                 └─→ Cloudinary
```

Do the steps **in this order**, because each one needs the URL from the one
before.

---

## 0. Push the code to GitHub

Render and Vercel both deploy straight from GitHub, so commit and push first.

## 1. AI classifier → Hugging Face Spaces

1. Make a free account at https://huggingface.co
2. Go to https://huggingface.co/new-space
   - Space name: `merosadak-classifier`
   - SDK: **Docker** → **Blank**
   - Hardware: **CPU basic (free)**
   - Visibility: Public (Private Spaces can't be called from Render without a token)
3. In the new Space open **Files → Add file → Upload files** and upload:
   - `classifier/Dockerfile`
   - `classifier/app.py`
   - `classifier/prompts.py`
   - `classifier/requirements.txt`
   - `deploy/huggingface/README.md`. This one **replaces** the Space's README
     (it tells Hugging Face to use Docker on port 8000).
4. Wait for the build (about 5–10 minutes, it installs torch). The status goes
   from *Building* to *Running*.
5. Check it:
   ```bash
   curl https://<your-hf-username>-merosadak-classifier.hf.space/health
   # {"ok":true,"model":"openai/clip-vit-base-patch32","version":"clip-spam-v3"}
   ```
   The first start downloads the model, so give it another minute if it
   doesn't answer straight away.

Write down: `https://<your-hf-username>-merosadak-classifier.hf.space/classify`

> A free Space goes to sleep after ~48 hours with no use. The first report
> after that comes back **UNCLASSIFIED** (my API only waits 8 s). The report is
> still saved, and an officer can press **Re-classify**.

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
   | `SMTP_*`, `MAIL_FROM` | same as in `server/.env` (or leave empty, then emails are only logged) |

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
- Same database as local: reports you make locally show up online too. To keep
  them apart, make a second database in Atlas (for example `merosadak-prod`)
  and use that in `MONGODB_URI` on Render.
