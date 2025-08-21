'use client';
import { useEffect, useMemo, useState } from 'react';
import { useKeys } from './KeyContext';
const PROVIDERS = ["openai","anthropic","google","mistral","groq","cerebras","xai"];
function Check({ok}:{ok:boolean}){ return <span className={"inline-block w-2.5 h-2.5 rounded-full " + (ok ? "bg-green-500" : "bg-white/20")} />; }
export default function OnboardingGate({ children }:{ children: React.ReactNode }){
  const { unlocked, unlock, setup } = useKeys();
  const [mode, setMode] = useState<'loading'|'setup'|'unlock'|'ready'>('loading');
  const [pwd, setPwd] = useState(''); const [keys, setKeys] = useState<Record<string,string>>({});
  useEffect(()=>{ const vault = localStorage.getItem('vault'); setMode(vault ? 'unlock' : 'setup'); }, []);
  useEffect(()=>{ if(unlocked) setMode('ready'); },[unlocked]);
  const hasAtLeastOne = useMemo(()=>Object.values(keys).some(v => (v||'').trim().length>0), [keys]);
  async function doUnlock(e:any){ e?.preventDefault(); const ok=await unlock(pwd); if(!ok) alert('Wrong password'); }
  async function doSetup(e:any){ e?.preventDefault(); if(!pwd) { alert('Set a password'); return; } if(!hasAtLeastOne){ alert('Please add at least one API key'); return; } await setup(pwd, keys); }
  if (mode==='ready') return <>{children}</>; if (mode==='loading') return null;
  return (<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
    <form onSubmit={mode==='unlock'?doUnlock:doSetup} className="card w-full max-w-2xl p-6 space-y-5">
      <div className="text-lg font-semibold">{mode==='unlock'?'Unlock your vault':'Welcome — add at least one API key'}</div>
      <input className="input" type="password" placeholder={mode==='unlock'?'Enter your password':'Choose a password'} value={pwd} onChange={e=>setPwd(e.target.value)} />
      {mode==='setup' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{PROVIDERS.map(p=>{ const val=keys[p]||''; const ok=(val||'').trim().length>0; return (
        <label key={p} className="text-sm space-y-1"><div className="flex items-center justify-between"><span className="small">{p.toUpperCase()}</span><Check ok={ok}/></div>
          <input className="input" placeholder={`${p} API key`} value={val} onChange={e=>setKeys({...keys,[p]:e.target.value})}/></label> );})}
      </div>)}
      <button className="button w-full" type="submit">{mode==='unlock'?'Unlock':'Create vault'}</button>
      <div className="small">{mode==='unlock'?'Keys stay local.':'Keys are encrypted locally with your password.'}</div>
    </form>
  </div>);
}
