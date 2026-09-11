import type { Desglose } from './confianza.ts';
import type { DatoExtraido, EquipoExtraido } from './extraccion.ts';
import type { Evidencia, Modalidad } from './index.ts';

/** Equipo tal como lo reportó una observación. `serie` llega de la lectura de placa. */
export type EquipoObservado = EquipoExtraido & {
  serie?: DatoExtraido<string>;
  evidencia?: Evidencia;
};

/** Una visita en el log de un dispositivo. El autor es la clave pública que la firmó. */
export type ObservacionGuardada = {
  tipo?: 'observacion';
  id: string;
  autor: string;
  autorNombre: string;
  fecha: string;
  fuente: Evidencia;
  transcripcion?: string;
  cliente: DatoExtraido<string>;
  ciudad: DatoExtraido<string>;
  pais: DatoExtraido<string>;
  equipos: EquipoObservado[];
};

/** Contrato de POST /api/observaciones. */
export type NuevaObservacion = Omit<ObservacionGuardada, 'tipo' | 'id' | 'autor' | 'autorNombre' | 'fecha'> & { fecha?: string };

/**
 * Decisión de una persona sobre dos reportes que podrían ser el mismo equipo.
 * `refs` apunta a equipos de observaciones: `<id de observación>-<índice del equipo>`.
 */
export type DecisionDuplicado = {
  tipo: 'fusion' | 'distintos';
  id: string;
  autor: string;
  autorNombre: string;
  fecha: string;
  refs: [string, string];
};

/** Contrato de POST /api/decisiones. */
export type NuevaDecision = Pick<DecisionDuplicado, 'tipo' | 'refs'>;

export type EntradaLog = ObservacionGuardada | DecisionDuplicado;

export const esDecision = (e: EntradaLog): e is DecisionDuplicado => e.tipo === 'fusion' || e.tipo === 'distintos';

export type Testigo = { clave: string; nombre: string; fecha: string; evidencia: Evidencia };

export type ClienteBase = { id: string; nombre: string; ciudad: string | null; pais: string | null };

/** Un equipo físico, uniendo lo que reportaron distintos testigos. */
export type EquipoBase = {
  id: string;
  /** Reportes que componen este equipo. */
  refs: string[];
  clienteId: string;
  modalidad: Modalidad;
  cantidad: number;
  marca: DatoExtraido<string>;
  modelo: DatoExtraido<string>;
  antiguedad: DatoExtraido<number>;
  serie: DatoExtraido<string>;
  testigos: Testigo[];
  evidencia: Evidencia;
  diasDesdeVerificacion: number;
  confianza: Desglose;
};

/** Contrato de GET /api/base. `distintos`: pares de reportes que alguien marcó como equipos distintos. */
export type BaseInstalada = { clientes: ClienteBase[]; equipos: EquipoBase[]; distintos: [string, string][]; generado: string };

export type Dispositivo = {
  clave: string;
  nombre: string;
  esEste: boolean;
  enLinea: boolean;
  observaciones: number;
  ultimaVez: string | null;
};

/** Contrato de GET /api/red. */
export type EstadoRed = {
  este: Dispositivo;
  dispositivos: Dispositivo[];
  conexiones: number;
  eventos: { fecha: string; texto: string }[];
};
