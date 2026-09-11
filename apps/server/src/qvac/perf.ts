import fs from 'node:fs/promises';
import path from 'node:path';
import type { RegistroInferencia } from '@quorum/shared';

export type { RegistroInferencia, Tarea } from '@quorum/shared';

export const RUTA_PERF = process.env.QUORUM_PERF_LOG ?? path.resolve(process.cwd(), 'perf.jsonl');

let escritura: Promise<void> = Promise.resolve();

/** Agrega una línea al registro. Las escrituras se encolan para no mezclar líneas. */
export function registrar(registro: RegistroInferencia): Promise<void> {
  const linea = `${JSON.stringify(registro)}\n`;
  escritura = escritura.then(() => fs.appendFile(RUTA_PERF, linea)).catch((error) => {
    console.error('No se pudo escribir perf.jsonl:', error);
  });
  return escritura;
}

/** Devuelve las últimas `limite` inferencias, la más reciente primero. */
export async function leerRegistro(limite = 100): Promise<RegistroInferencia[]> {
  let contenido = '';
  try {
    contenido = await fs.readFile(RUTA_PERF, 'utf8');
  } catch {
    return [];
  }
  return contenido
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-limite)
    .map((linea) => JSON.parse(linea) as RegistroInferencia)
    .reverse();
}
