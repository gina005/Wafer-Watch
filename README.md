# waferwatch

A semiconductor industry news tracker and analysis dashboard. Aggregates
news from industry RSS feeds, tracks major companies, and generates
lightweight weekly analysis (category trends, company mentions, sentiment) —
all served as a static site with no backend server to run or pay for.

## Architecture

```
RSS feeds ──► scripts/fetch_news.py ──► public/data/news.json
                                              │
                                              ▼
                              scripts/build_digest.py ──► public/data/digest.json
                                              │
                                              ▼
                              React frontend fetches JSON at runtime
                                              │
                                              ▼
                                    Deployed static site (Vercel)
```

- **Frontend**: React + Vite + Tailwind CSS, charts via Recharts.
- **Data pipeline**: Python (`feedparser`) scripts that pull RSS feeds,
  tag articles by category/company, and write plain JSON files into
  `public/data/`.
- **Automation**: a GitHub Actions workflow (`.github/workflows/update-data.yml`)
  runs the pipeline every 6 hours and commits the updated JSON back to the repo.
- **Hosting**: Vercel, deployed straight from GitHub. No database, no
  server — the site is 100% static and just fetches the committed JSON.

This means the whole project costs nothing to run and has no server to
maintain, while still updating itself automatically.

## Local development

Requirements: Node.js 18+, and Python 3.10+ if you want to run the data
pipeline locally.

```bash
# install frontend dependencies
npm install

# run the dev server
npm run dev
```

The app reads from `public/data/*.json`. The repo ships with sample seed
data so the site works immediately, before you've run the pipeline even
once.

To pull live data locally:

```bash
pip install -r scripts/requirements.txt
python scripts/fetch_news.py
python scripts/build_digest.py
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Vercel auto-detects the Vite framework preset — no config needed.
   Build command: `npm run build`. Output directory: `dist`.
4. Deploy. Every push to `main` redeploys automatically.

## Enabling the automated data pipeline

The GitHub Action in `.github/workflows/update-data.yml` needs write
access to push commits back to the repo:

1. In your repo, go to **Settings → Actions → General → Workflow permissions**.
2. Select **Read and write permissions**.
3. That's it — the workflow runs on its own schedule, or you can trigger
   it manually from the **Actions** tab (`Run workflow`).

Each run overwrites `public/data/news.json` and `public/data/digest.json`
with fresh data and commits the change, which triggers a new Vercel
deployment automatically.

## Project structure

```
src/
  components/     shared UI (nav, cards, tags)
  pages/          one file per tab: Dashboard, NewsFeed, Companies,
                  NodeRoadmap, Analysis, About
  hooks/          useJsonData — fetches /public/data/*.json at runtime
public/data/      the "database" — JSON files updated by the pipeline
scripts/          Python pipeline: fetch_news.py, build_digest.py
.github/workflows/  the scheduled GitHub Action
```

## Customizing

- **Add a news source**: add an entry to `FEEDS` in `scripts/fetch_news.py`.
- **Add a tracked company**: add it to `COMPANY_KEYWORDS` in
  `scripts/fetch_news.py`, and to `public/data/companies.json` if you want
  it on the Companies tab (price history there is currently seed data —
  wire up a free market-data API like Alpha Vantage or Finnhub to make it live).
- **Change categories**: edit `CATEGORY_KEYWORDS` in `scripts/fetch_news.py`
  and the `categoryColors` map in `src/components/ui.jsx`.

## Ideas for extending this further

- Swap the templated weekly summary in `build_digest.py` for a real LLM
  call (Anthropic/OpenAI API) for richer written analysis.
- Wire up live stock prices with a free-tier market-data API.
- Add a "compare companies" view using the existing Recharts setup.
- Persist historical digests (one JSON file per week) to show trends over months.
