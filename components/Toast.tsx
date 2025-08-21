'use client';
import { createContext, useContext, useState } from 'react';
type Item={ id:string, text:string };
const Ctx = createContext<{push:(t:string)=>void} | null>(null);
export function useToast(){ const c=useContext(Ctx); if(!c) throw new Error('ToastProvider missing'); return c; }
export default function ToastProvider({children}:{children:React.ReactNode}){
  const [items, setItems] = useState<Item[]>([]);
  function push(text:string){ const id = Math.random().toString(36).slice(2); setItems(x=>[...x,{id,text}]); setTimeout(()=> setItems(x=>x.filter(i=>i.id!==id)), 3000); }
  return (<Ctx.Provider value={{push}}>
    {children}
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {items.map(i=>(<div key={i.id} className="toast-enter card px-3 py-2 small">{i.text}</div>))}
    </div>
  </Ctx.Provider>);
}
