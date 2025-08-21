export async function runGemini(opts: { apiKey: string; model: string; text: string; temperature?: number; top_p?: number; }){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  const generationConfig: any = { temperature: opts.temperature ?? 1.0 };
  if (opts.top_p !== undefined) generationConfig.topP = opts.top_p;
  const body = { contents: [{ parts: [{ text: opts.text }] }], generationConfig };
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!r.ok) return { error:`HTTP ${r.status}` };
  const j = await r.json(); const text = j.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join('') || ''; return { text };
}
