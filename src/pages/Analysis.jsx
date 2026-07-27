import { useState } from 'react'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Line, Legend, Cell, ReferenceLine,
} from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, SkeletonCard, ErrorState } from '../components/ui.jsx'
import { averageSentiment } from '../utils/sentiment.js'

const CATEGORIES = ['Fabrication', 'Chip Design', 'Supply Chain', 'Policy', 'EDA', 'M&A']
const CATEGORY_COLORS = {
  Fabrication: '#C4753A',
  'Chip Design': '#5B8FA8',
  'Supply Chain': '#6FA97A',
  Policy: '#C4574A',
  EDA: '#8B9296',
  'M&A': '#E0975A',
}

// "Yesterday" is a single specific day, excluded from "today"; the other
// two are rolling windows that include today. offset = how many days back
// the window starts, days = how many days it spans.
const RANGE_OPTIONS = [
  { key: 'yesterday', label: 'Yesterday', days: 1, offset: 1 },
  { key: '3d', label: 'Past 3 Days', days: 3, offset: 0 },
  { key: '7d', label: 'Past 7 Days', days: 7, offset: 0 },
]

const MS_PER_DAY = 86400000

function daysAgo(dateStr) {
  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((todayUTC - Date.parse(`${dateStr}T00:00:00Z`)) / MS_PER_DAY)
}

function dateNDaysAgo(n) {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n))
  return d.toISOString().slice(0, 10)
}

function formatShortDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function inWindow(article, offset, days) {
  if (days <= 0) return false
  const age = daysAgo(article.date)
  return age >= offset && age < offset + days
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}

function countBy(articles, getKeys) {
  const counts = {}
  articles.forEach((a) => {
    const keys = getKeys(a)
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k) => {
      counts[k] = (counts[k] || 0) + 1
    })
  })
  return counts
}

// Percentage change; null means "no prior baseline" (can't express as a %).
function pctChange(current, prior) {
  if (prior === 0) return current === 0 ? 0 : null
  return ((current - prior) / prior) * 100
}

// Compact badge text, e.g. "+20%", "new", "±0%" — for inline lists.
function deltaLabel(current, prior) {
  const pct = pctChange(current, prior)
  if (pct === null) return 'new'
  if (pct === 0) return '±0%'
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
}

// Fuller narrative phrasing for the observation bullets.
function describeChange(current, prior) {
  const pct = pctChange(current, prior)
  if (pct === null) return `new this period (${current} vs. 0 prior)`
  if (current === prior) return `unchanged at ${current}`
  return `${pct > 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% (${prior} → ${current})`
}

