import type { Modalidad } from './index.ts';

/** Filtros que produce una pregunta en lenguaje natural. Se aplican en código, nunca como SQL. */
export type FiltrosConsulta = {
  pais: string | null;
  ciudad: string | null;
  cliente: string | null;
  modalidad: Modalidad | null;
  marca: string | null;
  /** Inclusivo: "más de 7 años" es 8. */
  antiguedadMin: number | null;
  /** Inclusivo: "menos de 5 años" es 4. */
  antiguedadMax: number | null;
  confianzaMin: number | null;
  soloRenovacion: boolean;
  soloSinVerificar: boolean;
};

/** Contrato de POST /api/consulta. */
export type RespuestaConsulta = {
  filtros: FiltrosConsulta;
  modelo: string;
  duracionMs: number;
  /** 'par': la propuesta del modelo la corrió otro dispositivo del equipo que ofrece consultas. */
  dondeCorre: 'este-dispositivo' | 'par';
  par?: string;
};
