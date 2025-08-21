export async function runAnthropic(opts: {
  apiKey: string; model: string;
  text: string;
  temperature?: number;
  top_p?: number;
}) {
  try {
    const headers: Record<string,string> = {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    
    const body: any = {
      model: opts.model,
      messages: [{ 
        role: 'user', 
        content: opts.text 
      }],
      max_tokens: 1024,
      temperature: opts.temperature ?? 1.0
    };
    
    if (opts.top_p !== undefined) body.top_p = opts.top_p;
    
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      mode: 'cors' // Explicitly set CORS mode
    });
    
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      console.error('Anthropic API error:', resp.status, errorText);
      return { error: `HTTP ${resp.status}: ${errorText}` };
    }
    
    const j = await resp.json();
    const text = j.content?.map((c:any) => c.text).join('') || '';
    return { text };
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    // Check if it's a network error
    if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
      return { 
        error: 'Network error: Please check your internet connection and API key. If the issue persists, there may be a temporary service outage.' 
      };
    }
    return { error: `Error: ${error.message || error}` };
  }
}
