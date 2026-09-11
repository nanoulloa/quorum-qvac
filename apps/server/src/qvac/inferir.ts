import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { completion, transcribe } from '@qvac/sdk';
import { modelo, type ClaveModelo } from './modelos.ts';
import { registrar, type Tarea } from './perf.ts';

type Mensaje = { role: 'system' | 'user' | 'assistant'; content: string; attachments?: { path: string }[] };

type OpcionesJson = {
  clave: ClaveModelo;
  tarea: Tarea;
  history: Mensaje[];
  nombreEsquema: string;
  esquema: Record<string, unknown>;
};

/** Completion con salida JSON garantizada por esquema. Registra la inferencia en perf.jsonl. */
export async function completarJson<T>({ clave, tarea, history, nombreEsquema, esquema }: OpcionesJson): Promise<T> {
  const m = await modelo(clave);
  const t0 = performance.now();
  const prompt = history.map((h) => h.content).join('\n---\n');
  try {
    const run = completion({
      modelId: m.id,
      history: history as never,
      stream: true,
      responseFormat: { type: 'json_schema', json_schema: { name: nombreEsquema, schema: esquema } },
    });
    for await (const _evento of run.events) {
      // Se consume el stream para que `final` resuelva.
    }
    const final = await run.final;
    await registrar({
      fecha: new Date().toISOString(),
      tarea,
      modelo: m.nombre,
      cuantizacion: m.cuantizacion,
      dondeCorre: 'este-dispositivo',
      cargaMs: m.cargaMs,
      duracionMs: Math.round(performance.now() - t0),
      prompt,
      tokensEntrada: final.stats?.promptTokens,
      tokensSalida: final.stats?.generatedTokens,
      ttftMs: final.stats?.timeToFirstToken,
      tokensPorSegundo: final.stats?.tokensPerSecond,
      backend: final.stats?.backendDevice,
    });
    return JSON.parse(final.contentText.trim()) as T;
  } catch (error) {
    await registrar({
      fecha: new Date().toISOString(),
      tarea,
      modelo: m.nombre,
      cuantizacion: m.cuantizacion,
      dondeCorre: 'este-dispositivo',
      duracionMs: Math.round(performance.now() - t0),
      prompt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

const EXTENSIONES: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
};

/**
 * Transcribe audio en español. `vocabulario` orienta a Whisper con nombres propios
 * (clientes, marcas, modelos). El audio se escribe a un archivo temporal local y se borra al terminar.
 */
export async function transcribir(audio: Buffer, contentType: string, vocabulario?: string): Promise<{ texto: string; duracionMs: number }> {
  const m = await modelo('whisper');
  const extension = EXTENSIONES[contentType.split(';')[0].trim()] ?? 'wav';
  const archivo = path.join(os.tmpdir(), `quorum-${randomUUID()}.${extension}`);
  await fs.writeFile(archivo, audio);
  const t0 = performance.now();
  try {
    const texto = (await transcribe({ modelId: m.id, audioChunk: archivo, prompt: vocabulario })).trim();
    const duracionMs = Math.round(performance.now() - t0);
    await registrar({
      fecha: new Date().toISOString(),
      tarea: 'transcripcion',
      modelo: m.nombre,
      cuantizacion: m.cuantizacion,
      dondeCorre: 'este-dispositivo',
      cargaMs: m.cargaMs,
      duracionMs,
      prompt: `${(audio.byteLength / 1024).toFixed(0)} KB de audio ${extension}`,
    });
    return { texto, duracionMs };
  } finally {
    await fs.rm(archivo, { force: true });
  }
}
