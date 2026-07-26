# WaferWatch — Data Density & Depth Pass (Spec for Implementation)

Read `PROJECT_NOTES.md` first for overall project context (stack, structure, design system). This document specifies a set of improvements to make the site feel more data-dense and specific — inspired by sgreceipts.org's philosophy of "real numbers, receipts attached" rather than summarized/vague descriptions.

Implement in the order listed. After each numbered section, run `npm run build` to confirm nothing broke before moving to the next.

---

## 1. Company Tracker — real price pipeline + layered depth

### 1a. New pipeline: `scripts/fetch_prices.py`

Currently `public/data/companies.json` is 100% static sample data — there is no live pipeline. Build one, following the same pattern as `scripts/fetch_news.py` (scheduled script → writes JSON → committed by GitHub Action).

- Use `yfinance` (add to `scripts/requirements.txt`)
- All tickers must be USD-denominated already (US listings or USD ADRs) — do not use home-market tickers that require currency conversion. Current roster is already correct: `TSM, NVDA, ASML, INTC, SSNLF, AMD, MU, AMAT`
- Pull daily closing prices for the last ~90 days (not just 14 — need enough history for the multi-range toggle in section 1e)
- Also pull, where available from `yfinance`'s `.info`: market cap, trailing P/E, 52-week high/low, average volume vs. current volume, beta, dividend yield
- Write to `public/data/companies.json`, preserving the manually-curated fields (sector, focus, supply chain links, segment revenue — see below) and only overwriting the live-fetched fields (priceHistory, financials)
- Add `.github/workflows/update-prices.yml` — same structure as `update-data.yml`, can run once daily (`cron: "0 6 * * *"`) since price data doesn't need 6-hour freshness like news

### 1b. Extend `companies.json` schema

Add these fields per company (financials will be pipeline-populated; the rest are manually curated once, since this is fairly stable data):

```json
{
  "ticker": "TSM",
  "name": "TSMC",
  "sector": "Foundry",
  "focus": "...",
  "priceHistory": [...],
  "change30d": 8.4,
  "financials": {
    "marketCapUSD": 950000000000,
    "peRatio": 28.4,
    "week52Low": 118.2,
    "week52High": 205.6,
    "avgVolume": 14200000,
    "currentVolume": 16800000,
    "beta": 1.2,
    "dividendYield": 1.4
  },
  "segmentRevenue": [
    { "segment": "HPC", "pct": 51 },
    { "segment": "Smartphone", "pct": 34 },
    { "segment": "IoT", "pct": 7 },
    { "segment": "Automotive", "pct": 5 },
    { "segment": "Other", "pct": 3 }
  ],
  "rdSpendPctRevenue": 8.7,
  "capexTrend": "rising",
  "supplyChain": {
    "customers": ["Nvidia", "Apple", "AMD", "Qualcomm"],
    "suppliers": ["ASML", "Applied Materials"]
  }
}
```

`supplyChain.customers` / `.suppliers` should reference company `name` fields already in the dataset where possible, so the UI can link between them (see 1c). It's fine for some entries to reference companies not in the tracked set (e.g. "Apple") — those just render as plain text, not a link.

Populate `segmentRevenue`, `rdSpendPctRevenue`, `capexTrend`, and `supplyChain` manually and reasonably for all 8 current companies based on each company's actual public segment reporting (10-Ks / investor presentations) — these are slow-changing enough not to need a live pipeline, but they should be genuinely researched, not fabricated placeholder numbers.

### 1c. UI: Company profile depth (`src/pages/Companies.jsx`)

Restructure the single-company view into a stacked profile, not just a chart + one sentence:

1. Snapshot header (existing) — name, sector, 30d change
2. Financial stats grid — market cap, P/E, 52w range, volume vs. avg, beta, dividend yield (from `financials`)
3. Segment revenue — horizontal bar or donut chart from `segmentRevenue`
4. R&D / Capex strip — R&D as % revenue, capex trend (rising/falling/flat) with an icon
5. Supply chain panel — two columns: "Customers" and "Suppliers," each a list of clickable chips. Clicking a chip that matches another tracked company's `name` switches `selected` to that company's ticker (in-app navigation, not a page reload) — this is the "receipts" feeling: a real graph you can walk through, not a static description
6. Price chart (existing, but see 1d and 1e)
7. Recent coverage (existing)

### 1d. News-annotated price chart

