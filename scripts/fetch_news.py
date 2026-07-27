"""
Pulls semiconductor-related articles from a set of public RSS feeds,
tags each one by category and company, de-duplicates against the
existing dataset, and writes the result to public/data/news.json.

Run manually with:  python scripts/fetch_news.py
Runs automatically via .github/workflows/update-data.yml
"""
import hashlib
import html
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import feedparser

OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "news.json"
# Retention is time-based, not count-based: keep everything from the last
# RETENTION_DAYS days (7 for the Analysis page's window + 7 for its
# prior-period comparison — no extra buffer). A fixed article count gets hit
# almost immediately at this feed's real volume (~20-40 qualifying
# articles/day), which pins the dataset's depth to just 1-2 days no matter
# how long the pipeline runs — that's not enough history for a real
# week-over-week comparison. MAX_ARTICLES_CAP is a runaway-growth ceiling
# for an unexpected volume spike. Note it's still lower than 14 days' worth
# at today's volume (14 * 20-40/day = 280-560), so at current volume it will
# typically be the binding constraint, trimming back to the newest 200 —
# roughly 5-10 days of depth in practice, an improvement over the old
# 1-2 days even if short of the full 14. Raise this if actual depth turns
# out to matter more than dataset size.
RETENTION_DAYS = 14
MAX_ARTICLES_CAP = 200
MIN_SUMMARY_CHARS = 60  # below this, a "summary" is too thin to be useful
SUMMARY_MAX_CHARS = 420  # roughly 2-3 sentences — enough to be informative without a wall of text

# Add or remove feeds here. Any publication with an RSS feed works.
# Besides the general-interest feeds, we run a few category-targeted Google
# News searches so Policy/M&A/EDA/Supply Chain/Chip Design actually have
# source material to pull from — without these, almost everything the
# general feeds return is generic "semiconductor" business/investor
# coverage that falls into Fabrication by default.
FEEDS = {
    "SemiEngineering": "https://semiengineering.com/feed/",
    "EE Times": "https://www.eetimes.com/feed/",
    "IEEE Spectrum": "https://spectrum.ieee.org/feeds/topic/semiconductors.rss",
    "Tom's Hardware": "https://www.tomshardware.com/feeds/all",
    "Google News - Semiconductors": (
        "https://news.google.com/rss/search?q=semiconductor+OR+chipmaking+OR+foundry"
        "+when:2d&hl=en-US&gl=US&ceid=US:en"
    ),
    "Google News - Chip Policy": (
        "https://news.google.com/rss/search?q=%22chips+act%22+OR+%22export+control%22"
        "+OR+%22chip+export%22+OR+%22semiconductor+sanctions%22+OR+%22semiconductor+tariff%22"
        "+when:4d&hl=en-US&gl=US&ceid=US:en"
    ),
    "Google News - Chip M&A": (
        "https://news.google.com/rss/search?q=%22chipmaker+acquisition%22+OR+%22chip+merger%22"
        "+OR+%22acquires+chipmaker%22+OR+%22semiconductor+merger%22+OR+%22chip+acquisition%22"
        "+when:4d&hl=en-US&gl=US&ceid=US:en"
    ),
    "Google News - EDA & Chip Design": (
        "https://news.google.com/rss/search?q=%22chip+design%22+OR+%22chip+architecture%22"
        "+OR+chiplet+OR+%22eda+software%22+OR+synopsys+OR+cadence+OR+%22ai+accelerator%22"
        "+when:4d&hl=en-US&gl=US&ceid=US:en"
    ),
    "Google News - Chip Supply Chain": (
        "https://news.google.com/rss/search?q=%22chip+supply+chain%22+OR+%22chip+shortage%22"
        "+OR+%22packaging+capacity%22+OR+%22memory+shortage%22+OR+%22hbm+supply%22"
        "+when:4d&hl=en-US&gl=US&ceid=US:en"
    ),
}

# An article must contain at least one of these to be considered
# semiconductor-industry news at all. This is what keeps consumer PC-build,
# gaming-deal, and "which laptop should I buy" posts out of the feed, even
# when they happen to mention a chip company by name.
INDUSTRY_KEYWORDS = [
    # Fabrication / manufacturing
    "semiconductor", "chipmaker", "chip maker", "foundry", "fab ", "fabs ",
    "wafer", "process node", "nanometer", "nm process", "euv", "lithography",
    "yield", "die shrink", "transistor", "gate-all-around", "finfet",
    "fab expansion", "silicon wafer",
    # Chip design
    "chip design", "chip architecture", "processor architecture",
    "gpu architecture", "cpu architecture", "soc design", "chiplet",
    "accelerator chip", "ai chip", "ai accelerator", "data center chip",
    "silicon design", "compute subsystem", "ic design",
    # Supply chain
    "chip supply", "chip shortage", "semiconductor supply", "wafer supply",
    "packaging capacity", "cowos", "hbm", "memory chip", "dram", "nand flash",
    # Policy / trade
    "export control", "chips act", "chip sanctions", "semiconductor sanctions",
    "chip export", "semiconductor export", "trade restriction", "chip tariff",
    "export restriction",
    # M&A
    "chipmaker acquisition", "acquires chipmaker", "chip acquisition",
    "semiconductor merger", "chip merger",
    # EDA
    "eda tool", "eda software", "chip verification", "verification software",
    "tape-out", "tape out",
    # Capex / financials specific to the industry
    "capex",
]

