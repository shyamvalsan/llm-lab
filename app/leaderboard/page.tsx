'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_LEADERBOARD_URL || '';
type Row = { model: string; provider: string; elo: number; wins: number; losses: number; ladder_key: string };
export default function Leaderboard(){
  const [rows,setRows]=useState<Row[]>([]);
  useEffect(()=>{ (async()=>{ if (!API) return; const r=await fetch(`${API}`); const j=await r.json(); setRows(j.data||[]); })(); },[]);
  return (<div className="space-y-4">
    <div className="h1">Global Leaderboard</div>
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm"><thead><tr className="text-left">
        <th className="p-3">#</th><th>Model</th><th>Provider</th><th>ELO</th><th>Wins</th><th>Losses</th><th className="hidden md:table-cell">Ladder</th>
      </tr></thead><tbody>
        {rows.map((r,i)=>(<tr key={i} className="border-t border-white/10"><td className="p-3">{i+1}</td><td>{r.model}</td><td>{r.provider}</td><td>{Math.round(r.elo)}</td><td>{r.wins}</td><td>{r.losses}</td><td className="small hidden md:table-cell">{r.ladder_key}</td></tr>))}
        {rows.length===0 && <tr><td className="p-3 small" colSpan={7}>Set NEXT_PUBLIC_LEADERBOARD_URL to your central backend to see rankings.</td></tr>}
      </tbody></table>
    </div>
  </div>);
}
