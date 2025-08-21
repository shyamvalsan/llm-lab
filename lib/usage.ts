import { costUSD } from './pricing';
export type UsageEntry = {
  ts: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costInput: number;
  costOutput: number;
  costTotal: number;
  activity: 'compare'|'sampling'|'debate'|'judge';
};
const KEY='usage_v1';
export function addUsage(u: Omit<UsageEntry,'ts'|'costInput'|'costOutput'|'costTotal'>){
  const ts = new Date().toISOString();
  const costs = costUSD(u.provider, u.model, u.promptTokens, u.completionTokens);
  const entry: UsageEntry = { ts, costInput: costs.input, costOutput: costs.output, costTotal: costs.total, ...u };
  const arr = getUsage(); arr.push(entry);
  try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch{}
}
export function getUsage(): UsageEntry[]{
  try{ const raw=localStorage.getItem(KEY); if(!raw) return []; const arr=JSON.parse(raw); if(Array.isArray(arr)) return arr; }catch{} return [];
}
export function clearUsage(){ try{ localStorage.removeItem(KEY); }catch{} }