# If any of these show up, the article is almost certainly a consumer deal,
# giveaway, or review rather than industry news — drop it even if an
# industry keyword also matched.
NOISE_KEYWORDS = [
    "giveaway", "sweepstakes", "leaving a comment", "% off", "deal alert",
    "best deal", "coupon", "prime day", "black friday", "cyber monday",
    "unboxing", "buying guide", "which laptop", "best laptops", "best gpus",
    "gaming pc build", "review:", "hands-on",
    # Automated stock-trading / analyst-note filler. Google News' general
    # semiconductor search is flooded with these — they're not industry
    # news, they're routine 13F filing recaps, and they crowd out real
    # articles while all landing in the Fabrication default bucket.
    "shares of", "grows holdings", "holdings in", "trims holdings",
    "sells shares", "buys shares", "raised its stake", "boosts stake",
    "revenue breakdown", "price to book", "price to sales", "forward of",
    "enterprise value to ebitda", "consensus rating", "price target",
    "buy rating", "sell rating", "hold rating", "given a rating",
    "shares sold by", "shares acquired by", "position raised by",
    "position trimmed by", "stock position", "13f filing", "etf",
]

# Keyword -> category. Checked against title + summary, first match wins.
CATEGORY_KEYWORDS = {
    "Policy": [
        "export control", "commerce department", "tariff", "sanction", "chips act",
        "regulation", "entity list", "trade war", "trade restriction",
        "export restriction", "national security", "white house", "biden administration",
        "trump administration", "washington", "beijing", "subsidy", "subsidies",
    ],
    "M&A": [
        "acquisition", "acquire", "acquires", "acquired", "merger", "buyout",
        "deal to buy", "takeover", "to buy", "stake in", "joint venture",
        "strategic collaboration", "strategic partnership",
    ],
    "EDA": [
        "eda", "cadence", "synopsys", "verification software", "design software",
        "electronic design automation", "simulation software", "chip verification",
    ],
    "Supply Chain": [
        "supply chain", "shortage", "capacity", "hbm", "memory demand",
        "packaging capacity", "supply constraint", "lead time", "raw material",
        "dram", "nand flash", "memory chip", "wafer supply",
    ],
    "Chip Design": [
        "architecture", "chiplet", "gpu", "accelerator", "processor design", "soc",
        "ai chip", "ai accelerator", "custom silicon", "npu", "asic",
        "chip design", "chip architecture", "next-gen chip", "unveils chip",
        "launches chip", "new chip",
    ],
    "Fabrication": [
        "fab", "foundry", "euv", "lithography", "yield", "nm process", "wafer",
        "gate-all-around", "finfet", "chip factory", "fab construction",
        "chip plant", "manufacturing facility", "fab expansion",
    ],
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
    """Strip HTML and decode entities so junk markup never reaches the UI."""
    text = html.unescape(raw)
    text = TAG_RE.sub(" ", text)
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text


def truncate_summary(text: str, limit: int = SUMMARY_MAX_CHARS) -> str:
    """Trim to a sentence boundary where possible, otherwise a word boundary,
    so summaries never end mid-word with an abrupt cut."""
    if len(text) <= limit:
        return text
    clipped = text[:limit]
    last_period = clipped.rfind(". ")
    if last_period > limit * 0.4:  # only use it if it doesn't cut too much away
        return clipped[: last_period + 1]
    last_space = clipped.rfind(" ")
    return (clipped[:last_space] if last_space > 0 else clipped).rstrip(",;: ") + "…"


def has_real_content(title: str, summary: str) -> bool:
    """
    Some aggregators (Google News in particular) don't provide a real
    summary at all — their "summary" field is just the title repeated,
    followed by the source name. Strip the title back out and check
    whether anything substantive is actually left.
    """
    t = title.strip().lower()
    s = summary.strip().lower()
    if s.startswith(t):
        s = s[len(t):]
    remainder = s.strip(" -\u2013\u2014|.")
    return len(remainder) >= MIN_SUMMARY_CHARS


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
            if not has_real_content(title, summary) or URL_ONLY_RE.match(summary):
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
                    "summary": truncate_summary(summary),
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
    # instead of sitting in the dataset until it ages out of retention.
    still_valid_existing = [
        a for a in existing.get("articles", [])
        if is_relevant(f"{a['title']} {a.get('summary', '')}")
        and has_real_content(a["title"], a.get("summary", ""))
    ]

    seen_ids = set()
    merged = []
    for article in fetched + still_valid_existing:
        if article["id"] in seen_ids:
            continue
        seen_ids.add(article["id"])
        merged.append(article)

    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).strftime("%Y-%m-%d")
    merged = [a for a in merged if a["date"] >= cutoff]

    merged.sort(key=lambda a: a["date"], reverse=True)
    merged = merged[:MAX_ARTICLES_CAP]

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