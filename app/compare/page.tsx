'use client';
import { useState, useMemo } from 'react';
import ParamControls, { Params } from '@/components/ParamControls';
import SplitViewer from '@/components/SplitViewer';
import VoteBar from '@/components/VoteBar';
import { Loader, Play, Plus } from '@/components/Icons';
import ModelSelector from '@/components/ModelSelector';
import { PROVIDERS, DEFAULT_MODELS } from '@/lib/catalog';
import { useKeys } from '@/components/KeyContext';
import { chatOpenAICompat } from '@/lib/providers/openaiCompat';
import { runAnthropic } from '@/lib/providers/anthropic';
import { runMistral } from '@/lib/providers/mistral';
import { runGemini } from '@/lib/providers/gemini';
import { runSarvam, chatSarvamStream } from '@/lib/providers/sarvam';
import { tokenEstimate } from '@/lib/pricing';
import { addUsage } from '@/lib/usage';
import { useToast } from '@/components/Toast';

type Sel = { provider: any, model: string };
const defaults: Sel[] = [{provider:'openai',model:DEFAULT_MODELS.openai},{provider:'anthropic',model:DEFAULT_MODELS.anthropic}];

export default function Page(){
  const [prompt, setPrompt] = useState('Explain emergence to a curious 12-year-old.');
  const [params, setParams] = useState<Params>({ temperature: 1.0 });
  const [selections, setSelections] = useState<Sel[]>(defaults);
  const [outputs, setOutputs] = useState<Array<{title:string, body:string, meta?:string, provider?:string}>>([]);
  const [running, setRunning] = useState(false);
  const { keys } = useKeys();
  const { push } = useToast();

  function addRow(){ setSelections(s=>[...s, {provider:'openai', model:DEFAULT_MODELS.openai}]); }
  function onChange(i:number, v:Sel){ const copy=selections.slice(); copy[i]=v; setSelections(copy); }


  async function runOne(sel:Sel, i:number){
    const title = `${sel.provider}/${sel.model}`;
    const pushOut = (text:string)=> setOutputs(prev=>{ const copy=[...prev]; copy[i] = { title, provider: sel.provider, body: (copy[i]?.body||'') + text, meta: `T=${params.temperature}` }; return copy; });
    const setOut = (text:string)=> setOutputs(prev=>{ const copy=[...prev]; copy[i] = { title, provider: sel.provider, body: text, meta: `T=${params.temperature}` }; return copy; });

    try{
      let full='';
      if (['openai','groq','cerebras','xai'].includes(sel.provider)){
        const base = PROVIDERS.find(x=>x.id===sel.provider)?.base;
        for await (const ev of chatOpenAICompat({ baseUrl:base, apiKey: keys[sel.provider], model: sel.model, messages:[{role:'user', content: prompt}], temperature: params.temperature })){
          if (ev.event==='text'){ pushOut(ev.data||''); full += ev.data||''; } if (ev.event==='error'){ setOut(`Error: ${ev.data}`); break; }
        }
      } else if (sel.provider==='anthropic'){
        const r = await runAnthropic({ apiKey: keys['anthropic'], model: sel.model, text: prompt, temperature: params.temperature });
        if ('error' in (r as any)) setOut(`Error: ${(r as any).error}`); else { setOut(r.text||''); full = r.text||''; }
      } else if (sel.provider==='mistral'){
        const r = await runMistral({ apiKey: keys['mistral'], model: sel.model, text: prompt, temperature: params.temperature });
        if ('error' in (r as any)) setOut(`Error: ${(r as any).error}`); else { setOut(r.text||''); full = r.text||''; }
      } else if (sel.provider==='google'){
        const r = await runGemini({ apiKey: keys['google'], model: sel.model, text: prompt, temperature: params.temperature });
        if ('error' in (r as any)) setOut(`Error: ${(r as any).error}`); else { setOut(r.text||''); full = r.text||''; }
      } else if (sel.provider==='sarvam'){
        for await (const ev of chatSarvamStream({ apiKey: keys['sarvam'], model: sel.model, messages:[{role:'user', content: prompt}], temperature: params.temperature })){
          if (ev.event==='text'){ pushOut(ev.data||''); full += ev.data||''; } if (ev.event==='error'){ setOut(`Error: ${ev.data}`); break; }
        }
      }
      const promptTokens = tokenEstimate(prompt); const completionTokens = tokenEstimate(full);
      addUsage({ activity:'compare', provider: sel.provider, model: sel.model, promptTokens, completionTokens });
    }catch(e:any){ setOut(`Error: ${String(e)}`); }
  }

  async function runCompare(){
    setRunning(true); setOutputs(Array(selections.length).fill({ title:'', body:'' } as any));
    await Promise.all(selections.map((s,i)=>runOne(s,i)));
    setRunning(false);
  }

  return (<div className="space-y-6">
    <div className="card p-4 space-y-3">
      <textarea className="input min-h-[120px]" value={prompt} onChange={e=>setPrompt(e.target.value)} />
    </div>
    <ParamControls params={params} setParams={setParams} />
    <div className="card p-4 space-y-3">
      <div className="font-semibold">Models</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {selections.map((s,i)=>(<ModelSelector key={i} value={s as any} onChange={v=>onChange(i,v as any)} />))}
      </div>
      <div className="flex justify-between"><button className="button flex items-center gap-2" onClick={addRow}><Plus/> Add</button><button disabled={running} onClick={runCompare} className="button flex items-center gap-2">{running?<Loader/>:<Play/>}{running ? "Running..." : "Compare Models"}</button></div>
    </div>
    {outputs.filter(Boolean).length>0 && (<div className='space-y-3 fade-in'><VoteBar models={selections.map(s=>({provider:s.provider,id:s.model}))} meta={{prompt, params}}/><SplitViewer panes={outputs.filter(Boolean)} /></div>)}
  </div>);
}
