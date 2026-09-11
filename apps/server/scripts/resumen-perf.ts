// Evidencia de rendimiento para el track QVAC Psy (issue E-03).
// Copia perf.jsonl a docs/perf y escribe un resumen por tarea y modelo.
// Uso: npm run perf:resumen -w @quorum/server
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { RegistroInferencia } from '@quorum/shared';
import { RUTA_PERF } from '../src/qvac/perf.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(aqui, '..', '..', '..', 'docs', 'perf');
const cpu = os.cpus()[0]?.model ?? 'desconocido';
const slug = cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const qvacSdk = (createRequire(import.meta.url)('@qvac/sdk/package') as { version: string }).version;

const lineas = (await fs.readFile(RUTA_PERF, 'utf8')).trim().split('\n').filter(Boolean);
const registros = lineas.map((l) => JSON.parse(l) as RegistroInferencia).filter((r) => !r.error);

const mediana = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
const fmt = (v: number | null, unidad: string, decimales = 0) => (v === null ? '—' : `${v.toFixed(decimales).replace('.', ',')}${unidad ? ` ${unidad}` : ''}`);

const grupos = new Map<string, RegistroInferencia[]>();
for (const r of registros) {
  const clave = `${r.tarea}|${r.modelo}|${r.cuantizacion}`;
  grupos.set(clave, [...(grupos.get(clave) ?? []), r]);
}

const filas = [...grupos.entries()].map(([clave, rs]) => {
  const [tarea, modelo, cuantizacion] = clave.split('|');
  const cargas = rs.map((r) => r.cargaMs).filter((x): x is number => typeof x === 'number');
  return `| ${tarea} | \`${modelo}\` | ${cuantizacion} | ${rs.length} | ${fmt(cargas.length ? Math.min(...cargas) : null, 'ms')} | ${fmt(mediana(rs.map((r) => r.ttftMs)), 'ms')} | ${fmt(mediana(rs.map((r) => r.tokensPorSegundo)), 'tok/s', 1)} | ${fmt(mediana(rs.map((r) => r.tokensEntrada)), '')} | ${fmt(mediana(rs.map((r) => r.tokensSalida)), '')} | ${fmt(mediana(rs.map((r) => r.duracionMs)), 'ms')} |`;
});

const archivoLog = `perf-${slug}.jsonl`;
const md = [
  '# Registro de rendimiento',
  '',
  `Hardware: ${cpu} · ${Math.round(os.totalmem() / 1024 ** 3)} GB · ${os.type()} ${os.release()} · Node ${process.version} · \`@qvac/sdk\` ${qvacSdk}.`,
  '',
  `Todas las inferencias corrieron en este dispositivo. ${registros.length} llamadas registradas (sesiones de prueba de humo, evaluaciones y uso de la app). Cada línea de [\`${archivoLog}\`](${archivoLog}) incluye modelo, cuantización, prompt, tokens de entrada y salida, tiempo al primer token, tokens por segundo, duración y backend.`,
  '',
  '| Tarea | Modelo | Cuantización | Llamadas | Carga (mín.) | Primer token (mediana) | Velocidad (mediana) | Tokens entrada | Tokens salida | Duración (mediana) |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...filas,
  '',
  'La carga mínima es con el modelo ya descargado; la primera carga incluye la descarga desde el registro de QVAC. Los datos de los prompts son ficticios.',
  '',
  'Para regenerar: `npm run perf:resumen -w @quorum/server`.',
  '',
].join('\n');

await fs.mkdir(destino, { recursive: true });
await fs.copyFile(RUTA_PERF, path.join(destino, archivoLog));
await fs.writeFile(path.join(destino, 'README.md'), md);
console.log(md);
