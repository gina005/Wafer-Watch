import { useEffect, useMemo, useState } from 'react'
import useJsonData from '../hooks/useJsonData.js'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { Card, CategoryTag, SkeletonList, ErrorState, EmptyState } from '../components/ui.jsx'

const CATEGORIES = ['All', 'Fabrication', 'Chip Design', 'Supply Chain', 'Policy', 'EDA', 'M&A']
const PAGE_SIZE = 8

export default function NewsFeed() {
  const { data, loading, error } = useJsonData('data/news.json')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [savedIds, setSavedIds] = useLocalStorage('waferwatch:saved-articles', [])

  // reset pagination whenever a filter changes, so "load more" starts fresh
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [category, query, savedOnly])

  const toggleSaved = (id) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const filtered = useMemo(() => {
    if (!data) return []
    return data.articles.filter((a) => {
      const matchesCategory = category === 'All' || a.category === category
      const matchesQuery =
        query.trim() === '' ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.companies.some((c) => c.toLowerCase().includes(query.toLowerCase()))
      const matchesSaved = !savedOnly || savedIds.includes(a.id)
      return matchesCategory && matchesQuery && matchesSaved
    })
  }, [data, category, query, savedOnly, savedIds])

  const visible = filtered.slice(0, visibleCount)

  const topCategory = useMemo(() => {
    if (filtered.length === 0) return null
    const counts = {}
    filtered.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1 })
    const [name, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return { name, count }
  }, [filtered])

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">News Feed</h1>
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
          <button
            onClick={() => setSavedOnly((v) => !v)}
            className={`px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
              savedOnly
                ? 'bg-silicon/15 border-silicon text-silicon'
                : 'bg-surface border-border text-muted hover:text-ink'
            }`}
          >
            <BookmarkIcon filled={savedOnly} />
            Saved{savedIds.length > 0 ? ` (${savedIds.length})` : ''}
          </button>
        </div>
      </div>

      {loading && <SkeletonList count={6} />}
      {error && <ErrorState />}

      {data && (
        <>
          <p className="text-xs font-mono text-muted">
            {filtered.length} articles
            {topCategory && filtered.length > 1 ? ` · mostly ${topCategory.name} (${topCategory.count})` : ''}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              title={savedOnly ? 'No Saved Articles Yet' : 'No Articles Match That Filter'}
              hint={savedOnly ? 'Tap the bookmark icon on any article to save it here.' : 'Try a different search term or category.'}
            />
          ) : (
            <div className="space-y-2.5 fade-in-stagger">
              {visible.map((a) => (
                <Card key={a.id} className="p-4 hover:border-copper/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
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
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <CategoryTag category={a.category} />
                      <button
                        onClick={() => toggleSaved(a.id)}
                        aria-label={savedIds.includes(a.id) ? 'Remove from saved' : 'Save article'}
                        aria-pressed={savedIds.includes(a.id)}
                        className="text-muted hover:text-copper-bright transition-colors p-0.5"
                      >
                        <BookmarkIcon filled={savedIds.includes(a.id)} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="px-4 py-2 rounded text-xs font-mono border border-border text-muted hover:text-copper-bright hover:border-copper/40 transition-colors"
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
      <path d="M3.5 2.5h9a.5.5 0 0 1 .5.5v11.2a.4.4 0 0 1-.63.33L8 11.2l-4.37 3.33A.4.4 0 0 1 3 14.2V3a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
    </svg>
  )
}