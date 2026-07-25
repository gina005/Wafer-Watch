import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, SkeletonList, ErrorState } from '../components/ui.jsx'

const LINE_COLORS = ['#C4753A', '#5B8FA8', '#6FA97A', '#C4574A', '#E0975A']

export default function Companies() {
  const { data: companyData, loading, error } = useJsonData('data/companies.json')
  const { data: newsData } = useJsonData('data/news.json')
  const [selected, setSelected] = useState('TSM')
  const [compareMode, setCompareMode] = useState(false)
  const [compareSet, setCompareSet] = useState(['TSM', 'NVDA'])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Company tracker</h1>
        </div>
        <SkeletonList count={1} lines={4} />
      </div>
    )
  }
  if (error) return <ErrorState />

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Company tracker</h1>
          <p className="text-muted text-sm mt-1">
            Price trend and recent coverage for major players across the supply chain.
          </p>
        </div>
        <button
          onClick={() => setCompareMode((v) => !v)}
          className={`px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors ${
            compareMode
              ? 'bg-copper/15 border-copper text-copper-bright'
              : 'bg-surface border-border text-muted hover:text-ink'
          }`}
        >
          {compareMode ? '← Back to single view' : 'Compare companies'}
        </button>
      </div>

      {compareMode ? (
        <CompareView companies={companyData.companies} compareSet={compareSet} setCompareSet={setCompareSet} />
      ) : (
        <SingleView
          companies={companyData.companies}
          selected={selected}
          setSelected={setSelected}
          newsData={newsData}
        />
      )}
    </div>
  )
}

function SingleView({ companies, selected, setSelected, newsData }) {
  const company = companies.find((c) => c.ticker === selected) || companies[0]
  const chartData = company.priceHistory.map((p, i) => ({ day: i, price: p }))
  const relatedNews = newsData
    ? newsData.articles.filter((a) => a.companies.includes(company.name)).slice(0, 5)
    : []

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {companies.map((c) => (
          <button
            key={c.ticker}
            onClick={() => setSelected(c.ticker)}
            className={`px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors ${
              selected === c.ticker
                ? 'bg-copper/15 border-copper text-copper-bright'
                : 'bg-surface border-border text-muted hover:text-ink'
            }`}
          >
            {c.ticker}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-baseline justify-between mb-1">
            <div>
              <h2 className="font-display text-xl">{company.name}</h2>
              <p className="text-muted text-xs font-mono mt-0.5">{company.sector}</p>
            </div>
            <span className={`font-mono text-sm ${company.change30d >= 0 ? 'text-positive' : 'text-negative'}`}>
              {company.change30d >= 0 ? '+' : ''}
              {company.change30d}% · 30d
            </span>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['dataMin - 2%', 'dataMax + 2%']} />
                <Tooltip
                  contentStyle={{ background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }}
                  labelFormatter={() => ''}
                  formatter={(v) => [v, 'price']}
                />
                <Line type="monotone" dataKey="price" stroke="#C4753A" strokeWidth={2} dot={false} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted mt-3">{company.focus}</p>
        </Card>

        <div>
          <SectionLabel>Recent coverage</SectionLabel>
          <div className="space-y-2.5">
            {relatedNews.length === 0 && (
              <p className="text-muted text-sm">No recent articles tagged to this company.</p>
            )}
            {relatedNews.map((a) => (
              <Card key={a.id} className="p-3.5">
                <h4 className="text-sm font-medium leading-snug">{a.title}</h4>
                <p className="text-xs text-muted font-mono mt-1.5">{a.source} · {a.date}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function CompareView({ companies, compareSet, setCompareSet }) {
  const toggle = (ticker) => {
    setCompareSet((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : prev.length < 5 ? [...prev, ticker] : prev
    )
  }

  // Normalize each series to % change from its first value so tickers with
  // very different price scales (e.g. $26 Intel vs $77,500 Samsung) can be
  // compared meaningfully on one chart.
  const chartData = useMemo(() => {
    const selectedCompanies = companies.filter((c) => compareSet.includes(c.ticker))
    const length = Math.max(0, ...selectedCompanies.map((c) => c.priceHistory.length))
    return Array.from({ length }, (_, day) => {
      const point = { day }
      selectedCompanies.forEach((c) => {
        const base = c.priceHistory[0]
        const val = c.priceHistory[day]
        point[c.ticker] = val !== undefined ? Number((((val - base) / base) * 100).toFixed(2)) : null
      })
      return point
    })
  }, [companies, compareSet])

  return (
    <>
      <div>
        <SectionLabel>Select up to 5 to compare (% change)</SectionLabel>
        <div className="flex gap-1.5 flex-wrap">
          {companies.map((c) => (
            <button
              key={c.ticker}
              onClick={() => toggle(c.ticker)}
              className={`px-3 py-2 rounded text-xs font-mono border transition-colors ${
                compareSet.includes(c.ticker)
                  ? 'bg-copper/15 border-copper text-copper-bright'
                  : 'bg-surface border-border text-muted hover:text-ink'
              }`}
            >
              {c.ticker}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        {compareSet.length === 0 ? (
          <p className="text-muted text-sm text-center py-16">Select at least one company above.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" hide />
                <YAxis
                  tick={{ fill: '#8B9296', fontSize: 11 }}
                  axisLine={{ stroke: '#2A3338' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, '']}
                  labelFormatter={() => ''}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }} />
                {compareSet.map((ticker, i) => (
                  <Line
                    key={ticker}
                    type="monotone"
                    dataKey={ticker}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={500}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </>
  )
}