export default function Analysis() {
  const { data: newsData, loading: newsLoading, error: newsError } = useJsonData('data/news.json')
  const { data: digestData, loading: digestLoading, error: digestError } = useJsonData('data/digest.json')
  const [rangeKey, setRangeKey] = useState('7d')

  if (newsLoading || digestLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }
  if (newsError || digestError) return <ErrorState />

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey)
  const articles = newsData.articles

  const currentArticles = articles.filter((a) => inWindow(a, range.offset, range.days))

  // The prior comparison window is adaptive: rather than requiring a full
  // match (e.g. exactly 7 prior days) and falling back to "no data" when
  // the dataset doesn't reach back that far, compare against however much
  // prior history actually exists, up to the same length as the selected
  // range. A real comparison against a shorter window is more useful than
  // no comparison at all — the "not enough history" fallback is reserved
  // for when there's genuinely less than ~2 days of prior data to compare
  // against at all.
  //
  // The 2-day threshold is checked against the UNCAPPED depth of history
  // before this window, not the range-capped value — for a 1-day range
  // like "Yesterday", the comparison window itself is always capped at 1
  // day, which would otherwise make the threshold impossible to clear
  // regardless of how much real history exists. The range.days cap is only
  // applied afterward, to size the actual comparison window.
  const priorWindowStart = range.offset + range.days
  const oldestDaysAgo = articles.length ? Math.max(...articles.map((a) => daysAgo(a.date))) : -1
  const rawPriorDepth = oldestDaysAgo - priorWindowStart + 1
  const hasPriorBaseline = rawPriorDepth >= 2
  const availablePriorDays = clamp(rawPriorDepth, 0, range.days)
  const priorLabel = `${availablePriorDays} day${availablePriorDays === 1 ? '' : 's'}`

  const priorArticles = hasPriorBaseline ? articles.filter((a) => inWindow(a, priorWindowStart, availablePriorDays)) : []

  const categoryCounts = countBy(currentArticles, (a) => a.category)
  const priorCategoryCounts = countBy(priorArticles, (a) => a.category)
  const companyCounts = countBy(currentArticles, (a) => a.companies)
  const priorCompanyCounts = countBy(priorArticles, (a) => a.companies)

  const currentAvgSentiment = averageSentiment(currentArticles)
  const priorAvgSentiment = averageSentiment(priorArticles)

  // Day-by-day volume (stacked by category) + sentiment, oldest to newest.
  const dailyBreakdown = []
  for (let n = range.offset + range.days - 1; n >= range.offset; n--) {
    const dateStr = dateNDaysAgo(n)
    const dayArticles = articles.filter((a) => a.date === dateStr)
    const row = { date: dateStr, label: formatShortDate(dateStr), count: dayArticles.length }
    CATEGORIES.forEach((cat) => { row[cat] = dayArticles.filter((a) => a.category === cat).length })
    row.sentiment = averageSentiment(dayArticles) ?? 0
    dailyBreakdown.push(row)
  }

  const sentimentByCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      score: averageSentiment(currentArticles.filter((a) => a.category === category)) ?? 0,
    }))

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([company, count]) => ({ company, count, prior: priorCompanyCounts[company] || 0 }))

  // --- Key observations: 3-4 dynamic bullets, each citing a real number ---
  const observations = []

  if (!hasPriorBaseline) {
    observations.push(
      `Less than 2 days of history exist before this period, so there's not enough prior data yet for a meaningful comparison — these figures describe this period on its own.`
    )
  } else {
    const categoryDeltas = Object.keys({ ...categoryCounts, ...priorCategoryCounts })
      .map((cat) => ({ cat, current: categoryCounts[cat] || 0, prior: priorCategoryCounts[cat] || 0 }))
      .map((d) => ({ ...d, delta: d.current - d.prior }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    if (categoryDeltas[0] && categoryDeltas[0].delta !== 0) {
      const m = categoryDeltas[0]
      observations.push(`${m.cat} coverage is ${describeChange(m.current, m.prior)} articles vs. the previous ${priorLabel}.`)
    }

    const companyDeltas = Object.keys({ ...companyCounts, ...priorCompanyCounts })
      .map((co) => ({ co, current: companyCounts[co] || 0, prior: priorCompanyCounts[co] || 0 }))
      .map((d) => ({ ...d, delta: d.current - d.prior }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    if (companyDeltas[0] && companyDeltas[0].delta !== 0) {
      const m = companyDeltas[0]
      observations.push(`${m.co} mentions are ${describeChange(m.current, m.prior)} vs. the previous ${priorLabel}.`)
    }
  }

  if (currentAvgSentiment != null) {
    if (hasPriorBaseline && priorAvgSentiment != null) {
      const delta = Math.round((currentAvgSentiment - priorAvgSentiment) * 100) / 100
      observations.push(
        Math.abs(delta) >= 0.05
          ? `Overall sentiment ${delta > 0 ? 'improved' : 'declined'} to ${currentAvgSentiment.toFixed(2)} from ${priorAvgSentiment.toFixed(2)} (${delta > 0 ? '+' : ''}${delta.toFixed(2)}) vs. the previous ${priorLabel}.`
          : `Sentiment held roughly steady at ${currentAvgSentiment.toFixed(2)}, little changed from ${priorAvgSentiment.toFixed(2)} over the previous ${priorLabel}.`
      )
    } else {
      observations.push(`Sentiment across this period averages ${currentAvgSentiment.toFixed(2)} over ${currentArticles.length} article${currentArticles.length === 1 ? '' : 's'}.`)
    }
  }

  if (range.days > 1) {
    const activeDays = dailyBreakdown.filter((d) => d.count > 0)
    if (activeDays.length > 1) {
      const avg = activeDays.reduce((s, d) => s + d.sentiment, 0) / activeDays.length
      const worst = activeDays.reduce((w, d) => (d.sentiment < w.sentiment ? d : w), activeDays[0])
      if (worst.sentiment <= avg - 0.4 || worst.sentiment <= -0.3) {
        observations.push(`Sentiment dipped on ${worst.label} (score ${worst.sentiment.toFixed(2)}), the low point of this window.`)
      }
    }
  }

  if (observations.length < 3 && sentimentByCategory[0]) {
    const lead = sentimentByCategory[0]
    observations.push(`${lead.category} led coverage this period with ${lead.count} article${lead.count === 1 ? '' : 's'} (sentiment ${lead.score.toFixed(2)}).`)
  }

  const displayedObservations = observations.length > 0 ? observations.slice(0, 4) : ['No articles were published in this window.']

  const tooltipStyle = { background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }
  const deltaClass = (current, prior) => {
    const pct = pctChange(current, prior)
    return pct == null || pct === 0 ? '' : pct > 0 ? 'text-positive' : 'text-negative'
  }

  return (
    <div className="space-y-10 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Analysis & Insights</h1>
          <p className="text-muted text-sm mt-1">
            A synthesis of the raw news feed — what's actually moving, not just what's published.
          </p>
        </div>
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors ${
                rangeKey === r.key
                  ? 'bg-copper/15 border-copper text-copper-bright'
                  : 'bg-surface border-border text-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <SectionLabel>Weekly Summary</SectionLabel>
        <p className="text-sm leading-relaxed text-ink/90">{digestData.weekly_summary}</p>
      </Card>

      <Card className="p-5 border-copper/30 bg-copper/5">
        <SectionLabel>Key Observations — {range.label}</SectionLabel>
        <ul className="space-y-2 text-sm leading-relaxed text-ink/90 list-disc pl-4">
          {displayedObservations.map((obs, i) => (
            <li key={i}>{obs}</li>
          ))}
        </ul>
      </Card>

      <section>
        <SectionLabel>Day-by-Day Coverage & Sentiment — {range.label}</SectionLabel>
        <Card className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyBreakdown}>
                <XAxis dataKey="label" tick={{ fill: '#8B9296', fontSize: 11 }} axisLine={{ stroke: '#2A3338' }} tickLine={false} />
                <YAxis yAxisId="count" hide />
                <YAxis yAxisId="sentiment" orientation="right" hide domain={[-1, 1]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => (name === 'sentiment' ? [Number(value).toFixed(2), 'sentiment'] : [value, name])}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
                {CATEGORIES.map((cat) => (
                  <Bar key={cat} yAxisId="count" dataKey={cat} stackId="vol" fill={CATEGORY_COLORS[cat]} isAnimationActive={false} />
                ))}
                <Line yAxisId="sentiment" type="monotone" dataKey="sentiment" name="sentiment" stroke="#E8E6E1" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Bars show article volume per day, stacked by category (left axis) — so a spike is traceable to a specific
            day and category. The line shows that day's average sentiment score, −1 to +1 (right axis).
          </p>
        </Card>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <SectionLabel>Sentiment by Category — {range.label}</SectionLabel>
          <Card className="p-4">
            {sentimentByCategory.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No articles in this window.</p>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentByCategory} margin={{ top: 8 }}>
                      <XAxis dataKey="category" tick={{ fill: '#8B9296', fontSize: 10 }} axisLine={{ stroke: '#2A3338' }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                      <YAxis hide domain={[-1, 1]} />
                      <ReferenceLine y={0} stroke="#2A3338" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, _n, item) => [`score ${v} · ${item.payload.count} articles`, item.payload.category]}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="score" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                        {sentimentByCategory.map((entry) => (
                          <Cell key={entry.category} fill={entry.score >= 0 ? '#6FA97A' : '#C4574A'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {sentimentByCategory.map((c) => {
                    const prior = priorCategoryCounts[c.category] || 0
                    return (
                      <div key={c.category} className="flex justify-between text-xs font-mono text-muted">
                        <span>{c.category}</span>
                        <span>
                          {c.count} article{c.count === 1 ? '' : 's'}
                          {hasPriorBaseline && <span className={deltaClass(c.count, prior)}> · {deltaLabel(c.count, prior)}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {hasPriorBaseline && (
                  <p className="text-[11px] font-mono text-muted mt-2">Δ vs. previous {priorLabel}</p>
                )}
              </>
            )}
            <p className="text-xs text-muted mt-3 leading-relaxed">
              Same keyword-based sentiment estimate, broken out per category for {range.label.toLowerCase()} — this is
              where an aggregate score hides the real spread.
            </p>
          </Card>
        </section>

        <section>
          <SectionLabel>Most-Mentioned Companies — {range.label}</SectionLabel>
          <Card className="p-4">
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No company mentions in this window.</p>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompanies}>
                      <XAxis dataKey="company" tick={{ fill: '#8B9296', fontSize: 10 }} axisLine={{ stroke: '#2A3338' }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, _n, item) => [
                          hasPriorBaseline ? `${v} mentions (${deltaLabel(v, item.payload.prior)} vs. previous ${priorLabel})` : `${v} mentions`,
                          item.payload.company,
                        ]}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="count" fill="#C4753A" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {topCompanies.map((c) => (
                    <div key={c.company} className="flex justify-between text-xs font-mono text-muted">
                      <span>{c.company}</span>
                      <span>
                        {c.count} mention{c.count === 1 ? '' : 's'}
                        {hasPriorBaseline && <span className={deltaClass(c.count, c.prior)}> · {deltaLabel(c.count, c.prior)}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                {hasPriorBaseline && (
                  <p className="text-[11px] font-mono text-muted mt-2">Δ vs. previous {priorLabel}</p>
                )}
              </>
            )}
          </Card>
        </section>
      </div>

      <section>
        <SectionLabel>Methodology</SectionLabel>
        <Card className="p-5">
          <ul className="text-sm text-muted space-y-2 leading-relaxed list-disc pl-4">
            <li>All figures on this page — category counts, company mentions, sentiment, and the day-by-day chart — are computed client-side from the currently-loaded news feed for whichever range is selected above, so the whole page stays scoped to one consistent window.</li>
            <li>Period-over-period changes compare the selected window against however much prior history actually exists, up to the same length (e.g. up to 7 prior days for a 7-day selection) — the comparison is always labeled with the real number of days used rather than assuming a full match. When less than 2 days of prior history exist at all, that's called out explicitly instead of shown as a comparison.</li>
            <li>Company mentions count how often each company appears in an article's tag list, not full-text mentions.</li>
            <li>Sentiment is a lightweight keyword-weighted estimate over headlines and summaries — intended as a directional signal, not a precise measure. The per-category and per-day breakdowns use the same method, scoped to that slice of articles.</li>
            <li>The weekly summary above is generated by the scheduled pipeline independent of the range selector; see the About page for the full pipeline.</li>
          </ul>
        </Card>
      </section>
    </div>
  )
}
