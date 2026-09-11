import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import type { CampoPlaca, Estado, LecturaPlaca } from '@quorum/shared';
import { CATALOGO, marcaConocida } from '../captura/catalogo.ts';
import { completarJson } from '../qvac/inferir.ts';
import { CATALOGO as MODELOS } from '../qvac/modelos.ts';

const nulo = (tipo: string) => ({ anyOf: [{ type: tipo }, { type: 'null' }] });

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['manufacturer', 'model', 'serial_number', 'manufacture_date'],
  properties: {
    manufacturer: nulo('string'),
    model: nulo('string'),
    serial_number: nulo('string'),
    manufacture_date: nulo('string'),
  },
};

// VisionPsy solo admite instrucciones en inglés.
const INSTRUCCION =
  'This is a photo of a medical equipment nameplate. Read the manufacturer, model, serial number and manufacture date exactly as printed. Use null for anything not legible.';

const EXTENSIONES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp' };

type Crudo = { manufacturer: string | null; model: string | null; serial_number: string | null; manufacture_date: string | null };

const estado = (confianza: number): Estado => (confianza >= 70 ? 'Confirmado' : confianza > 0 ? 'Estimado' : 'Desconocido');

const campo = (nombre: CampoPlaca['campo'], valor: string | null, confianza: number): CampoPlaca => ({
  campo: nombre,
  valor,
  confianza: valor ? confianza : 0,
  estado: valor ? estado(confianza) : 'Desconocido',
});

/** "2017-03", "03/2017", "Mar 2017" o "2017" → año. */
function anioDeFecha(fecha: string | null, anioActual: number): number | null {
  const anio = fecha?.match(/\b(19[89]\d|20\d{2})\b/)?.[1];
  const n = anio ? Number(anio) : NaN;
  return n >= 1980 && n <= anioActual ? n : null;
}

/**
 * Lee la placa con VisionPsy en este dispositivo (nunca se delega) y valida cada campo
 * contra el catálogo y el formato esperado para decidir si queda Confirmado o Estimado.
 */
export async function leerPlaca(imagen: Buffer, contentType: string, anioActual = new Date().getFullYear()): Promise<LecturaPlaca> {
  const extension = EXTENSIONES[contentType.split(';')[0].trim()] ?? 'png';
  const archivo = path.join(os.tmpdir(), `quorum-placa-${randomUUID()}.${extension}`);
  await fs.writeFile(archivo, imagen);
  const t0 = performance.now();
  try {
    const crudo = await completarJson<Crudo>({
      clave: 'vision',
      tarea: 'placa',
      nombreEsquema: 'placa',
      esquema: ESQUEMA,
      history: [{ role: 'user', content: INSTRUCCION, attachments: [{ path: archivo }] }],
    });

    const marcaLeida = crudo.manufacturer?.trim() || null;
    const marca = marcaConocida(marcaLeida);
    const modelo = crudo.model?.trim() || null;
    const modeloEnCatalogo = Boolean(marca && modelo && CATALOGO[marca].some((m) => modelo.toLowerCase().startsWith(m.toLowerCase())));
    const serie = crudo.serial_number?.replace(/^\s*(s\/?n|serial( no\.?| number)?|no\.?)[\s:#.]*/i, '').trim() || null;
    const anio = anioDeFecha(crudo.manufacture_date, anioActual);

    const campos = [
      campo('Marca', marca ?? marcaLeida, marca ? 95 : 55),
      campo('Modelo', modelo, modeloEnCatalogo ? 92 : 60),
      campo('Número de serie', serie, serie && /^[A-Z0-9-]{4,20}$/i.test(serie) ? 80 : 50),
      campo('Fabricación', crudo.manufacture_date?.trim() || null, anio ? 88 : 40),
    ];

    const fabricacion = campos[3];
    return {
      campos,
      antiguedad: anio ? { valor: anioActual - anio, estado: fabricacion.estado } : { valor: null, estado: 'Desconocido' },
      modelo: `${MODELOS.vision.nombre} · ${MODELOS.vision.cuantizacion}`,
      duracionMs: Math.round(performance.now() - t0),
    };
  } finally {
    await fs.rm(archivo, { force: true });
  }
}
