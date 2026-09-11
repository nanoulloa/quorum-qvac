import type { ClienteUI, EquipoUI } from './base';
import { esRenovacion, evidenciaTexto } from './reglas';

const COLUMNAS = [
  'Cliente',
  'Ciudad',
  'País',
  'Modalidad',
  'Marca',
  'Estado marca',
  'Modelo',
  'Estado modelo',
  'Antigüedad (años)',
  'Estado antigüedad',
  'Número de serie',
  'Estado número de serie',
  'Evidencia',
  'Testigos',
  'Días desde verificación',
  'Confianza',
  'Oportunidad de renovación',
];

const celda = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined || v === '—' ? '' : String(v);
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Fecha local AAAA-MM-DD (toISOString daría la de UTC). */
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Descarga los equipos como CSV. Lleva BOM para que Excel respete los acentos. */
export function exportarCsv(nombre: string, equipos: EquipoUI[], clientes: ClienteUI[]) {
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const filas = equipos.map((e) => {
    const c = porId.get(e.clienteId);
    return [
      c?.nombre,
      c?.ciudad,
      c?.pais,
      e.modalidad,
      e.marca.valor,
      e.marca.estado,
      e.modelo.valor,
      e.modelo.estado,
      e.anios,
      e.antiguedad.estado,
      e.serie.valor,
      e.serie.estado,
      evidenciaTexto[e.evidencia],
      e.testigos.map((t) => t.nombre).join(' / '),
      e.dias,
      e.confianza.total,
      esRenovacion(e) ? 'Sí' : 'No',
    ];
  });
  const csv = [COLUMNAS, ...filas].map((fila) => fila.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const enlace = Object.assign(document.createElement('a'), { href: url, download: `quorum-${nombre}-${hoy()}.csv` });
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
