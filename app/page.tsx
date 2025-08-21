export default function Home(){ return (<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <a href="/compare" className="card p-6 hover:shadow-lg transition"><div className="text-lg font-semibold mb-2">Side-by-side comparison</div><div className="small">Ask same prompt to multiple models.</div></a>
  <a href="/sampling" className="card p-6 hover:shadow-lg transition"><div className="text-lg font-semibold mb-2">N-sampling</div><div className="small">Seeds, temp grids, export JSONL.</div></a>
  <a href="/debate" className="card p-6 hover:shadow-lg transition"><div className="text-lg font-semibold mb-2">Debate Club</div><div className="small">Pick a style; AI panel judges automatically.</div></a>
  <a href="/sandbox" className="card p-6 hover:shadow-lg transition"><div className="text-lg font-semibold mb-2">Sandbox</div><div className="small">Multi-agent conversations with emergent personalities.</div></a>
</div>); }
