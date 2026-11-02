# LMSysDojo project page

A static, dependency-free page: open `index.html` through any static server (`python3 -m http.server` from this
folder) or publish the folder as-is with GitHub Pages. No build step; the only external request is Google Fonts
(Google Sans Flex and Google Sans Code, the faces of the paper's figures).

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The overview: all page copy, tables, figures and captions. Every interactive piece mounts into a `data-mount="…"` element whose static content is the no-JavaScript fallback. |
| `playgrounds.html` | The Playgrounds tab: every corpus playground with its measurements. One filter bar scopes a strip of the expert's speedups and the list under it; a dialog shows one playground (setup, launch config, both measurements, or why its run errored) and is addressable as `playgrounds.html#<engine>/<item>`. |
| `assets/css/base.css` | Design tokens (light and dark), type, layout, nav, rail, cards, tables, code, charts, reveal. |
| `assets/js/site.js` | Theme toggle, nav and rail scroll-spy, smooth in-page links, reveal-on-scroll, count-ups, lightbox, BibTeX copy, and the `LMSDUI` helper API. |
| `assets/js/charts.js` | `LMSDCharts.line / hbar / donut`: the shared SVG charts. |
| `assets/js/data.js` | Every number on the page (`window.LMSD`). Curves were read off the paper's own PDF figures. |
| `assets/js/cases.js` | The case gallery, walkthrough and check examples (`window.LMSD_CASES`), from the qualitative appendix. |
| `assets/{js,css}/hero.*` | Hero: title choreography and the ambient request-stream canvas. |
| `assets/{js,css}/story.*` | "Watch an agent find a gap": the pinned, scroll-driven vLLM 4696 walkthrough. |
| `assets/{js,css}/pillars.*` | Overview of the three pillars and the loop between them. |
| `assets/{js,css}/dojo.*` | 01 Environment: normalized-gain calculator, census funnel, composition, sealed sandbox. |
| `assets/{js,css}/dojo-pipeline.*` | 01 Environment: the LMSysDojo pipeline figure as an animation (one PR from scan to playground to a scored patch). |
| `assets/{js,css}/gap.*` | 02 Agent: variance, parallel K demo, provenance viewer, iterative checks, results, K = 50 scaling. |
| `assets/{js,css}/papers.*`, `assets/js/papers-data.js` | 02 Agent: the 50-paper library behind the gap section's lede (a dialog, opened on request). The data is generated from the paper's Appendix G table by `asset/source/site-papers.py`. |
| `assets/{js,css}/gap-glance.*` | 02 Agent: the "At a glance" figure as an animation (setups, parallel gap analysis, candidate mechanisms against the expert). |
| `assets/{js,css}/rl.*` | 03 Training: signal comparison, the three-challenge loop animation (whole solver vs analysis RL, fixed vs elastic GPU fleet, synchronous vs asynchronous), throughput, RL results. |
| `assets/{js,css}/gallery.*` | 04 Gallery: a walkthrough player for the paper's two end-to-end deliveries (SGLang 8940, vLLM 41868), the mechanism cards, failure modes. |
| `assets/{js,css}/playgrounds.*` | The Playgrounds tab's script and styles. |
| `assets/data/playgrounds.json`, `assets/data/pg/` | The playground list and one file per playground, generated from the sysdojo corpus by `asset/source/site-playgrounds.py`: setup card fields, launch config, and the latest numbers on file for both versions (the seal, else the latest run or benchmark report, scored as sysdojo's `build_track.py` scores a seal); for a run that left no numbers, its cause and reason (reviewed wording in `asset/source/site-playgrounds-errors.json`). Nothing sealed (problem, fix, diff, trace) and none of the tracker's free-text notes. Re-run the generator after a measurement push. |
| `assets/img/fig`, `assets/img/chart` | Paper figures (WebP, 1200 and 2400 px) and the paper's own charts, opened by the "Paper figure ↗" buttons next to each interactive version. |
| `assets/img/kit` | Logos and marks the animations reuse from the paper's figure sources (engine logos, model marks, analyzer head). |

## Before publishing

- Replace the `data-soon` placeholders (nav "Paper"; hero Paper, Code, Model, Benchmark; release grid) with real links; both Paper buttons
  point to the arXiv abstract page. Search for `TODO`.
- Update the BibTeX entry in `index.html` once there is an arXiv id or venue.
- If numbers change in the paper, change them in `assets/js/data.js` / `assets/js/cases.js` and in the matching
  sentences of `index.html` (the copy quotes several of them). If a paper figure changes, re-render it into
  `assets/img/chart/` (the lightbox copies are 2000 px WebP renders of the PDFs).
- The page is hosted at https://lmsysdojo.github.io/ (GitHub Pages of `lmsysdojo/lmsysdojo.github.io`, a mirror of
  this folder pushed by `deploy/site-pages/publish.sh` in the paper repository); `og:image`, `og:url` and the canonical
  link point there. The paper repository's `.github/workflows/deploy-site.yml` also mirrors the folder to
  https://junyan.ch/lmsysdojo/. Delete the `<meta name="robots" content="noindex, nofollow">` line at launch so search
  engines can list it. The 1200×630 card is `assets/img/og.png`.
- The paper PDF is not included; add it under `assets/paper/` once it can be shared.

## Previews

- `?reveal=all` shows every reveal-on-scroll block at once (full-page screenshots).
- The page honours `prefers-reduced-motion`: animations render their final state and the pinned story unpins.
- Stylesheets and scripts are linked with a `?v=` date so a returning visitor never pairs new HTML with a cached old file; bump it in both pages when you change an asset. The Playgrounds data is fetched with `cache: 'no-cache'` (a cheap revalidation each visit).
