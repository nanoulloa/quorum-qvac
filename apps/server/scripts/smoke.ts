// Prueba de humo de QVAC (issue P0-01): carga cada modelo y ejecuta una tarea real sin conexión.
// Uso: npm run smoke -w @quorum/server
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  close,
  completion,
  embed,
  loadModel,
  transcribe,
  unloadModel,
  EMBEDDINGGEMMA_300M_Q8_0,
  MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
  QWEN3_1_7B_INST_Q4,
  VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
  WHISPER_BASE_Q8_0,
} from '@qvac/sdk';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(aqui, '..', 'fixtures');
const require = createRequire(import.meta.url);

const DICTADO_ESPERADO =
  'Estoy en Hospital DemoCare Pacific, en Ciudad de Panamá. Hay dos resonadores y un tomógrafo. Uno de los resonadores es Philips, un Ingenia, y parece de unos ocho años. El tomógrafo lo cambiaron el año pasado.';

type Progreso = { percentage: number; downloaded: number; total: number };
const progreso = (nombre: string) => (p: Progreso) => {
  const mb = (n: number) => (n / 1e6).toFixed(0);
  process.stderr.write(`\r▸ ${nombre}: ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)   `);
  if (p.percentage >= 100) process.stderr.write('\n');
};

async function medir<T>(fn: () => Promise<T>) {
  const t0 = performance.now();
  const valor = await fn();
  return { valor, ms: Math.round(performance.now() - t0) };
}

const resultados: Record<string, unknown> = {};

async function paso(nombre: string, fn: () => Promise<Record<string, unknown>>) {
  console.log(`\n=== ${nombre}`);
  try {
    const r = await fn();
    resultados[nombre] = { ok: true, ...r };
    console.log(JSON.stringify(r, null, 2));
  } catch (error) {
    resultados[nombre] = { ok: false, error: error instanceof Error ? error.message : String(error) };
    console.error(`✖ ${nombre}:`, error);
  }
}

async function completarJson(modelId: string, history: unknown[], nombre: string, schema: object) {
  const run = completion({
    modelId,
    history: history as never,
    stream: true,
    responseFormat: { type: 'json_schema', json_schema: { name: nombre, schema } },
  });
  const t0 = performance.now();
  for await (const _evento of run.events) {
    // Se consume el stream para que `final` resuelva.
  }
  const final = await run.final;
  return { ms: Math.round(performance.now() - t0), stats: final.stats, json: JSON.parse(final.contentText.trim()) };
}

let transcripcion = DICTADO_ESPERADO;

await paso('transcripcion', async () => {
  const carga = await medir(() =>
    loadModel({ modelSrc: WHISPER_BASE_Q8_0, modelConfig: { language: 'es', translate: false, temperature: 0 }, onProgress: progreso('whisper-base') }),
  );
  const t = await medir(() => transcribe({ modelId: carga.valor, audioChunk: path.join(fixtures, 'dictado-democare.wav') }));
  await unloadModel({ modelId: carga.valor });
  transcripcion = t.valor.trim() || DICTADO_ESPERADO;
  return { modelo: 'WHISPER_BASE_Q8_0', cargaMs: carga.ms, transcripcionMs: t.ms, texto: t.valor.trim() };
});

const nulo = (tipo: string) => ({ anyOf: [{ type: tipo }, { type: 'null' }] });

const ESQUEMA_OBSERVACION = {
  type: 'object',
  additionalProperties: false,
  required: ['cliente', 'ciudad', 'pais', 'equipos'],
  properties: {
    cliente: nulo('string'),
    ciudad: nulo('string'),
    pais: nulo('string'),
    equipos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['modalidad', 'marca', 'modelo', 'antiguedad_anios', 'antiguedad_estado'],
        properties: {
          modalidad: { type: 'string', enum: ['Resonancia magnética', 'Tomografía', 'Ecografía', 'Rayos X', 'Otro'] },
          marca: nulo('string'),
          modelo: nulo('string'),
          antiguedad_anios: nulo('integer'),
          antiguedad_estado: { type: 'string', enum: ['Reportado', 'Estimado', 'Desconocido'] },
        },
      },
    },
  },
};

