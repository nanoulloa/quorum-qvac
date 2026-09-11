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

/** Campo que la pregunta de seguimiento puede pedir. */
export type CampoPregunta = 'antiguedad' | 'modelo' | 'marca' | 'cantidad';

/** El dato que falta y en qué equipo de la extracción. */
export type Faltante = { equipo: number; campo: CampoPregunta };

/** Contrato de POST /api/pregunta. `respuestas` son los chips que el servidor fija. */
export type Pregunta = Faltante & { pregunta: string; razon: string; respuestas: string[] };

/** Contrato de POST /api/respuesta. */
export type Respuesta = { valor: string | number | null; estado: Estado };
