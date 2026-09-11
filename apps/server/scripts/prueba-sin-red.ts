// Verifica que la IA funciona sin internet (modo avión simulado con sandbox de macOS).
// Uso: npm run prueba:sin-red -w @quorum/server  (los modelos tienen que estar descargados antes)
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { extraer } from '../src/captura/extraccion.ts';
import { leerPlaca } from '../src/placa/lectura.ts';
import { leerEnVozAlta, transcribir } from '../src/qvac/inferir.ts';
import { cerrarModelos } from '../src/qvac/modelos.ts';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
let fallos = 0;

async function paso(nombre: string, fn: () => Promise<string>) {
  const t0 = performance.now();
  try {
    const detalle = await fn();
    console.log(`✓ ${nombre} (${Math.round(performance.now() - t0)} ms) · ${detalle}`);
  } catch (error) {
    fallos++;
    console.log(`✖ ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await paso('internet bloqueado', async () => {
  try {
    await fetch('https://huggingface.co', { signal: AbortSignal.timeout(5000) });
  } catch {
    return 'la conexión a internet falla, como en modo avión';
  }
  throw new Error('hay acceso a internet: la prueba no está aislada');
});

let texto = '';
await paso('voz a texto (Parakeet)', async () => {
  const audio = await fs.readFile(path.join(fixtures, 'dictado-democare.wav'));
  texto = (await transcribir(audio, 'audio/wav')).texto;
  return texto.slice(0, 60);
});

await paso('extracción (Qwen3 1.7B)', async () => {
  const r = await extraer(texto || 'Estoy en Hospital DemoCare Pacific. Hay un tomógrafo Philips de tres años.');
  return `${r.cliente.valor} · ${r.equipos.length} equipos`;
});

await paso('lectura de placa (VisionPsy)', async () => {
  const r = await leerPlaca(await fs.readFile(path.join(fixtures, 'placa-philips.png')), 'image/png');
  return r.campos.map((c) => `${c.campo}=${c.valor}`).join(' · ');
});

await paso('pregunta en voz alta (Supertonic)', async () => {
  const { wav } = await leerEnVozAlta('¿Qué marca tiene el tomógrafo?');
  return `${Math.round(wav.length / 1024)} KB de audio WAV, ${((wav.length - 44) / 2 / 44_100).toFixed(1).replace('.', ',')} s`;
});

await cerrarModelos();
console.log(fallos ? `\n✖ ${fallos} pasos fallaron sin red` : '\n✓ Toda la IA funciona sin internet');
process.exit(fallos ? 1 : 0);
