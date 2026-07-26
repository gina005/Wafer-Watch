import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, SkeletonCard, ErrorState } from '../components/ui.jsx'

export default function Analysis() {
  const { data, loading, error } = useJsonData('data/digest.json')

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={3} />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }
  if (error) return <ErrorState />

  const topCategory = data.category_counts[0]
  const topCompany = data.company_mentions[0]
  const latestSentiment = data.sentiment_trend[data.sentiment_trend.length - 1]
  const sentimentLabel =
    latestSentiment.score > 0.15 ? 'cautiously positive' : latestSentiment.score < -0.15 ? 'cautiously negative' : 'broadly neutral'

  return (
    <div className="space-y-10 fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analysis & Insights</h1>
        <p className="text-muted text-sm mt-1">
          A weekly synthesis of the raw news feed — what's actually moving, not just what's published.
        </p>
      </div>

      <Card className="p-5">
        <SectionLabel>Weekly Summary</SectionLabel>
        <p className="text-sm leading-relaxed text-ink/90">{data.weekly_summary}</p>
      </Card>

      {topCategory && topCompany && (
        <Card className="p-5 border-copper/30 bg-copper/5">
          <SectionLabel>Key Insight</SectionLabel>
          <p className="text-sm leading-relaxed text-ink/90">
            <span className="text-copper-bright font-medium">{topCategory.category}</span> was the most
            active category this week ({topCategory.count} articles), with{' '}
            <span className="text-silicon font-medium">{topCompany.company}</span> the most-mentioned
            company ({topCompany.count} mentions). Overall coverage sentiment reads as{' '}
            <span className="font-medium">{sentimentLabel}</span>, based on the keyword estimate below.
          </p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <SectionLabel>Coverage Sentiment Trend</SectionLabel>
          <Card className="p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.sentiment_trend}>
                  <XAxis dataKey="week" tick={{ fill: '#8B9296', fontSize: 11 }} axisLine={{ stroke: '#2A3338' }} tickLine={false} />
                  <YAxis hide domain={[-0.5, 0.5]} />
                  <Tooltip
                    contentStyle={{ background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#6FA97A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Score is a simple −1 to +1 keyword-based sentiment estimate over that week's headlines and summaries — a rough signal, not a market indicator.
            </p>
          </Card>
        </section>

        <section>
          <SectionLabel>Most-Mentioned Companies (7d)</SectionLabel>
          <Card className="p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.company_mentions}>
                  <XAxis dataKey="company" tick={{ fill: '#8B9296', fontSize: 10 }} axisLine={{ stroke: '#2A3338' }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#C4753A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      </div>

      <section>
        <SectionLabel>Methodology</SectionLabel>
        <Card className="p-5">
          <ul className="text-sm text-muted space-y-2 leading-relaxed list-disc pl-4">
            <li>Category counts are tag frequencies across the past 7 days of ingested articles.</li>
            <li>Company mentions count how often each company appears in an article's tag list, not full-text mentions.</li>
            <li>Sentiment is a lightweight keyword-weighted estimate over headlines and summaries — intended as a directional signal, not a precise measure.</li>
            <li>The weekly summary is generated from that week's ingested articles; see the About page for the full pipeline.</li>
          </ul>
        </Card>
      </section>
    </div>
  )
}