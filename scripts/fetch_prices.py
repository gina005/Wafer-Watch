"""
Pulls live pricing and a financial snapshot for each tracked company via
yfinance, and merges the result into public/data/companies.json — only the
live-fetched fields (priceHistory, change30d, financials) are overwritten;
manually-curated fields (sector, focus, segmentRevenue, rdSpendPctRevenue,
capexTrend, supplyChain, researchNote) are left untouched.

Run manually with:  python scripts/fetch_prices.py
Runs automatically via .github/workflows/update-prices.yml
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "companies.json"
HISTORY_PERIOD = "90d"  # calendar-day window yfinance accepts; ~63 trading days
CHANGE_WINDOW_TRADING_DAYS = 21  # ~30 calendar days of trading activity

# yfinance .info key -> our financials key. Only included if yfinance
# actually returns a value, so we never write nulls over real data.
INFO_FIELD_MAP = {
    "marketCap": "marketCapUSD",
    "trailingPE": "peRatio",
    "fiftyTwoWeekLow": "week52Low",
    "fiftyTwoWeekHigh": "week52High",
    "averageVolume": "avgVolume",
    "volume": "currentVolume",
    "beta": "beta",
    "dividendYield": "dividendYield",
}


def fetch_company_data(ticker: str) -> dict | None:
    t = yf.Ticker(ticker)
    hist = t.history(period=HISTORY_PERIOD)
    if hist.empty:
        return None

    closes = [round(float(c), 2) for c in hist["Close"].tolist()]
    dates = [d.strftime("%Y-%m-%d") for d in hist.index]

    base_idx = -(CHANGE_WINDOW_TRADING_DAYS + 1) if len(closes) > CHANGE_WINDOW_TRADING_DAYS else 0
    base = closes[base_idx]
    change30d = round((closes[-1] - base) / base * 100, 1) if base else 0.0

    info = t.info
    financials = {
        our_key: info[yf_key]
        for yf_key, our_key in INFO_FIELD_MAP.items()
        if info.get(yf_key) is not None
    }

    return {
        "priceHistory": closes,
        "priceDates": dates,
        "change30d": change30d,
        "financials": financials,
    }


def main():
    existing = json.loads(OUT_PATH.read_text())
    companies = existing.get("companies", [])

    updated = 0
    for company in companies:
        ticker = company["ticker"]
        data = fetch_company_data(ticker)
        if data is None:
            print(f"  ! No data returned for {ticker}, leaving existing values in place")
            continue
        company.update(data)
        updated += 1
        print(f"  {ticker}: {data['change30d']:+.1f}% ({len(data['priceHistory'])} trading days)")

    existing["generated_at"] = datetime.now(timezone.utc).isoformat()
    OUT_PATH.write_text(json.dumps(existing, indent=2) + "\n")
    print(f"Updated {updated}/{len(companies)} companies in {OUT_PATH}")


if __name__ == "__main__":
    main()
