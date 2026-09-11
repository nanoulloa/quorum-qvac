// Evaluación de la extracción (issue P0-06). Uso: npm run eval:extraccion -w @quorum/server
import type { Estado, Extraccion, Modalidad } from '@quorum/shared';
import { extraer } from '../src/captura/extraccion.ts';
import { cerrarModelos } from '../src/qvac/modelos.ts';

type EquipoEsperado = { modalidad: Modalidad; cantidad: number; marca: string | null; modelo: string | null; antiguedad: number | null; estadoAntiguedad: Estado };
/** `nuevo`: escrito después de ajustar las reglas; mide la precisión sobre dictados no vistos. */
type Caso = { dictado: string; cliente: string; ciudad: string | null; pais: string | null; equipos: EquipoEsperado[]; nuevo?: true };

const ANIO = 2026;

const CASOS: Caso[] = [
  {
    dictado: 'Estoy en Hospital DemoCare Pacific, en Ciudad de Panamá. Hay dos resonadores y un tomógrafo. Uno de los resonadores es Philips, un Ingenia, y parece de unos ocho años. El tomógrafo lo cambiaron el año pasado.',
    cliente: 'DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: null,
    equipos: [
      { modalidad: 'Resonancia magnética', cantidad: 1, marca: 'Philips', modelo: 'Ingenia', antiguedad: 8, estadoAntiguedad: 'Estimado' },
      { modalidad: 'Resonancia magnética', cantidad: 1, marca: null, modelo: null, antiguedad: null, estadoAntiguedad: 'Desconocido' },
      { modalidad: 'Tomografía', cantidad: 1, marca: null, modelo: null, antiguedad: 1, estadoAntiguedad: 'Reportado' },
    ],
  },
  {
    dictado: 'Acabo de salir del Centro Médico Bahía Azul en Colón. Tienen un tomógrafo Philips Incisive de tres años y un ecógrafo Siemens.',
    cliente: 'Bahía Azul', ciudad: 'Colón', pais: null,
    equipos: [
      { modalidad: 'Tomografía', cantidad: 1, marca: 'Philips', modelo: 'Incisive', antiguedad: 3, estadoAntiguedad: 'Reportado' },
      { modalidad: 'Ecografía', cantidad: 1, marca: 'Siemens', modelo: null, antiguedad: null, estadoAntiguedad: 'Desconocido' },
    ],
  },
  {
    dictado: 'Visité la Clínica Horizonte Norte en Bogotá, Colombia. El resonador es un Achieva de Philips, calculo que tiene como diez años.',
    cliente: 'Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia',
    equipos: [{ modalidad: 'Resonancia magnética', cantidad: 1, marca: 'Philips', modelo: 'Achieva', antiguedad: 10, estadoAntiguedad: 'Estimado' }],
  },
  {
    dictado: 'En el Hospital Aurora Paulista de São Paulo hay tres ecógrafos GE, no sé de qué año son.',
    cliente: 'Aurora Paulista', ciudad: 'São Paulo', pais: null,
    equipos: [{ modalidad: 'Ecografía', cantidad: 3, marca: 'GE', modelo: null, antiguedad: null, estadoAntiguedad: 'Desconocido' }],
  },
  {
    dictado: 'Hospital Valle Sereno, en San José de Costa Rica. El tomógrafo Siemens Somatom se instaló en 2016.',
    cliente: 'Valle Sereno', ciudad: 'San José', pais: 'Costa Rica',
    equipos: [{ modalidad: 'Tomografía', cantidad: 1, marca: 'Siemens', modelo: 'Somatom', antiguedad: 10, estadoAntiguedad: 'Reportado' }],
  },
  {
    dictado: 'Estoy en el Hospital Maré Alta, en Recife. Hay un resonador que parece bastante viejo, quizás unos doce años. La marca no la vi.',
    cliente: 'Maré Alta', ciudad: 'Recife', pais: null,
    equipos: [{ modalidad: 'Resonancia magnética', cantidad: 1, marca: null, modelo: null, antiguedad: 12, estadoAntiguedad: 'Estimado' }],
  },
  {
    nuevo: true,
    dictado: 'Reporte rápido desde la Clínica Cumbres del Norte, en Monterrey, México. Vi un ecógrafo Canon Aplio de dos años y dos tomógrafos que no tenían la placa visible.',
    cliente: 'Cumbres del Norte', ciudad: 'Monterrey', pais: 'México',
    equipos: [
      { modalidad: 'Ecografía', cantidad: 1, marca: 'Canon', modelo: 'Aplio', antiguedad: 2, estadoAntiguedad: 'Reportado' },
      { modalidad: 'Tomografía', cantidad: 2, marca: null, modelo: null, antiguedad: null, estadoAntiguedad: 'Desconocido' },
    ],
  },
  {
    nuevo: true,
    dictado: 'Hospital Regional Santa Elena en Guayaquil, Ecuador. Tienen un resonador Siemens Magnetom comprado en 2019 y un ecógrafo GE Logiq de aproximadamente seis años.',
    cliente: 'Santa Elena', ciudad: 'Guayaquil', pais: 'Ecuador',
    equipos: [
      { modalidad: 'Resonancia magnética', cantidad: 1, marca: 'Siemens', modelo: 'Magnetom', antiguedad: 7, estadoAntiguedad: 'Reportado' },
      { modalidad: 'Ecografía', cantidad: 1, marca: 'GE', modelo: 'Logiq', antiguedad: 6, estadoAntiguedad: 'Estimado' },
    ],
  },
  {
    nuevo: true,
    dictado: 'Pasé por el Instituto Médico Horizonte Sur en Porto Alegre. Hay cuatro resonadores, todos Philips Ingenia, y creo que tienen unos nueve años.',
    // Coincide con el cliente registrado "Instituto Horizonte Sul" (misma ciudad); se acepta cualquiera de los dos.
    cliente: 'Horizonte Su', ciudad: 'Porto Alegre', pais: null,
    equipos: [{ modalidad: 'Resonancia magnética', cantidad: 4, marca: 'Philips', modelo: 'Ingenia', antiguedad: 9, estadoAntiguedad: 'Estimado' }],
  },
  {
    nuevo: true,
    dictado: 'Centro de Diagnóstico Luz Andina, en Quito. Hay un tomógrafo de marca Philips, el modelo no lo pude ver, y está ahí desde hace doce años.',
    cliente: 'Luz Andina', ciudad: 'Quito', pais: null,
    equipos: [{ modalidad: 'Tomografía', cantidad: 1, marca: 'Philips', modelo: null, antiguedad: 12, estadoAntiguedad: 'Reportado' }],
  },
];

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const contiene = (obtenido: string | null, esperado: string | null) =>
  esperado === null ? obtenido === null : obtenido !== null && norm(obtenido).includes(norm(esperado));

