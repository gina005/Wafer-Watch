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
import math
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


def _is_bad_number(value) -> bool:
    """True for NaN/Infinity — valid Python floats, but not valid JSON, and
    Python's json.dumps writes them as bare NaN/Infinity tokens by default,
    which silently breaks JSON.parse on the frontend for the whole file."""
    return isinstance(value, float) and (math.isnan(value) or math.isinf(value))


def fetch_company_data(ticker: str) -> dict | None:
    t = yf.Ticker(ticker)
    hist = t.history(period=HISTORY_PERIOD)
    if hist.empty:
        return None

    # yfinance occasionally returns a NaN close for the most recent trading
    # day (a data gap from the source), so drop any (date, close) pair where
    # the close isn't a real number rather than writing NaN into the JSON.
    raw_dates = [d.strftime("%Y-%m-%d") for d in hist.index]
    raw_closes = hist["Close"].tolist()
    dates, closes = [], []
    for date, close in zip(raw_dates, raw_closes):
        close = float(close)
        if _is_bad_number(close):
            continue
        dates.append(date)
        closes.append(round(close, 2))

    if not closes:
        return None

    base_idx = -(CHANGE_WINDOW_TRADING_DAYS + 1) if len(closes) > CHANGE_WINDOW_TRADING_DAYS else 0
    base = closes[base_idx]
    change30d = round((closes[-1] - base) / base * 100, 1) if base else 0.0

    info = t.info
    financials = {
        our_key: info[yf_key]
        for yf_key, our_key in INFO_FIELD_MAP.items()
        if info.get(yf_key) is not None and not _is_bad_number(info.get(yf_key))
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
    # allow_nan=False is a hard backstop: if a NaN/Infinity ever slips through
    # despite the filtering above, this raises here instead of silently
    # writing invalid JSON that breaks JSON.parse for every page that reads
    # this file.
    OUT_PATH.write_text(json.dumps(existing, indent=2, allow_nan=False) + "\n")
    print(f"Updated {updated}/{len(companies)} companies in {OUT_PATH}")


if __name__ == "__main__":
    main()
