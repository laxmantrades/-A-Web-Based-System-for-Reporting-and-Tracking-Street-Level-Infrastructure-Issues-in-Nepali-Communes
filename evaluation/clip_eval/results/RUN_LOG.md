# Run log

| when (2026-10-29) | what |
|---|---|
| after split | `run_clip_eval.py --set tuning` → `tuning_results.csv`, `tuning_summary.txt`, `tuning_run_info.json` |
| after decision | `threshold_decision.md` written: keep 0.7 / 0.3 |
| 09:17:02 | `run_clip_eval.py --set test` → `test_results.csv`, `test_run_info.json`, `metrics.txt`, figures, `errors/` |
| 09:17:33 | **Edit to `run_clip_eval.py` (figure layout only):** in `fig_scores.png` the legend overlapped the "Likely spam below 0.3" label. The legend was moved into the Unsure band and that label placed on the left of its line. No change to how results are obtained or counted. |
| after edit | `run_clip_eval.py --set test --report-only` re-drew the figures from the saved `test_results.csv` without calling the classifier. `metrics.txt` was byte-identical before and after. |
| later | Independent check (`CHECK.md`) re-scored all 166 images against the live classifier and reproduced every stored score and result. |
| after the evaluation | **Comment-only edit to `classifier/app.py` and `classifier/prompts.py`:** comments and docstrings were rewritten in plainer language. No code, prompt or threshold changed (checked by comparing the Python syntax trees with docstrings removed: identical). Because of this, the current files no longer match the sha256 recorded in `*_run_info.json` and `CHECK.md`. The exact files that were evaluated are kept in `backups/classifier-as-evaluated-20261029/` and still match those hashes (`app.py` ae275413…, `prompts.py` b963027b…). New hashes: `app.py` fe3870b6…, `prompts.py` a37584fe…. |
| after the evaluation | **Comment-only edit to `server/src/models/ClassifierConfig.js`** (part of a shorter-comments pass over client/ and server/). Compiled code is identical (checked with esbuild). The evaluated file is kept in `backups/classifier-as-evaluated-20261029/` (sha256 2befe7e2…); new sha256 88433ebd…. |
