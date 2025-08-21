'use client'; import { createContext, useContext, useEffect, useState } from 'react'; import { decryptJSON, encryptJSON } from '@/lib/crypto';
type Keys=Record<string,string>; type KeyCtx={keys:Keys; unlocked:boolean; unlock:(pwd:string)=>Promise<boolean>; setup:(pwd:string,initial:Keys)=>Promise<void>; changePassword:(oldPwd:string,newPwd:string)=>Promise<boolean>;};
const Ctx=createContext<KeyCtx|null>(null); export function useKeys(){ const c=useContext(Ctx); if(!c) throw new Error('KeyContext missing'); return c; }
export default function KeyProvider({children}:{children:React.ReactNode}){ const [keys,setKeys]=useState<Keys>({}); const [unlocked,setUnlocked]=useState(false);
  async function unlock(pwd:string){ const v=localStorage.getItem('vault'); if(!v) return false; try{ const j=await decryptJSON(pwd,v); setKeys(j); setUnlocked(true); sessionStorage.setItem('unlocked','1'); sessionStorage.setItem('keys-cache', JSON.stringify(j)); return true; }catch{ return false; } }
  async function setup(pwd:string,initial:Keys){ const b64=await encryptJSON(pwd,initial); localStorage.setItem('vault',b64); localStorage.setItem('vault_hint','set'); setKeys(initial); setUnlocked(true); sessionStorage.setItem('unlocked','1'); sessionStorage.setItem('keys-cache', JSON.stringify(initial)); }
  async function changePassword(oldPwd:string,newPwd:string){ const v=localStorage.getItem('vault'); if(!v) return false; try{ const j=await decryptJSON(oldPwd,v); await setup(newPwd,j); return true; }catch{return false;} }
  useEffect(()=>{ if(sessionStorage.getItem('unlocked')==='1'){ setUnlocked(true); const cached=sessionStorage.getItem('keys-cache'); if(cached) setKeys(JSON.parse(cached)); } },[]);
  return <Ctx.Provider value={{keys,unlocked,unlock,setup,changePassword}}>{children}</Ctx.Provider>;
}
