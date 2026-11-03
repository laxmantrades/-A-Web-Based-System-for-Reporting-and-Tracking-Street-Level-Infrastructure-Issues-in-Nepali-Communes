# Threshold decision

**Date:** 2026-10-29
**Decided by:** Laxman Giri (author)
**Decision:** keep the app's thresholds unchanged: score ≥ **0.7** → "Looks genuine",
score < **0.3** → "Likely spam", anything in between → "Unsure".

These values are now locked for the final test run. The CLIP prompts, scoring
and thresholds in the app (`classifier/prompts.py`,
`server/src/models/ClassifierConfig.js`) were not changed.

## Evidence (tuning set only)

Tuning set: 44 images (18 genuine, 24 spam, 2 unclear), split with seed
20261028 (`clip_dataset/split.csv`). Classifier `clip-spam-v3`, model
`openai/clip-vit-base-patch32`. Full output: `tuning_results.csv`,
`tuning_summary.txt`.

| thresholds (genuine/spam) | genuine → Likely spam | spam → Looks genuine | genuine Unsure | spam Unsure |
|---|---|---|---|---|
| **0.7 / 0.3 (current)** | **0** | **0** | 0 | 1 |
| 0.6 / 0.3 | 0 | 0 | 0 | 1 |
| 0.7 / 0.4 | 0 | 0 | 0 | 1 |
| 0.8 / 0.3 | 0 | 0 | 0 | 1 |
| 0.6 / 0.4 | 0 | 0 | 0 | 1 |
| 0.8 / 0.2 | 0 | 0 | 0 | 1 |
| 0.5 / 0.5 | 0 | 1 | 0 | 0 |

- Lowest genuine score: 0.948 (`genuine/streetlight_08.jpg`). All 4 dark/blurred
  genuine photos in the tuning set scored ≥ 0.985.
- Highest spam score: 0.530 (`spam/landscape/landscape_09.jpg`, Nepali rice
  terraces), which fell in "Unsure". The next highest was 0.183.
- Both unclear images fell in "Unsure" (0.302 and 0.531).

## Reasoning

1. Every pair tried between roughly 0.53 and 0.95 separates the tuning set
   perfectly, so the data gives no reason to move away from the values set
   before the evaluation.
2. With 44 tuning images, choosing new thresholds to fit them would risk
   overfitting. Keeping the pre-set values keeps the test result honest.
3. The Unsure band does what it is meant to do: it holds the one borderline
   spam image and both ambiguous images, and no clear-cut image.

Limitation noted at decision time: the tuning set is small, so the 122-image
test set is the real measure.
