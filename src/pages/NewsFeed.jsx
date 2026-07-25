import { useMemo, useState } from 'react'
import useJsonData from '../hooks/useJsonData.js'
import { Card, CategoryTag, LoadingState, ErrorState } from '../components/ui.jsx'

const CATEGORIES = ['All', 'Fabrication', 'Chip Design', 'Supply Chain', 'Policy', 'EDA', 'M&A']

export default function NewsFeed() {
  const { data, loading, error } = useJsonData('data/news.json')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.articles.filter((a) => {
      const matchesCategory = category === 'All' || a.category === category
      const matchesQuery =
        query.trim() === '' ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.companies.some((c) => c.toLowerCase().includes(query.toLowerCase()))
      return matchesCategory && matchesQuery
    })
  }, [data, category, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">News feed</h1>
        <p className="text-muted text-sm mt-1">
          Aggregated from industry RSS sources, refreshed automatically.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by title or company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm flex-1 outline-none focus:border-copper placeholder:text-muted"
        />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors ${
                category === c
                  ? 'bg-copper/15 border-copper text-copper-bright'
                  : 'bg-surface border-border text-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState />}

      {data && (
        <>
          <p className="text-xs font-mono text-muted">{filtered.length} articles</p>
          <div className="space-y-2.5">
            {filtered.map((a) => (
              <Card key={a.id} className="p-4 hover:border-copper/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm leading-snug">{a.title}</h3>
                    <p className="text-muted text-sm mt-1.5 leading-relaxed">{a.summary}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-xs font-mono text-muted">{a.source} · {a.date}</span>
                      {a.companies.map((c) => (
                        <span key={c} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-raised text-silicon">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <CategoryTag category={a.category} />
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted text-sm py-8 text-center">No articles match that filter.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
