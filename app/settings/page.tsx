'use client';
import { useEffect, useState } from 'react';
import { useKeys } from '@/components/KeyContext';
import { invalidateModelsCache } from '@/lib/catalog';

const PROVIDERS = ['openai','anthropic','google','mistral','groq','cerebras','xai','sarvam'] as const;

export default function SettingsPage(){
  const { keys, setup, changePassword } = useKeys();
  const [form,setForm]=useState<Record<string,string>>({});
  const [pwd,setPwd]=useState('');
  const [newPwd,setNewPwd]=useState('');
  const [saving,setSaving]=useState(false); const [msg,setMsg]=useState('');
  const [showKeys,setShowKeys]=useState<Record<string,boolean>>({});

  useEffect(()=>{ setForm(keys||{}); },[JSON.stringify(keys)]);

  async function saveKeys(e?:any){ e?.preventDefault(); if(!pwd){ alert('Enter your vault password to save.'); return; }
    setSaving(true); setMsg(''); try{ await setup(pwd, form); invalidateModelsCache(); setMsg('Saved! Keys re-encrypted locally.'); } catch(err:any){ alert(`Failed: ${String(err)}`);} finally{ setSaving(false); setPwd(''); } }

  async function doChangePassword(e?:any){ e?.preventDefault(); if(!pwd||!newPwd){ alert('Enter current and new password.'); return; } const ok=await changePassword(pwd,newPwd); if(ok){ setMsg('Password updated.'); } else { alert('Could not verify current password.'); } setPwd(''); setNewPwd(''); }

  return (<div className="space-y-6">
    <div className="h1">Settings</div>
    <form onSubmit={saveKeys} className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="small">Manage provider API keys (encrypted locally).</div>
        <button
          type="button"
          onClick={() => {
            const allShown = PROVIDERS.every(p => showKeys[p]);
            const newState: Record<string,boolean> = {};
            PROVIDERS.forEach(p => { newState[p] = !allShown; });
            setShowKeys(newState);
          }}
          className="text-xs opacity-70 hover:opacity-100 transition-opacity"
        >
          {PROVIDERS.every(p => showKeys[p]) ? '🙈 Hide All' : '👁️ Show All'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map(p=>(
          <div key={p} className="space-y-1">
            <div className="small">{p.toUpperCase()}</div>
            <div className="relative">
              <input 
                className="input pr-10" 
                type={showKeys[p] ? 'text' : 'password'}
                value={form[p]??''} 
                onChange={e=>setForm({...form,[p]:e.target.value})} 
                placeholder={`${p} API key`} 
              />
              <button
                type="button"
                onClick={()=>setShowKeys({...showKeys,[p]:!showKeys[p]})}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-sm opacity-70 hover:opacity-100 transition-opacity"
                title={showKeys[p] ? 'Hide' : 'Show'}
              >
                {showKeys[p] ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="text-sm block"><div className="small mb-1">Vault password (required to save keys)</div><input className="input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Enter password"/></label>
      <div className="flex items-center justify-between"><button className="button" type="submit" disabled={saving}>{saving?'Saving…':'Save keys'}</button><div className="small">{msg}</div></div>
    </form>
    <form onSubmit={doChangePassword} className="card p-6 space-y-3">
      <div className="font-semibold">Change vault password</div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm"><div className="small mb-1">Current password</div><input className="input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)}/></label>
        <label className="text-sm"><div className="small mb-1">New password</div><input className="input" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></label>
      </div>
      <div className="flex justify-end"><button className="button" type="submit">Update password</button></div>
    </form>
  </div>);
}
