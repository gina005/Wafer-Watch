"""
Reads public/data/news.json and derives the summary stats shown on the
Analysis tab: category counts, company mention counts, a lightweight
sentiment estimate, and a short weekly summary.

Run manually with:  python scripts/build_digest.py
Runs automatically via .github/workflows/update-data.yml, after fetch_news.py
"""
import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
NEWS_PATH = DATA_DIR / "news.json"
DIGEST_PATH = DATA_DIR / "digest.json"

POSITIVE_WORDS = ["growth", "record", "expand", "milestone", "strong", "gain", "accelerate", "win", "ramp"]
NEGATIVE_WORDS = ["shortage", "delay", "cut", "restrict", "ban", "decline", "weak", "concern", "constraint"]


def week_articles(articles, days=7):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = []
    for a in articles:
        try:
            d = datetime.strptime(a["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if d >= cutoff:
            result.append(a)
    return result


def sentiment_score(text: str) -> int:
    text = text.lower()
    return sum(w in text for w in POSITIVE_WORDS) - sum(w in text for w in NEGATIVE_WORDS)


def main():
    news = json.loads(NEWS_PATH.read_text())
    articles = news.get("articles", [])
    recent = week_articles(articles)

    category_counts = Counter(a["category"] for a in recent)
    company_counts = Counter(c for a in recent for c in a["companies"])

    total_sentiment = sum(sentiment_score(f"{a['title']} {a['summary']}") for a in recent)
    avg_sentiment = round(total_sentiment / max(len(recent), 1), 2)

    top_categories = [{"category": c, "count": n} for c, n in category_counts.most_common(6)]
    top_companies = [{"company": c, "count": n} for c, n in company_counts.most_common(7)]

    # Per-category sentiment breakdown, so the Analysis page can show where
    # positive/negative coverage is actually concentrated instead of just
    # one aggregate number.
    sentiment_by_category = []
    for category, count in category_counts.most_common():
        cat_articles = [a for a in recent if a["category"] == category]
        cat_total = sum(sentiment_score(f"{a['title']} {a['summary']}") for a in cat_articles)
        sentiment_by_category.append(
            {"category": category, "score": round(cat_total / max(len(cat_articles), 1), 2), "count": count}
        )

    # Simple templated summary; swap in an LLM API call here for richer prose
    # if you want to add that as a v2 feature.
    if top_categories:
        lead_category = top_categories[0]["category"]
        lead_companies = ", ".join(c["company"] for c in top_companies[:3]) or "the usual major players"
        summary = (
            f"This week's coverage skewed toward {lead_category.lower()} news, with {lead_companies} "
            f"appearing most frequently across {len(recent)} tracked articles."
        )
    else:
        summary = "Not enough recent articles to summarize this week."

    existing_trend = []
    if DIGEST_PATH.exists():
        existing_trend = json.loads(DIGEST_PATH.read_text()).get("sentiment_trend", [])[-3:]

    week_label = datetime.now(timezone.utc).strftime("%b %d")
    sentiment_trend = existing_trend + [{"week": week_label, "score": avg_sentiment}]

    DIGEST_PATH.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "note": "Live data from scripts/build_digest.py",
                "weekly_summary": summary,
                "category_counts": top_categories,
                "company_mentions": top_companies,
                "sentiment_trend": sentiment_trend,
                "sentiment_by_category": sentiment_by_category,
            },
            indent=2,
        )
    )
    print(f"Wrote digest to {DIGEST_PATH}")


if __name__ == "__main__":
    main()
