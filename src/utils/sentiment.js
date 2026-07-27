// Lightweight keyword-based sentiment estimate, computed client-side so the
// Analysis page can score any date window on the fly. Mirrors the word
// lists in scripts/build_digest.py — keep both in sync if either changes.
export const POSITIVE_WORDS = ['growth', 'record', 'expand', 'milestone', 'strong', 'gain', 'accelerate', 'win', 'ramp']
export const NEGATIVE_WORDS = ['shortage', 'delay', 'cut', 'restrict', 'ban', 'decline', 'weak', 'concern', 'constraint']

export function scoreText(text) {
  const lower = text.toLowerCase()
  let score = 0
  POSITIVE_WORDS.forEach((w) => { if (lower.includes(w)) score += 1 })
  NEGATIVE_WORDS.forEach((w) => { if (lower.includes(w)) score -= 1 })
  return score
}

// Average sentiment across a set of articles, rounded to 2dp. Returns null
// for an empty set rather than 0, so callers can distinguish "no coverage"
// from "genuinely neutral coverage".
export function averageSentiment(articles) {
  if (!articles.length) return null
  const total = articles.reduce((sum, a) => sum + scoreText(`${a.title} ${a.summary}`), 0)
  return Math.round((total / articles.length) * 100) / 100
}
