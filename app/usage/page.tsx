'use client';
import { useEffect, useMemo, useState } from 'react';
import { getUsage, clearUsage } from '@/lib/usage';

export default function UsagePage(){
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{ setRows(getUsage()); },[]);
  const totals = useMemo(()=> rows.reduce((a,r)=>({ tokensIn:a.tokensIn+r.promptTokens, tokensOut:a.tokensOut+r.completionTokens, cost:a.cost+r.costTotal }), { tokensIn:0,tokensOut:0,cost:0 }), [rows]);
  return (<div className="space-y-6">
    <div className="h1">Usage</div>
    <div className="card p-4 flex items-center justify-between">
      <div className="small">Totals — In: <b>{totals.tokensIn}</b> · Out: <b>{totals.tokensOut}</b> · Cost: <b>${totals.cost.toFixed(4)}</b></div>
      <button className="button" onClick={()=>{ clearUsage(); setRows([]); }}>Clear</button>
    </div>
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm"><thead><tr className="text-left">
        <th className="p-3">When</th><th>Activity</th><th>Provider</th><th>Model</th><th>In</th><th>Out</th><th>Cost</th>
      </tr></thead><tbody>
        {rows.map((r,i)=>(<tr key={i} className="border-t border-white/10">
          <td className="p-3">{new Date(r.ts).toLocaleString()}</td>
          <td>{r.activity}</td><td>{r.provider}</td><td>{r.model}</td><td>{r.promptTokens}</td><td>{r.completionTokens}</td><td>${r.costTotal.toFixed(4)}</td>
        </tr>))}
        {rows.length===0 && <tr><td className="p-3 small" colSpan={7}>No usage recorded yet.</td></tr>}
      </tbody></table>
    </div>
  </div>);
}
