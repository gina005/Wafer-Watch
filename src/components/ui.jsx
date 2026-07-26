export function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${className}`}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
      {children}
    </div>
  )
}

const categoryColors = {
  Fabrication: 'text-copper-bright bg-copper/10 border-copper/30',
  'Chip Design': 'text-silicon bg-silicon/10 border-silicon/30',
  'Supply Chain': 'text-positive bg-positive/10 border-positive/30',
  Policy: 'text-negative bg-negative/10 border-negative/30',
  EDA: 'text-muted bg-raised border-border',
  'M&A': 'text-copper-bright bg-copper/10 border-copper/30',
}

export function CategoryTag({ category }) {
  const cls = categoryColors[category] || 'text-muted bg-raised border-border'
  return (
    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${cls}`}>
      {category}
    </span>
  )
}

export function LoadingState({ label = 'Loading data…' }) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm font-mono py-12 justify-center">
      <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pulse" />
      {label}
    </div>
  )
}

export function ErrorState({ label = 'Could not load data.' }) {
  return (
    <div className="text-negative text-sm font-mono py-12 text-center">{label}</div>
  )
}

// Skeleton placeholders shaped like the content they're standing in for,
// so the layout doesn't jump once real data arrives.
export function SkeletonCard({ className = '', lines = 2 }) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="skeleton h-3.5 w-2/3 rounded mb-2.5" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-2.5 rounded mb-1.5" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </Card>
  )
}

export function SkeletonList({ count = 4, lines = 2 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}

export function Sparkline({ points, positive, className = 'w-full h-7 mt-2' }) {
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
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
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

export function EmptyState({ title = 'Nothing Here Yet', hint, action }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="w-8 h-8 mx-auto mb-3 border border-border rounded grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 opacity-50">
        <span className="bg-border rounded-[1px]" />
        <span className="rounded-[1px]" />
        <span className="rounded-[1px]" />
        <span className="bg-border rounded-[1px]" />
      </div>
      <p className="text-sm text-ink/80">{title}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      {action}
    </div>
  )
}