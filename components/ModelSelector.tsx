'use client';
import { PROVIDERS, ensureModels, type ModelsMap, type ProviderId, DEFAULT_MODELS } from '@/lib/catalog';
import { useEffect, useMemo, useState } from 'react';
import { useKeys } from './KeyContext';
import { Logo } from './Logos';
export default function ModelSelector({ value, onChange }:{ value:{provider:ProviderId, model:string}, onChange:(v:{provider:ProviderId,model:string})=>void }){
  const { keys, unlocked } = useKeys(); const [models,setModels]=useState<ModelsMap>({}); const [loading,setLoading]=useState(true);
  useEffect(()=>{ let alive=true; (async()=>{ if(!unlocked) return; setLoading(true); const map=await ensureModels(keys); if(!alive) return; setModels(map); setLoading(false); const list=map[value.provider]||[]; if(!list.includes(value.model)) { const defaultModel = DEFAULT_MODELS[value.provider]; const modelToUse = list.includes(defaultModel) ? defaultModel : (list[0]||''); onChange({provider:value.provider, model:modelToUse}); } })(); return ()=>{alive=false}; },[unlocked, JSON.stringify(Object.keys(keys))]);
  const modelOptions = useMemo(()=>models[value.provider]||[],[models,value.provider]);
  function chooseProvider(p:ProviderId){ const list=models[p]||[]; const defaultModel = DEFAULT_MODELS[p]; const modelToUse = list.includes(defaultModel) ? defaultModel : (list[0]||''); onChange({provider:p, model:modelToUse}); }
  return (<div className="flex gap-2 items-center">
    <div className="flex items-center gap-2">
      <Logo provider={value.provider}/>
      <select className="input w-44" value={value.provider} onChange={e=>chooseProvider(e.target.value as ProviderId)}>
        {PROVIDERS.map(p=> <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </div>
    <select className="input" value={value.model} onChange={e=>onChange({provider:value.provider, model:e.target.value})} disabled={loading || (modelOptions.length===0 && unlocked)}>
      {loading && <option>Loading models…</option>}
      {!loading && modelOptions.length===0 && (<option>{unlocked ? 'No models (check key)' : 'Unlock vault first'}</option>)}
      {modelOptions.map(m=> <option key={m} value={m}>{m}</option>)}
    </select>
  </div>);
}
