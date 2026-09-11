import { performance } from 'node:perf_hooks';
import {
  close,
  loadModel,
  unloadModel,
  EMBEDDINGGEMMA_300M_Q8_0,
  MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
  PARAKEET_TDT_0_6B_V3_Q8_0,
  QWEN3_1_7B_INST_Q4,
  QWEN3_4B_INST_Q4_K_M,
  TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
  VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
} from '@qvac/sdk';

export type ClaveModelo = 'voz' | 'extraccion' | 'consultas' | 'vision' | 'embeddings' | 'lectura';

type Definicion = {
  nombre: string;
  cuantizacion: string;
  cargar: () => Promise<string>;
};

/**
 * Todos los modelos corren en este dispositivo. Solo las consultas pueden correr en un par del equipo que
 * las ofrece (red/red.ts); VisionPsy nunca se delega (regla del track Psy).
 */
export const CATALOGO: Record<ClaveModelo, Definicion> = {
  // Parakeet v3: 14% de error por palabra en el dictado de prueba contra 25–31% de whisper-base (scripts/eval-voz.ts).
  voz: {
    nombre: 'parakeet-tdt-0.6b-v3',
    cuantizacion: 'Q8_0',
    cargar: () => loadModel({ modelSrc: PARAKEET_TDT_0_6B_V3_Q8_0 }),
  },
  extraccion: {
    nombre: 'qwen3-1.7b',
    cuantizacion: 'Q4',
    cargar: () => loadModel({ modelSrc: QWEN3_1_7B_INST_Q4, modelConfig: { ctx_size: 4096 } }),
  },
  consultas: {
    nombre: 'qwen3-4b',
    cuantizacion: 'Q4_K_M',
    cargar: () => loadModel({ modelSrc: QWEN3_4B_INST_Q4_K_M, modelConfig: { ctx_size: 4096 } }),
  },
  vision: {
    nombre: 'visionpsy-nano-460m',
    cuantizacion: 'Q8_0',
    cargar: () =>
      loadModel({
        modelSrc: VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
        modelConfig: { ctx_size: 4096, projectionModelSrc: MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0, image_no_upscale: 'on' } as never,
      }),
  },
  embeddings: {
    nombre: 'embeddinggemma-300m',
    cuantizacion: 'Q8_0',
    cargar: () => loadModel({ modelSrc: EMBEDDINGGEMMA_300M_Q8_0 }),
  },
  // Supertonic 3 multilingüe en español: lee en voz alta la pregunta de seguimiento para capturar con manos libres.
  lectura: {
    nombre: 'supertonic-3',
    cuantizacion: 'Q8_0',
    cargar: () =>
      loadModel({
        modelSrc: TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
        modelConfig: { ttsEngine: 'supertonic', language: 'es', voice: 'F1', ttsSpeed: 1.05, ttsNumInferenceSteps: 5 } as never,
      }),
  },
};

export type ModeloCargado = Omit<Definicion, 'cargar'> & { id: string; cargaMs: number };

const cargados = new Map<ClaveModelo, Promise<ModeloCargado>>();

/** Carga el modelo la primera vez que se pide y reutiliza la misma instancia después. */
export function modelo(clave: ClaveModelo): Promise<ModeloCargado> {
  let promesa = cargados.get(clave);
  if (!promesa) {
    const { cargar, ...info } = CATALOGO[clave];
    const t0 = performance.now();
    promesa = cargar().then((id) => ({ ...info, id, cargaMs: Math.round(performance.now() - t0) }));
    promesa.catch(() => cargados.delete(clave));
    cargados.set(clave, promesa);
  }
  return promesa;
}

export async function cerrarModelos() {
  const activos = await Promise.allSettled(cargados.values());
  for (const r of activos) {
    if (r.status === 'fulfilled') await unloadModel({ modelId: r.value.id }).catch(() => {});
  }
  cargados.clear();
  await close();
}