await paso('extraccion', async () => {
  const carga = await medir(() => loadModel({ modelSrc: QWEN3_1_7B_INST_Q4, modelConfig: { ctx_size: 4096 }, onProgress: progreso('qwen3-1.7b') }));
  const r = await completarJson(
    carga.valor,
    [
      {
        role: 'system',
        content:
          'Extraes datos de equipos médicos de lo que dicta un ingeniero de campo. Cada equipo físico va por separado. ' +
          'Si un dato no se menciona, usa null. La antigüedad es Estimado si se dice con duda ("parece", "unos", "más o menos"), ' +
          'Reportado si se dice con seguridad y Desconocido si no se menciona. "El año pasado" son 1 año. /no_think',
      },
      { role: 'user', content: transcripcion },
    ],
    'observacion',
    ESQUEMA_OBSERVACION,
  );
  await unloadModel({ modelId: carga.valor });
  return { modelo: 'QWEN3_1_7B_INST_Q4', cargaMs: carga.ms, totalMs: r.ms, stats: r.stats, resultado: r.json };
});

const ESQUEMA_PLACA = {
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

await paso('placa', async () => {
  const carga = await medir(() =>
    loadModel({
      modelSrc: VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
      modelConfig: { ctx_size: 4096, projectionModelSrc: MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0, image_no_upscale: 'on' } as never,
      onProgress: progreso('visionpsy-nano'),
    }),
  );
  const r = await completarJson(
    carga.valor,
    [
      {
        role: 'user',
        content:
          'This is a photo of a medical equipment nameplate. Read the manufacturer, model, serial number and manufacture date exactly as printed. Use null for anything not legible.',
        attachments: [{ path: path.join(fixtures, 'placa-philips.png') }],
      },
    ],
    'placa',
    ESQUEMA_PLACA,
  );
  await unloadModel({ modelId: carga.valor });
  return { modelo: 'VISIONPSY_NANO_460M_MULTIMODAL_Q8_0', cargaMs: carga.ms, totalMs: r.ms, stats: r.stats, resultado: r.json };
});

await paso('embeddings', async () => {
  const carga = await medir(() => loadModel({ modelSrc: EMBEDDINGGEMMA_300M_Q8_0, onProgress: progreso('embeddinggemma') }));
  const textos = [
    'Hospital DemoCare Pacific · Resonancia magnética · Philips Ingenia · 8 años',
    'DemoCare Pacific, resonador Philips Ingenia 1.5T fabricado en 2017',
    'Clínica Vale Verde · Tomografía · GE Revolution · 3 años',
  ];
  const t = await medir(() => embed({ modelId: carga.valor, text: textos }));
  await unloadModel({ modelId: carga.valor });
  const [a, b, c] = t.valor.embedding;
  const coseno = (x: number[], y: number[]) => {
    const dot = x.reduce((s, v, i) => s + v * y[i], 0);
    return dot / (Math.hypot(...x) * Math.hypot(...y));
  };
  return {
    modelo: 'EMBEDDINGGEMMA_300M_Q8_0',
    cargaMs: carga.ms,
    embedMs: t.ms,
    dimension: a.length,
    similitudMismoEquipo: Number(coseno(a, b).toFixed(3)),
    similitudOtroEquipo: Number(coseno(a, c).toFixed(3)),
  };
});

const cpu = os.cpus()[0]?.model ?? 'desconocido';
const resumen = {
  fecha: new Date().toISOString(),
  hardware: { cpu, memoriaGB: Math.round(os.totalmem() / 1024 ** 3), sistema: `${os.type()} ${os.release()}`, arquitectura: os.arch() },
  node: process.version,
  qvacSdk: (require('@qvac/sdk/package') as { version: string }).version,
  resultados,
};

const salida = path.join(aqui, '..', '..', '..', 'docs', 'perf', `smoke-${cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`);
await fs.mkdir(path.dirname(salida), { recursive: true });
await fs.writeFile(salida, JSON.stringify(resumen, null, 2) + '\n');
console.log(`\n▸ Resumen guardado en ${path.relative(process.cwd(), salida)}`);

await close();
const fallos = Object.entries(resultados).filter(([, r]) => !(r as { ok: boolean }).ok).map(([k]) => k);
if (fallos.length) {
  console.error(`✖ Fallaron: ${fallos.join(', ')}`);
  process.exit(1);
}
console.log('✓ Todo corrió en este dispositivo');
process.exit(0);
