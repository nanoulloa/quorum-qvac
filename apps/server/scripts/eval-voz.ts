// Compara modelos de voz a texto sobre el mismo dictado. Uso: npm run eval:voz -w @quorum/server
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { close, loadModel, transcribe, unloadModel, PARAKEET_TDT_0_6B_V3_Q8_0, WHISPER_BASE_Q8_0 } from '@qvac/sdk';

const audio = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'dictado-democare.wav');

const REFERENCIA =
  'Estoy en Hospital DemoCare Pacific, en Ciudad de Panamá. Hay dos resonadores y un tomógrafo. Uno de los resonadores es Philips, un Ingenia, y parece de unos ocho años. El tomógrafo lo cambiaron el año pasado.';

const palabras = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Tasa de error por palabra (distancia de edición / largo de la referencia). */
function wer(hipotesis: string) {
  const r = palabras(REFERENCIA);
  const h = palabras(hipotesis);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

type Variante = { nombre: string; cargar: () => Promise<string>; prompt?: string };

const VARIANTES: Variante[] = [
  { nombre: 'whisper-base sin pista', cargar: () => loadModel({ modelSrc: WHISPER_BASE_Q8_0, modelConfig: { language: 'es', temperature: 0 } }) },
  {
    nombre: 'whisper-base con pista corta',
    cargar: () => loadModel({ modelSrc: WHISPER_BASE_Q8_0, modelConfig: { language: 'es', temperature: 0 } }),
    prompt: 'Visita a un hospital: resonadores, tomógrafos y ecógrafos Philips, Siemens y GE.',
  },
  { nombre: 'parakeet-tdt-0.6b-v3', cargar: () => loadModel({ modelSrc: PARAKEET_TDT_0_6B_V3_Q8_0 }) },
];

for (const v of VARIANTES) {
  try {
    const t0 = performance.now();
    const id = await v.cargar();
    const cargaMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const texto = (await transcribe({ modelId: id, audioChunk: audio, prompt: v.prompt })).trim();
    const ms = Math.round(performance.now() - t1);
    await unloadModel({ modelId: id });
    console.log(`\n▸ ${v.nombre} · carga ${cargaMs} ms · transcripción ${ms} ms · WER ${(wer(texto) * 100).toFixed(0)}%\n  ${texto}`);
  } catch (error) {
    console.log(`\n✖ ${v.nombre}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await close();
process.exit(0);
