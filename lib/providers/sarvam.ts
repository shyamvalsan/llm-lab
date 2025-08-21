export async function runSarvam(opts: {
  apiKey: string; model: string; text: string; temperature?: number; top_p?: number;
}) {
  const headers: Record<string,string> = { 
    'Content-Type': 'application/json', 
    'api-subscription-key': opts.apiKey 
  };
  const body: any = { 
    model: opts.model, 
    messages: [{role:'user', content: opts.text}], 
    temperature: opts.temperature ?? 0.2,
    max_tokens: 800 
  };
  if (opts.top_p !== undefined) body.top_p = opts.top_p;
  
  const resp = await fetch('https://api.sarvam.ai/v1/chat/completions', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(body) 
  });
  
  if (!resp.ok) return { error: `HTTP ${resp.status}` };
  const j = await resp.json(); 
  const text = j.choices?.[0]?.message?.content || ''; 
  return { text };
}

export async function* chatSarvamStream(opts: {
  apiKey: string; model: string; messages: {role:string; content:string}[]; temperature?: number;
}) {
  const headers: Record<string,string> = { 
    'Content-Type': 'application/json', 
    'api-subscription-key': opts.apiKey 
  };
  const body: any = { 
    model: opts.model, 
    messages: opts.messages, 
    temperature: opts.temperature ?? 0.2,
    max_tokens: 800,
    stream: true 
  };
  
  const resp = await fetch('https://api.sarvam.ai/v1/chat/completions', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(body) 
  });
  
  if (!resp.ok) {
    yield { event: 'error', data: `HTTP ${resp.status}` };
    return;
  }
  
  const reader = resp.body?.getReader();
  if (!reader) {
    yield { event: 'error', data: 'No response body' };
    return;
  }
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            yield { event: 'text', data: content };
          }
        } catch (e) {
          console.error('Failed to parse SSE:', e);
        }
      }
    }
  }
}