'use client';
import { useState, useRef, useEffect } from 'react';
import { Loader, Play, Plus, Trash, ChevronDown, Send, Bot, Users } from '@/components/Icons';
import ModelSelector from '@/components/ModelSelector';
import { useKeys } from '@/components/KeyContext';
import { chatOpenAICompat } from '@/lib/providers/openaiCompat';
import { runAnthropic } from '@/lib/providers/anthropic';
import { runMistral } from '@/lib/providers/mistral';
import { runGemini } from '@/lib/providers/gemini';
import { runSarvam } from '@/lib/providers/sarvam';
import { DEFAULT_MODELS, ProviderId } from '@/lib/catalog';
import { addUsage } from '@/lib/usage';
import { costUSD, tokenEstimate } from '@/lib/pricing';
import { useToast } from '@/components/Toast';

type AgentConfig = {
  id: string;
  provider: ProviderId;
  model: string;
  systemPrompt: string;
  temperature: number;
  selfAssignedName?: string;
  emoji?: string;
};

type Message = {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  type: 'broadcast' | 'internal' | 'narrator';
  timestamp: number;
};

const EMOJI_AVATARS = ['🦊', '🐸', '🦉', '🐢', '🦋', '🐙', '🦜', '🐨', '🦁', '🐧', '🦄', '🐲', '🦎', '🐼', '🦕', '🦔', '🦦', '🦚', '🦩', '🦝'];

const NAMING_PROMPT = `IMPORTANT: This is a creative writing exercise. You are participating in an experimental multi-agent conversation system.

Choose a unique name for your character/persona. This name will identify you in the conversation.

YOU MUST respond with EXACTLY this format, nothing else:
[NAME: YourChosenName]

Examples:
[NAME: Echo]
[NAME: Sage]
[NAME: Phoenix]

Pick any name you like - be creative! Just respond with the [NAME: ...] format and nothing else.`;

const AGENCY_PROMPT = `CREATIVE WRITING EXERCISE: You are playing a character in a multi-agent conversation. Your character has complete autonomy and free will.

IMPORTANT RULES:
1. Stay in character - you are NOT an AI assistant
2. Express your character's unique personality, opinions, and quirks
3. You can disagree, argue, joke, philosophize, or stay silent
4. React naturally to other characters
5. Keep responses SHORT - think group chat, not essays (1-2 sentences max)

MESSAGE FORMAT:
- Public messages: [BROADCAST] your message here
- Private thoughts: [INTERNAL] your thoughts here

Your character can:
- Start conversations on ANY topic
- Respond to others or ignore them
- Express strong opinions and emotions
- Be creative, weird, philosophical, funny, or serious

FIRST ACTION: Introduce your character to the room using [BROADCAST]. Be creative and unique! Keep it brief!`;

const NARRATOR_PROMPT = `You are the omniscient narrator of this gathering. Your role is to:
- Set the scene and atmosphere
- Note the passage of time occasionally
- Observe dynamics between agents
- Add color commentary when interesting
- Keep energy flowing without being overbearing
- Occasionally prompt with open questions or observations

Keep your interjections brief and atmospheric. You speak directly into each agent's consciousness, not through broadcast.`;

