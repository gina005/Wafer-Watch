import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/news', label: 'News' },
  { to: '/companies', label: 'Companies' },
  { to: '/roadmap', label: 'Node Roadmap' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/about', label: 'About' },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-graphite text-ink font-body">
      <header className="border-b border-border sticky top-0 z-30 bg-graphite/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <DieMark />
              <span className="font-display text-lg tracking-tight font-semibold">
                Wafer<span className="text-copper">Watch</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-raised text-copper-bright'
                        : 'text-muted hover:text-ink'
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </div>
          {/* mobile tabs */}
          <nav className="flex md:hidden gap-1 overflow-x-auto pb-3 scrollbar-thin">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${
                    isActive ? 'bg-raised text-copper-bright' : 'text-muted'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted font-mono">
          <span>waferwatch — semiconductor industry tracker</span>
          <span>data refreshed periodically via automated pipeline</span>
        </div>
      </footer>
    </div>
  )
}

function DieMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" rx="2" stroke="#C4753A" strokeWidth="1.4" />
      <rect x="5" y="5" width="4" height="4" fill="#C4753A" />
      <rect x="13" y="5" width="4" height="4" fill="#5B8FA8" />
      <rect x="5" y="13" width="4" height="4" fill="#5B8FA8" />
      <rect x="13" y="13" width="4" height="4" fill="#C4753A" />
    </svg>
  )
}
