import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, LoadingState, ErrorState } from '../components/ui.jsx'

export default function Analysis() {
  const { data, loading, error } = useJsonData('data/digest.json')

  if (loading) return <LoadingState />
  if (error) return <ErrorState />

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analysis & insights</h1>
        <p className="text-muted text-sm mt-1">
          A weekly synthesis of the raw news feed — what's actually moving, not just what's published.
        </p>
      </div>

      <Card className="p-5">
        <SectionLabel>Week of Jul 20 — summary</SectionLabel>
        <p className="text-sm leading-relaxed text-ink/90">{data.weekly_summary}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <SectionLabel>Coverage sentiment trend</SectionLabel>
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
          <SectionLabel>Most-mentioned companies (7d)</SectionLabel>
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
