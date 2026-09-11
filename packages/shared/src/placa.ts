import type { Estado } from './index.ts';

/** Contrato de POST /api/placa. */
export type CampoPlaca = {
  campo: 'Marca' | 'Modelo' | 'Número de serie' | 'Fabricación';
  valor: string | null;
  /** 0–100: qué tan bien pasa la validación (catálogo y formato), no una probabilidad del modelo. */
  confianza: number;
  estado: Estado;
};

export type LecturaPlaca = {
  campos: CampoPlaca[];
  antiguedad: { valor: number | null; estado: Estado };
  modelo: string;
  duracionMs: number;
};
