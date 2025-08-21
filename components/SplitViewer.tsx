'use client'; import { useState } from 'react'; import { clsx } from 'clsx'; import { Logo } from './Logos';
export default function SplitViewer({ panes }:{ panes:Array<{title:string,body:string,meta?:string, provider?:string}> }){
  const [dir,setDir]=useState<'h'|'v'>('h');
  return (<div className="space-y-2 fade-in">
    <div className="flex items-center gap-2"><span className="small">Layout</span>
      <div className="flex gap-2"><button className={clsx('button',dir==='h'&&'opacity-100')} onClick={()=>setDir('h')}>Horizontal</button><button className={clsx('button',dir==='v'&&'opacity-100')} onClick={()=>setDir('v')}>Vertical</button></div>
    </div>
    <div className={clsx('card p-4 flex gap-4', dir==='h'?'flex-row':'flex-col')}>
      {panes.map((p,i)=>(<div key={i} className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">{p.provider && <Logo provider={p.provider}/>} {p.title}</div>
        <pre className="whitespace-pre-wrap text-sm">{p.body}</pre>{p.meta&&<div className="small mt-2">{p.meta}</div>}
      </div>))}
    </div>
  </div>);
}
