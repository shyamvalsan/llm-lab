export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:100000, hash:"SHA-256" }, keyMaterial, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
}
export async function encryptJSON(password: string, obj: any): Promise<string> {
  const enc = new TextEncoder(); const salt=crypto.getRandomValues(new Uint8Array(16)); const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(password, salt); const data=enc.encode(JSON.stringify(obj)); const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, data);
  const out=new Uint8Array(salt.length+iv.length+new Uint8Array(cipher).length); out.set(salt,0); out.set(iv,salt.length); out.set(new Uint8Array(cipher), salt.length+iv.length);
  return btoa(String.fromCharCode(...out));
}
export async function decryptJSON(password: string, b64: string): Promise<any> {
  const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); const salt=raw.slice(0,16), iv=raw.slice(16,28), data=raw.slice(28);
  const key=await deriveKey(password, salt); const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv}, key, data); return JSON.parse(new TextDecoder().decode(plain));
}
