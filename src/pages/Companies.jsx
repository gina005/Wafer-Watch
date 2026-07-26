import { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, ReferenceDot, ResponsiveContainer } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, SkeletonList, ErrorState } from '../components/ui.jsx'
import { getSectorRank, formatSectorRank } from '../utils/ranking.js'

function formatCompact(n) {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

function formatVolume(n) {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

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
          <h1 className="font-display text-2xl font-semibold">Company Tracker</h1>
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
          <h1 className="font-display text-2xl font-semibold">Company Tracker</h1>
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
  const relatedNews = newsData
    ? newsData.articles.filter((a) => a.companies.includes(company.name)).slice(0, 5)
    : []

  const goToCompany = (name) => {
    const match = companies.find((c) => c.name === name)
    if (match) setSelected(match.ticker)
  }

  const f = company.financials

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

      <div className="space-y-6">
        {/* 1. Snapshot header */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between mb-1">
            <div>
              <h2 className="font-display text-xl">{company.name}</h2>
              <p className="text-muted text-xs font-mono mt-0.5">{company.sector}</p>
            </div>
            <div className="text-right">
              <span className={`font-mono text-sm ${company.change30d >= 0 ? 'text-positive' : 'text-negative'}`}>
                {company.change30d >= 0 ? '+' : ''}
                {company.change30d}% · 30d
              </span>
              <p className="text-[11px] font-mono text-copper-bright mt-0.5">
                {formatSectorRank(getSectorRank(company, companies))}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted mt-2">{company.focus}</p>
        </Card>

        {/* 2. Financial stats grid */}
        {f && (
          <Card className="p-5">
            <SectionLabel>Financial Snapshot</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatField label="Market Cap" value={formatCompact(f.marketCapUSD)} />
              <StatField label="P/E Ratio" value={f.peRatio != null ? f.peRatio.toFixed(1) : '—'} />
              <StatField
                label="52w Range"
                value={f.week52Low != null && f.week52High != null ? `${f.week52Low.toLocaleString()} – ${f.week52High.toLocaleString()}` : '—'}
              />
              <StatField
                label="Volume vs Avg"
                value={f.currentVolume != null ? formatVolume(f.currentVolume) : '—'}
                hint={f.avgVolume != null ? `avg ${formatVolume(f.avgVolume)}` : undefined}
              />
              <StatField label="Beta" value={f.beta != null ? f.beta.toFixed(2) : '—'} />
              <StatField label="Dividend Yield" value={f.dividendYield != null ? `${f.dividendYield}%` : 'None'} />
            </div>
          </Card>
        )}

        {/* 3. Segment revenue */}
        {company.segmentRevenue?.length > 0 && (
          <Card className="p-5">
            <SectionLabel>Segment Revenue</SectionLabel>
            <div style={{ height: Math.max(160, company.segmentRevenue.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={company.segmentRevenue} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="segment"
                    width={170}
                    tick={{ fill: '#8B9296', fontSize: 11 }}
                    axisLine={{ stroke: '#2A3338' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1E262B', border: '1px solid #2A3338', borderRadius: 6, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'of revenue']}
                  />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {company.segmentRevenue.map((entry, i) => (
                      <Cell key={entry.segment} fill={i === 0 ? '#C4753A' : '#5B8FA8'} fillOpacity={i === 0 ? 1 : 0.55} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* 4. R&D / Capex strip */}
        {(company.rdSpendPctRevenue != null || company.capexTrend) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {company.rdSpendPctRevenue != null && (
              <Card className="p-4">
                <p className="text-xs font-mono text-muted">R&D Spend</p>
                <p className="font-display text-2xl mt-1">{company.rdSpendPctRevenue}%</p>
                <p className="text-xs text-muted mt-0.5">of revenue</p>
              </Card>
            )}
            {company.capexTrend && (
              <Card className="p-4 flex items-center gap-3">
                <CapexIcon trend={company.capexTrend} />
                <div>
                  <p className="text-xs font-mono text-muted">Capex Trend</p>
                  <p className="font-display text-lg capitalize mt-0.5">{company.capexTrend}</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 5. Supply chain panel */}
        {company.supplyChain && (
          <Card className="p-5">
            <SectionLabel>Supply Chain</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-6">
              <SupplyChainColumn
                title="Customers"
                names={company.supplyChain.customers}
                companies={companies}
                onSelect={goToCompany}
              />
              <SupplyChainColumn
                title="Suppliers"
                names={company.supplyChain.suppliers}
                companies={companies}
                onSelect={goToCompany}
              />
            </div>
          </Card>
        )}

        {/* 6. Price chart */}
        <PriceChartCard key={company.ticker} company={company} newsData={newsData} />

        {/* 7. Recent coverage */}
        <div>
          <SectionLabel>Recent Coverage</SectionLabel>
          <div className="space-y-2.5">
            {relatedNews.length === 0 && (
              <p className="text-muted text-sm">No recent articles tagged to this company.</p>
            )}
            {relatedNews.map((a) => (
              <Card key={a.id} className="p-3.5">
                <h4 className="text-sm font-medium leading-snug">{a.title}</h4>
                <p className="text-xs text-muted font-mono mt-1.5">{a.source} · {a.date}</p>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-copper-bright hover:underline mt-1.5 inline-block"
                >
                  Read full article →
                </a>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// 30D/90D is what the pipeline can honestly offer today — fetch_prices.py
// pulls a 90-day window (see scripts/fetch_prices.py). 6M/1Y ranges would
// need that fetch window extended, plus enough historical data accumulated
// over time (or a one-off historical backfill run), before they'd show real
// data instead of a flat/misleading line.
const PRICE_RANGES = ['30D', '90D']

function PriceTooltip({ active, payload, articlesByDate }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const articles = point.date ? articlesByDate[point.date] : null
  return (
    <div className="bg-[#1E262B] border border-border rounded px-3 py-2 text-xs max-w-[260px]">
      <p className="font-mono text-muted">price: {point.price}</p>
      {articles && (
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <p className="font-mono text-silicon">
            {articles.length} article{articles.length === 1 ? '' : 's'} on {point.date}
          </p>
          {articles.slice(0, 2).map((a) => (
            <p key={a.id} className="text-ink/90 mt-1 leading-snug">{a.title}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function PriceChartCard({ company, newsData }) {
  const [range, setRange] = useState('30D')

  const chartData = company.priceHistory.map((p, i) => ({
    day: i,
    price: p,
    date: company.priceDates?.[i],
  }))
  const visibleData = range === '30D' ? chartData.slice(-30) : chartData

  const high = Math.max(...visibleData.map((d) => d.price))
  const low = Math.min(...visibleData.map((d) => d.price))
  const latest = visibleData[visibleData.length - 1].price
  const pctFromHigh = (((latest - high) / high) * 100).toFixed(1)
  const rangeLabel = range === '30D' ? '30-day' : '90-day'
  const trendBlurb =
    Math.abs(Number(pctFromHigh)) < 1
      ? `Trading at its ${rangeLabel} high of ${high.toLocaleString()}.`
      : `Currently ${Math.abs(pctFromHigh)}% below its ${rangeLabel} high of ${high.toLocaleString()}, and ${(((latest - low) / low) * 100).toFixed(1)}% above its ${rangeLabel} low of ${low.toLocaleString()}.`

  // Cross-reference this company's news coverage against the chart's date
  // axis: any trading day with a matching article gets a marker.
  const articlesByDate = useMemo(() => {
    if (!newsData) return {}
    const map = {}
    newsData.articles
      .filter((a) => a.companies.includes(company.name))
      .forEach((a) => {
        ;(map[a.date] ??= []).push(a)
      })
    return map
  }, [newsData, company.name])

  const newsMarkers = visibleData.filter((d) => d.date && articlesByDate[d.date])

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <SectionLabel>Price</SectionLabel>
        <div className="flex gap-1.5">
          {PRICE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                range === r
                  ? 'bg-copper/15 border-copper text-copper-bright'
                  : 'bg-surface border-border text-muted hover:text-ink'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData}>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={['dataMin - 2%', 'dataMax + 2%']} />
            <Tooltip content={<PriceTooltip articlesByDate={articlesByDate} />} />
            <Line type="monotone" dataKey="price" stroke="#C4753A" strokeWidth={2} dot={false} isAnimationActive={false} />
            {newsMarkers.map((m) => (
              <ReferenceDot
                key={m.day}
                x={m.day}
                y={m.price}
                r={5}
                fill="#5B8FA8"
                stroke="#0F1417"
                strokeWidth={1.5}
                isFront
                ifOverflow="extendDomain"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {newsMarkers.length > 0 && (
        <p className="text-[11px] font-mono text-muted mt-1">
          {newsMarkers.length} news marker{newsMarkers.length === 1 ? '' : 's'} on this chart — hover a highlighted point for the headline.
        </p>
      )}
      <div className="flex items-center gap-4 mt-3 text-xs font-mono text-muted">
        <span>{range} low: {low.toLocaleString()}</span>
        <span>{range} high: {high.toLocaleString()}</span>
      </div>
      <p className="text-sm text-muted mt-3 leading-relaxed">{trendBlurb}</p>
    </Card>
  )
}

function SupplyChainColumn({ title, names, companies, onSelect }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted mb-2">{title}</p>
      {!names || names.length === 0 ? (
        <p className="text-sm text-muted">None disclosed.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => {
            const tracked = companies.some((c) => c.name === name)
            return tracked ? (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className="text-xs font-mono px-2.5 py-1 rounded border border-copper/30 bg-copper/10 text-copper-bright hover:bg-copper/20 transition-colors"
              >
                {name} →
              </button>
            ) : (
              <span
                key={name}
                className="text-xs font-mono px-2.5 py-1 rounded border border-border bg-raised text-muted"
              >
                {name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CapexIcon({ trend }) {
  const color = trend === 'rising' ? '#6FA97A' : trend === 'falling' ? '#C4574A' : '#8B9296'
  const rotation = trend === 'rising' ? -45 : trend === 'falling' ? 45 : 0
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      style={{ transform: `rotate(${rotation}deg)` }}
      className="shrink-0"
    >
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CompareView({ companies, compareSet, setCompareSet }) {
  const toggle = (ticker) => {
    setCompareSet((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : prev.length < 5 ? [...prev, ticker] : prev
    )
  }

  // Normalise each series to % change from its first value so tickers with
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

  const leader = useMemo(() => {
    if (chartData.length === 0 || compareSet.length === 0) return null
    const last = chartData[chartData.length - 1]
    return compareSet.reduce((best, t) => (last[t] > (last[best] ?? -Infinity) ? t : best), compareSet[0])
  }, [chartData, compareSet])

  return (
    <>
      <div>
        <SectionLabel>Select up to 5 to Compare (% Change)</SectionLabel>
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
          <>
            {leader && compareSet.length > 1 && (
              <p className="text-xs font-mono text-muted mb-3">
                Best performer over this period: <span className="text-copper-bright">{leader}</span>
              </p>
            )}
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
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    </>
  )
}

function StatField({ label, value, hint, accent }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-sm mt-0.5 ${accent ? 'text-copper-bright font-mono' : ''}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted font-mono mt-0.5">{hint}</p>}
    </div>
  )
}