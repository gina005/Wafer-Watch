"""
Pulls semiconductor-related articles from a set of public RSS feeds,
tags each one by category and company, de-duplicates against the
existing dataset, and writes the result to public/data/news.json.

Run manually with:  python scripts/fetch_news.py
Runs automatically via .github/workflows/update-data.yml
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import feedparser

OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "news.json"
MAX_ARTICLES = 60  # keep the dataset small and fast to load
MIN_SUMMARY_CHARS = 40  # below this, a "summary" is usually just a stray link/tag

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

# An article must contain at least one of these to be considered
# semiconductor-industry news at all. This is what keeps consumer PC-build,
# gaming-deal, and "which laptop should I buy" posts out of the feed, even
# when they happen to mention a chip company by name.
INDUSTRY_KEYWORDS = [
    "semiconductor", "chipmaker", "chip maker", "foundry", "fab ", "fabs ",
    "wafer", "process node", "nanometer", "nm process", "euv", "lithography",
    "yield", "capex", "packaging capacity", "cowos", "die shrink", "transistor",
    "gate-all-around", "finfet", "hbm", "chip design", "chip manufacturing",
    "export control", "chips act", "tape-out", "tape out", "fab expansion",
    "chip shortage", "chip supply", "silicon wafer", "eda tool", "ic design",
]

# If any of these show up, the article is almost certainly a consumer deal,
# giveaway, or review rather than industry news — drop it even if an
# industry keyword also matched.
NOISE_KEYWORDS = [
    "giveaway", "sweepstakes", "leaving a comment", "% off", "deal alert",
    "best deal", "coupon", "prime day", "black friday", "cyber monday",
    "unboxing", "buying guide", "which laptop", "best laptops", "best gpus",
    "gaming pc build", "review:", "hands-on",
]

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

TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")
URL_ONLY_RE = re.compile(r"^https?://\S+$")


def clean_summary(raw: str) -> str:
    """Strip HTML and collapse whitespace so junk markup never reaches the UI."""
    text = TAG_RE.sub(" ", raw)
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text


def is_relevant(text: str) -> bool:
    text = text.lower()
    if any(n in text for n in NOISE_KEYWORDS):
        return False
    return any(k in text for k in INDUSTRY_KEYWORDS)


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
            summary = clean_summary(entry.get("summary", ""))
            link = entry.get("link", "")
            if not title or not link:
                continue

            combined_text = f"{title} {summary}"
            if not is_relevant(combined_text):
                continue
            if len(summary) < MIN_SUMMARY_CHARS or URL_ONLY_RE.match(summary):
                # No usable summary — skip rather than show a bare link or junk
                continue

            published = entry.get("published_parsed") or entry.get("updated_parsed")
            date = (
                datetime(*published[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
                if published
                else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            )
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

    # Re-check previously stored articles against the current relevance
    # rules too, so already-committed noise gets cleaned out over time
    # instead of sitting in the dataset until it ages past MAX_ARTICLES.
    still_valid_existing = [
        a for a in existing.get("articles", [])
        if is_relevant(f"{a['title']} {a.get('summary', '')}")
        and len(a.get("summary", "")) >= MIN_SUMMARY_CHARS
    ]

    seen_ids = set()
    merged = []
    for article in fetched + still_valid_existing:
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
