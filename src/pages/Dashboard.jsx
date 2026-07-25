import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, CategoryTag, LoadingState, ErrorState } from '../components/ui.jsx'

export default function Dashboard() {
  const { data: newsData, loading: newsLoading, error: newsError } = useJsonData('data/news.json')
  const { data: companyData, loading: companyLoading } = useJsonData('data/companies.json')
  const { data: digestData, loading: digestLoading } = useJsonData('data/digest.json')

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Semiconductor industry, at a glance
        </h1>
        <p className="text-muted mt-1.5 text-sm">
          Aggregated news, company movement, and process-node trends — updated automatically.
        </p>
      </div>

      {/* Key metric strip */}
      <section>
        <SectionLabel>Movers — last 30 days</SectionLabel>
        {companyLoading ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {companyData.companies.slice(0, 4).map((c) => (
              <Card key={c.ticker} className="p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs text-muted">{c.ticker}</span>
                  <span
                    className={`font-mono text-xs ${
                      c.change30d >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {c.change30d >= 0 ? '+' : ''}
                    {c.change30d}%
                  </span>
                </div>
                <div className="font-display text-lg mt-1">{c.name}</div>
                <Sparkline points={c.priceHistory} positive={c.change30d >= 0} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Headlines */}
        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Latest headlines</SectionLabel>
            <Link to="/news" className="text-xs font-mono text-copper-bright hover:underline">
              view all →
            </Link>
          </div>
          {newsLoading && <LoadingState />}
          {newsError && <ErrorState />}
          {newsData && (
            <div className="space-y-2.5">
              {newsData.articles.slice(0, 6).map((a) => (
                <Card key={a.id} className="p-4 hover:border-copper/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-sm leading-snug">{a.title}</h3>
                      <p className="text-muted text-xs mt-1.5 font-mono">
                        {a.source} · {a.date}
                      </p>
                    </div>
                    <CategoryTag category={a.category} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Trending topics */}
        <section>
          <SectionLabel>Coverage by category (7d)</SectionLabel>
          {digestLoading ? (
            <LoadingState />
          ) : (
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={digestData.category_counts} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <Tooltip
                    contentStyle={{
                      background: '#1E262B',
                      border: '1px solid #2A3338',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#E8E6E1' }}
                  />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {digestData.category_counts.map((entry, i) => (
                      <Cell key={entry.category} fill={i === 0 ? '#C4753A' : '#5B8FA8'} fillOpacity={i === 0 ? 1 : 0.55} />
                    ))}
                  </Bar>
                  <text />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 -mt-2">
                {digestData.category_counts.map((c) => (
                  <div key={c.category} className="flex justify-between text-xs font-mono text-muted">
                    <span>{c.category}</span>
                    <span>{c.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="mt-6">
            <SectionLabel>This week's read</SectionLabel>
            <Card className="p-4">
              {digestLoading ? (
                <LoadingState />
              ) : (
                <p className="text-sm text-muted leading-relaxed">
                  {digestData.weekly_summary.split('. ').slice(0, 2).join('. ')}.
                </p>
              )}
              <Link to="/analysis" className="text-xs font-mono text-copper-bright hover:underline mt-3 inline-block">
                full analysis →
              </Link>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

function Sparkline({ points, positive }) {
  const w = 100
  const h = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = w / (points.length - 1)
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-2" preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke={positive ? '#6FA97A' : '#C4574A'}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
