type Price = { in: number; out: number };
export const PRICING: Record<string, Price> = {
  // OpenAI models (prices per 1M tokens)
  'openai:gpt-5': { in: 1.25, out: 10 },
  'openai:gpt-5-mini': { in: 0.25, out: 2 },
  'openai:gpt-5-nano': { in: 0.05, out: 0.4 },
  'openai:gpt-4o': { in: 2.5, out: 10 },
  'openai:o3': { in: 2, out: 8 },
  
  // Anthropic models
  'anthropic:claude-opus-4-1-20250805': { in: 15, out: 75 },
  'anthropic:claude-sonnet-4-20250514': { in: 3, out: 15 },
  'anthropic:claude-3-5-haiku-20241022': { in: 0.80, out: 4 },
  
  // Mistral models
  'mistral:mistral-medium-3': { in: 0.4, out: 2 },
  'mistral:magistral-medium-3': { in: 2, out: 5 },
  'mistral:devstral-medium': { in: 0.4, out: 2 },
  'mistral:codestral': { in: 0.3, out: 0.9 },
  'mistral:mistral-small-3.2': { in: 0.1, out: 0.3 },
  'mistral:magistral-small': { in: 0.5, out: 1.5 },
  'mistral:mistral-large': { in: 2, out: 6 },
  'mistral:pixtral-large': { in: 2, out: 6 },
  'mistral:mistral-saba': { in: 0.2, out: 0.6 },
  
  // Google models
  'google:gemini-2.5-pro': { in: 1.25, out: 10 },
  'google:gemini-2.5-flash': { in: 0.3, out: 2.50 },
  'google:gemini-2.5-flash-lite': { in: 0.1, out: 0.40 },
  'google:gemini-2.0-flash': { in: 0.1, out: 0.40 },
  'google:gemini-2.0-flash-lite': { in: 0.075, out: 0.30 },
  'google:gemma-2-27b-it': { in: 0, out: 0 },
  'google:gemma-2-9b-it': { in: 0, out: 0 },
  
  // Groq models
  'groq:openai/gpt-oss-20b': { in: 0.1, out: 0.5 },
  'groq:openai/gpt-oss-120b': { in: 0.15, out: 0.75 },
  'groq:moonshotai/kimi-k2-instruct': { in: 1, out: 3 },
  'groq:meta-llama/llama-4-scout-17b-16e-instruct': { in: 0.11, out: 0.34 },
  'groq:meta-llama/llama-4-maverick-17b-128e-instruct': { in: 0.2, out: 0.6 },
  'groq:meta-llama/llama-prompt-guard-2-22m': { in: 0.2, out: 0.2 },
  'groq:deepseek-r1-distill-llama-70b': { in: 0.75, out: 0.99 },
  
  // Cerebras models
  'cerebras:openai/gpt-oss-120b': { in: 0.25, out: 0.69 },
  'cerebras:kimi-k2': { in: 0.25, out: 0.69 },
  'cerebras:llama-4-scout': { in: 0.65, out: 0.85 },
  'cerebras:llama-4-maverick': { in: 0.2, out: 0.6 },
  'cerebras:llama-3.3-70b': { in: 0.85, out: 1.2 },
  'cerebras:llama-3.1-8b': { in: 0.1, out: 0.1 },
  'cerebras:qwen-235b-instruct': { in: 0.6, out: 1.2 },
  'cerebras:qwen-235b-thinking': { in: 0.6, out: 1.2 },
  
  // xAI models
  'xai:grok-4': { in: 3, out: 15 },
  'xai:grok-3': { in: 3, out: 15 },
  'xai:grok-3-mini': { in: 0.3, out: 0.5 },
};
export function tokenEstimate(text: string){ return Math.max(1, Math.round((text||'').length/4)); }
export function costUSD(provider:string, model:string, promptTokens:number, completionTokens:number){
  const key = `${provider}:${model}`;
  const p = PRICING[key]; if (!p) return { input: 0, output: 0, total: 0 };
  const input = (promptTokens/1000000) * p.in;  // Divide by 1M since prices are per 1M tokens
  const output = (completionTokens/1000000) * p.out;  // Divide by 1M since prices are per 1M tokens
  return { input, output, total: input + output };
}
