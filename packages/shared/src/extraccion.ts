import type { Estado, Modalidad } from './index.ts';

/** Contrato de POST /api/extraer. */
export type DatoExtraido<T> = { valor: T | null; estado: Estado };

export type EquipoExtraido = {
  modalidad: Modalidad;
  cantidad: number;
  marca: DatoExtraido<string>;
  modelo: DatoExtraido<string>;
  antiguedad: DatoExtraido<number>;
};

export type Extraccion = {
  cliente: DatoExtraido<string>;
  ciudad: DatoExtraido<string>;
  pais: DatoExtraido<string>;
  equipos: EquipoExtraido[];
};

/** Contrato de POST /api/transcribir. */
export type Transcripcion = { texto: string; duracionMs: number };
