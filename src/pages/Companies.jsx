import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import useJsonData from '../hooks/useJsonData.js'
import { Card, SectionLabel, LoadingState, ErrorState } from '../components/ui.jsx'

export default function Companies() {
  const { data: companyData, loading, error } = useJsonData('data/companies.json')
  const { data: newsData } = useJsonData('data/news.json')
  const [selected, setSelected] = useState('TSM')

  if (loading) return <LoadingState />
  if (error) return <ErrorState />

  const company = companyData.companies.find((c) => c.ticker === selected) || companyData.companies[0]
  const chartData = company.priceHistory.map((p, i) => ({ day: i, price: p }))
  const relatedNews = newsData
    ? newsData.articles.filter((a) => a.companies.includes(company.name)).slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Company tracker</h1>
        <p className="text-muted text-sm mt-1">
          Price trend and recent coverage for major players across the supply chain.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {companyData.companies.map((c) => (
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
                <Line type="monotone" dataKey="price" stroke="#C4753A" strokeWidth={2} dot={false} />
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
    </div>
  )
}
