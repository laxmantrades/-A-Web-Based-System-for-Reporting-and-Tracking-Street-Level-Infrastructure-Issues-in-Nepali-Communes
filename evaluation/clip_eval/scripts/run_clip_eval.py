"""
CLIP spam-check evaluation for MeroSadak (thesis Section 4.5).

Sends every image of one set (tuning or test, from dataset/split.csv)
straight to the running CLIP service — POST /classify, the same endpoint,
model, prompts and thresholds the app uses — and saves one row per image.

  evaluation/.venv/bin/python evaluation/clip_eval/scripts/run_clip_eval.py --set tuning
  evaluation/.venv/bin/python evaluation/clip_eval/scripts/run_clip_eval.py --set test

--set tuning  writes tuning_results.csv and prints result counts plus
              the error counts at the current and alternative thresholds.
--set test    writes test_results.csv, metrics.txt, the three figures
              and copies of misclassified images in errors/.

Output goes to a new folder clip_eval/live_runs/<set>_<date-time>/ unless
--out is given. The thesis results in clip_eval/results/ are locked: a live
run refuses to write there unless --overwrite-results is passed.

Each run also writes <set>_run_info.json with the service's /health
answer and SHA-256 hashes of the classifier code, prompts and server threshold
config, so it can be checked afterwards that nothing changed between runs.
"""
import argparse
import base64
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone

# This file lives in evaluation/clip_eval/scripts/.
CLIP_EVAL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(CLIP_EVAL))
DATASET = os.path.join(CLIP_EVAL, "dataset")
# Locked thesis results. main() points RESULTS at the folder for this run.
OFFICIAL_RESULTS = os.path.join(CLIP_EVAL, "results")
RESULTS = OFFICIAL_RESULTS

RESULTS_ORDER = ["Looks genuine", "Unsure", "Likely spam"]
SPAM_TYPES = ["furniture", "chart", "screenshot", "selfie", "food", "animal",
              "document", "meme", "blank", "indoor", "landscape", "group"]
ISSUE_TYPES = ["pothole", "road_sign", "streetlight", "road_marking", "footpath", "drain"]
# Alternative (genuine, spam) thresholds compared on the tuning set.
ALTERNATIVES = [(0.7, 0.3), (0.6, 0.3), (0.7, 0.4), (0.8, 0.3), (0.6, 0.4), (0.8, 0.2), (0.5, 0.5)]
# Files whose contents define the classifier's behaviour.
TRACKED_FILES = ["classifier/prompts.py", "classifier/app.py", "server/src/models/ClassifierConfig.js"]

# Reference data-viz palette: slot 1 (blue) genuine, slot 2 (orange) spam.
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, INK_SOFT, GRID = "#0b0b0b", "#52514e", "#e4e3df"
COLUMNS = ["filename", "set", "true_label", "spam_type", "issue_type", "score", "result",
           "reason", "predicted_spam_type", "classifier_version"]


# --------------------------------------------------------------------------- run

