"""
Wikimedia Commons helper used to collect the CLIP evaluation dataset.

Standard library only. Two commands:

  python3 commons.py search "pothole Nepal" [--limit 40]
      Lists bitmap files matching the query with licence, size and a flag if
      Commons categorises them as generated / rendered.

  python3 commons.py get "File:Pothole in Kathmandu.jpg" <dest.jpg> \
        --cls genuine --type pothole --sources <partial.csv> [--notes "dark"]
      Downloads the 1024px Commons thumbnail (smaller originals as-is) and
      appends one row to the partial sources CSV. Refuses files whose licence
      is not CC0 / public domain / CC BY / CC BY-SA, SVGs, and files in any
      AI-generated / computer-generated / rendered category.
"""
import argparse
import csv
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

API = "https://commons.wikimedia.org/w/api.php"
UA = "MeroSadak-thesis-eval/1.0 (academic CLIP evaluation; laxman giri)"
THUMB_WIDTH = 1024

ALLOWED_LICENCE = re.compile(r"^(cc0|cc[- ]zero|public domain|pd\b|pd-|cc[- ]by(-sa)?[- ]\d|cc[- ]by(-sa)?$)", re.I)
GENERATED_CATEGORY = re.compile(
    r"ai[- ]generated|generated (by|with|using)|midjourney|dall[- ]?e|stable diffusion|"
    r"computer[- ]generated|cgi|3d render|rendered|renders? |blender|povray|pov-ray|"
    r"matplotlib|gnuplot|created with|made with|images? made|procedural|"
    r"photomontage|photoshopped|digital art|fractal",
    re.I,
)
FIELDS = [
    "filename", "class", "type", "source_url", "image_url", "author",
    "licence", "licence_url", "commons_title", "notes",
]


def api(**params):
    params.update(format="json", formatversion="2")
    return json.loads(fetch(API + "?" + urllib.parse.urlencode(params)))


def fetch(url):
    # curl rather than urllib: python.org builds on macOS ship without CA certs.
    res = subprocess.run(["curl", "-sSfL", "--retry", "3", "-m", "60", "-A", UA, url],
                         capture_output=True, check=True)
    return res.stdout


def clean(text):
    text = re.sub(r"<[^>]+>", "", html.unescape(text or ""))
    return re.sub(r"\s+", " ", text).strip()


def file_info(titles):
    data = api(
        action="query", titles="|".join(titles), prop="imageinfo|categories",
        iiprop="url|mime|size|extmetadata", iiurlwidth=THUMB_WIDTH,
        clshow="", cllimit="max",
    )
    out = []
    for page in data["query"]["pages"]:
        if "imageinfo" not in page:
            continue
        ii = page["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        cats = [c["title"].removeprefix("Category:") for c in page.get("categories", [])]
        meta_cats = clean(meta.get("Categories", {}).get("value", "")).split("|")
        all_cats = cats + [c for c in meta_cats if c]
        out.append({
            "title": page["title"],
            "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(page["title"].replace(" ", "_")),
            "mime": ii.get("mime", ""),
            "width": ii.get("width"),
            "height": ii.get("height"),
            "thumb": ii.get("thumburl") or ii.get("url"),
            "licence": clean(meta.get("LicenseShortName", {}).get("value", "")),
            "licence_url": clean(meta.get("LicenseUrl", {}).get("value", "")),
            "author": clean(meta.get("Artist", {}).get("value", "")) or clean(meta.get("Credit", {}).get("value", "")),
            "description": clean(meta.get("ImageDescription", {}).get("value", ""))[:200],
            "generated": [c for c in all_cats if GENERATED_CATEGORY.search(c)],
            "categories": all_cats,
        })
    return out


def problems(info):
    issues = []
    if info["mime"] not in ("image/jpeg", "image/png", "image/webp"):
        issues.append(f"mime {info['mime']}")
    if not ALLOWED_LICENCE.search(info["licence"]):
        issues.append(f"licence '{info['licence']}'")
    if info["generated"]:
        issues.append("generated/rendered category: " + "; ".join(info["generated"][:3]))
    if not info["author"]:
        issues.append("no author")
    return issues


def cmd_search(args):
    data = api(action="query", list="search", srsearch=args.query + " filetype:bitmap",
               srnamespace=6, srlimit=min(args.limit, 50))
    titles = [r["title"] for r in data["query"]["search"]]
    for i in range(0, len(titles), 20):
        for info in file_info(titles[i:i + 20]):
            flag = "OK " if not problems(info) else "NO "
            print(f"{flag}{info['title']}  [{info['licence']}] {info['width']}x{info['height']}"
                  + (f"  !! {'; '.join(problems(info))}" if problems(info) else "")
                  + (f"\n      {info['description'][:140]}" if info["description"] else ""))


def cmd_get(args):
    infos = file_info([args.title])
    if not infos:
        sys.exit(f"not found: {args.title}")
    info = infos[0]
    issues = problems(info)
    if issues:
        sys.exit("REFUSED " + info["title"] + ": " + "; ".join(issues))

    data = fetch(info["thumb"])
    os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
    with open(args.dest, "wb") as fh:
        fh.write(data)

    new = not os.path.exists(args.sources)
    with open(args.sources, "a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        if new:
            w.writeheader()
        w.writerow({
            "filename": args.dest_rel or args.dest,
            "class": args.cls,
            "type": args.type,
            "source_url": info["page"],
            "image_url": info["thumb"],
            "author": info["author"],
            "licence": info["licence"],
            "licence_url": info["licence_url"],
            "commons_title": info["title"],
            "notes": args.notes,
        })
    print(f"saved {args.dest} ({len(data)//1024} KB) — {info['licence']} — {info['author'][:60]}")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=30)
    g = sub.add_parser("get")
    g.add_argument("title")
    g.add_argument("dest")
    g.add_argument("--dest-rel", default="", help="filename to record, relative to the dataset folder")
    g.add_argument("--cls", required=True, choices=["genuine", "spam", "unclear"])
    g.add_argument("--type", required=True)
    g.add_argument("--sources", required=True)
    g.add_argument("--notes", default="")
    args = p.parse_args()
    {"search": cmd_search, "get": cmd_get}[args.cmd](args)


if __name__ == "__main__":
    main()
