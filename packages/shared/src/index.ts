import { z } from 'zod';

export * from './confianza.ts';
export * from './extraccion.ts';
export * from './placa.ts';

/** Estado de cada dato capturado (requisito del reto Philips). */
export const Estado = z.enum(['Confirmado', 'Reportado', 'Estimado', 'Desconocido']);
export type Estado = z.infer<typeof Estado>;

/** De dónde salió un dato. `sync` = llegó de otro dispositivo del equipo. */
export const Evidencia = z.enum(['voz', 'texto', 'foto', 'sync']);
export type Evidencia = z.infer<typeof Evidencia>;

export const Modalidad = z.enum(['Resonancia magnética', 'Tomografía', 'Ecografía', 'Rayos X', 'Otro']);
export type Modalidad = z.infer<typeof Modalidad>;

export const CampoTexto = z.object({
  valor: z.string().nullable(),
  estado: Estado,
  evidencia: Evidencia.optional(),
});
export type CampoTexto = z.infer<typeof CampoTexto>;

export const CampoNumero = z.object({
  valor: z.number().nullable(),
  estado: Estado,
  evidencia: Evidencia.optional(),
});
export type CampoNumero = z.infer<typeof CampoNumero>;

export const Equipo = z.object({
  id: z.string(),
  modalidad: Modalidad,
  cantidad: z.number().int().positive(),
  marca: CampoTexto,
  modelo: CampoTexto,
  /** Años desde fabricación o instalación. */
  antiguedad: CampoNumero,
  serie: CampoTexto.optional(),
});
export type Equipo = z.infer<typeof Equipo>;

export const Observacion = z.object({
  id: z.string(),
  /** Clave pública (ed25519) del dispositivo que la firmó. */
  autor: z.string(),
  fecha: z.string(),
  fuente: Evidencia,
  transcripcion: z.string().optional(),
  cliente: CampoTexto,
  ciudad: CampoTexto,
  pais: CampoTexto,
  equipos: z.array(Equipo),
});
export type Observacion = z.infer<typeof Observacion>;
