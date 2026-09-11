// Evaluación de VisionPsy sobre placas sintéticas (issue P1-03).
// Uso: npm run placas:generar -w @quorum/server && npm run eval:placas -w @quorum/server
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CampoPlaca } from '@quorum/shared';
import { leerPlaca } from '../src/placa/lectura.ts';
import { cerrarModelos } from '../src/qvac/modelos.ts';

const ANIO_ACTUAL = 2026;
const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(aqui, '..', 'fixtures', 'placas');
const salida = path.join(aqui, '..', '..', '..', 'docs', 'eval');

type Verdad = { archivo: string; variacion: string; marca: string; modelo: string; serie: string; anio: number };
const verdades = JSON.parse(await fs.readFile(path.join(carpeta, 'verdad.json'), 'utf8')) as Verdad[];

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[\s\-_.]/g, '');

type Conteo = { ok: number; total: number };
const nuevo = (): Conteo => ({ ok: 0, total: 0 });
const porCampo: Record<string, Conteo> = { Marca: nuevo(), Modelo: nuevo(), 'Número de serie': nuevo(), Fabricación: nuevo() };
const porVariacion: Record<string, Conteo> = {};
const confirmados = nuevo();
const latencias: number[] = [];

for (const v of verdades) {
  const imagen = await fs.readFile(path.join(carpeta, v.archivo));
  const lectura = await leerPlaca(imagen, 'image/png', ANIO_ACTUAL);
  latencias.push(lectura.duracionMs);
  const campo = (nombre: CampoPlaca['campo']) => lectura.campos.find((c) => c.campo === nombre)!;
  const aciertos: Record<string, boolean> = {
    Marca: norm(campo('Marca').valor) === norm(v.marca),
    Modelo: norm(campo('Modelo').valor) === norm(v.modelo),
    'Número de serie': norm(campo('Número de serie').valor) === norm(v.serie),
    Fabricación: lectura.antiguedad.valor === ANIO_ACTUAL - v.anio,
  };
  porVariacion[v.variacion] ??= nuevo();
  for (const [nombre, ok] of Object.entries(aciertos)) {
    porCampo[nombre].total++;
    porVariacion[v.variacion].total++;
    if (ok) {
      porCampo[nombre].ok++;
      porVariacion[v.variacion].ok++;
    }
    if (campo(nombre as CampoPlaca['campo']).estado === 'Confirmado') {
      confirmados.total++;
      if (ok) confirmados.ok++;
    }
  }
  const fallos = Object.entries(aciertos).filter(([, ok]) => !ok).map(([k]) => `${k}=${campo(k as CampoPlaca['campo']).valor}`);
  console.log(`${fallos.length ? '✖' : '✓'} ${v.archivo} (${v.variacion}, ${lectura.duracionMs} ms)${fallos.length ? `: ${fallos.join(' · ')}` : ''}`);
}

const pct = (c: Conteo) => `${c.ok}/${c.total} (${((c.ok / Math.max(1, c.total)) * 100).toFixed(0)}%)`;
const total = Object.values(porCampo).reduce((a, c) => ({ ok: a.ok + c.ok, total: a.total + c.total }), nuevo());
const ordenadas = [...latencias].sort((a, b) => a - b);
const mediana = ordenadas[Math.floor(ordenadas.length / 2)];

const md = [
  '# Evaluación de VisionPsy-Nano sobre placas sintéticas',
  '',
  `Modelo: \`VISIONPSY_NANO_460M_MULTIMODAL_Q8_0\` · Hardware: ${os.cpus()[0]?.model} · ${Math.round(os.totalmem() / 1024 ** 3)} GB · ${verdades.length} placas generadas con \`scripts/generar-placas.py\` (semilla 42).`,
  '',
  '| Campo | Acierto |',
  '|---|---|',
  ...Object.entries(porCampo).map(([k, c]) => `| ${k} | ${pct(c)} |`),
  `| **Total** | **${pct(total)}** |`,
  '',
  '| Variación | Acierto |',
  '|---|---|',
  ...Object.entries(porVariacion).map(([k, c]) => `| ${k} | ${pct(c)} |`),
  '',
  `Campos marcados **Confirmado** que eran correctos: ${pct(confirmados)}.`,
  '',
  `Latencia por placa: mediana ${mediana} ms (incluye la primera carga del modelo en la primera placa).`,
  '',
].join('\n');

await fs.mkdir(salida, { recursive: true });
await fs.writeFile(path.join(salida, 'vision.md'), md);
await fs.writeFile(path.join(salida, 'vision.json'), JSON.stringify({ porCampo, porVariacion, confirmados, latencias }, null, 2) + '\n');
console.log(`\n${md}`);
await cerrarModelos();
process.exit(0);
