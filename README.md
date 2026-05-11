# Checkpoint Scout

A go-to-market agent for Entire (entire.io). Scans public GitHub for moments where open-source maintainers are visibly struggling with AI-generated code, and drafts three artifacts per pain moment that Entire's GTM team could ship.

## Dashboard

Live review UI for Entire's GTM team:
**https://aunshx.github.io/checkpoint-scout/**

Shows the full pipeline funnel, ranked pain moments, and all generated artifacts (comment drafts, outreach messages, case study skeletons) with expand/collapse. Dark mode, read-only. Nothing is posted to GitHub or sent to anyone — human-in-the-loop by design.

## What it does

For each detected pain moment, generates:
1. **Public comment** — a useful, non-spammy draft comment for the PR or issue thread
2. **Outreach message** — a personalized DM/email to the maintainer for offline follow-up
3. **Case study skeleton** — a draft blog post Entire could publish

All outputs are drafts saved to disk. Nothing is auto-posted to GitHub.

## Architecture

Three pipeline stages + a dashboard:

1. **Acquire** (`src/acquire.py`) — Pull recent PRs and issue comments from 15 curated OSS repos via GitHub API, plus 6 AI-coding pain-phrase queries against GitHub Issue Search. Produces `data/raw/{timestamp}/candidates.json`.
2. **Classify** (`src/classify.py`) — Prioritize top 100 candidates (keyword signal, bot filtering, repo diversity cap), then call Claude Opus 4.7 to score each against a pain rubric. Saves `data/classified/{timestamp}/qualified.json` (score ≥ 6).
3. **Generate** (`src/generate.py`) — For each qualified pain moment, draft the three artifacts in parallel using Claude Opus 4.7 with adaptive thinking. Saves to `outputs/runs/{timestamp}/pain_moment_{id}/`.
4. **Dashboard** (`scripts/build_dashboard_data.py` + `web/`) — Compiles all outputs into `web/public/data.json`, served by a React + Vite + Tailwind static site deployed to GitHub Pages.

## The bet

Entire is in a race-to-default category creation play. The wedge: hijack acute pain moments in public OSS workflows where Entire is the obvious answer, before incumbents (GitHub, Cursor, Anthropic) absorb the context-preservation layer.

Target persona: open-source maintainers, not enterprise compliance buyers. They have the loudest public voice and the most existential pain right now from AI-generated PR slop.

## Setup

```bash
cp .env.example .env
# Fill in GITHUB_TOKEN and ANTHROPIC_API_KEY
pip install -r requirements.txt
python src/acquire.py
python src/classify.py
python src/generate.py
python src/dashboard.py
python scripts/build_dashboard_data.py
```

To run the web dashboard locally:

```bash
cd web
npm install
npm run dev
# open http://localhost:5173/checkpoint-scout/
```

## Why this design

- **Targets pain, not lists.** Most GTM agents personalize cold outreach to a prospect list. This one ignores lists and chases moments.
- **Drafts, never posts.** Auto-posting promotional comments on OSS would be spam. Human-in-the-loop is the only ethical version.
- **Useful outputs even if not shipped.** The case study skeleton has standalone marketing value. The PR comment, if shipped, adds value to the maintainer's conversation regardless of whether they adopt Entire.
- **Dashboard over raw JSON.** The GTM team shouldn't have to read files — the review UI puts comment, outreach, and case study one click apart from the pain signal that generated them.

## CI / Automation

- **`.github/workflows/deploy.yml`** — Builds and deploys the web dashboard to GitHub Pages on every push to `main` that touches `web/`.
- **`.github/workflows/daily-scout.yml`** — Scaffolded daily cron (6am UTC). Will run the full pipeline and commit fresh data automatically once `ANTHROPIC_API_KEY` and `SCOUT_GITHUB_TOKEN` are added to repo secrets.

## Status

Prototype built for the Basis Set AI Fellowship application. See `docs/architecture.md` for the full design spec.
