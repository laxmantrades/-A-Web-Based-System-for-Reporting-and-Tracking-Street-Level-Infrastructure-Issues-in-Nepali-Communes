# Independent check: CLIP spam check evaluation (thesis Section 4.5)

**Date:** 2026-10-29
**Checker:** independent agent (did not collect the images or run the evaluation)
**Scope:** `evaluation/clip_dataset/` (166 images, `SOURCES.csv`, `split.csv`), `evaluation/make_split.py`,
`evaluation/results/` (tuning and test outputs, `metrics.txt`, figures, `errors/`), the app classifier
(`classifier/prompts.py`, `classifier/app.py`, `server/src/models/ClassifierConfig.js`) and the running
container `aipoweredfixmystreet-classifier-1`.
I changed no file except this one. All scratch work is in the session scratchpad.

## Summary

| # | Check | Verdict |
|---|---|---|
| 1 | No generated images; sources and licences valid | **PASS** (with observations) |
| 2 | SOURCES.csv covers every image; no duplicates; no demo images | **PASS** |
| 3 | No tuning image in the test set; split reproducible | **PASS** |
| 4 | Prompts and thresholds unchanged during the test run | **PASS** (one minor observation) |
| 5 | Every number in metrics.txt matches test_results.csv | **PASS** |

No ISSUE-level findings. The observations in section 6 are things an examiner is likely to raise and
should be addressed in the thesis text, not by changing the data.

## What I did beyond reading summaries

- Recomputed everything from the raw CSVs with my own code (I did not import `run_clip_eval.py`).
- **Re-scored all 166 images (44 tuning + 122 test) against the live classifier container** with my own
  client (base64 POST to `http://127.0.0.1:8000/classify`). Every score, result, spam type and version
  matched the CSVs exactly (max absolute score difference 0). So the recorded results really are what the
  current `clip-spam-v3` classifier produces for these files.
- Queried the Wikimedia Commons API for **all 162** Commons rows (4 batches of ≤50 titles, no 429s).
- Downloaded each row's `image_url` from Wikimedia and compared SHA-256 with the file on disk
  (result in Check 1).
- Re-ran `make_split.py` unmodified in a temporary copy (copied SOURCES.csv plus empty placeholder files)
  and compared its output byte-for-byte with `split.csv`.
- Opened 34 dataset images and the 3 figures with an image viewer.

---

## Check 1: No generated images — PASS

**Source column.** 162 rows have a `source_url` of the form `https://commons.wikimedia.org/wiki/File:…`;
4 rows have `source_url` exactly `taken by the author` (`spam/chart/chart_author_01.png` … `_04`). No other
source type. For every Commons row, the title decoded from `source_url` equals the `commons_title` column.

**Commons API (all 162 rows, `prop=imageinfo|categories`, `iiprop=extmetadata|mime`).**
- All 162 titles exist (none missing, no continuation left unread).
- Licences per `LicenseShortName`: CC BY-SA 4.0 (65), CC BY-SA 2.0 (24), CC BY-SA 3.0 (19), CC0 (16),
  Public domain (16), CC BY 2.0 (9), CC BY 4.0 (7), CC BY 3.0 (5), CC BY 1.0 (1). All are CC0 / PD /
  CC BY / CC BY-SA, and each one agrees with the `licence` column in SOURCES.csv.
- MIME: image/jpeg 153, image/png 9. All bitmaps; no SVG.
- Categories: scanned every category of every file for AI-generated / computer-generated / render / CGI /
  matplotlib / gnuplot / chart / graph / plot / diagram / montage / photomontage / SVG / digital art /
  synthetic / 3D / retouch. **No hits.** Image descriptions were also scanned for "AI-generated",
  "generated with/by", "rendered", "matplotlib", "stable diffusion", "midjourney", "DALL-E": no hits.
  (The collection helper `tools/commons.py` applies a similar `GENERATED_CATEGORY` filter, and neither
  tool script contains any drawing or image-generation code.)

**Files on disk are the Commons files (sample of 53 of 162).** I downloaded each row's `image_url`
(the Commons thumbnail) and compared its SHA-256 with the file on disk. Covered: a seeded random sample of
25 across all classes, plus rows 1–39 of SOURCES.csv in file order. Together that is **53 distinct files,
all byte-identical, 0 mismatches**. After about 40 files, `upload.wikimedia.org` began returning the
Wikimedia error page (rate limit), so I stopped there instead of hammering it. The other ~109 Commons files
were checked by API metadata only, not by hash. This byte-identity also shows the files were not edited
(no crop, filter or re-encode) after download.

