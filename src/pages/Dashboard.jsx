import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, CategoryTag, SkeletonCard, SkeletonList, ErrorState } from '../components/ui.jsx'

export default function Dashboard() {
  const { data: newsData, loading: newsLoading, error: newsError } = useJsonData('data/news.json')
  const { data: companyData, loading: companyLoading } = useJsonData('data/companies.json')
  const { data: digestData, loading: digestLoading } = useJsonData('data/digest.json')

  const topCategory = digestData?.category_counts?.[0]
  const topCompany = digestData?.company_mentions?.[0]
  const gainers = companyData?.companies?.filter((c) => c.change30d >= 0).length

  return (
    <div className="space-y-10 fade-in">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Semiconductor Industry, at a Glance
        </h1>
        <p className="text-muted mt-1.5 text-sm">
          Aggregated news, company movement, and process-node trends — updated automatically.
        </p>
      </div>

      {/* This week's snapshot — a quick, scannable insight strip above the raw feed */}
      <section>
        <SectionLabel>This Week's Snapshot</SectionLabel>
        {digestLoading || companyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 fade-in-stagger">
            <Card className="p-4">
              <p className="text-xs font-mono text-muted">Leading category</p>
              <p className="font-display text-lg mt-1">{topCategory?.category ?? '—'}</p>
              <p className="text-xs text-muted mt-0.5">{topCategory?.count ?? 0} articles this week</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-mono text-muted">Most active company</p>
              <p className="font-display text-lg mt-1">{topCompany?.company ?? '—'}</p>
              <p className="text-xs text-muted mt-0.5">{topCompany?.count ?? 0} mentions this week</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-mono text-muted">Tracked companies up</p>
              <p className="font-display text-lg mt-1">{gainers ?? 0} of {companyData?.companies?.length ?? 0}</p>
              <p className="text-xs text-muted mt-0.5">over the last 30 days</p>
            </Card>
          </div>
        )}
      </section>

      {/* Key metric strip */}
      <section>
        <SectionLabel>Movers — Last 30 Days</SectionLabel>
        {companyLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-in-stagger">
            {companyData.companies.slice(0, 4).map((c) => (
              <Card key={c.ticker} className="p-4 hover:border-copper/40 transition-colors">
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
            <SectionLabel>Latest Headlines</SectionLabel>
            <Link to="/news" className="text-xs font-mono text-copper-bright hover:underline">
              view all →
            </Link>
          </div>
          {newsLoading && <SkeletonList count={5} />}
          {newsError && <ErrorState />}
          {newsData && (
            <div className="space-y-2.5 fade-in-stagger">
              {newsData.articles.slice(0, 6).map((a) => (
                <Card key={a.id} className="p-4 hover:border-copper/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-sm leading-snug">{a.title}</h3>
                      <p className="text-muted text-xs mt-1.5 font-mono">
                        {a.source} · {a.date}
                      </p>
                      
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-copper-bright hover:underline mt-1.5 inline-block"
                      >
                        Read full article →
                      </a>
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
          <SectionLabel>Coverage by Category (7d)</SectionLabel>
          {digestLoading ? (
            <SkeletonCard lines={5} />
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
                  <Bar dataKey="count" radius={[0, 3, 3, 0]} animationDuration={600}>
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
            <SectionLabel>This Week's Read</SectionLabel>
            <Card className="p-4">
              {digestLoading ? (
                <div className="space-y-1.5">
                  <div className="skeleton h-2.5 rounded w-full" />
                  <div className="skeleton h-2.5 rounded w-5/6" />
                  <div className="skeleton h-2.5 rounded w-2/3" />
                </div>
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