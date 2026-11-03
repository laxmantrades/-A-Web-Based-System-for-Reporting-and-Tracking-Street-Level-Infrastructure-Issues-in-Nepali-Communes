# CLIP evaluation dataset

166 labelled images used to test the MeroSadak AI photo check (thesis
Section 4.5).

| folder | what | count |
|---|---|---|
| `genuine/` | real street photos of the 6 issue types (pothole, road_sign, streetlight, road_marking, footpath, drain), 12 each; 10 of them dark or blurred | 72 |
| `spam/<type>/` | 7 each of the 12 spam types: furniture, chart, screenshot, selfie, food, animal, document, meme, blank, indoor, landscape, group | 84 |
| `unclear/` | genuinely ambiguous images (road through a window, puddle reflection, construction…), reported separately and not scored | 10 |

## Files

- **`SOURCES.csv`**: one row per image with its source URL, author and
  licence. 162 images come from Wikimedia Commons (CC0, public domain, CC BY
  or CC BY-SA). 4 are marked "taken by the author" (see below). No image is
  AI-generated, computer-generated or edited.
- **`split.csv`**: which images are in the tuning set (44) and which in the
  test set (122). Made once with seed 20261028 by
  `../scripts/make_split.py`, stratified by class and type. It must never be
  changed.

## Chart photos taken by the author

Commons has very few real photos or screenshots of trading charts, because most
chart images there are drawn by code, which the rules did not allow. Of the 7
chart images first found, 4 were stock ticker boards with no chart line. On
2026-10-28 these were replaced by 4 of the author's own images
(`spam/chart/chart_author_01`–`04`): two phone/desktop screenshots of
TradingView and Yahoo Finance, one phone photo of a laptop showing TradingView,
and one cropped TradingView screenshot. They show no account names or balances.

`chart_author_03.jpg` shows desktop folder names in the background; crop a copy
before using it as a figure. Don't edit the file here, because this is the
exact image that was evaluated.

## Checking it

```bash
python3 evaluation/clip_eval/scripts/check_dataset.py
```