**Visual inspection (34 images + 3 figures).** Opened: all 7 chart images (`chart_01`, `chart_07`,
`chart_11`, `chart_author_01..04`), all 7 blank (`blank_02..08`), all 7 meme (`meme_01..07`), plus a
seeded random sample (`genuine/pothole_07`, `pothole_03`, `road_sign_10`, `streetlight_02`;
`spam/document/document_03`, `spam/selfie/selfie_02`, `selfie_07`, `spam/indoor/indoor_02`,
`spam/screenshot/screenshot_08`; `unclear/unclear_09`, `unclear_06`) and the two images the evaluation
singles out (`spam/landscape/landscape_06`, `unclear/unclear_02`).
All look like real photographs, real screenshots or real scans, and each matches its label. Nothing looks
AI-generated or code-drawn.
- Charts: the 3 Commons ones are real photos of Bloomberg terminals and of a phone stocks app.
  `chart_author_01` is a real iPhone TradingView screenshot (EUR/USD 5m). `chart_author_02` is a real desktop
  Yahoo Finance screenshot. `chart_author_03` is a real phone photo of a MacBook screen (moiré visible,
  TradingView AAPL 1D). `chart_author_04` is a real but tightly cropped TradingView "Replay" screenshot.
- Blank: real motion-blur or out-of-focus photos (`02`–`05`, `07`) and NASA/NARA film frames that are
  overexposed (`06`) or underexposed (`08`).
- Meme: scans of printed cartoons from 1873–1928 (Puck, Punch, Judge, newspaper comic strips).

Doubtful or borderline (labels are defensible; listed for transparency):
- `genuine/streetlight_02.jpg`: an artistic contre-jour shot of an ornate lamp with one bulb missing. It is
  a streetlight, but the defect is subtle and the photo is not citizen-like.
- `unclear/unclear_02.jpg`: the note says "rain on bus window, road behind", but the road is barely visible
  (mostly field/lake and trees). It is "unclear" either way, and unclear images are not scored.
- `spam/blank/blank_02.jpg` and `blank_05.jpg` are deliberate artistic motion-blur photos (autumn leaves,
  a whirling dancer) rather than accidental blank uploads.
- `chart_author_*` deviate from the `PHOTOS_TO_TAKE.md` brief: `.png` instead of `.jpg` for 3 files;
  `_02` is a desktop screenshot, not a phone screenshot; `_04` is a cropped desktop screenshot, not a
  photo of a screen in dim light with a dark theme (the brief says "don't crop heavily"). `chart_author_03`
  shows desktop file and folder names (e.g. `lms.pem`, `CTEC2710Assignment`, `MERN-LMS`), against the
  brief's "no personal data visible" rule. The SOURCES.csv notes describe all of this honestly. None of it
  affects whether the images are real, but do not reproduce `chart_author_03` in the thesis without
  cropping it.

## Check 2: SOURCES.csv covers every image — PASS

- 166 image files under `clip_dataset/` (excluding `tools/`, `_partial/`, and the CSV/MD files); 166
  SOURCES.csv rows. Every file has exactly one row and every row has a file. No duplicate filenames.
- SHA-256 of all 166 files: **no duplicate content**.
- `evaluation/demo_images/` (7 files): **no hash matches** any dataset file.
- Directory agrees with labels for every row (`genuine/…` ↔ class genuine; `spam/<type>/…` ↔ class spam and
  that type; `unclear/…` ↔ class unclear).
- Composition: genuine 72 (6 types × 12), spam 84 (12 types × 7), unclear 10 (7 sub-types).

## Check 3: No tuning image in the test set — PASS

- `split.csv`: 166 rows, each filename once, sets only `tuning` (44) and `test` (122).
  **tuning ∩ test = ∅.** The split's filenames are exactly the SOURCES.csv filenames, and
  `true_label`/`type` agree with SOURCES.csv for every row.
- `tuning_results.csv`: 44 rows, exactly the 44 tuning files. `test_results.csv`: 122 rows, exactly the
  122 test files. No duplicates in either.
- Every genuine issue type (3 tuning / 9 test each) and every spam type (2 tuning / 5 test each) appears in
  both sets. Unclear is split as one stratum (2 tuning / 8 test), as `make_split.py` intends. Its
  sub-types are not all in both sets: `tarmac_closeup` is tuning-only, and `construction`, `crowd_street`,
  `map_or_sign_board`, `puddle_reflection` and `vehicle_focus` are test-only. This is fine because unclear
  images are not scored.
- **Reproduction:** running the unmodified `make_split.py` (seed 20261028) on a copy of SOURCES.csv in a
  temp directory gives output **byte-identical** to `split.csv`
  (sha256 `cfdef8cc017eaba4fa548b863f2852abcbd2106bfc825c9a9aff10e4fb759979`, the value in RESUME.md).
