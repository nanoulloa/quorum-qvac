import { diferencia, normalizar } from './texto.ts';

// Clientes ficticios que el equipo ya tiene registrados. Con la base P2P (P0-04) esta lista sale de ahí.
export const CLIENTES_CONOCIDOS = [
  'Hospital DemoCare Pacific',
  'Centro Médico Bahía Azul',
  'Clínica Horizonte Norte',
  'Hospital Valle Sereno',
  'Hospital Aurora Paulista',
  'Instituto Horizonte Sul',
  'Clínica Vale Verde',
  'Hospital Maré Alta',
];

const sinTipo = (s: string) => normalizar(s).replace(/^(hospital|clinica|centro medico|centro de diagnostico|instituto( medico)?)\s+/, '');

/**
 * Devuelve el nombre registrado si el cliente transcrito se le parece lo suficiente
 * ("Hospital Tembocar el Pacific" → "Hospital DemoCare Pacific"). Si no, null.
 */
export function clienteConocido(nombre: string | null, conocidos = CLIENTES_CONOCIDOS): string | null {
  if (!nombre) return null;
  const buscado = sinTipo(nombre);
  let mejor: { nombre: string; diferencia: number } | null = null;
  for (const c of conocidos) {
    const d = diferencia(buscado, sinTipo(c));
    if (d <= 0.35 && (!mejor || d < mejor.diferencia)) mejor = { nombre: c, diferencia: d };
  }
  return mejor?.nombre ?? null;
}
