"""
Pulls semiconductor-related articles from a set of public RSS feeds,
tags each one by category and company, de-duplicates against the
existing dataset, and writes the result to public/data/news.json.

Run manually with:  python scripts/fetch_news.py
Runs automatically via .github/workflows/update-data.yml
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import feedparser

OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "news.json"
MAX_ARTICLES = 60  # keep the dataset small and fast to load

# Add or remove feeds here. Any publication with an RSS feed works.
FEEDS = {
    "SemiEngineering": "https://semiengineering.com/feed/",
    "EE Times": "https://www.eetimes.com/feed/",
    "IEEE Spectrum": "https://spectrum.ieee.org/feeds/topic/semiconductors.rss",
    "Tom's Hardware": "https://www.tomshardware.com/feeds/all",
    "Google News - Semiconductors": (
        "https://news.google.com/rss/search?q=semiconductor+OR+chipmaking+OR+foundry"
        "+when:2d&hl=en-US&gl=US&ceid=US:en"
    ),
}

# Keyword -> category. Checked against title + summary, first match wins.
CATEGORY_KEYWORDS = {
    "Policy": ["export control", "commerce department", "tariff", "sanction", "chips act", "regulation"],
    "M&A": ["acquisition", "acquire", "merger", "buyout", "deal to buy"],
    "EDA": ["eda", "cadence", "synopsys", "verification software", "design software"],
    "Supply Chain": ["supply chain", "shortage", "capacity", "hbm", "memory demand", "packaging capacity"],
    "Chip Design": ["architecture", "chiplet", "gpu", "accelerator", "processor design", "soc"],
    "Fabrication": ["fab", "foundry", "euv", "lithography", "yield", "nm process", "wafer", "gate-all-around", "finfet"],
}

# Keyword -> canonical company name. Checked against title + summary.
COMPANY_KEYWORDS = {
    "TSMC": ["tsmc", "taiwan semiconductor"],
    "Nvidia": ["nvidia"],
    "Intel": ["intel"],
    "Samsung": ["samsung"],
    "ASML": ["asml"],
    "AMD": ["amd", "advanced micro devices"],
    "Micron": ["micron"],
    "SK Hynix": ["sk hynix"],
    "Applied Materials": ["applied materials"],
    "Qualcomm": ["qualcomm"],
    "Arm": ["arm holdings", " arm "],
    "Synopsys": ["synopsys"],
    "Cadence": ["cadence"],
    "SMIC": ["smic"],
    "Texas Instruments": ["texas instruments"],
    "Analog Devices": ["analog devices"],
}


def categorize(text: str) -> str:
    text = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(k in text for k in keywords):
            return category
    return "Fabrication"  # sensible default for this beat


def tag_companies(text: str) -> list[str]:
    text = text.lower()
    return [name for name, keywords in COMPANY_KEYWORDS.items() if any(k in text for k in keywords)]


def make_id(link: str) -> str:
    return hashlib.sha1(link.encode("utf-8")).hexdigest()[:10]


def fetch_all() -> list[dict]:
    articles = []
    for source, url in FEEDS.items():
        parsed = feedparser.parse(url)
        for entry in parsed.entries:
            title = entry.get("title", "").strip()
            summary = entry.get("summary", "").strip()
            link = entry.get("link", "")
            if not title or not link:
                continue
            published = entry.get("published_parsed") or entry.get("updated_parsed")
            date = (
                datetime(*published[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
                if published
                else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            )
            combined_text = f"{title} {summary}"
            articles.append(
                {
                    "id": make_id(link),
                    "title": title,
                    "source": source,
                    "url": link,
                    "date": date,
                    "category": categorize(combined_text),
                    "companies": tag_companies(combined_text),
                    "summary": summary[:280],
                }
            )
    return articles


def main():
    fetched = fetch_all()

    existing = {"articles": []}
    if OUT_PATH.exists():
        existing = json.loads(OUT_PATH.read_text())

    seen_ids = set()
    merged = []
    for article in fetched + existing.get("articles", []):
        if article["id"] in seen_ids:
            continue
        seen_ids.add(article["id"])
        merged.append(article)

    merged.sort(key=lambda a: a["date"], reverse=True)
    merged = merged[:MAX_ARTICLES]

    OUT_PATH.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "note": "Live data from scripts/fetch_news.py",
                "articles": merged,
            },
            indent=2,
        )
    )
    print(f"Wrote {len(merged)} articles to {OUT_PATH}")


if __name__ == "__main__":
    main()
