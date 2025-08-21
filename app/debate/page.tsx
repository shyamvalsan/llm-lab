'use client';
import { useEffect, useMemo, useState } from 'react';
import { Loader, Play } from '@/components/Icons';
import ModelSelector from '@/components/ModelSelector';
import { useKeys } from '@/components/KeyContext';
import { chatOpenAICompat } from '@/lib/providers/openaiCompat';
import { runAnthropic } from '@/lib/providers/anthropic';
import { runMistral } from '@/lib/providers/mistral';
import { runGemini } from '@/lib/providers/gemini';
import { runSarvam } from '@/lib/providers/sarvam';
import { sendVote } from '@/lib/vote';
import { DEFAULT_MODELS } from '@/lib/catalog';
import { generateDebateAudio, createAudioPlayer, downloadAudio, PROVIDER_VOICES } from '@/lib/tts';
import { useToast } from '@/components/Toast';

type Pick = { provider:any, model:string };
type Verdict = { judge: Pick, winner: 'pro'|'con'|'tie', rationale: string };
type Turn = { 
  side: 'pro' | 'con';
  type: 'opening' | 'rebuttal' | 'closing';
  content: string;
  model: string;
  streaming?: boolean;
};

const STYLES: Record<string,string> = {
  'Oxford (classic)': 'Debate format: Oxford. Opening statements (150-200 words) from each side, then rebuttals (150-200), then closings (80-120). Aim for clarity over breadth.',
  'Lincoln-Douglas': 'Debate format: Lincoln-Douglas. Begin with value framework, then constructive case, then cross-apply rebuttals, then crystallization. Each section 120-180 words.',
  'Cross-examination': 'Debate format: CX. Opening (120-150), then each side asks 3 pointed questions (Q&A style), then short rebuttals (100-140), then closings (80-120).',
  'Speed (short)': 'Debate format: Speed. Very concise: Opening (80-120), Rebuttal (80-120), Closing (50-90). Dense, minimal fluff.',
  'Long form': 'Debate format: Long form. Opening (200-250), Rebuttal (200-250), Closing (120-160). Explore nuance and trade-offs.',
  'Creative (rhetorical)': 'Debate format: Creative. Use light rhetorical flourishes, historical analogies, but remain factual; Opening (150-200), Rebuttal (150-200), Closing (100-140).',
  'Rap Battle': 'Debate format: Rap Battle! Drop bars with rhythm and rhyme. Opening verse (8-12 bars), Response/diss track (8-12 bars), Final mic drop (6-8 bars). Keep it clean but fierce. Use wordplay, metaphors, and flow. End lines with rhymes when possible.',
  'Socratic Dialogue': 'Debate format: Ancient Greek Socratic method. Proceed through questioning and examination. Opening: pose fundamental questions (100-150), Rebuttal: challenge assumptions with deeper questions (100-150), Closing: synthesize wisdom gained (80-100). Channel the spirit of the agora.',
  'Tarka Shastra': 'Debate format: Ancient Indian Tarka Shastra (logic debate). Opening: Establish Purvapaksha (prima facie view) and Siddhanta (conclusion) (120-160), Rebuttal: Apply Pramanas (valid knowledge sources) and expose Hetvabhasa (logical fallacies) (120-160), Closing: Achieve Nirnaya (final determination) (80-120).',
  'Shastrartha': 'Debate format: Classical Indian Shastrartha. Opening: Present Pratijna (proposition) with Hetu (reason) and Drishtanta (example) (120-150), Rebuttal: Challenge via Prativada (counter-argument) using Nyaya principles (120-150), Closing: Establish Nigamana (conclusion) (80-100). Maintain respectful philosophical rigor.',
  'Zen Koan': 'Debate format: Zen Koan style. Speak in paradoxes and profound simplicity. Opening: Present your position as a riddle or metaphor (60-80), Rebuttal: Respond with deeper paradox that transcends opposites (60-80), Closing: Offer final koan that dissolves the question itself (40-60). Embrace the void.',
  'Platonic Dialogue': 'Debate format: Platonic dialogue seeking ideal Forms. Opening: Define the essence of the matter (120-150), Rebuttal: Ascend from particular to universal through dialectic (120-150), Closing: Glimpse the eternal Form beyond shadows (80-100). Channel ancient Athens.',
  'Moot Court': 'Debate format: Legal Moot Court. Opening: Present your case with precedents and statutory interpretation (150-180), Rebuttal: Cross-examine and impeach opposing arguments (150-180), Closing: Summation to the bench (100-120). Maintain judicial decorum.',
  'Parliamentary': 'Debate format: British Parliamentary. Opening: Government/Opposition constructive (120-150), Rebuttal: Points of information and refutation (120-150), Closing: Whip speeches summarizing clash (80-100). "Hear, hear!" and "Shame!" as appropriate.',
  'Talmudic': 'Debate format: Talmudic argumentation. Opening: Present your interpretation with textual support (120-150), Rebuttal: Raise kushya (difficulties) and provide teirutz (resolutions) (120-150), Closing: Achieve psak (ruling) through svara (logic) (80-100). Embrace machloket l\'shem shamayim (argument for sake of heaven).',
  'Shakespearean': 'Debate format: Shakespearean dramatic verse. Opening: Speak in iambic pentameter when possible (10-14 lines), Rebuttal: Thrust and parry with wit and wordplay (10-14 lines), Closing: Soliloquy of triumph (8-10 lines). "Methinks" and "forsooth" encouraged. To argue or not to argue?',
  'Scientific Peer Review': 'Debate format: Scientific peer review. Opening: Present hypothesis with methodology (120-150), Rebuttal: Critique methodology and challenge interpretation of data (120-150), Closing: Discuss implications and future research (80-100). Maintain academic rigor. Cite sources (hypothetically).',
  'Stand-up Comedy Roast': 'Debate format: Comedy roast battle. Opening: Establish your position with humor and savage burns (100-130), Rebuttal: Counter-roast while defending your stance (100-130), Closing: Final punchline that wins the crowd (60-80). Keep it clever, not cruel.',
  'Haiku Minimalism': 'Debate format: Haiku-inspired minimalism. Opening: Three statements of 5-7-5 syllable structure capturing your essence (3 haikus), Rebuttal: Three responsive haikus that counter yet honor the form, Closing: One perfect haiku that transcends the debate. Beauty in brevity.',
  'Conspiracy Theorist': 'Debate format: Conspiracy theory style (satirical). Opening: "What THEY don\'t want you to know..." Present your case with dramatic revelations (120-150), Rebuttal: "Follow the money!" Connect everything to your theory (120-150), Closing: "Wake up, sheeple!" Final truth bomb (80-100). For entertainment only.',
  'Medieval Disputation': 'Debate format: Medieval scholastic disputation. Opening: "Quaestio" - state your position with "Videtur quod" (it seems that) (120-150), Rebuttal: "Sed contra" (but against this) with authorities (120-150), Closing: "Respondeo dicendum" (I respond that) with synthesis (80-100). Channel Aquinas.'
};

