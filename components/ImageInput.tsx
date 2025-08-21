'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fileToDataUrl, type Img } from '@/lib/images';

export default function ImageInput({ value, onChange }:{ value: Img|null, onChange:(img:Img|null)=>void }){
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    const img = await fileToDataUrl(f); onChange(img);
  };

  const onPaste = useCallback(async (e: ClipboardEvent)=>{
    const items = e.clipboardData?.items; if (!items) return;
    for (const it of items){ if (it.type.startsWith('image/')){ const f = it.getAsFile(); if (f){ const img=await fileToDataUrl(f); onChange(img); break; } } }
  }, [onChange]);

  useEffect(()=>{
    const el = ref.current; if (!el) return;
    el.addEventListener('paste', onPaste as any); return ()=> el.removeEventListener('paste', onPaste as any);
  }, [onPaste]);

  return (
    <div ref={ref} className="space-y-2">
      <div
        className={"drag " + (drag ? "opacity-100" : "opacity-90")}
        onDragOver={e=>{ e.preventDefault(); setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
      >
        <div className="small">Paste, drag & drop, or upload an image</div>
        <input type="file" accept="image/*" className="mt-2 small" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return; const img=await fileToDataUrl(f); onChange(img);
        }} />
      </div>
      {value && (<div className="flex items-center gap-3">
        <img src={value.dataUrl} alt="attachment" className="thumb w-24 h-24 object-cover" />
        <button className="button" onClick={()=>onChange(null)}>Remove</button>
      </div>)}
    </div>
  );
}