const cuenta = { ajuste: { ok: 0, total: 0 }, nuevos: { ok: 0, total: 0 } };

for (const [i, caso] of CASOS.entries()) {
  const grupo = caso.nuevo ? cuenta.nuevos : cuenta.ajuste;
  const fallos: string[] = [];
  const marcar = (ok: boolean, etiqueta: string) => {
    grupo.total++;
    if (ok) grupo.ok++;
    else fallos.push(etiqueta);
  };

  const t0 = performance.now();
  const r: Extraccion = await extraer(caso.dictado, ANIO);
  const ms = Math.round(performance.now() - t0);

  marcar(contiene(r.cliente.valor, caso.cliente), `cliente=${r.cliente.valor}`);
  marcar(caso.ciudad === null || contiene(r.ciudad.valor, caso.ciudad), `ciudad=${r.ciudad.valor}`);
  marcar(caso.pais === null || contiene(r.pais.valor, caso.pais), `pais=${r.pais.valor}`);
  marcar(r.equipos.length === caso.equipos.length, `equipos=${r.equipos.length}/${caso.equipos.length}`);

  const disponibles = [...r.equipos];
  for (const esperado of caso.equipos) {
    const idx = disponibles.findIndex((e) => e.modalidad === esperado.modalidad && contiene(e.marca.valor, esperado.marca));
    const e = idx >= 0 ? disponibles.splice(idx, 1)[0] : disponibles.find((x) => x.modalidad === esperado.modalidad);
    const tag = `${esperado.modalidad}${esperado.marca ? ` ${esperado.marca}` : ''}`;
    if (!e) {
      for (const campo of ['modalidad', 'cantidad', 'marca', 'modelo', 'antigüedad', 'estado']) marcar(false, `${tag}: falta (${campo})`);
      continue;
    }
    marcar(true, '');
    marcar(e.cantidad === esperado.cantidad, `${tag}: cantidad=${e.cantidad}`);
    marcar(contiene(e.marca.valor, esperado.marca), `${tag}: marca=${e.marca.valor}`);
    marcar(contiene(e.modelo.valor, esperado.modelo), `${tag}: modelo=${e.modelo.valor}`);
    marcar(e.antiguedad.valor === esperado.antiguedad, `${tag}: antigüedad=${e.antiguedad.valor}`);
    marcar(e.antiguedad.estado === esperado.estadoAntiguedad, `${tag}: estado=${e.antiguedad.estado}`);
  }
  console.log(`${fallos.length === 0 ? '✓' : '✖'} Caso ${i + 1}${caso.nuevo ? ' (nuevo)' : ''} (${ms} ms)${fallos.length ? `: ${fallos.join(' · ')}` : ''}`);
}

const pct = (g: { ok: number; total: number }) => `${g.ok}/${g.total} (${((g.ok / Math.max(1, g.total)) * 100).toFixed(0)}%)`;
console.log(`\nPrecisión por campo · casos de ajuste: ${pct(cuenta.ajuste)} · casos nuevos: ${pct(cuenta.nuevos)}`);
await cerrarModelos();
process.exit(0);