export default function Debate(){
  const [topic,setTopic]=useState('AI should be open-sourced by default');
  const [style,setStyle]=useState<string>('Oxford (classic)');
  const [pro,setPro]=useState<Pick>({provider:'openai',model:DEFAULT_MODELS.openai});
  const [con,setCon]=useState<Pick>({provider:'anthropic',model:DEFAULT_MODELS.anthropic});
  const [running,setRunning]=useState(false);
  const [turns,setTurns]=useState<Turn[]>([]);
  const [currentSpeaker,setCurrentSpeaker]=useState<'pro'|'con'|null>(null);
  const [verdicts,setVerdicts]=useState<Verdict[]>([]);
  const [panelRunning,setPanelRunning]=useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { keys } = useKeys();
  const { push: pushToast } = useToast();

  async function callModelStreaming(sel:Pick, prompt:string, onChunk:(text:string)=>void){
    if (['openai','groq','cerebras','xai'].includes(sel.provider)){
      let out=''; 
      const base= sel.provider==='openai'? 'https://api.openai.com' : 
                  (sel.provider==='groq'?'https://api.groq.com': 
                   sel.provider==='cerebras'?'https://api.cerebras.ai':'https://api.x.ai');
      for await (const ev of chatOpenAICompat({ 
        baseUrl: base, 
        apiKey: keys[sel.provider], 
        model: sel.model, 
        messages:[{role:'user', content: prompt}]
      })){ 
        if (ev.event==='text') {
          out+=ev.data;
          onChunk(out);
        }
      }
      return out;
    } else if (sel.provider==='anthropic'){ 
      const r=await runAnthropic({ apiKey: keys['anthropic'], model: sel.model, text: prompt }); 
      const text = (r as any).text||'';
      onChunk(text);
      return text;
    } else if (sel.provider==='mistral'){ 
      const r=await runMistral({ apiKey: keys['mistral'], model: sel.model, text: prompt }); 
      const text = (r as any).text||'';
      onChunk(text);
      return text;
    } else if (sel.provider==='google'){ 
      const r=await runGemini({ apiKey: keys['google'], model: sel.model, text: prompt }); 
      const text = (r as any).text||'';
      onChunk(text);
      return text;
    } else if (sel.provider==='sarvam'){ 
      const r=await runSarvam({ apiKey: keys['sarvam'], model: sel.model, text: prompt }); 
      const text = (r as any).text||'';
      onChunk(text);
      return text;
    }
    return '';
  }

  function buildContextForDebater(side: 'pro'|'con', type: 'opening'|'rebuttal'|'closing', allTurns: Turn[]): string {
    const rules = STYLES[style] || STYLES['Oxford (classic)'];
    const position = side === 'pro' ? 'FOR' : 'AGAINST';
    
    if (type === 'opening') {
      return `${rules}\n\nDebate topic: "${topic}"\n\nYou are arguing ${position} this topic. Provide your opening statement:`;
    }
    
    if (type === 'rebuttal') {
      const myOpening = allTurns.find(t => t.side === side && t.type === 'opening')?.content || '';
      const oppOpening = allTurns.find(t => t.side !== side && t.type === 'opening')?.content || '';
      
      return `${rules}\n\nDebate topic: "${topic}"\n\nYou are arguing ${position} this topic.\n\nYour opening statement was:\n${myOpening}\n\nYour opponent's opening statement was:\n${oppOpening}\n\nProvide your rebuttal, addressing their points while reinforcing your position:`;
    }
    
    if (type === 'closing') {
      const transcript = allTurns
        .filter(t => t.content)
        .map(t => `[${t.side.toUpperCase()} - ${t.type}]\n${t.content}`)
        .join('\n\n');
      
      return `${rules}\n\nDebate topic: "${topic}"\n\nYou are arguing ${position} this topic.\n\nDebate so far:\n${transcript}\n\nProvide your closing statement, summarizing your key arguments:`;
    }
    
    return '';
  }

  function isValidResponse(response: string): boolean {
    // Check if response is meaningful (not empty, not just whitespace, has minimum content)
    if (!response || response.trim().length < 20) {
      return false;
    }
    
    // Check if response contains actual words (not just symbols or errors)
    const wordCount = response.trim().split(/\s+/).length;
    if (wordCount < 5) {
      return false;
    }
    
    // Check if response might be an error message
    const errorPatterns = [
      /^error:/i,
      /^failed/i,
      /api.*error/i,
      /unauthorized/i,
      /rate.*limit/i,
      /invalid.*key/i
    ];
    
    for (const pattern of errorPatterns) {
      if (pattern.test(response.trim())) {
        return false;
      }
    }
    
    return true;
  }

  async function runDebate(){
    setRunning(true); 
    setTurns([]); 
    setVerdicts([]);
    
    const debate: Turn[] = [];
    
    try {
      // Opening - Pro
      setCurrentSpeaker('pro');
      const proOpeningTurn: Turn = { 
        side: 'pro', 
        type: 'opening', 
        content: '', 
        model: `${pro.provider}/${pro.model}`,
        streaming: true 
      };
      debate.push(proOpeningTurn);
      setTurns([...debate]);
      
      const proOpeningText = await callModelStreaming(
        pro, 
        buildContextForDebater('pro', 'opening', debate),
        (text) => {
          proOpeningTurn.content = text;
          setTurns([...debate]);
        }
      );
      proOpeningTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Pro's opening response
      if (!isValidResponse(proOpeningText)) {
        pushToast('Pro speaker failed to provide a valid opening statement. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
      
      // Opening - Con
      setCurrentSpeaker('con');
      const conOpeningTurn: Turn = { 
        side: 'con', 
        type: 'opening', 
        content: '', 
        model: `${con.provider}/${con.model}`,
        streaming: true 
      };
      debate.push(conOpeningTurn);
      setTurns([...debate]);
      
      const conOpeningText = await callModelStreaming(
        con, 
        buildContextForDebater('con', 'opening', debate),
        (text) => {
          conOpeningTurn.content = text;
          setTurns([...debate]);
        }
      );
      conOpeningTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Con's opening response
      if (!isValidResponse(conOpeningText)) {
        pushToast('Con speaker failed to provide a valid opening statement. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
    
      // Rebuttal - Pro
      setCurrentSpeaker('pro');
      const proRebuttalTurn: Turn = { 
        side: 'pro', 
        type: 'rebuttal', 
        content: '', 
        model: `${pro.provider}/${pro.model}`,
        streaming: true 
      };
      debate.push(proRebuttalTurn);
      setTurns([...debate]);
      
      const proRebuttalText = await callModelStreaming(
        pro, 
        buildContextForDebater('pro', 'rebuttal', debate),
        (text) => {
          proRebuttalTurn.content = text;
          setTurns([...debate]);
        }
      );
      proRebuttalTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Pro's rebuttal response
      if (!isValidResponse(proRebuttalText)) {
        pushToast('Pro speaker failed to provide a valid rebuttal. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
      
      // Rebuttal - Con
      setCurrentSpeaker('con');
      const conRebuttalTurn: Turn = { 
        side: 'con', 
        type: 'rebuttal', 
        content: '', 
        model: `${con.provider}/${con.model}`,
        streaming: true 
      };
      debate.push(conRebuttalTurn);
      setTurns([...debate]);
      
      const conRebuttalText = await callModelStreaming(
        con, 
        buildContextForDebater('con', 'rebuttal', debate),
        (text) => {
          conRebuttalTurn.content = text;
          setTurns([...debate]);
        }
      );
      conRebuttalTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Con's rebuttal response
      if (!isValidResponse(conRebuttalText)) {
        pushToast('Con speaker failed to provide a valid rebuttal. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
    
      // Closing - Pro
      setCurrentSpeaker('pro');
      const proClosingTurn: Turn = { 
        side: 'pro', 
        type: 'closing', 
        content: '', 
        model: `${pro.provider}/${pro.model}`,
        streaming: true 
      };
      debate.push(proClosingTurn);
      setTurns([...debate]);
      
      const proClosingText = await callModelStreaming(
        pro, 
        buildContextForDebater('pro', 'closing', debate),
        (text) => {
          proClosingTurn.content = text;
          setTurns([...debate]);
        }
      );
      proClosingTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Pro's closing response
      if (!isValidResponse(proClosingText)) {
        pushToast('Pro speaker failed to provide a valid closing statement. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
      
      // Closing - Con
      setCurrentSpeaker('con');
      const conClosingTurn: Turn = { 
        side: 'con', 
        type: 'closing', 
        content: '', 
        model: `${con.provider}/${con.model}`,
        streaming: true 
      };
      debate.push(conClosingTurn);
      setTurns([...debate]);
      
      const conClosingText = await callModelStreaming(
        con, 
        buildContextForDebater('con', 'closing', debate),
        (text) => {
          conClosingTurn.content = text;
          setTurns([...debate]);
        }
      );
      conClosingTurn.streaming = false;
      setTurns([...debate]);
      
      // Validate Con's closing response
      if (!isValidResponse(conClosingText)) {
        pushToast('Con speaker failed to provide a valid closing statement. Debate terminated.');
        setCurrentSpeaker(null);
        setRunning(false);
        return;
      }
      
      setCurrentSpeaker(null);
      setRunning(false);
      
    } catch (error) {
      console.error('Debate error:', error);
      pushToast('An error occurred during the debate. Please check your API keys and try again.');
      setCurrentSpeaker(null);
      setRunning(false);
    }
  }

  const transcript = useMemo(() => {
    if (turns.length === 0) return '';
    return `Style: ${style}\nTopic: ${topic}\n\n` + 
      turns.map(t => `[${t.side.toUpperCase()} - ${t.type}] ${t.model}\n${t.content}`).join('\n\n');
  }, [turns, style, topic]);

  // Trigger judging when debate completes
  useEffect(()=>{ 
    if(!transcript || running || turns.length < 6) return; // Only judge complete debates (6 turns)
    
    (async()=>{
      setPanelRunning(true);
      
      // Use diverse panel of available models that have API keys
      const potentialJudges: Pick[] = [
        { provider:'openai', model:'gpt-4o' },
        { provider:'anthropic', model:'claude-3-5-haiku-20241022' },
        { provider:'google', model:'gemini-2.5-flash' },
        { provider:'mistral', model:'mistral-small-3.2' },
        { provider:'groq', model:'deepseek-r1-distill-llama-70b' },
      ];
      
      // Filter to only judges with available API keys
      const panel = potentialJudges.filter(j => keys[j.provider]);
      
      if (panel.length === 0) {
        setVerdicts([]);
        setPanelRunning(false);
        return;
      }
      
      // Take up to 3 judges
      const selectedJudges = panel.slice(0, 3);
      
      const prompt = `You are an impartial debate judge. Read the full debate transcript below carefully and decide which side won.

Evaluate based on:
- Strength of arguments
- Quality of rebuttals
- Logical consistency
- Persuasiveness

Output your verdict as JSON in exactly this format:
{"winner":"pro","rationale":"Brief explanation"} OR
{"winner":"con","rationale":"Brief explanation"} OR  
{"winner":"tie","rationale":"Brief explanation"}

TRANSCRIPT:
${transcript}

YOUR VERDICT (JSON only):`;
      
      const outs: Verdict[] = [];
      
      for (const j of selectedJudges){
        try{
          const text = await callModelStreaming(j, prompt, ()=>{});
          
          // Try to extract JSON from response
          const jsonMatch = text.match(/\{[^{}]*"winner"\s*:\s*"(pro|con|tie)"[^{}]*\}/i);
          let winner:'pro'|'con'|'tie'='tie'; 
          let rationale='Unable to parse verdict';
          
          if (jsonMatch){ 
            try{ 
              const obj=JSON.parse(jsonMatch[0]); 
              winner = (obj.winner?.toLowerCase() as any) || 'tie'; 
              rationale = obj.rationale || rationale; 
            } catch(e) {
              console.error('Failed to parse judge response:', e);
            }
          }
          
          outs.push({ judge:j, winner, rationale });
        } catch(error) { 
          console.error('Judge failed:', j, error);
          outs.push({ judge:j, winner:'tie', rationale:'(judging failed - check API key)' }); 
        }
      }
      
      setVerdicts(outs);
      setPanelRunning(false);
      
      // Send analytics if we got valid verdicts
      if (outs.length > 0 && outs.some(v => v.rationale !== '(judging failed - check API key)')) {
        try{ 
          await sendVote({ 
            type:'debate_verdicts', 
            anon_id: localStorage.getItem('anon_id'), 
            topic, 
            pro, 
            con, 
            transcript, 
            verdicts: outs, 
            timestamp: new Date().toISOString(), 
            source:'oss_v8.0' 
          }); 
        } catch(e) {
          console.error('Failed to send vote:', e);
        }
      }
    })();
  }, [transcript, running, turns.length, keys, topic, pro, con, style]);

  async function userVote(side:'pro'|'con'){
    await sendVote({ type:'debate', anon_id: localStorage.getItem('anon_id'), topic, pro, con, transcript, user_choice: side, timestamp: new Date().toISOString(), source:'oss_v8.0' });
    alert('Recorded your vote!');
  }

  const majority = useMemo(()=>{
    const counts = { pro: 0, con: 0, tie: 0 } as any;
    verdicts.forEach(v=>counts[v.winner]++);
    const order = ['pro','con','tie'] as const;
    return order.reduce((a,b)=> counts[b]>counts[a]?b:a, 'tie');
  },[verdicts]);

  async function generateAudio() {
    if (!keys.openai) {
      pushToast('OpenAI API key required for text-to-speech');
      return;
    }
    
    setIsGeneratingAudio(true);
    try {
      const audioTurns = turns.map(turn => ({
        side: turn.side,
        content: turn.content,
        provider: turn.side === 'pro' ? pro.provider : con.provider
      }));
      
      const blob = await generateDebateAudio(
        keys.openai,
        audioTurns,
        pro.provider,
        con.provider
      );
      
      setAudioBlob(blob);
      const player = createAudioPlayer(blob);
      setAudioPlayer(player);
      
      player.addEventListener('ended', () => setIsPlaying(false));
      player.addEventListener('pause', () => setIsPlaying(false));
      player.addEventListener('play', () => setIsPlaying(true));
      
      pushToast('Audio generated successfully!');
    } catch (error) {
      console.error('Failed to generate audio:', error);
      pushToast('Failed to generate audio. Please check your OpenAI API key.');
    } finally {
      setIsGeneratingAudio(false);
    }
  }

  function playAudio() {
    if (!audioPlayer) return;
    
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play();
      setIsPlaying(true);
    }
  }

  function downloadDebateAudio() {
    if (!audioBlob) return;
    const filename = `debate-${topic.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}.mp3`;
    downloadAudio(audioBlob, filename);
  }

  return (<div className="space-y-6">
    <div className="h1">Debate Club</div>
    <div className="card p-4 space-y-3">
      <input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Debate topic"/>
      <label className="text-sm block"><div className="small mb-1">Style</div>
        <select className="input" value={style} onChange={e=>setStyle(e.target.value)}>
          {Object.keys(STYLES).map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm"><div className="small mb-1">FOR (pro)</div><ModelSelector value={pro as any} onChange={v=>setPro(v as any)} /></label>
        <label className="text-sm"><div className="small mb-1">AGAINST (con)</div><ModelSelector value={con as any} onChange={v=>setCon(v as any)} /></label>
      </div>
      <div className="flex justify-end">
        <button className="button flex items-center gap-2" disabled={running} onClick={runDebate}>{running?<Loader/>:<Play/>}{running?'Running…':'Start debate'}</button>
      </div>
    </div>
    
    {/* Live debate display - Side by Side */}
    {turns.length > 0 && (
      <div className="space-y-4">
        <div className="text-lg font-semibold">Live Debate</div>
        
        {/* Debate Header - Show participants */}
        <div className="card p-4 bg-gradient-to-r from-green-50 to-red-50 dark:from-green-950 dark:to-red-950">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Arguing FOR</div>
              <div className="font-bold text-green-600 dark:text-green-400">
                {pro.provider}/{pro.model}
              </div>
              <div className="text-sm opacity-70 mt-1">"{topic}"</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Arguing AGAINST</div>
              <div className="font-bold text-red-600 dark:text-red-400">
                {con.provider}/{con.model}
              </div>
              <div className="text-sm opacity-70 mt-1">"{topic}"</div>
            </div>
          </div>
        </div>
        
        {/* Group turns by type for side-by-side display */}
        {['opening', 'rebuttal', 'closing'].map(turnType => {
          const proTurn = turns.find(t => t.side === 'pro' && t.type === turnType);
          const conTurn = turns.find(t => t.side === 'con' && t.type === turnType);
          
          if (!proTurn && !conTurn) return null;
          
          return (
            <div key={turnType} className="space-y-2">
              <div className="text-sm font-semibold opacity-70 uppercase tracking-wide">
                {turnType} Statements
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* FOR (Pro) Side - Left */}
                <div className={`card p-4 border-2 border-green-500/30 ${proTurn?.streaming ? 'animate-pulse' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        FOR
                      </span>
                      {proTurn && (
                        <span className="text-xs opacity-60">{proTurn.model}</span>
                      )}
                    </div>
                    {proTurn?.streaming && currentSpeaker === 'pro' && (
                      <div className="flex items-center gap-1 text-xs opacity-70">
                        <Loader /> Speaking...
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                    {proTurn ? (
                      proTurn.content || <span className="opacity-50 text-gray-500">Preparing response...</span>
                    ) : (
                      <span className="opacity-30 text-gray-500">Waiting for turn...</span>
                    )}
                  </div>
                </div>
                
                {/* AGAINST (Con) Side - Right */}
                <div className={`card p-4 border-2 border-red-500/30 ${conTurn?.streaming ? 'animate-pulse' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        AGAINST
                      </span>
                      {conTurn && (
                        <span className="text-xs opacity-60">{conTurn.model}</span>
                      )}
                    </div>
                    {conTurn?.streaming && currentSpeaker === 'con' && (
                      <div className="flex items-center gap-1 text-xs opacity-70">
                        <Loader /> Speaking...
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap">
                    {conTurn ? (
                      conTurn.content || <span className="opacity-50 text-gray-500">Preparing response...</span>
                    ) : (
                      <span className="opacity-30 text-gray-500">Waiting for turn...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    
    {transcript && !running && (
      <div className="space-y-3">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Audio Narration</div>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <span>Voices: {PROVIDER_VOICES[pro.provider]} (FOR) / {PROVIDER_VOICES[con.provider]} (AGAINST)</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {!audioBlob ? (
              <button 
                className="button flex items-center gap-2" 
                onClick={generateAudio}
                disabled={isGeneratingAudio}
              >
                {isGeneratingAudio ? <><Loader /> Generating Audio...</> : <>🎙️ Generate Audio</>}
              </button>
            ) : (
              <>
                <button 
                  className="button flex items-center gap-2" 
                  onClick={playAudio}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button 
                  className="button flex items-center gap-2" 
                  onClick={downloadDebateAudio}
                >
                  💾 Download
                </button>
                <button 
                  className="button flex items-center gap-2" 
                  onClick={generateAudio}
                  disabled={isGeneratingAudio}
                >
                  {isGeneratingAudio ? <><Loader /> Regenerating...</> : '🔄 Regenerate'}
                </button>
              </>
            )}
          </div>
          <div className="text-xs opacity-70">
            Note: AI-generated audio using OpenAI TTS. Requires OpenAI API key.
          </div>
        </div>
        <div className="card p-4 flex gap-2 items-center">
          <div className="small">You judge:</div>
          <button className="button" onClick={()=>userVote('pro')}>FOR</button>
          <button className="button" onClick={()=>userVote('con')}>AGAINST</button>
        </div>
        <div className="card p-4 space-y-2">
          <div className="font-semibold">
            AI Panel verdict 
            {panelRunning && <span className="small">(scoring…)</span>}
          </div>
          
          {verdicts.length > 0 ? (
            <>
              <div className="small">Majority decision: <b>{majority.toUpperCase()}</b></div>
              <div className="grid md:grid-cols-3 gap-3">
                {verdicts.map((v,i)=>(<div key={i} className="card p-3">
                  <div className="small mb-1">{v.judge.provider}/{v.judge.model}</div>
                  <div className="font-semibold mb-1">Winner: {v.winner.toUpperCase()}</div>
                  <div className="small">{v.rationale}</div>
                </div>))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {panelRunning ? (
                <div className="small">Waiting for AI judges to evaluate the debate...</div>
              ) : (
                <div className="small opacity-70">
                  No AI judges available. Add API keys for OpenAI, Anthropic, Google, Mistral, or Groq to enable AI judging.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </div>);
}