On the price chart (Recharts `LineChart`), add a `ReferenceDot` or small marker for any date in `priceHistory` that has a matching article in `news.json` where `companies` includes this company's `name`. Hovering/tapping the marker shows the headline. This is a cross-feature connection between News and Companies — implement by cross-referencing `a.date` against the chart's date axis when rendering.

### 1e. Multi-range toggle

Add a small control above the chart: `30D | 6M | 1Y`. Since the pipeline now fetches ~90 days minimum (1a), start with 30D/90D available honestly; note in a code comment that 6M/1Y need the pipeline's fetch window extended once there's enough historical data accumulated (or fetched in one historical backfill run).

### 1f. Sector-relative peer ranking — NOT a flat cross-sector ranking

This is important: do not rank all 8 companies together by 30-day % change (comparing a foundry to an equipment maker is meaningless — different business models move on different signals). Instead:

- Group companies by `sector` (already a field): e.g. "Foundry" (TSMC, Samsung, Intel), "Equipment" (ASML, Applied Materials), "Fabless / Accelerators" (Nvidia, AMD), "Memory" (Micron)
- Compute each company's rank within its own sector group by `change30d`
- Display as: "#1 of 3 tracked foundries" or "#2 of 2 tracked equipment makers" — not a meaningless global rank
- If a sector has only one tracked company, show something like "Only tracked company in Equipment" rather than a rank of "#1 of 1" which reads oddly

Implement this as a small utility function (e.g. `src/utils/ranking.js`) — `getSectorRank(company, allCompanies)` — rather than inline logic, since it'll likely be reused (e.g. on the Dashboard snapshot).

---

## 2. Node Roadmap — comparison table view

Add a toggle (similar pattern to Companies' "Compare companies" toggle) between the existing Timeline view and a new Table view.

Table columns: Node | Year | Technology | Relative Density (vs. previous node, e.g. "~1.7x") | Adoption Status ("Current standard" / "Legacy" / "Upcoming").

Extend the `nodes` array in `src/pages/NodeRoadmap.jsx` with a `relativeDensity` field (approximate, sourced from publicly cited industry figures — a rough multiplier is fine, this is illustrative, not a precision claim) and an `adoptionStatus` field derived from the existing `current` boolean plus year (past nodes = "Legacy", the `current: true` node = "Current Standard", future-dated nodes = "Upcoming").

---

## 3. Dashboard — expand the snapshot strip

Currently 3 stats (leading category, most active company, gainers count). Expand to 5-6:

- Total articles tracked (from `news.json` length)
- Categories active this week (count of distinct categories with ≥1 article in `digest.json.category_counts`)
- Average sentiment score (from `digest.json.sentiment_trend`, latest entry)
- Biggest single-company mover today (largest absolute `change30d` across `companies.json`, labeled "up" or "down")
- (Optional 6th) Number of tracked companies at a 52-week high (once `financials.week52High` exists from section 1)

Keep the existing grid layout pattern (`grid-cols-1 sm:grid-cols-3` → adjust to fit 5-6 items responsively, e.g. `sm:grid-cols-3 lg:grid-cols-6`).

---

## 4. News Feed — additional per-article metadata

Add to each article card:
- Estimated read time — compute client-side from `summary.length` (roughly 200 words/minute; summary alone is a proxy, label it "~1 min read" etc., don't overclaim precision)
- Cross-mention count — "3 other articles this week also mention TSMC" — computed by checking how many other articles in the currently-loaded `news.json` share at least one company tag with this article

---

## 5. Analysis — break down sentiment by category/company

Currently `sentiment_trend` in `digest.json` is one aggregate line. Extend `scripts/build_digest.py` to also compute sentiment per category (e.g. Fabrication sentiment vs. Policy sentiment, since these often diverge — Policy news skews negative more often than Fabrication progress news). Add a small multi-line chart or grouped bar chart on the Analysis page showing sentiment split by category, alongside the existing aggregate trend line (keep both — aggregate for the big picture, breakdown for the "receipts").

---

## Implementation order recap

1. `fetch_prices.py` pipeline + schema extension (section 1a, 1b)
2. Company profile UI depth + supply chain linking (1c)
3. News-annotated chart + multi-range toggle (1d, 1e)
4. Sector-relative ranking utility (1f) — use it in both Companies and Dashboard
5. Node Roadmap table view (2)
6. Dashboard snapshot expansion (3)
7. News Feed metadata (4)
8. Analysis sentiment breakdown (5)

After each section, run `npm run build`, then show the person what changed before moving to the next section — don't implement everything silently in one giant commit, since some of this (segment revenue, supply chain data) involves manually-researched figures worth double-checking together.