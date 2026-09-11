export type Tarea = 'transcripcion' | 'extraccion' | 'pregunta' | 'placa' | 'embeddings' | 'consulta' | 'lectura';

/** Una línea de perf.jsonl por inferencia (requisito del track QVAC Psy). Contrato de GET /api/perf. */
export type RegistroInferencia = {
  fecha: string;
  tarea: Tarea;
  modelo: string;
  cuantizacion: string;
  dondeCorre: 'este-dispositivo' | 'par';
  /** Nombre del par que corrió la inferencia, cuando `dondeCorre` es 'par'. */
  par?: string;
  cargaMs?: number;
  duracionMs: number;
  prompt?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  ttftMs?: number;
  tokensPorSegundo?: number;
  backend?: 'gpu' | 'cpu';
  error?: string;
};

/** Contrato de GET /api/sistema. */
export type Sistema = { cpu: string; memoriaGB: number; sistema: string; node: string; qvacSdk: string };
