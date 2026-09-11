/** Utilidades de texto para corregir errores típicos de la transcripción. */

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Distancia de edición entre dos cadenas. */
export function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** Proporción de cambios necesarios para convertir una cadena en la otra (0 = iguales). */
export const diferencia = (a: string, b: string) => distancia(a, b) / Math.max(1, a.length, b.length);

/** ¿Aparece en el texto una palabra igual o casi igual a `termino`? Tolera ~1 error cada 5 letras. */
export function mencionaParecido(texto: string, termino: string): boolean {
  const objetivo = normalizar(termino);
  const tolerancia = Math.floor(objetivo.length / 5);
  return normalizar(texto)
    .split(' ')
    .some((p) => p === objetivo || (objetivo.length >= 5 && Math.abs(p.length - objetivo.length) <= tolerancia && distancia(p, objetivo) <= tolerancia));
}

export const oraciones = (texto: string) => texto.split(/(?<=[.!?;])\s+/).map((s) => s.trim()).filter(Boolean);

const NUMEROS: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

/** Convierte "dos", "tres" o "4" en número. */
export const numero = (palabra: string): number | undefined => NUMEROS[normalizar(palabra)] ?? (/^\d+$/.test(palabra) ? Number(palabra) : undefined);
