"""
Split evaluation/clip_eval/dataset/ into a tuning set and a test set.

Stratified by class and type (each genuine issue type, each spam type, and the
unclear images are split separately), so every stratum appears in both sets.
About 25% of each stratum goes to tuning, at least 1, and at least 1 stays in
test. Fixed seed, so the split is reproducible.

Run once:  python3 evaluation/clip_eval/scripts/make_split.py
It refuses to overwrite an existing split.csv: images must never move between
sets after the split is made.
"""
import csv
import os
import random
import sys
from collections import defaultdict

SEED = 20261028
TUNING_SHARE = 0.25
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset")
SOURCES = os.path.join(ROOT, "SOURCES.csv")
SPLIT = os.path.join(ROOT, "split.csv")


def main():
    if os.path.exists(SPLIT):
        sys.exit(f"{SPLIT} already exists; the split is locked. Delete it by hand only if the dataset was rebuilt.")

    with open(SOURCES, newline="") as fh:
        rows = list(csv.DictReader(fh))

    strata = defaultdict(list)
    for row in rows:
        if not os.path.exists(os.path.join(ROOT, row["filename"])):
            sys.exit(f"missing file listed in SOURCES.csv: {row['filename']}")
        strata[(row["class"], row["type"] if row["class"] != "unclear" else "unclear")].append(row)

    rng = random.Random(SEED)
    out = []
    for key in sorted(strata):
        items = sorted(strata[key], key=lambda r: r["filename"])
        rng.shuffle(items)
        n_tune = min(max(1, round(len(items) * TUNING_SHARE)), len(items) - 1)
        for i, row in enumerate(items):
            out.append({
                "filename": row["filename"],
                "set": "tuning" if i < n_tune else "test",
                "true_label": row["class"],
                "type": row["type"],
            })

    out.sort(key=lambda r: r["filename"])
    with open(SPLIT, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["filename", "set", "true_label", "type"])
        w.writeheader()
        w.writerows(out)

    print(f"seed {SEED}; {len(out)} images")
    for key in sorted(strata):
        n = len(strata[key])
        t = sum(1 for r in out if r["set"] == "tuning" and (r["true_label"], r["type"] if r["true_label"] != "unclear" else "unclear") == key)
        print(f"  {key[0]:8} {key[1]:14} total {n:3}  tuning {t:2}  test {n - t:3}")
    print(f"tuning {sum(r['set'] == 'tuning' for r in out)}, test {sum(r['set'] == 'test' for r in out)}")


if __name__ == "__main__":
    main()
