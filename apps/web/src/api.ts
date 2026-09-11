import type { DecisionDuplicado, Extraccion, LecturaPlaca, NuevaDecision, NuevaObservacion, ObservacionGuardada, Transcripcion } from '@quorum/shared';

async function pedir<T>(ruta: string, init: RequestInit): Promise<T> {
  const respuesta = await fetch(ruta, init);
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (!respuesta.ok) throw new Error(cuerpo.error ?? `El servidor local respondió ${respuesta.status}`);
  return cuerpo as T;
}

const json = (cuerpo: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

/** Cliente del servidor local. Vite redirige /api a 127.0.0.1:4000. */
export const api = {
  transcribir: (audio: Blob) =>
    pedir<Transcripcion>('/api/transcribir', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/wav' }, body: audio }),
  extraer: (texto: string) => pedir<Extraccion>('/api/extraer', json({ texto })),
  leerPlaca: (foto: Blob) =>
    pedir<LecturaPlaca>('/api/placa', { method: 'POST', headers: { 'Content-Type': foto.type || 'image/png' }, body: foto }),
  guardarObservacion: (observacion: NuevaObservacion) => pedir<ObservacionGuardada>('/api/observaciones', json(observacion)),
  decidir: (decision: NuevaDecision) => pedir<DecisionDuplicado>('/api/decisiones', json(decision)),
};
