import type { Estado, Evidencia } from '@quorum/shared';
import type { EquipoUI } from './base';

/** Resonador o tomógrafo de más de 7 años con confianza media o alta (issue P1-10). */
export const esRenovacion = (e: EquipoUI) =>
  (e.modalidad === 'Resonancia magnética' || e.modalidad === 'Tomografía') && (e.anios ?? 0) > 7 && e.confianza.total >= 50;

export const sinVerificar = (e: EquipoUI) => e.dias > 180;

const ORDEN_ESTADO: Estado[] = ['Desconocido', 'Estimado', 'Reportado', 'Confirmado'];

/** El estado de un equipo es el de su dato más débil. */
export const estadoGeneral = (e: EquipoUI): Estado => {
  const estados = [e.marca.estado, e.modelo.estado, e.antiguedad.estado];
  return ORDEN_ESTADO.find((s) => estados.includes(s)) ?? 'Desconocido';
};

export const haceDias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`);

export const evidenciaTexto: Record<Evidencia, string> = { foto: 'Foto de placa', voz: 'Voz', texto: 'Texto', sync: 'Sincronización' };
