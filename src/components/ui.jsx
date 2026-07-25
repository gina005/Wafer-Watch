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
