"""
Check the CLIP evaluation dataset (read-only).

  python3 evaluation/clip_eval/scripts/check_dataset.py

Every image file has exactly one row in dataset/SOURCES.csv and every row has
a file; every row has a source, author and licence; no Commons file or
identical image appears twice; nothing comes from evaluation/demo/images/.
Prints the count per class and type. Exit code 1 if anything is wrong.
"""
import csv
import glob
import hashlib
import os
import sys
from collections import Counter

CLIP_EVAL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(CLIP_EVAL, "dataset")
DEMO = os.path.join(os.path.dirname(CLIP_EVAL), "demo", "images")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")


def digest(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


with open(os.path.join(ROOT, "SOURCES.csv"), newline="") as fh:
    rows = list(csv.DictReader(fh))

problems = []
files = sorted(
    os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, "**", "*"), recursive=True)
    if p.lower().endswith(IMAGE_EXT)
)
by_file = Counter(r["filename"] for r in rows)
for f in files:
    if by_file[f] != 1:
        problems.append(f"{f}: {by_file[f]} rows")
for f in by_file:
    if f not in files:
        problems.append(f"row without file: {f}")
for title, n in Counter(r["commons_title"] for r in rows if r["commons_title"]).items():
    if n > 1:
        problems.append(f"Commons file used {n} times: {title}")

demo_hashes = {digest(p) for p in glob.glob(os.path.join(DEMO, "*")) if p.lower().endswith(IMAGE_EXT)}
hashes = Counter()
for f in files:
    h = digest(os.path.join(ROOT, f))
    hashes[h] += 1
    if h in demo_hashes:
        problems.append(f"{f} is a demo image")
if any(n > 1 for n in hashes.values()):
    problems.append("identical image bytes appear more than once")
for r in rows:
    if not r["source_url"] or not r["licence"] or not r["author"]:
        problems.append(f"{r['filename']}: missing source/licence/author")

counts = Counter((r["class"], r["type"] if r["class"] != "unclear" else "-") for r in rows)
for key in sorted(counts):
    print(f"{key[0]:8} {key[1]:14} {counts[key]}")
print(f"total {len(rows)} rows, {len(files)} files")
print("\n".join(problems) if problems else "OK: no problems")
sys.exit(1 if problems else 0)
