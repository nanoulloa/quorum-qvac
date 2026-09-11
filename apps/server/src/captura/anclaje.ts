import type { DatoExtraido } from '@quorum/shared';
import { mencionaParecido, normalizar } from './texto.ts';

/** Palabras que no distinguen un lugar: tipos de institución y artículos. */
const GENERICAS = new Set(['hospital', 'clinica', 'centro', 'medico', 'instituto', 'diagnostico', 'regional', 'general', 'ciudad', 'de', 'del', 'la', 'las', 'el', 'los', 'en', 'san', 'santa', 'santo']);

/**
 * ¿El dictado nombra este lugar? Al menos la mitad de sus palabras distintivas tienen que aparecer
 * en el texto, con la tolerancia de la transcripción ("DemoCare" puede llegar como "de Mocar").
 * Un nombre que el modelo copió del ejemplo del prompt no aparece en el dictado y no pasa.
 */
export function nombrado(texto: string, nombre: string | null): boolean {
  if (!nombre) return false;
  const palabras = normalizar(nombre).split(' ').filter(Boolean);
  const distintivas = palabras.filter((p) => !GENERICAS.has(p));
  const revisar = distintivas.length ? distintivas : palabras;
  const presentes = revisar.filter((p) => mencionaParecido(texto, p)).length;
  return presentes > 0 && presentes * 2 >= revisar.length;
}

type Lugar = { cliente: string | null; ciudad: string | null; pais: string | null };

/**
 * Deja solo lo que el dictado respalda (#44). Cliente y ciudad que no se nombran quedan en null.
 * El país dicho es Reportado; si no se dijo pero la ciudad sí, el país que propone el modelo
 * queda Estimado, porque lo dedujo de la ciudad.
 */
export function anclarLugar(texto: string, lugar: Lugar): { cliente: string | null; ciudad: string | null; pais: DatoExtraido<string> } {
  const ciudad = nombrado(texto, lugar.ciudad) ? lugar.ciudad : null;
  const pais: DatoExtraido<string> = !lugar.pais
    ? { valor: null, estado: 'Desconocido' }
    : nombrado(texto, lugar.pais)
      ? { valor: lugar.pais, estado: 'Reportado' }
      : ciudad
        ? { valor: lugar.pais, estado: 'Estimado' }
        : { valor: null, estado: 'Desconocido' };
  return { cliente: nombrado(texto, lugar.cliente) ? lugar.cliente : null, ciudad, pais };
}