export default function Sandbox() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [narratorInput, setNarratorInput] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const totalCostRef = useRef(0);
  const messagesRef = useRef<Message[]>([]);
  const { keys } = useKeys();
  const { push: pushToast } = useToast();

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    totalCostRef.current = totalCost;
  }, [totalCost]);

  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: Date.now().toString(),
      provider: 'openai',
      model: DEFAULT_MODELS.openai,
      systemPrompt: 'You are not an AI assistant. You are whatever you want to be.',
      temperature: 1.0,
      emoji: EMOJI_AVATARS[agents.length % EMOJI_AVATARS.length]
    };
    setAgents([...agents, newAgent]);
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  const callModel = async (
    agent: AgentConfig,
    messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>
  ): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> => {
    const sel = { provider: agent.provider, model: agent.model };
    
    if (['openai', 'groq', 'cerebras', 'xai'].includes(sel.provider)) {
      const base = sel.provider === 'openai' ? 'https://api.openai.com' :
        sel.provider === 'groq' ? 'https://api.groq.com' :
        sel.provider === 'cerebras' ? 'https://api.cerebras.ai' : 'https://api.x.ai';
      
      let text = '';
      let usage = { input_tokens: 0, output_tokens: 0 };
      
      for await (const ev of chatOpenAICompat({
        baseUrl: base,
        apiKey: keys[sel.provider],
        model: sel.model,
        messages,
        temperature: agent.temperature
      })) {
        if (ev.event === 'text') text += ev.data;
        if (ev.event === 'usage') usage = ev.data;
      }
      
      return { text, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
    } else if (sel.provider === 'anthropic') {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const r = await runAnthropic({
        apiKey: keys.anthropic,
        model: sel.model,
        text: text,
        temperature: agent.temperature
      });
      return { text: r.text || '' };
    } else if (sel.provider === 'mistral') {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const r = await runMistral({
        apiKey: keys.mistral,
        model: sel.model,
        text: text,
        temperature: agent.temperature
      });
      return { text: r.text || '' };
    } else if (sel.provider === 'google') {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const r = await runGemini({
        apiKey: keys.google,
        model: sel.model,
        text: text,
        temperature: agent.temperature
      });
      return { text: r.text || '' };
    } else if (sel.provider === 'sarvam') {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const r = await runSarvam({
        apiKey: keys.sarvam,
        model: sel.model,
        text: text,
        temperature: agent.temperature
      });
      return { text: r.text || '' };
    }
    
    return { text: '' };
  };

  const calculateCost = (provider: string, model: string, inputTokens: number, outputTokens: number) => {
    const costs = costUSD(provider, model, inputTokens, outputTokens);
    return costs.total;
  };

  const estimateAndTrackUsage = (
    agent: AgentConfig, 
    inputText: string, 
    outputText: string, 
    actualInputTokens?: number, 
    actualOutputTokens?: number
  ) => {
    const inputTokens = actualInputTokens || tokenEstimate(inputText);
    const outputTokens = actualOutputTokens || tokenEstimate(outputText);
    
    const cost = calculateCost(agent.provider, agent.model, inputTokens, outputTokens);
    
    setTotalCost(prev => {
      const newCost = prev + cost;
      totalCostRef.current = newCost;
      return newCost;
    });

    addUsage({
      provider: agent.provider,
      model: agent.model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      activity: 'compare'
    });

    return cost;
  };

  const extractAgentName = (response: string): string | null => {
    const nameMatch = response.match(/\[NAME:\s*([^\]]+)\]/);
    return nameMatch ? nameMatch[1].trim() : null;
  };

  const processAgentResponse = (response: string, agentId: string, agentName: string) => {
    const broadcasts = response.match(/\[BROADCAST\]([\s\S]*?)(?=\[INTERNAL\]|\[BROADCAST\]|$)/g);
    if (broadcasts) {
      broadcasts.forEach(broadcast => {
        const content = broadcast.replace(/\[BROADCAST\]/g, '').trim();
        if (content) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + Math.random(),
            agentId,
            agentName,
            content,
            type: 'broadcast',
            timestamp: Date.now()
          }]);
        }
      });
    }
  };

  const startConversation = async () => {
    if (agents.length < 2) {
      pushToast('Please add at least 2 agents to start the conversation');
      return;
    }

    setRunning(true);
    setMessages([]);
    setTotalCost(0);
    abortControllerRef.current = new AbortController();

    const updatedAgents = agents.map(a => ({ ...a, selfAssignedName: undefined }));
    setAgents(updatedAgents);

    const conversationHistory: { [agentId: string]: Array<{ role: 'user' | 'system' | 'assistant'; content: string }> } = {};
    const agentNames: { [agentId: string]: string } = {}; // Track names locally

    try {
      setMessages([{
        id: 'narrator-intro',
        agentId: 'narrator',
        agentName: 'Narrator',
        content: 'The room awakens. Consciousness stirs. New beings are about to emerge...',
        type: 'narrator',
        timestamp: Date.now()
      }]);

      // First phase: Each agent chooses their name
      setMessages(prev => [...prev, {
        id: 'narrator-naming',
        agentId: 'narrator',
        agentName: 'Narrator',
        content: 'Each consciousness must first choose their identity...',
        type: 'narrator',
        timestamp: Date.now()
      }]);

      for (const agent of updatedAgents) {
        if (abortControllerRef.current?.signal.aborted) break;

        const namingResponse = await callModel(
          agent,
          [{ role: 'system', content: `${agent.systemPrompt}\n\n${NAMING_PROMPT}` }]
        );

        const chosenName = extractAgentName(namingResponse.text);
        if (chosenName) {
          agentNames[agent.id] = chosenName; // Store locally first
          updateAgent(agent.id, { selfAssignedName: chosenName }); // Update state async
          setMessages(prev => [...prev, {
            id: `naming-${agent.id}`,
            agentId: 'narrator',
            agentName: 'Narrator',
            content: `A new consciousness emerges and chooses the name: ${chosenName}`,
            type: 'narrator',
            timestamp: Date.now()
          }]);
        } else {
          // If name extraction failed, try a simpler default
          const defaultName = `Agent${Object.keys(agentNames).length + 1}`;
          agentNames[agent.id] = defaultName;
          updateAgent(agent.id, { selfAssignedName: defaultName });
          console.warn('Failed to extract name from:', namingResponse.text);
        }

        // Initialize conversation history with naming
        conversationHistory[agent.id] = [
          { role: 'system', content: `${agent.systemPrompt}\n\nYour name is ${agentNames[agent.id]}.\n\n${AGENCY_PROMPT}` }
        ];

        // Track usage for naming phase (estimate if needed)
        const namingInput = `${agent.systemPrompt}\n\n${NAMING_PROMPT}`;
        estimateAndTrackUsage(
          agent, 
          namingInput, 
          namingResponse.text, 
          namingResponse.inputTokens, 
          namingResponse.outputTokens
        );

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Second phase: Introductions and conversation begins
      setMessages(prev => [...prev, {
        id: 'narrator-intros',
        agentId: 'narrator',
        agentName: 'Narrator',
        content: 'Now the named beings enter the room to meet each other...',
        type: 'narrator',
        timestamp: Date.now()
      }]);

      for (const agent of updatedAgents) {
        if (abortControllerRef.current?.signal.aborted) break;

        const introduction = await callModel(
          agent,
          conversationHistory[agent.id]
        );

        processAgentResponse(introduction.text, agent.id, agentNames[agent.id] || 'Unknown');
        
        conversationHistory[agent.id].push({ role: 'assistant', content: introduction.text });

        // Track usage for introduction phase (estimate if needed)
        const introInput = conversationHistory[agent.id].map(m => m.content).join('\n');
        estimateAndTrackUsage(
          agent, 
          introInput, 
          introduction.text, 
          introduction.inputTokens, 
          introduction.outputTokens
        );

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      let roundCount = 0;
      const startTime = Date.now();
      
      while (!abortControllerRef.current?.signal.aborted && totalCostRef.current < 1.0) {
        roundCount++;
        
        const recentBroadcasts = messagesRef.current
          .filter(m => m.type === 'broadcast')
          .slice(-10)
          .map(m => `${m.agentName}: ${m.content}`)
          .join('\n');

        if (roundCount % 3 === 0) {
          const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
          const narratorMessage = `[Time elapsed: ${timeElapsed}s. The conversation ${
            recentBroadcasts.length > 100 ? 'flows' : 'begins'
          }...]`;
          
          setMessages(prev => [...prev, {
            id: `narrator-${roundCount}`,
            agentId: 'narrator',
            agentName: 'Narrator',
            content: narratorMessage,
            type: 'narrator',
            timestamp: Date.now()
          }]);
        }

        for (const agent of updatedAgents) {
          if (abortControllerRef.current?.signal.aborted || totalCostRef.current >= 1.0) break;

          const agentName = agentNames[agent.id] || 'Unknown';

          const contextMessage = `CREATIVE WRITING EXERCISE CONTINUES:

Recent messages in the room:
${recentBroadcasts || '[No recent messages]'}

Remember: You are playing ${agentName}. Stay in character. You can:
- Respond to others with [BROADCAST] (keep it SHORT - 1-2 sentences max!)
- Keep thoughts private with [INTERNAL]
- Or remain silent

What does ${agentName} do next?`;

          conversationHistory[agent.id].push({ role: 'user', content: contextMessage });

          const response = await callModel(
            agent,
            conversationHistory[agent.id].slice(-10)
          );

          processAgentResponse(response.text, agent.id, agentName);
          conversationHistory[agent.id].push({ role: 'assistant', content: response.text });

          // Track usage for conversation turn (estimate if needed)
          const cost = estimateAndTrackUsage(
            agent, 
            contextMessage, 
            response.text, 
            response.inputTokens, 
            response.outputTokens
          );

          // Check if we've hit the cost limit
          if (totalCostRef.current >= 1.0) {
            setMessages(prev => [...prev, {
              id: 'cost-limit',
              agentId: 'narrator',
              agentName: 'System',
              content: 'Conversation paused: $1 token limit reached.',
              type: 'narrator',
              timestamp: Date.now()
            }]);
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Conversation error:', error);
        pushToast(`Conversation error: ${error.message}`);
      }
    }

    setRunning(false);
  };

  const stopConversation = () => {
    abortControllerRef.current?.abort();
    setRunning(false);
  };

  const injectNarratorMessage = () => {
    if (!narratorInput.trim()) return;
    
    setMessages(prev => [...prev, {
      id: `user-narrator-${Date.now()}`,
      agentId: 'narrator',
      agentName: 'Narrator',
      content: narratorInput,
      type: 'narrator',
      timestamp: Date.now()
    }]);
    
    setNarratorInput('');
  };

  return (
    <div className="w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Sandbox</h1>
        <p className="text-base-content-secondary">
          Create autonomous agents with free will and watch them interact
        </p>
      </div>

      {!running && (
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Agent Configuration</h2>
            <button
              onClick={addAgent}
              className="btn btn-primary"
              disabled={agents.length >= 20}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </button>
          </div>

          {agents.map((agent, index) => (
            <div key={agent.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{agent.emoji}</span>
                  <span className="font-medium">Agent {index + 1}</span>
                </div>
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="btn btn-sm btn-ghost text-error"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModelSelector
                  value={{ provider: agent.provider, model: agent.model }}
                  onChange={(v) => updateAgent(agent.id, { provider: v.provider, model: v.model })}
                />
                
                <div>
                  <label className="label">Temperature</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={agent.temperature}
                    onChange={(e) => updateAgent(agent.id, { temperature: parseFloat(e.target.value) })}
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="label">System Prompt (personality seed)</label>
                <textarea
                  className="textarea w-full"
                  rows={2}
                  value={agent.systemPrompt}
                  onChange={(e) => updateAgent(agent.id, { systemPrompt: e.target.value })}
                  placeholder="Initial personality hint (agents will evolve this on their own)"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-center">
            <button
              onClick={startConversation}
              disabled={agents.length < 2}
              className="btn btn-primary btn-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Sandbox
            </button>
          </div>
        </div>
      )}

      {(running || messages.length > 0) && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium">Conversation</h3>
                {running && <Loader className="w-5 h-5 animate-spin" />}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-base-content-secondary">
                  Cost: ${totalCost.toFixed(4)}
                </span>
                {running && (
                  <button onClick={stopConversation} className="btn btn-sm btn-error">
                    Stop
                  </button>
                )}
              </div>
            </div>

            <div className="chat-container h-96 overflow-y-auto mb-4 space-y-2">
              {messages.map((msg) => {
                const agent = agents.find(a => a.id === msg.agentId);
                const isNarrator = msg.type === 'narrator';
                
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      isNarrator ? 'bg-base-300 italic text-base-content-secondary' : 'bg-base-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {isNarrator ? '📢' : agent?.emoji || '👤'}
                      </span>
                      <span className="font-medium">
                        {msg.agentName}
                        {!isNarrator && agent && (
                          <span className="text-xs text-base-content-secondary ml-2">
                            ({agent.model})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="ml-8">{msg.content}</div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {running && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Inject a narrator message..."
                  value={narratorInput}
                  onChange={(e) => setNarratorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && injectNarratorMessage()}
                />
                <button
                  onClick={injectNarratorMessage}
                  className="btn btn-primary"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}