def classify(url, path):
    with open(path, "rb") as fh:
        body = json.dumps({"image": base64.b64encode(fh.read()).decode(),
                           "filename": os.path.basename(path)}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.load(res)
        except (urllib.error.URLError, TimeoutError) as err:
            if attempt == 2:
                raise SystemExit(f"classifier failed on {path}: {err}")
            time.sleep(2)


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def app_thresholds():
    text = open(os.path.join(REPO, "classifier/prompts.py")).read()
    g = float(re.search(r"^GENUINE_THRESHOLD\s*=\s*([\d.]+)", text, re.M).group(1))
    s = float(re.search(r"^SPAM_THRESHOLD\s*=\s*([\d.]+)", text, re.M).group(1))
    return g, s


def bucket(score, genuine, spam):
    if score >= genuine:
        return "Looks genuine"
    if score < spam:
        return "Likely spam"
    return "Unsure"


def run(args):
    with open(os.path.join(DATASET, "split.csv"), newline="") as fh:
        split = [r for r in csv.DictReader(fh) if r["set"] == args.set]
    if not split:
        sys.exit(f"no images in set '{args.set}'")

    health_url = args.url.rsplit("/", 1)[0] + "/health"
    with urllib.request.urlopen(health_url, timeout=10) as res:
        health = json.load(res)
    genuine_t, spam_t = app_thresholds()
    info = {
        "set": args.set,
        "started": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "url": args.url,
        "health": health,
        "thresholds_in_prompts_py": {"genuine": genuine_t, "spam": spam_t},
        "sha256": {f: sha256(os.path.join(REPO, f)) for f in TRACKED_FILES},
        "images": len(split),
    }

    rows = []
    for i, item in enumerate(split, 1):
        res = classify(args.url, os.path.join(DATASET, item["filename"]))
        if bucket(res["score"], genuine_t, spam_t) != res["result"]:
            sys.exit(f"service result '{res['result']}' for {item['filename']} does not match "
                     f"prompts.py thresholds {genuine_t}/{spam_t} — is the container out of date?")
        rows.append({
            "filename": item["filename"],
            "set": item["set"],
            "true_label": item["true_label"],
            "spam_type": item["type"] if item["true_label"] == "spam" else "",
            "issue_type": item["type"] if item["true_label"] != "spam" else "",
            "score": res["score"],
            "result": res["result"],
            "reason": res.get("reason") or "",
            "predicted_spam_type": res.get("spam") or "",
            "classifier_version": res["version"],
        })
        print(f"[{i:3}/{len(split)}] {res['score']:.4f} {res['result']:13} {item['filename']}", flush=True)

    info["finished"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    # Re-hash after the run: proves the files did not change while it ran.
    info["sha256_after"] = {f: sha256(os.path.join(REPO, f)) for f in TRACKED_FILES}

    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, f"{args.set}_results.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(RESULTS, f"{args.set}_run_info.json"), "w") as fh:
        json.dump(info, fh, indent=2)
    return rows, (genuine_t, spam_t)


def load(set_name):
    with open(os.path.join(RESULTS, f"{set_name}_results.csv"), newline="") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        r["score"] = float(r["score"])
    return rows


# ------------------------------------------------------------------ tuning report

def tuning_report(rows, thresholds):
    out = []
    counts = defaultdict(Counter)
    for r in rows:
        counts[r["true_label"]][r["result"]] += 1
    out.append(f"Tuning set: {len(rows)} images; app thresholds {thresholds[0]}/{thresholds[1]}")
    out.append("")
    out.append(f"{'true label':10} {'n':>4} " + " ".join(f"{k:>13}" for k in RESULTS_ORDER))
    for label in ["genuine", "spam", "unclear"]:
        c = counts.get(label, Counter())
        out.append(f"{label:10} {sum(c.values()):4} " + " ".join(f"{c[k]:13}" for k in RESULTS_ORDER))

    gen = [r["score"] for r in rows if r["true_label"] == "genuine"]
    spam = [r["score"] for r in rows if r["true_label"] == "spam"]
    out.append("")
    out.append("Thresholds (genuine/spam) -> errors on the tuning set (unclear images not counted)")
    out.append(f"{'thresholds':>10}  {'genuine->Likely spam':>21}  {'spam->Looks genuine':>20}  "
               f"{'genuine Unsure':>15}  {'spam Unsure':>12}")
    for g, s in ALTERNATIVES:
        gl = sum(x < s for x in gen)
        sg = sum(x >= g for x in spam)
        gu = sum(s <= x < g for x in gen)
        su = sum(s <= x < g for x in spam)
        mark = "  <- current" if (g, s) == thresholds else ""
        out.append(f"{g:>4}/{s:<5}  {gl:>10} ({pct(gl, len(gen)):>5})  {sg:>9} ({pct(sg, len(spam)):>5})  "
                   f"{gu:>7} ({pct(gu, len(gen)):>5})  {su:>4} ({pct(su, len(spam)):>5}){mark}")

    out.append("")
    out.append("Lowest-scoring genuine images:")
    for r in sorted((r for r in rows if r["true_label"] == "genuine"), key=lambda r: r["score"])[:6]:
        out.append(f"  {r['score']:.4f}  {r['result']:13} {r['filename']}")
    out.append("Highest-scoring spam images:")
    for r in sorted((r for r in rows if r["true_label"] == "spam"), key=lambda r: -r["score"])[:6]:
        out.append(f"  {r['score']:.4f}  {r['result']:13} {r['filename']}")
    out.append("Unclear images:")
    for r in sorted((r for r in rows if r["true_label"] == "unclear"), key=lambda r: r["score"]):
        out.append(f"  {r['score']:.4f}  {r['result']:13} {r['filename']}")
    text = "\n".join(out) + "\n"
    with open(os.path.join(RESULTS, "tuning_summary.txt"), "w") as fh:
        fh.write(text)
    print("\n" + text)


def pct(n, d):
    return f"{100 * n / d:.1f}%" if d else "n/a"


# -------------------------------------------------------------------- test report

def notes_by_file():
    with open(os.path.join(DATASET, "SOURCES.csv"), newline="") as fh:
        return {r["filename"]: r["notes"].lower() for r in csv.DictReader(fh)}


def test_report(rows, thresholds):
    scored = [r for r in rows if r["true_label"] in ("genuine", "spam")]
    gen = [r for r in scored if r["true_label"] == "genuine"]
    spam = [r for r in scored if r["true_label"] == "spam"]
    unclear = [r for r in rows if r["true_label"] == "unclear"]
    cm = {lab: Counter(r["result"] for r in scored if r["true_label"] == lab) for lab in ("genuine", "spam")}
    versions = sorted({r["classifier_version"] for r in rows})

    L = []
    L.append("MeroSadak CLIP spam check — test set metrics")
    L.append(f"Classifier version: {', '.join(versions)}; thresholds {thresholds[0]} (Looks genuine) / "
             f"{thresholds[1]} (Likely spam)")
    L.append(f"Source: results/test_results.csv ({len(rows)} rows)")
    L.append("")
    L.append("1. Images per class (test set)")
    L.append(f"   genuine  {len(gen)}")
    for t in ISSUE_TYPES:
        L.append(f"     {t:13} {sum(r['issue_type'] == t for r in gen)}")
    L.append(f"   spam     {len(spam)}")
    for t in SPAM_TYPES:
        L.append(f"     {t:13} {sum(r['spam_type'] == t for r in spam)}")
    L.append(f"   unclear  {len(unclear)} (reported separately, not scored)")
    L.append(f"   scored total (genuine + spam): {len(scored)}")
    L.append("")
    L.append("2. Confusion matrix (rows = true label, columns = result)")
    L.append(f"   {'':9}" + "".join(f"{k:>15}" for k in RESULTS_ORDER) + f"{'total':>8}")
    for lab in ("genuine", "spam"):
        L.append(f"   {lab:9}" + "".join(f"{cm[lab][k]:>15}" for k in RESULTS_ORDER) + f"{sum(cm[lab].values()):>8}")
    L.append("")

    unsure = cm["genuine"]["Unsure"] + cm["spam"]["Unsure"]
    decisive = len(scored) - unsure
    correct = cm["genuine"]["Looks genuine"] + cm["spam"]["Likely spam"]
    g_as_spam = cm["genuine"]["Likely spam"]
    s_as_gen = cm["spam"]["Looks genuine"]
    L.append("3. Headline numbers")
    L.append(f"   Unsure rate:                       {unsure}/{len(scored)} = {pct(unsure, len(scored))}"
             f"  (genuine {cm['genuine']['Unsure']}/{len(gen)} = {pct(cm['genuine']['Unsure'], len(gen))}, "
             f"spam {cm['spam']['Unsure']}/{len(spam)} = {pct(cm['spam']['Unsure'], len(spam))})")
    L.append(f"   Accuracy on decisive results:      {correct}/{decisive} = {pct(correct, decisive)}  (Unsure excluded)")
    L.append(f"   Genuine flagged as Likely spam:    {g_as_spam}/{len(gen)} = {pct(g_as_spam, len(gen))}")
    L.append(f"   Spam marked Looks genuine:         {s_as_gen}/{len(spam)} = {pct(s_as_gen, len(spam))}")
    L.append("")

    L.append("4. Results per spam type")
    L.append(f"   {'type':12} {'n':>3} {'Likely spam':>12} {'Unsure':>7} {'Looks genuine':>14} {'share Likely spam':>18} {'reason matched type':>20}")
    per_type = {}
    for t in SPAM_TYPES:
        sub = [r for r in spam if r["spam_type"] == t]
        c = Counter(r["result"] for r in sub)
        flagged = [r for r in sub if r["result"] != "Looks genuine"]
        matched = sum(r["predicted_spam_type"] == t for r in flagged)
        per_type[t] = (c["Likely spam"], len(sub))
        L.append(f"   {t:12} {len(sub):>3} {c['Likely spam']:>12} {c['Unsure']:>7} {c['Looks genuine']:>14} "
                 f"{pct(c['Likely spam'], len(sub)):>18} {f'{matched}/{len(flagged)}':>20}")
    L.append("   (reason matched type = of the images not marked Looks genuine, how many got the reason for their own type)")
    L.append("")

    L.append("5. Results per genuine issue type")
    L.append(f"   {'type':13} {'n':>3} {'Looks genuine':>14} {'Unsure':>7} {'Likely spam':>12}")
    for t in ISSUE_TYPES:
        sub = [r for r in gen if r["issue_type"] == t]
        c = Counter(r["result"] for r in sub)
        L.append(f"   {t:13} {len(sub):>3} {c['Looks genuine']:>14} {c['Unsure']:>7} {c['Likely spam']:>12}")
    notes = notes_by_file()
    hard = [r for r in gen if re.search(r"dark|blur", notes.get(r["filename"], ""))]
    c = Counter(r["result"] for r in hard)
    L.append(f"   {'dark/blurred':13} {len(hard):>3} {c['Looks genuine']:>14} {c['Unsure']:>7} {c['Likely spam']:>12}"
             "  (subset of the rows above, from SOURCES.csv notes)")
    L.append("")

    L.append("6. Unclear images (not scored)")
    c = Counter(r["result"] for r in unclear)
    L.append("   " + ", ".join(f"{k}: {c[k]}" for k in RESULTS_ORDER))
    for r in sorted(unclear, key=lambda r: r["score"]):
        L.append(f"   {r['score']:.4f}  {r['result']:13} {r['filename']} ({r['issue_type']})")
    L.append("")

    L.append("7. Misclassified images (copied to results/errors/)")
    errors = [r for r in scored if (r["true_label"] == "genuine" and r["result"] == "Likely spam")
              or (r["true_label"] == "spam" and r["result"] == "Looks genuine")]
    unsure_rows = [r for r in scored if r["result"] == "Unsure"]
    for r in sorted(errors, key=lambda r: r["score"]):
        L.append(f"   {r['score']:.4f}  {r['true_label']:7} -> {r['result']:13} {r['filename']}")
    if not errors:
        L.append("   none")
    L.append(f"   plus {len(unsure_rows)} Unsure images in results/errors/unsure/")

    with open(os.path.join(RESULTS, "metrics.txt"), "w") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L))

    copy_errors(errors, unsure_rows)
    figures(cm, per_type, gen, spam, thresholds)


