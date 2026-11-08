# Evaluation

Everything used for the evaluation chapter of the thesis. There is one folder
per part.

```
evaluation/
├── app_tests/      4.4  automated backend tests (Jest): summaries + raw output
├── clip_eval/      4.5  AI photo check evaluation
│   ├── dataset/         166 labelled images, SOURCES.csv, split.csv
│   ├── scripts/         the code that built the dataset and ran the evaluation
│   └── results/         metrics, figures, decisions and the independent check
├── demo/           images and screenshots used to illustrate the AI photo check
│   ├── images/          the 6 demo photos and their sources
│   └── screenshots/     staff dashboard screenshots
└── requirements.txt     Python packages for clip_eval (matplotlib, numpy)
```

## 4.4 App tests (`app_tests/`)

| file | what |
|---|---|
| `TEST_SUMMARY.md` | summary of the main test run, by area |
| `test_results.txt`, `test_results.json` | raw Jest output of that run |
| `existing_tests_output.txt` | output of the tests that existed before that run |
| `FIX_SUMMARY.md`, `fix_test_results.txt` | the later CLIP-score / wording fixes and their test run (39/39 passed) |

The test code itself lives in `server/tests/`. Run it with `cd server && npm test`.

## 4.5 CLIP evaluation (`clip_eval/`)

**Start here:** `results/metrics.txt` and the three figures
(`results/fig_confusion.png`, `fig_per_type.png`, `fig_scores.png`).

| file in `results/` | what |
|---|---|
| `metrics.txt` | all test-set numbers: confusion matrix, Unsure rate, error rates, per type |
| `test_results.csv` | one row per test image: score, result, reason |
| `tuning_results.csv`, `tuning_summary.txt` | the tuning run and the threshold comparison |
| `threshold_decision.md` | the decision to keep 0.7 / 0.3 (dated 2026-10-29) |
| `*_run_info.json` | classifier version and file hashes recorded at each run |
| `CHECK.md` | independent check of the whole evaluation (all checks passed) |
| `RUN_LOG.md` | what was run, and when |
| `errors/` | copies of misclassified images (none) and Unsure images, named with their score |

| file in `scripts/` | what |
|---|---|
| `run_clip_eval.py` | sends each image to the running CLIP service and writes the results |
| `make_split.py` | made `split.csv` (run once; refuses to run again) |
| `check_dataset.py` | checks that `SOURCES.csv` and the image files match |
| `commons.py`, `COLLECTOR_BRIEF.md` | the Wikimedia Commons helper and the rules used to collect the images |

## Running the tests yourself

All commands are run from the project folder (`aipowered fixmystreet/`).

### App tests (4.4)

```bash
cd server
npm install        # first time only
npm test
```

This runs all the Jest tests (about a minute). They use a temporary
in-memory database and fake email/Cloudinary/classifier, so your real data is
never touched. You should see `Tests: 39 passed, 39 total` at the end.

### CLIP evaluation, live (4.5)

The evaluation talks to the **real classifier**, so start it first and check
that it answers. The setup steps are in the [main README](../README.md#3-start-everything).

```bash
# in its own terminal
cd classifier
.venv/bin/uvicorn app:app --port 8000

# in another terminal
curl http://127.0.0.1:8000/health
# {"ok":true,"model":"openai/clip-vit-base-patch32","version":"clip-spam-v3"}
```

The first start downloads the CLIP model (about 600 MB) and takes a few
minutes. After that it starts in seconds.

**1. Set up Python (first time only)**

```bash
python3 -m venv evaluation/.venv
evaluation/.venv/bin/pip install -r evaluation/requirements.txt
```

**2. Try one photo**

Any photo works. This sends it to the classifier and prints the answer:

```bash
printf '{"image":"%s"}' "$(base64 -i path/to/photo.jpg)" \
  | curl -s http://127.0.0.1:8000/classify -H 'Content-Type: application/json' -d @-
```

For example a chart gives
`{"score":0.0, "result":"Likely spam", "reason":"Looks like a chart", ...}`
and a pothole gives a score near 1.0 and `"Looks genuine"`.

**3. Run the whole test set live**

```bash
evaluation/.venv/bin/python evaluation/clip_eval/scripts/run_clip_eval.py --set test
```

This sends all 122 test images to the classifier (1–2 minutes), prints the
metrics, and saves everything (CSV, `metrics.txt`, figures, `errors/`) in a
**new folder** such as `clip_eval/live_runs/test_20261029-101500/`. Use
`--set tuning` for the 44 tuning images instead.

If the classifier, prompts and thresholds are unchanged, the numbers should
match `clip_eval/results/metrics.txt` exactly. That makes a good live demo:
the official results can be reproduced at any time.

**Your thesis results are protected.** A live run never writes into
`clip_eval/results/`. It refuses unless you add `--overwrite-results`, so
don't use that flag. `live_runs/` is not saved in git; delete it whenever you like.

**Other options**

| option | what it does |
|---|---|
| `--out some/folder` | save the run to a folder of your choice |
| `--report-only` | rebuild `metrics.txt` and the figures from an already-saved CSV without calling the classifier (default folder: `clip_eval/results/`) |

**If something goes wrong**

- `Connection refused`: the classifier isn't running. Start it as above and wait until `/health` answers.
- `does not match prompts.py thresholds … is the container out of date?`: the
  classifier is running older code than the repo. Stop it and start it again.
- `No module named matplotlib`: you used `python3` instead of
  `evaluation/.venv/bin/python`, or step 1 hasn't been done.



