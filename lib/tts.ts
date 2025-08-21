// Text-to-Speech utilities using OpenAI API

export type VoiceId = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

// Assign distinct voices to each provider for variety
export const PROVIDER_VOICES: Record<string, VoiceId> = {
  'openai': 'alloy',        // Neutral, balanced
  'anthropic': 'nova',       // Warm, friendly
  'google': 'echo',          // Clear, articulate
  'mistral': 'sage',         // Wise, thoughtful
  'groq': 'ballad',         // Expressive, dynamic
  'cerebras': 'onyx',       // Deep, authoritative
  'xai': 'shimmer',         // Bright, energetic
};

export interface TTSOptions {
  apiKey: string;
  text: string;
  voice?: VoiceId;
  model?: 'gpt-4o-mini-tts' | 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 to 4.0
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export async function generateSpeech(options: TTSOptions): Promise<Blob> {
  const {
    apiKey,
    text,
    voice = 'alloy',
    model = 'gpt-4o-mini-tts',
    speed = 1.0,
    responseFormat = 'mp3'
  } = options;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      speed,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}

export async function generateDebateAudio(
  apiKey: string,
  turns: Array<{ side: 'pro' | 'con'; content: string; provider?: string }>,
  proProvider: string,
  conProvider: string
): Promise<Blob> {
  // Generate audio for each turn with appropriate voice
  const audioChunks: ArrayBuffer[] = [];
  
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const provider = turn.side === 'pro' ? proProvider : conProvider;
    const voice = PROVIDER_VOICES[provider] || 'alloy';
    
    try {
      // Generate audio for this turn with the appropriate voice
      const audioBlob = await generateSpeech({
        apiKey,
        text: turn.content,
        voice,
        model: 'gpt-4o-mini-tts',
        speed: 1.0,
        responseFormat: 'mp3'
      });
      
      // Convert blob to ArrayBuffer for concatenation
      const arrayBuffer = await audioBlob.arrayBuffer();
      audioChunks.push(arrayBuffer);
      
    } catch (error) {
      console.error(`Failed to generate audio for turn ${i + 1}:`, error);
      // Continue with other turns even if one fails
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('Failed to generate any audio chunks');
  }
  
  // Combine all ArrayBuffers into a single ArrayBuffer
  const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of audioChunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  
  // Return as a single MP3 blob
  return new Blob([combined], { type: 'audio/mpeg' });
}

export function createAudioPlayer(audioBlob: Blob): HTMLAudioElement {
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  // Clean up the object URL when the audio is done or on error
  audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl));
  audio.addEventListener('error', () => URL.revokeObjectURL(audioUrl));
  
  return audio;
}

export async function downloadAudio(audioBlob: Blob, filename: string = 'debate.mp3') {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}