def copy_errors(errors, unsure_rows):
    out = os.path.join(RESULTS, "errors")
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, "unsure"))

    def name(r):
        slug = r["result"].lower().replace(" ", "_")
        return f"{r['score']:.4f}_{r['true_label']}_as_{slug}_{os.path.basename(r['filename'])}"

    for r in errors:
        shutil.copy2(os.path.join(DATASET, r["filename"]), os.path.join(out, name(r)))
    for r in unsure_rows:
        shutil.copy2(os.path.join(DATASET, r["filename"]), os.path.join(out, "unsure", name(r)))


# ------------------------------------------------------------------------ figures

def style(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
    ax.tick_params(colors=INK_SOFT, labelsize=9)


def figures(cm, per_type, gen, spam, thresholds):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap

    plt.rcParams.update({"font.family": "DejaVu Sans", "text.color": INK, "axes.labelcolor": INK_SOFT})

    # Confusion matrix: one sequential blue ramp, shaded by row share.
    fig, ax = plt.subplots(figsize=(6.4, 3.2), dpi=200)
    ramp = LinearSegmentedColormap.from_list("blue", ["#f4f8fd", BLUE, "#123d73"])
    labels = ["genuine", "spam"]
    shares = [[cm[l][k] / max(1, sum(cm[l].values())) for k in RESULTS_ORDER] for l in labels]
    ax.imshow(shares, cmap=ramp, vmin=0, vmax=1, aspect="auto")
    for i, l in enumerate(labels):
        for j, k in enumerate(RESULTS_ORDER):
            share = shares[i][j]
            ax.text(j, i, f"{cm[l][k]}\n{share:.0%}", ha="center", va="center", fontsize=11,
                    color="white" if share > 0.55 else INK)
    ax.set_xticks(range(3), RESULTS_ORDER)
    ax.set_yticks(range(2), [f"true {l}\n(n={sum(cm[l].values())})" for l in labels])
    ax.set_xlabel("Classifier result")
    ax.tick_params(length=0, labelsize=10, colors=INK)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_title("Confusion matrix, test set (count and row share)", fontsize=11, loc="left", color=INK)
    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS, "fig_confusion.png"))
    plt.close(fig)

    # Share of each spam type marked Likely spam, sorted, direct-labelled.
    items = sorted(per_type.items(), key=lambda kv: (kv[1][0] / max(1, kv[1][1]), kv[0]))
    fig, ax = plt.subplots(figsize=(6.4, 4.2), dpi=200)
    shares = [k / max(1, n) for _, (k, n) in items]
    ax.barh(range(len(items)), shares, color=BLUE, height=0.62)
    for i, (_, (k, n)) in enumerate(items):
        ax.text(min(k / max(1, n), 1) + 0.015, i, f"{k}/{n}", va="center", fontsize=9, color=INK_SOFT)
    ax.set_yticks(range(len(items)), [t for t, _ in items])
    ax.set_xlim(0, 1.12)
    ax.set_xticks([0, 0.25, 0.5, 0.75, 1], ["0%", "25%", "50%", "75%", "100%"])
    ax.xaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    style(ax)
    ax.tick_params(axis="y", length=0, colors=INK, labelsize=10)
    ax.set_xlabel("Share marked “Likely spam”")
    ax.set_title("Spam images marked Likely spam, by spam type (test set)", fontsize=11, loc="left")
    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS, "fig_per_type.png"))
    plt.close(fig)

    # Score histogram, genuine vs spam, with threshold lines.
    fig, ax = plt.subplots(figsize=(6.4, 3.6), dpi=200)
    bins = [i / 20 for i in range(21)]
    for data, colour, label in (([r["score"] for r in gen], BLUE, f"genuine (n={len(gen)})"),
                                ([r["score"] for r in spam], ORANGE, f"spam (n={len(spam)})")):
        ax.hist(data, bins=bins, color=colour, alpha=0.35, edgecolor="none")
        ax.hist(data, bins=bins, histtype="step", color=colour, linewidth=2, label=label)
    top = ax.get_ylim()[1]
    # Each label sits on the side of its line that it describes.
    for x, text, dx, ha in ((thresholds[1], f"Likely spam below {thresholds[1]}", -0.01, "right"),
                            (thresholds[0], f"Looks genuine from {thresholds[0]}", 0.01, "left")):
        ax.axvline(x, color=INK_SOFT, linestyle="--", linewidth=1)
        ax.text(x + dx, top * 0.97, text, fontsize=8, color=INK_SOFT, va="top", ha=ha)
    ax.set_xlim(0, 1)
    ax.set_xlabel("CLIP genuine score")
    ax.set_ylabel("Images")
    ax.yaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    style(ax)
    # Between the threshold lines (the Unsure band), where bars are rare.
    ax.legend(frameon=False, fontsize=9, loc="center", bbox_to_anchor=(0.5, 0.6))
    ax.set_title("Score distribution, test set", fontsize=11, loc="left")
    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS, "fig_scores.png"))
    plt.close(fig)


