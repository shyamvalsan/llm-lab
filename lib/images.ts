export type Img = { mime: string; dataUrl: string };
export async function fileToDataUrl(file: File): Promise<Img>{
  const b = await file.arrayBuffer();
  const mime = file.type || 'image/png';
  const dataUrl = `data:${mime};base64,` + btoa(String.fromCharCode(...new Uint8Array(b)));
  return { mime, dataUrl };
}
