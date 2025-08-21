export async function* chatOpenAICompat(opts: {
  baseUrl?: string;
  apiKey: string;
  model: string;
  messages: Array<{role:'user'|'system'|'assistant', content:any}>;
  temperature?: number;
  top_p?: number;
  seed?: number;
}) {
  const base = opts.baseUrl || 'https://api.openai.com';
  const path = base.includes('groq.com') ? '/openai/v1/chat/completions' : '/v1/chat/completions';
  const url = base + path;
  const headers: Record<string,string> = { 'Content-Type':'application/json', 'Authorization': `Bearer ${opts.apiKey}` };
  const body:any = { 
    model: opts.model, 
    messages: opts.messages, 
    temperature: opts.temperature ?? 1.0, 
    stream: true 
  };
  if (opts.top_p !== undefined) body.top_p = opts.top_p;
  if (opts.seed !== undefined) body.seed = opts.seed;
  const resp = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok || !resp.body) { const text = await resp.text().catch(()=>'');
    yield { event:'error', data: `HTTP ${resp.status} ${text}` }; return; }
  const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buffer='';
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream:true }); const parts = buffer.split('\n\n'); buffer = parts.pop() || '';
    for (const chunk of parts) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue; const data = line.slice(5).trim(); if (data === '[DONE]'){ yield { event:'done' }; return; }
        try { const j = JSON.parse(data); const delta = j.choices?.[0]?.delta?.content || ''; if (delta) yield { event:'text', data: delta }; } catch {}
      }
    }
  }
  yield { event:'done' };
}