# --------------------------------------------------------------------------- main

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--set", required=True, choices=["tuning", "test"])
    p.add_argument("--url", default="http://127.0.0.1:8000/classify")
    p.add_argument("--report-only", action="store_true",
                   help="rebuild the report from the saved CSV without calling the service")
    p.add_argument("--out", help="output folder (default: a new folder in clip_eval/live_runs/; "
                                 "with --report-only: clip_eval/results/)")
    p.add_argument("--overwrite-results", action="store_true",
                   help="allow a live run to overwrite the locked thesis results in clip_eval/results/")
    args = p.parse_args()

    global RESULTS
    if args.out:
        RESULTS = os.path.abspath(args.out)
    elif args.report_only:
        RESULTS = OFFICIAL_RESULTS
    else:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        RESULTS = os.path.join(CLIP_EVAL, "live_runs", f"{args.set}_{stamp}")
    official = os.path.realpath(RESULTS) == os.path.realpath(OFFICIAL_RESULTS)
    if official and not args.report_only and not args.overwrite_results:
        sys.exit("clip_eval/results/ holds the locked thesis results. Use another --out folder "
                 "(or leave --out off), or pass --overwrite-results if you really mean it.")
    print(f"output folder: {os.path.relpath(RESULTS, REPO)}")

    if args.report_only:
        rows, thresholds = load(args.set), app_thresholds()
    else:
        rows, thresholds = run(args)
    (tuning_report if args.set == "tuning" else test_report)(rows, thresholds)


if __name__ == "__main__":
    main()
