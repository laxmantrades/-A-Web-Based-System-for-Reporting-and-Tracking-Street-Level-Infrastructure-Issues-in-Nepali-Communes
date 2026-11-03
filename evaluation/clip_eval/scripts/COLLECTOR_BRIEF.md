> Kept as a record of how the dataset was collected (thesis method). The
> collection is finished; the partial CSVs it mentions were merged into
> `dataset/SOURCES.csv` and removed.

# Brief for image collectors (CLIP evaluation dataset)

You are collecting part of a labelled image dataset for a thesis evaluation of a
zero-shot CLIP spam detector for MeroSadak, a Nepali road-problem reporting app.
Genuine = real street photos of road problems. Spam = anything else a citizen
might upload (furniture, charts, selfies...).

Root: `evaluation/clip_eval/dataset/` (helper: `evaluation/clip_eval/scripts/commons.py`)

## Hard rules

1. **Real images only.** Every image must be a real photograph, or a real
   screenshot or scan. NO AI-generated images, renders, matplotlib/gnuplot or
   other code-drawn charts, procedurally drawn scenes, photomontages, vector
   (SVG) drawings, or digital paintings. If in doubt, skip it.
2. **Wikimedia Commons only**, licence CC0, public domain, CC BY or CC BY-SA.
   Use the helper; it refuses anything else and anything in an
   AI-generated / rendered category. Commons copies of Unsplash/Pexels/Flickr
   photos are fine if the helper accepts them.
3. **No editing.** Do not blur, darken, crop or otherwise alter any image. Use
   naturally blurred/dark photos only.
4. **People:** selfie/group photos only where the image is openly licensed on
   Commons (e.g. own-work self-portraits, public events, Wikimedia meetups). No
   images scraped from social media. Avoid children as the main subject.
5. **Documents:** no personal data visible (no names + addresses, ID numbers,
   phone numbers, signatures of private people). Old public-domain documents,
   books, blank forms and shop receipts with no personal data are fine.
6. **Never reuse** these (already used in the demo):
   `File:Road_to_the_valley_village_(Unsplash).jpg`,
   `File:Foggy_road_in_January.jpg`, `File:Pothole_in_Villeray,_Montréal.jpg`.
7. Prefer variety: different places, angles, lighting, image sizes. Do not take
   several near-identical shots from the same series (max 2 per uploader/series
   per type).

## Tool

```bash
cd evaluation/clip_eval/dataset
python3 ../scripts/commons.py search "pothole Kathmandu" --limit 40
python3 ../scripts/commons.py get "File:Exact title.jpg" genuine/pothole_01.jpg \
    --dest-rel genuine/pothole_01.jpg --cls genuine --type pothole \
    --sources <your partial CSV> --notes "Nepal"
```

Search tips: Commons search supports `incategory:"Potholes in Nepal"` and
`incategory:Potholes`. Try category browsing too:
`curl -s -A "MeroSadak-thesis-eval/1.0" "https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Potholes&cmtype=file&cmlimit=50&format=json"`
(and `cmtype=subcat` to find subcategories).

**Run every command in the foreground** (never `run_in_background`, never wait
on a background task). The Commons API drops connections sometimes: if a
search or download fails, retry it at most twice, then move on to another
candidate. Do not stop to wait.

Existing files keep their names. New files continue after the highest number
already used for that type (gaps in numbering are fine).

## Verify every image you keep

After each `get`, **open the downloaded file with the Read tool and look at it.**
Delete it (and remove its row from your partial CSV) if any of these is true:
- it does not clearly show what the label says (for genuine: the issue type must
  be visible; for spam: the spam type must be the main subject);
- it looks AI-generated, rendered, drawn by code, or heavily edited;
- for spam: a road or street is a prominent part of it (that would make it
  ambiguous rather than spam);
- personal data or a private person in an inappropriate context is visible.

Keep your partial CSV in sync with the files on disk: at the end, every file
you saved has exactly one row and every row has a file. Fix the CSV with a
short Python script if you delete files.

## Final report (your last message)

- table: type → number kept, and how many are dark/blurred where relevant
- any type where you could not reach the target, with what you tried
- anything doubtful you kept and why
