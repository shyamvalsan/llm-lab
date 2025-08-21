export function Logo({provider}:{provider:string}){
  const map:Record<string,JSX.Element> = {
    openai: <span className="badge">OpenAI</span>,
    anthropic: <span className="badge">Anthropic</span>,
    google: <span className="badge">Gemini</span>,
    mistral: <span className="badge">Mistral</span>,
    groq: <span className="badge">Groq</span>,
    cerebras: <span className="badge">Cerebras</span>,
    xai: <span className="badge">xAI</span>,
  };
  return map[provider] ?? <span className="badge">{provider}</span>;
}
