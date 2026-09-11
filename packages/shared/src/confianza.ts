import type { Estado, Evidencia } from './index.ts';

/** Pesos del puntaje (issue P1-04). */
export const PESOS = { completitud: 0.35, testigos: 0.35, evidencia: 0.2, frescura: 0.1 } as const;

export type EntradaConfianza = {
  /** Estado de marca, modelo y antigüedad. */
  campos: Estado[];
  /** Cantidad de claves públicas distintas que reportaron el equipo. */
  testigos: number;
  evidencia: Evidencia;
  diasDesdeVerificacion: number;
};

export type Desglose = {
  completitud: number;
  testigos: number;
  evidencia: number;
  frescura: number;
  total: number;
};

export function confianza(e: EntradaConfianza): Desglose {
  const conDato = e.campos.filter((s) => s !== 'Desconocido').length;
  const completitud = e.campos.length ? conDato / e.campos.length : 0;
  const testigos = e.testigos >= 3 ? 1 : e.testigos === 2 ? 0.8 : e.testigos === 1 ? 0.4 : 0;
  const evidencia = e.evidencia === 'foto' ? 1 : e.campos.includes('Estimado') ? 0.3 : 0.6;
  const frescura = Math.max(0, 1 - e.diasDesdeVerificacion / 180);
  const total = Math.round(
    100 *
      (PESOS.completitud * completitud +
        PESOS.testigos * testigos +
        PESOS.evidencia * evidencia +
        PESOS.frescura * frescura),
  );
  return { completitud, testigos, evidencia, frescura, total };
}