- Timeline (file mtimes, CET): last dataset image (`chart_author_01.png`) 09:13; SOURCES.csv 09:13:56;
  split.csv 09:13:59; tuning results 09:14:14; threshold_decision.md 09:16:43; test results 09:17:02;
  metrics, figures and errors 09:17:34–35. So the split came after the dataset was final, the decision
  came after tuning, and the test run came after the decision. No dataset file is newer than split.csv.

## Check 4: Prompts and thresholds unchanged — PASS

| file | tuning_run_info sha256 / after | test_run_info sha256 / after | current repo file | running container |
|---|---|---|---|---|
| classifier/prompts.py | b963027b…282e / same | b963027b…282e / same | b963027b…282e | b963027b…282e |
| classifier/app.py | ae275413…fbfb / same | ae275413…fbfb / same | ae275413…fbfb | ae275413…fbfb |
| server/src/models/ClassifierConfig.js | 2befe7e2…c0 / same | 2befe7e2…c0 / same | 2befe7e2…c0 | n/a (server-side) |

- `prompts.py`: `GENUINE_THRESHOLD = 0.7`, `SPAM_THRESHOLD = 0.3`. `ClassifierConfig.js` defaults:
  `thresholds.high 0.7`, `thresholds.medium 0.3`. Both run-info files record 0.7/0.3.
- `/health` now returns `{"ok":true,"model":"openai/clip-vit-base-patch32","version":"clip-spam-v3"}`,
  which matches both run-info files.
- All 122 test rows and all 44 tuning rows have `classifier_version = clip-spam-v3`. Every row's `result`
  equals the 0.7/0.3 bucket of its `score` (0 mismatches). `reason` is consistent with `predicted_spam_type`
  and is empty only when the result is "Looks genuine".
- Git: `classifier/` and `ClassifierConfig.js` are untracked (`??`), so `git diff` shows nothing; I relied on
  the hashes above. On-disk mtimes of `prompts.py` and `app.py` are 2026-10-27, before the dataset and split.
- The independent re-score of all 166 images against the container reproduced every stored score exactly.
  So the classifier that produced the results is the one now deployed.
- `threshold_decision.md` is dated 2026-10-29, names the decider and states the decision (keep 0.7/0.3).
  Its tuning table matches `tuning_summary.txt` and `tuning_results.csv`.
- Minor: `run_clip_eval.py` has mtime 09:17:33, 31 s *after* `test_results.csv` (09:17:02) and 1 s before
  `metrics.txt`. That suggests the script was edited between the classification pass and the report pass
  (a `--report-only` mode exists). This cannot have changed the stored classifications: the re-score
  reproduces them, and metrics.txt matches my independent recomputation. But the log should say so.
- Minor: `ClassifierConfig.js` defaults `activeVersion` to `'clip-spam-v2'`, while the service reports
  `clip-spam-v3`. This does not affect the evaluation (which calls the service directly), but the app may
  label stored results with the old version until it is configured.

## Check 5: Every number in metrics.txt matches test_results.csv — PASS

Recomputed independently from `test_results.csv` (122 rows):

| item | metrics.txt | recomputed |
|---|---|---|
| genuine / spam / unclear | 54 / 60 / 8 | 54 / 60 / 8 |
| per genuine type | 9 each × 6 | 9 each × 6 |
| per spam type | 5 each × 12 | 5 each × 12 |
| confusion genuine | 54 / 0 / 0 | 54 / 0 / 0 |
| confusion spam | 0 / 1 / 59 | 0 / 1 / 59 |
| Unsure rate | 1/114 (genuine 0/54, spam 1/60) | same |
| decisive accuracy | 113/113 | 113/113 |
| genuine → Likely spam | 0/54 | 0/54 |
| spam → Looks genuine | 0/60 | 0/60 |
| reason matched type | furniture 2/5, chart 5/5, screenshot 4/5, selfie 5/5, food 5/5, animal 4/5, document 5/5, meme 3/5, blank 1/5, indoor 5/5, landscape 5/5, group 5/5 | identical |
| landscape row | 4 Likely spam, 1 Unsure, 80% | same |
| dark/blurred genuine (test) | 6, all Looks genuine | 6 (`drain_06`, `drain_12`, `drain_14`, `footpath_13`, `streetlight_07`, `streetlight_10`), all Looks genuine |
| unclear | 7 Looks genuine, 1 Likely spam; 8 listed scores | identical, same scores and files |
| misclassified | none | none |
| Unsure (scored) | 1 | `spam/landscape/landscape_06.jpg` 0.4267 |

