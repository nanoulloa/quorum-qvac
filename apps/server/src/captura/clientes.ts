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

/** "Centro Médico Bahía Azul en Colón" → "Centro Médico Bahía Azul" cuando la ciudad ya se extrajo aparte. */
export function sinCiudad(cliente: string | null, ciudad: string | null): string | null {
  if (!cliente || !ciudad) return cliente;
  const i = normalizar(cliente).lastIndexOf(` en ${normalizar(ciudad)}`);
  if (i <= 0) return cliente;
  const palabrasAntes = normalizar(cliente).slice(0, i).split(' ').length;
  return cliente.split(/\s+/).slice(0, palabrasAntes).join(' ').replace(/[,\s]+$/, '');
}

/**
 * Devuelve el nombre registrado si el cliente transcrito se le parece lo suficiente
 * ("Hospital Tembocar el Pacific" → "Hospital DemoCare Pacific"). Si no, null.
 */
export function clienteConocido(nombre: string | null, conocidos = CLIENTES_CONOCIDOS): string | null {
  if (!nombre) return null;
  const buscado = sinTipo(nombre);
  let mejor: { nombre: string; diferencia: number } | null = null;
  for (const c of conocidos) {
    const registrado = sinTipo(c);
    const contenido = registrado.length >= 6 && (buscado.includes(registrado) || registrado.includes(buscado));
    const d = contenido ? 0 : diferencia(buscado, registrado);
    if (d <= 0.35 && (!mejor || d < mejor.diferencia)) mejor = { nombre: c, diferencia: d };
  }
  return mejor?.nombre ?? null;
}
