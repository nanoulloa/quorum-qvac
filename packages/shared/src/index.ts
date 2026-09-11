import { z } from 'zod';

export * from './confianza.ts';
export * from './consulta.ts';
export * from './extraccion.ts';
export * from './perf.ts';
export * from './placa.ts';
export * from './registro.ts';

/** Estado de cada dato capturado (requisito del reto Philips). */
export const Estado = z.enum(['Confirmado', 'Reportado', 'Estimado', 'Desconocido']);
export type Estado = z.infer<typeof Estado>;

/** De dónde salió un dato. `sync` = llegó de otro dispositivo del equipo. */
export const Evidencia = z.enum(['voz', 'texto', 'foto', 'sync']);
export type Evidencia = z.infer<typeof Evidencia>;

export const Modalidad = z.enum(['Resonancia magnética', 'Tomografía', 'Ecografía', 'Rayos X', 'Otro']);
export type Modalidad = z.infer<typeof Modalidad>;