Mismatched "reasons" (all still Likely spam): furniture → indoor ×3; blank → selfie ×2, indoor ×1,
document ×1; meme → group ×1, document ×1; screenshot → document ×1; animal → landscape ×1.

`results/errors/`: contains exactly one file, `unsure/0.4267_spam_as_unsure_landscape_06.jpg`. Its SHA-256
equals `clip_dataset/spam/landscape/landscape_06.jpg`. With 0 misclassified and 1 Unsure, that is exactly
the expected content.

Figures:
- `fig_confusion.png`: 54/0/0 and 0/1/59 with row shares 100%/0/0 and 0/2%/98%. Matches.
- `fig_per_type.png`: 11 types at 5/5 and landscape at 4/5. Matches.
- `fig_scores.png`: 0.05-wide bins. Spam 50, 4, 1, 1, 2, 1 in [0, 0.3) plus 1 in [0.40, 0.45); genuine 1 in
  [0.70, 0.75), 1 in [0.80, 0.85), 2 in [0.85, 0.90), 50 in [0.95, 1.0]. Matches my binning exactly.

---

## Issues

None that invalidate the evaluation. Small items to fix or mention:
1. `evaluation/run_clip_eval.py` was modified (09:17:33) after `results/test_results.csv` was written
   (09:17:02). Say in the log what changed, e.g. report or figure code only. The stored results are
   unaffected (verified by re-score).
2. `spam/chart/chart_author_03.jpg` shows personal desktop file and folder names. Crop it before any use in
   the thesis or appendix.

## Observations for the thesis (not failures)

1. **The spam set mirrors the prompt set.** The 12 spam types in the dataset are exactly the 12 `SPAM_TYPES`
   keys in `prompts.py`. So the test measures recall on spam categories the prompts were written for.
   It says nothing about unanticipated spam (e.g. vehicles, products, posters, generic outdoor non-road
   scenes, text-only images, other people's road photos reused). State this explicitly. If possible, add a
   small "out-of-taxonomy" spam set.
2. **Small n per stratum.** 5 test images per spam type and 9 per genuine type. 100% on n=5 has a 95%
   Wilson interval of about 57–100%, and 54/54 genuine gives about 93–100%. Report intervals, not just
   point percentages. The single Unsure is 1 image.
3. **No Nepali genuine images.** None of the 72 genuine photos is from Nepal (UK, India, USA, Malaysia,
   Finland, Czechia and others), while several spam images *are* Nepali (landscapes, `animal_07` puppy) and
   one genuine prompt is "a photo of a street in a town in Nepal". The target deployment is Nepal. The
   hardest spam images were Nepali landscapes/animals (0.43, 0.25, 0.22). The genuine set does not test
   Nepali road scenes at all.
4. **Commons photos are cleaner than citizen uploads.** Most genuine images are well-framed, well-exposed
   photos by Commons/Geograph photographers. Only 10 of 72 are noted as dark/blurred (6 in test).
   Real citizen uploads will include more blur, odd angles, close-ups and compression. Results on this set
   are likely an upper bound.
5. **Thresholds were not stressed.** All tuning pairs between ~0.53 and ~0.95 separate the tuning set. The
   test set's lowest genuine score (0.7264, `genuine/streetlight_11.jpg`) is close to 0.7, and three more are
   0.81–0.87 (`road_sign_03`, `road_marking_15`, `footpath_12`). So the genuine margin on test is much smaller
   than on tuning (min 0.948). Worth reporting.
6. **"Meme" is historical cartoons.** All 7 memes are 1873–1928 cartoon scans, not modern image macros
   (photo + Impact-font caption, screenshots of social posts). The prompt "a cartoon or drawing" fits them
   well, which may overstate performance on real memes.
7. **"Reason matched type" is weaker than the headline.** Only 1/5 blank and 2/5 furniture got their own
   reason. If officers see the reason, it is often wrong for those types (blank → selfie, furniture →
   indoor).
8. **Class balance.** The test set is 54 genuine vs 60 spam. In real use spam is presumably rare, so
   precision for "Likely spam" will be lower in deployment than this balanced set suggests. The
   genuine → Likely spam rate (0/54) is the more deployment-relevant number.
9. **Unclear images are mostly called "Looks genuine"** (7/8 on test, all ≥ 0.79), while on tuning both
   were Unsure. The Unsure band does not catch ambiguous road scenes in the test set. State this rather
   than generalising from the tuning statement "the Unsure band holds … both ambiguous images".
10. `ClassifierConfig.js` default `activeVersion: 'clip-spam-v2'` vs deployed `clip-spam-v3` (see Check 4).
