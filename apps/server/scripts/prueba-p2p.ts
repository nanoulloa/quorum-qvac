// Prueba de sincronización P2P (issue P1-06): dos dispositivos con almacenes separados, sin servidor.
// Uso: npm run prueba:p2p -w @quorum/server  (necesita red para que Hyperswarm encuentre al otro par)
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NuevaObservacion } from '@quorum/shared';
import { Almacen } from '../src/datos/almacen.ts';
import { Red } from '../src/red/red.ts';

// Secreto propio: la prueba no debe mezclarse con dispositivos reales del equipo.
const secreto = `prueba-${randomUUID()}`;
const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'quorum-p2p-'));
const a = new Almacen(path.join(carpeta, 'a'), 'Laptop A');
const b = new Almacen(path.join(carpeta, 'b'), 'Laptop B');
await a.abrir();
await b.abrir();

const visita = (cliente: string): NuevaObservacion => ({
  fuente: 'texto',
  cliente: { valor: cliente, estado: 'Reportado' },
  ciudad: { valor: 'Ciudad de Panamá', estado: 'Reportado' },
  pais: { valor: 'Panamá', estado: 'Reportado' },
  equipos: [
    {
      modalidad: 'Tomografía',
      cantidad: 1,
      marca: { valor: 'Philips', estado: 'Reportado' },
      modelo: { valor: 'Incisive', estado: 'Reportado' },
      antiguedad: { valor: 3, estado: 'Reportado' },
    },
  ],
});

async function esperar(condicion: () => Promise<boolean>, limiteMs = 90_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    if (await condicion()) return Date.now() - inicio;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

await a.guardar(visita('Hospital DemoCare Pacific'));
const redA = new Red(a, secreto);
const redB = new Red(b, secreto);
redA.iniciar();
redB.iniciar();

const ab = await esperar(async () => (await b.observaciones()).some((o) => o.autor === a.clave));
console.log(ab === null ? '✖ B no recibió la visita de A' : `✓ B recibió la visita de A en ${ab} ms (incluye encontrarse)`);

await b.guardar(visita('Clínica Vale Verde'));
const ba = await esperar(async () => (await a.observaciones()).some((o) => o.autor === b.clave), 30_000);
console.log(ba === null ? '✖ A no recibió la visita de B' : `✓ A recibió la visita de B en ${ba} ms (ya conectados)`);

console.log('\nEventos de A:');
for (const e of redA.estado().eventos.reverse()) console.log(`  ${e.texto}`);

await redA.cerrar();
await redB.cerrar();
await a.cerrar();
await b.cerrar();
await fs.rm(carpeta, { recursive: true, force: true });
process.exit(ab !== null && ba !== null ? 0 : 1);
