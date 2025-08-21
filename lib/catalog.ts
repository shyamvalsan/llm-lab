// lib/catalog.ts
export type ProviderId = 'openai'|'anthropic'|'google'|'mistral'|'groq'|'cerebras'|'xai'|'sarvam';
export const PROVIDERS: { id: ProviderId; label: string; base?: string }[] = [
  { id: 'openai', label: 'OpenAI', base: 'https://api.openai.com' },
  { id: 'anthropic', label: 'Anthropic', base: 'https://api.anthropic.com' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'mistral', label: 'Mistral', base: 'https://api.mistral.ai' },
  { id: 'groq', label: 'Groq', base: 'https://api.groq.com' },
  { id: 'cerebras', label: 'Cerebras', base: 'https://api.cerebras.ai' },
  { id: 'xai', label: 'xAI', base: 'https://api.x.ai' },
  { id: 'sarvam', label: 'SarvamAI', base: 'https://api.sarvam.ai' },
];

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  'openai': 'gpt-5',
  'anthropic': 'claude-sonnet-4-20250514',
  'google': 'gemini-2.5-flash',
  'mistral': 'mistral-medium-2508',
  'groq': 'meta-llama/llama-4-maverick-17b-128e-instruct',
  'cerebras': 'gpt-oss-120b',
  'xai': 'grok-3',
  'sarvam': 'sarvam-m'
};

// Hardcoded models - only these will be available
export const HARDCODED_MODELS: Record<ProviderId, string[]> = {
  'openai': [
    'gpt-5',
    'gpt-5-mini', 
    'gpt-5-nano',
    'gpt-4o',
    'o3'
  ],
  'anthropic': [
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-20241022'
  ],
  'mistral': [
    'mistral-medium-2508',
    'magistral-medium-2507',
    'codestral-2508',
    'devstral-medium-2507',
    'mistral-small-2407',
    'magistral-small-2507',
    'mistral-large-2411',
    'pixtral-large-2411',
    'codestral-2501',
    'ministral-8b-2410',
    'ministral-3b-2410',
    'pixtral-12b-2409',
    'open-mistral-nemo'
  ],
  'google': [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemma-2-27b-it',
    'gemma-2-9b-it'
  ],
  'groq': [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'moonshotai/kimi-k2-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-prompt-guard-2-22m',
    'deepseek-r1-distill-llama-70b'
  ],
  'cerebras': [
    'gpt-oss-120b',
    'llama-4-scout-17b-16e-instruct',
    'llama-4-maverick-17b-128e-instruct',
    'llama-3.3-70b',
    'llama3.1-8b',
    'qwen-3-32b',
    'qwen-3-235b-a22b-instruct-2507',
    'qwen-3-235b-a22b-thinking-2507',
    'qwen-3-coder-480b'
  ],
  'xai': [
    'grok-4',
    'grok-3',
    'grok-3-mini'
  ],
  'sarvam': [
    'sarvam-m'
  ]
};

export type ModelsMap = Partial<Record<ProviderId, string[]>>;

// Return hardcoded models instead of fetching from API
export async function fetchModelsForProvider(provider: ProviderId, apiKey?: string): Promise<string[]> {
  return HARDCODED_MODELS[provider] || [];
}

export async function ensureModels(keys: Record<string, string | undefined>): Promise<ModelsMap> {
  const result: ModelsMap = {};
  
  // Return hardcoded models for all providers
  for (const provider of PROVIDERS) {
    result[provider.id] = HARDCODED_MODELS[provider.id] || [];
  }
  
  return result;
}

export function invalidateModelsCache() {
  // No-op since we're using hardcoded models
}
