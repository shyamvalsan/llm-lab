// Mistral chat
export async function runMistral(opts: {
  apiKey: string; model: string; text: string; temperature?: number; top_p?: number;
}) {
  const headers: Record<string,string> = { 'Content-Type':'application/json', 'Authorization': `Bearer ${opts.apiKey}` };
  const body:any = { model: opts.model, messages:[{role:'user', content: opts.text}], temperature: opts.temperature ?? 1.0, max_tokens:800 };
  if (opts.top_p !== undefined) body.top_p = opts.top_p;
  const resp = await fetch('https://api.mistral.ai/v1/chat/completions', { method:'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) return { error:`HTTP ${resp.status}` };
  const j = await resp.json(); const text = j.choices?.[0]?.message?.content || ''; return { text };
}
