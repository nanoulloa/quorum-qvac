import type { Desglose } from './confianza.ts';
import type { DatoExtraido, EquipoExtraido } from './extraccion.ts';
import type { Evidencia, Modalidad } from './index.ts';

/** Equipo tal como lo reportó una observación. `serie` llega de la lectura de placa. */
export type EquipoObservado = EquipoExtraido & {
  serie?: DatoExtraido<string>;
  evidencia?: Evidencia;
};

/** Una entrada del log de un dispositivo. El autor es la clave pública que la firmó. */
export type ObservacionGuardada = {
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
export type NuevaObservacion = Omit<ObservacionGuardada, 'id' | 'autor' | 'autorNombre' | 'fecha'> & { fecha?: string };

export type Testigo = { clave: string; nombre: string; fecha: string; evidencia: Evidencia };

export type ClienteBase = { id: string; nombre: string; ciudad: string | null; pais: string | null };

/** Un equipo físico, uniendo lo que reportaron distintos testigos. */
export type EquipoBase = {
  id: string;
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

/** Contrato de GET /api/base. */
export type BaseInstalada = { clientes: ClienteBase[]; equipos: EquipoBase[]; generado: string };

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
