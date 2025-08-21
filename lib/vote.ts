export async function sendVote(payload: any){
  try{
    const url = process.env.NEXT_PUBLIC_COLLECTOR_URL || '';
    if (url) { await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); return; }
  }catch(e){ console.warn('collector fail', e); }
}
