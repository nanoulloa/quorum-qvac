import type { Extraccion, LecturaPlaca, Transcripcion } from '@quorum/shared';

async function pedir<T>(ruta: string, init: RequestInit): Promise<T> {
  const respuesta = await fetch(ruta, init);
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (!respuesta.ok) throw new Error(cuerpo.error ?? `El servidor local respondió ${respuesta.status}`);
  return cuerpo as T;
}

/** Cliente del servidor local. Vite redirige /api a 127.0.0.1:4000. */
export const api = {
  transcribir: (audio: Blob) =>
    pedir<Transcripcion>('/api/transcribir', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/wav' }, body: audio }),
  extraer: (texto: string) =>
    pedir<Extraccion>('/api/extraer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) }),
  leerPlaca: (foto: Blob) =>
    pedir<LecturaPlaca>('/api/placa', { method: 'POST', headers: { 'Content-Type': foto.type || 'image/png' }, body: foto }),
};
