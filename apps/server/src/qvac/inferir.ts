import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { completion, textToSpeech, transcribe } from '@qvac/sdk';
import type { RegistroInferencia } from '@quorum/shared';
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

/**
 * Completion con salida JSON garantizada por esquema. Registra la inferencia en perf.jsonl y devuelve
 * también ese registro, para que un par que delegó la consulta sepa qué modelo la corrió y cuánto tardó.
 */
export async function completarJsonConRegistro<T>({ clave, tarea, history, nombreEsquema, esquema }: OpcionesJson): Promise<{ valor: T; registro: RegistroInferencia }> {
  const m = await modelo(clave);
  const t0 = performance.now();
  const prompt = history.map((h) => h.content).join('\n---\n');
  try {
    const run = completion({
      modelId: m.id,
      history: history as never,
      stream: true,
      // Temperatura 0 y semilla fija: el mismo dictado debe dar siempre los mismos datos.
      generationParams: { temp: 0, seed: 7, predict: 768 },
      responseFormat: { type: 'json_schema', json_schema: { name: nombreEsquema, schema: esquema } },
    });
    for await (const _evento of run.events) {
      // Se consume el stream para que `final` resuelva.
    }
    const final = await run.final;
    const registro: RegistroInferencia = {
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
    };
    await registrar(registro);
    return { valor: JSON.parse(final.contentText.trim()) as T, registro };
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

/** Completion con salida JSON garantizada por esquema. Registra la inferencia en perf.jsonl. */
export async function completarJson<T>(opciones: OpcionesJson): Promise<T> {
  return (await completarJsonConRegistro<T>(opciones)).valor;
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

/** Transcribe audio. El audio se escribe a un archivo temporal local y se borra al terminar. */
export async function transcribir(audio: Buffer, contentType: string): Promise<{ texto: string; duracionMs: number }> {
  const m = await modelo('voz');
  const extension = EXTENSIONES[contentType.split(';')[0].trim()] ?? 'wav';
  const archivo = path.join(os.tmpdir(), `quorum-${randomUUID()}.${extension}`);
  await fs.writeFile(archivo, audio);
  const t0 = performance.now();
  try {
    const texto = (await transcribe({ modelId: m.id, audioChunk: archivo })).trim();
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

/** Frecuencia de salida de Supertonic sin el mejorador LavaSR (ejemplo `tts/supertonic-multilingual` del SDK). */
const FRECUENCIA_VOZ = 44_100;

/** WAV PCM de 16 bits mono, para que el navegador lo reproduzca directo. */
function aWav(muestras: number[], frecuencia: number): Buffer {
  const datos = Buffer.from(Int16Array.from(muestras).buffer);
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVE', 8);
  cabecera.write('fmt ', 12);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);
  cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(frecuencia, 24);
  cabecera.writeUInt32LE(frecuencia * 2, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

/** Lee un texto en voz alta en este dispositivo (Supertonic, español) y lo devuelve como WAV. */
export async function leerEnVozAlta(texto: string): Promise<{ wav: Buffer; duracionMs: number }> {
  const m = await modelo('lectura');
  const t0 = performance.now();
  try {
    const muestras = await textToSpeech({ modelId: m.id, text: texto, inputType: 'text', stream: false }).buffer;
    const duracionMs = Math.round(performance.now() - t0);
    await registrar({
      fecha: new Date().toISOString(),
      tarea: 'lectura',
      modelo: m.nombre,
      cuantizacion: m.cuantizacion,
      dondeCorre: 'este-dispositivo',
      cargaMs: m.cargaMs,
      duracionMs,
      prompt: texto,
    });
    return { wav: aWav(muestras, FRECUENCIA_VOZ), duracionMs };
  } catch (error) {
    await registrar({
      fecha: new Date().toISOString(),
      tarea: 'lectura',
      modelo: m.nombre,
      cuantizacion: m.cuantizacion,
      dondeCorre: 'este-dispositivo',
      duracionMs: Math.round(performance.now() - t0),
      prompt: texto,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
