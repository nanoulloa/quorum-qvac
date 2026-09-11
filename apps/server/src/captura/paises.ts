import { normalizar } from './texto.ts';

const PAISES = ['Panamá', 'Colombia', 'Costa Rica', 'México', 'Perú', 'Ecuador', 'Brasil', 'Chile', 'Argentina', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'República Dominicana'];
const ALIAS: Record<string, string> = { brazil: 'Brasil', mexico: 'México', peru: 'Perú', panama: 'Panamá' };

/** "Panama" → "Panamá". Los países se guardan y se comparan con su nombre canónico. */
export function paisCanonico(pais: string | null): string | null {
  if (!pais) return null;
  const n = normalizar(pais);
  return PAISES.find((p) => normalizar(p) === n) ?? ALIAS[n] ?? pais;
}
