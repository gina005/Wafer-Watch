import { Card, SectionLabel } from '../components/ui.jsx'

export default function About() {
  return (
    <div className="space-y-10 max-w-2xl fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">About waferwatch</h1>
        <p className="text-muted text-sm mt-1">
          What this is, how it's built, and where the data comes from.
        </p>
      </div>

      <section>
        <SectionLabel>What This Is</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          waferwatch aggregates semiconductor industry news from trade publications and layers
          basic analysis on top — category trends, company mentions, and a lightweight sentiment
          signal — so the raw feed turns into something closer to a weekly briefing.
        </p>
      </section>

      <section>
        <SectionLabel>Data Sources</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          Articles are pulled from public RSS feeds of industry publications (e.g. SemiEngineering,
          EE Times, Tom's Hardware, IEEE Spectrum) plus keyword-filtered Google News RSS. Company
          price series use a free-tier market-data API. All sources are linked from each article card.
        </p>
      </section>

      <section>
        <SectionLabel>Pipeline</SectionLabel>
        <Card className="p-5">
          <ol className="text-sm text-muted space-y-2 leading-relaxed list-decimal pl-4">
            <li>A scheduled GitHub Action runs a Python script every few hours.</li>
            <li>The script pulls each RSS feed, de-duplicates and tags articles by keyword, and writes the result to <code className="font-mono text-copper-bright">public/data/news.json</code>.</li>
            <li>A second script rebuilds the weekly digest and sentiment estimate from that data.</li>
            <li>The Action commits the updated JSON files back to the repo — no server, no database.</li>
            <li>The React frontend fetches those static JSON files at runtime, so the site always reflects the latest commit without a rebuild.</li>
          </ol>
        </Card>
      </section>

      <section>
        <SectionLabel>Stack</SectionLabel>
        <p className="text-sm text-muted leading-relaxed">
          React + Vite + Tailwind CSS for the frontend, Recharts for data visualisation, Python
          (feedparser) for the ingestion pipeline, GitHub Actions for scheduling, and Vercel for
          hosting.
        </p>
      </section>
    </div>
  )
}