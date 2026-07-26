import { Card, SectionLabel } from '../components/ui.jsx'

const nodes = [
  { node: '28nm', year: '2011', tech: 'Planar', note: 'Last major planar transistor node before FinFET.' },
  { node: '14nm', year: '2014', tech: 'FinFET', note: 'FinFET transistors become mainstream, improving leakage control.' },
  { node: '7nm', year: '2018', tech: 'FinFET', note: 'EUV lithography begins entering high-volume manufacturing.' },
  { node: '5nm', year: '2020', tech: 'FinFET', note: 'Widespread EUV adoption; mobile and HPC chips converge on this node.' },
  { node: '3nm', year: '2022', tech: 'FinFET / early GAA', note: 'Samsung introduces GAA (MBCFET); TSMC stays on optimised FinFET.' },
  { node: '2nm', year: '2025', tech: 'GAA', current: true, note: 'Gate-all-around nanosheet transistors become the industry standard — this is where leading-edge production sits today.' },
  { node: '1.4nm (A14/14A class)', year: '2027-28', tech: 'GAA + Backside Power', note: 'Backside power delivery separates power and signal routing layers.' },
]

const glossary = [
  { term: 'FinFET', def: 'A 3D transistor design where the gate wraps around a fin-shaped channel on three sides, improving control over current leakage compared to older planar transistors.' },
  { term: 'GAA (Gate-All-Around)', def: 'The successor to FinFET — the gate wraps around the channel on all four sides, usually shaped as stacked nanosheets, giving even tighter control at smaller sizes.' },
  { term: 'EUV Lithography', def: 'Extreme ultraviolet lithography uses a much shorter wavelength of light than older DUV tools, allowing much finer circuit patterns to be printed onto silicon wafers.' },
  { term: 'High-NA EUV', def: 'A newer generation of EUV tools with a higher numerical aperture lens, enabling even finer patterning for nodes below 2nm.' },
  { term: 'CoWoS', def: "TSMC's Chip-on-Wafer-on-Substrate advanced packaging technology, widely used to combine GPU dies with high-bandwidth memory stacks." },
  { term: 'HBM (High Bandwidth Memory)', def: 'A memory type that stacks DRAM dies vertically and connects them with a very wide interface, used heavily in AI accelerators.' },
  { term: 'Backside Power Delivery', def: 'A chip design technique that moves power-routing wires to the back of the wafer, freeing up space on the front for signal routing and improving efficiency.' },
  { term: 'Chiplet', def: 'A small, modular piece of a larger chip design that is manufactured separately and then combined with other chiplets in one package, instead of building one large monolithic die.' },
]

export default function NodeRoadmap() {
  return (
    <div className="space-y-10 fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Process Node Roadmap</h1>
        <p className="text-muted text-sm mt-1">
          How leading-edge logic manufacturing has progressed — and where it's headed.
        </p>
      </div>

      <section>
        <SectionLabel>Timeline</SectionLabel>
        <div className="relative pl-4 border-l border-border space-y-8">
          {nodes.map((n, i) => (
            <div key={n.node} className="relative">
              <span
                className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-graphite"
                style={{ background: n.current ? '#6FA97A' : i === nodes.length - 1 ? '#5B8FA8' : '#C4753A' }}
              />
              <Card className={`p-4 ${n.current ? 'border-positive/40' : ''}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-lg font-semibold">{n.node}</span>
                  <span className="font-mono text-xs text-muted">{n.year}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-raised text-silicon">{n.tech}</span>
                  {n.current && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-positive/10 text-positive border border-positive/30">
                      Current Standard
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-2 leading-relaxed">{n.note}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Glossary</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-3">
          {glossary.map((g) => (
            <Card key={g.term} className="p-4">
              <h3 className="font-mono text-sm text-copper-bright">{g.term}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{g.def}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}