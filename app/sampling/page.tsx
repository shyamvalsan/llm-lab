'use client';
import { useMemo, useState } from 'react';
import ModelSelector from '@/components/ModelSelector';
import { useKeys } from '@/components/KeyContext';
import { chatOpenAICompat } from '@/lib/providers/openaiCompat';
import { runAnthropic } from '@/lib/providers/anthropic';
import { runMistral } from '@/lib/providers/mistral';
import { runGemini } from '@/lib/providers/gemini';
import { runSarvam } from '@/lib/providers/sarvam';
import { Loader, Download } from '@/components/Icons';
import { tokenEstimate } from '@/lib/pricing';
import { addUsage } from '@/lib/usage';
import { DEFAULT_MODELS } from '@/lib/catalog';

export default function Sampling(){
  const [prompt, setPrompt] = useState('Write a short haiku about the ocean.');
  const [n, setN] = useState(5);
  const [sel, setSel] = useState<{provider:any, model:string}>({provider:'openai', model:DEFAULT_MODELS.openai});
  const [runs, setRuns] = useState<{ text:string, temperature:number, top_p:number, seed:number, error?:string }[]>([]);
  const [running,setRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCustomParams, setUseCustomParams] = useState(false);
  
  // Advanced settings for custom ranges (only used if user explicitly enables them)
  const [tempRange, setTempRange] = useState({ min: 0.2, max: 1.8 });
  const [topPRange, setTopPRange] = useState({ min: 0.5, max: 1.0 });
  const [seedRange, setSeedRange] = useState({ min: 1, max: 1000000 });
  
  const { keys } = useKeys();

  async function callOnce(temperature:number, top_p:number | undefined, seed:number): Promise<{text: string, error?: string}>{
    try {
      if (['openai','groq','cerebras','xai'].includes(sel.provider)){
        let out=''; 
        let error: string | null = null;
        const base= sel.provider==='openai'? 'https://api.openai.com' : 
                    (sel.provider==='groq'?'https://api.groq.com': 
                     sel.provider==='cerebras'?'https://api.cerebras.ai':'https://api.x.ai');
        
        for await (const ev of chatOpenAICompat({ 
          baseUrl: base, 
          apiKey: keys[sel.provider], 
          model: sel.model, 
          messages:[{role:'user', content: prompt}], 
          temperature,
          top_p,
          seed
        })){ 
          if (ev.event==='text') {
            out+=ev.data;
          } else if (ev.event==='error') {
            error = ev.data;
            console.error('API error:', ev.data);
          }
        }
        
        if (error && !out) {
          return { text: '', error };
        }
        return { text: out };
        
      } else if (sel.provider==='anthropic'){ 
        const r = await runAnthropic({ apiKey: keys['anthropic'], model: sel.model, text: prompt, temperature, top_p }); 
        if ((r as any).error) {
          return { text: '', error: (r as any).error };
        }
        return { text: (r as any).text || '' };
        
      } else if (sel.provider==='mistral'){ 
        const r = await runMistral({ apiKey: keys['mistral'], model: sel.model, text: prompt, temperature, top_p }); 
        if ((r as any).error) {
          return { text: '', error: (r as any).error };
        }
        return { text: (r as any).text || '' };
        
      } else if (sel.provider==='google'){ 
        const r = await runGemini({ apiKey: keys['google'], model: sel.model, text: prompt, temperature, top_p }); 
        if ((r as any).error) {
          return { text: '', error: (r as any).error };
        }
        return { text: (r as any).text || '' };
        
      } else if (sel.provider==='sarvam'){ 
        const r = await runSarvam({ apiKey: keys['sarvam'], model: sel.model, text: prompt, temperature, top_p }); 
        if ((r as any).error) {
          return { text: '', error: (r as any).error };
        }
        return { text: (r as any).text || '' };
      }
      
      return { text: '' };
    } catch (error: any) {
      console.error('Call failed:', error);
      return { text: '', error: error.message || 'Unknown error' };
    }
  }

  function randomInRange(min: number, max: number, isInt: boolean = false): number {
    const value = Math.random() * (max - min) + min;
    return isInt ? Math.floor(value) : Math.round(value * 100) / 100;
  }


  async function runN(){
    setRunning(true); 
    setRuns([]);
    setCurrentRun(0);
    
    const outs: { text:string, temperature:number, top_p:number, seed:number, error?:string }[] = [];
    let retryCount = 0;
    const maxRetries = 2;
    
    for (let i = 0; i < n; i++){
      setCurrentRun(i + 1);
      
      // Default behavior: temperature=1, no top_p (uses model default), randomized seed
      let temperature = 1.0;
      let top_p: number | undefined = undefined;
      let seed = randomInRange(1, 1000000, true);
      
      // If user enabled custom parameters in advanced settings, use those instead
      if (useCustomParams) {
        temperature = randomInRange(tempRange.min, tempRange.max);
        top_p = randomInRange(topPRange.min, topPRange.max);
        seed = randomInRange(seedRange.min, seedRange.max, true);
      }
      
      let result = await callOnce(temperature, top_p, seed);
      
      // Retry logic for failed calls
      retryCount = 0;
      while (result.error && !result.text && retryCount < maxRetries) {
        console.log(`Retrying sample ${i + 1}, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        result = await callOnce(temperature, top_p, seed);
        retryCount++;
      }
      
      if (result.error && !result.text) {
        // If still failing after retries, save with error message
        outs.push({ 
          text: `[Error: ${result.error}]`, 
          temperature, 
          top_p: top_p || 1.0, // Store default value for display
          seed, 
          error: result.error 
        });
      } else {
        outs.push({ 
          text: result.text, 
          temperature, 
          top_p: top_p || 1.0, // Store default value for display
          seed 
        });
      }
      
      setRuns([...outs]); // Update runs progressively so user can see results as they come in
    }
    
    setRunning(false);
    const promptTokens = tokenEstimate(prompt) * n;
    const completionTokens = outs.reduce((a,b)=> a + tokenEstimate(b.error ? '' : b.text), 0);
    addUsage({ activity:'sampling', provider: sel.provider, model: sel.model, promptTokens, completionTokens });
  }

  const freq = useMemo(()=>{
    const map = new Map<string, number>();
    // Only count successful responses (no errors)
    const validRuns = runs.filter(r => !r.error);
    validRuns.forEach(r=>{ 
      const key=r.text.trim(); 
      if (key && !key.startsWith('[Error:')) { // Extra safety check
        map.set(key, (map.get(key)||0)+1); 
      }
    });
    const arr = Array.from(map.entries()).sort((a,b)=> b[1]-a[1]);
    const total = validRuns.length || 1;
    return arr.map(([text,count])=>({ text, count, pct: Math.round(count*100/total) }));
  },[runs]);

  function download(kind:'jsonl'|'csv'){
    if (runs.length===0) return;
    const lines = runs.map(r => kind==='jsonl' ? JSON.stringify(r) : JSON.stringify([r.temperature, r.top_p, r.seed, r.text]).slice(1,-1));
    const data = kind==='jsonl' ? lines.join('\n') : 'temperature,top_p,seed,text\n' + lines.join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href = url; a.download = kind==='jsonl' ? 'runs.jsonl' : 'runs.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (<div className="space-y-6">
    <div className="h1">N-sampling</div>
    <div className="card p-4 space-y-3">
      <textarea className="input min-h-[120px]" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Enter your prompt here..." />
    </div>
    
    <div className="card p-4 space-y-3">
      <div className="font-semibold">Configuration</div>
      <div className="space-y-4">
        {/* N value prominently displayed */}
        <label className="block">
          <div className="text-sm font-medium mb-2">Number of samples (N)</div>
          <div className="flex items-center gap-3">
            <input
              className="flex-1"
              type="range"
              min={1}
              max={50}
              step={1}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
            <input
              className="input w-20"
              type="number"
              min={1}
              max={100}
              step={1}
              value={n}
              onChange={(e) => setN(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="text-xs opacity-70 mt-1">
            {useCustomParams 
              ? "Each sample will use randomized parameters based on your custom ranges"
              : "Each sample will use temperature=1.0 and a random seed (default behavior)"
            }
          </div>
        </label>

        <ModelSelector value={sel as any} onChange={v=>setSel(v as any)} />
        
        {/* Advanced Settings */}
        <div className="border-t pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition"
          >
            <span className="text-xs">{showAdvanced ? '▼' : '▶'}</span>
            Advanced Settings
            <span className="small opacity-70 ml-2">
              (Custom parameter ranges)
            </span>
          </button>
          
          {showAdvanced && (
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={useCustomParams}
                  onChange={(e) => setUseCustomParams(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium">Use custom parameter ranges</span>
                <span className="text-xs opacity-60">
                  (When unchecked, uses temperature=1.0 and random seeds only)
                </span>
              </label>
              
              {useCustomParams && (
              <div className="grid md:grid-cols-2 gap-4 opacity-100 transition-opacity">
                {/* Show range controls only when custom params are enabled */}
                {/* Temperature Range */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Temperature Range</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-20"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={tempRange.min}
                      onChange={(e) => setTempRange({...tempRange, min: Number(e.target.value)})}
                    />
                    <span className="text-xs">to</span>
                    <input
                      className="input w-20"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={tempRange.max}
                      onChange={(e) => setTempRange({...tempRange, max: Number(e.target.value)})}
                    />
                  </div>
                  <div className="text-xs opacity-70">
                    Controls randomness (default: 0.2 - 1.8)
                  </div>
                </div>
                
                {/* Top-P Range */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Top-P Range</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-20"
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={topPRange.min}
                      onChange={(e) => setTopPRange({...topPRange, min: Number(e.target.value)})}
                    />
                    <span className="text-xs">to</span>
                    <input
                      className="input w-20"
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={topPRange.max}
                      onChange={(e) => setTopPRange({...topPRange, max: Number(e.target.value)})}
                    />
                  </div>
                  <div className="text-xs opacity-70">
                    Nucleus sampling (default: 0.5 - 1.0)
                  </div>
                </div>
                
                {/* Seed Range */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Seed Range</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-24"
                      type="number"
                      min={0}
                      value={seedRange.min}
                      onChange={(e) => setSeedRange({...seedRange, min: Number(e.target.value)})}
                    />
                    <span className="text-xs">to</span>
                    <input
                      className="input w-24"
                      type="number"
                      min={0}
                      value={seedRange.max}
                      onChange={(e) => setSeedRange({...seedRange, max: Number(e.target.value)})}
                    />
                  </div>
                  <div className="text-xs opacity-70">
                    Random seed range (default: 1 - 1000000)
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2">
          <button className="button" onClick={()=>download('jsonl')} disabled={runs.length === 0}>
            <Download/> JSONL
          </button>
          <button className="button" onClick={()=>download('csv')} disabled={runs.length === 0}>
            <Download/> CSV
          </button>
        </div>
        <button className="button flex items-center gap-2" onClick={runN} disabled={running}>
          {running ? <><Loader/> Generating {currentRun}/{n}...</> : `Generate ${n} Samples`}
        </button>
      </div>
    </div>
    
    {running && (
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Generating samples...</div>
          <div className="text-sm font-medium">
            {currentRun} / {n}
          </div>
        </div>
        <div className="relative">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${n > 0 ? (currentRun / n) * 100 : 0}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white mix-blend-difference">
              {n > 0 ? Math.round((currentRun / n) * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="text-xs opacity-70 text-center">
          Processing sample {currentRun} of {n}
        </div>
      </div>
    )}
    
    {runs.length>0 && (<div className="space-y-4">
      {runs.map((r,i)=>(<div key={i} className={`card p-4 ${r.error ? 'border-red-500 border' : ''}`}>
        <div className="small mb-2 flex items-center justify-between">
          <span>
            Sample {i+1} 
            {useCustomParams && ` · T=${r.temperature}`}
            {useCustomParams && r.top_p !== 1.0 && ` · P=${r.top_p}`}
            · Seed={r.seed}
          </span>
          {r.error && <span className="text-red-500 text-xs font-medium">Failed</span>}
        </div>
        {r.error ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span> {r.error}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{r.text}</pre>
        )}
      </div>))}
      
      <div className="card p-4 space-y-4">
        <div className="font-semibold">Response Analysis</div>
        
        {freq.length === 0 ? (
          <div className="small opacity-70">No data yet.</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{runs.length}</div>
                <div className="text-xs opacity-70">Total Samples</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{runs.filter(r => !r.error).length}</div>
                <div className="text-xs opacity-70">Successful</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{freq.length}</div>
                <div className="text-xs opacity-70">Unique Responses</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{runs.filter(r => r.error).length}</div>
                <div className="text-xs opacity-70">Failed</div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="font-medium mb-3">Distribution Overview</div>
                <div className="relative w-48 h-48 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {(() => {
                      let cumulativePercentage = 0;
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                      return freq.slice(0, 8).map((f, i) => {
                        const startAngle = cumulativePercentage * 3.6;
                        const endAngle = (cumulativePercentage + f.pct) * 3.6;
                        cumulativePercentage += f.pct;
                        
                        const startAngleRad = (startAngle * Math.PI) / 180;
                        const endAngleRad = (endAngle * Math.PI) / 180;
                        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
                        const outerRadius = 45;
                        const innerRadius = 25;
                        
                        const x1 = 50 + outerRadius * Math.cos(startAngleRad);
                        const y1 = 50 + outerRadius * Math.sin(startAngleRad);
                        const x2 = 50 + outerRadius * Math.cos(endAngleRad);
                        const y2 = 50 + outerRadius * Math.sin(endAngleRad);
                        const x3 = 50 + innerRadius * Math.cos(endAngleRad);
                        const y3 = 50 + innerRadius * Math.sin(endAngleRad);
                        const x4 = 50 + innerRadius * Math.cos(startAngleRad);
                        const y4 = 50 + innerRadius * Math.sin(startAngleRad);
                        
                        const pathData = [
                          `M ${x1} ${y1}`,
                          `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          `L ${x3} ${y3}`,
                          `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                          'Z'
                        ].join(' ');
                        
                        return (
                          <path
                            key={i}
                            d={pathData}
                            fill={colors[i % colors.length]}
                            className="hover:opacity-80 transition-opacity"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold">{Math.round((1 - (freq.length > 1 ? freq.slice(1).reduce((acc, f) => acc + f.pct, 0) / 100 : 0)) * 100)}%</div>
                      <div className="text-xs opacity-70">Top Response</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend and Bar Chart */}
              <div className="flex-1 space-y-3">
                <div className="font-medium">Response Frequency</div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {freq.slice(0, 10).map((f, i) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-cyan-500', 'bg-lime-500', 'bg-orange-500'];
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                            <span className="font-medium text-sm">{f.pct}%</span>
                            <span className="text-xs opacity-70">({f.count}× occurrences)</span>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors[i % colors.length]} transition-all duration-500 ease-out`}
                              style={{ width: `${f.pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs opacity-80 bg-gray-50 dark:bg-gray-800 p-2 rounded border-l-2 border-gray-300 dark:border-gray-600">
                          <div className="line-clamp-3">{f.text.length > 200 ? f.text.substring(0, 200) + '...' : f.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  {freq.length > 10 && (
                    <div className="text-xs opacity-70 text-center py-2">
                      ... and {freq.length - 10} more unique responses
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>)}
  </div>);
}