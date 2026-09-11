import { randomInt } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Lo que la persona elige al abrir Quorum por primera vez. Se guarda solo en este dispositivo. */
export type PerfilGuardado = { nombre: string; equipo: string };

const ARCHIVO = 'perfil.json';
// Sin caracteres que se confunden al dictar o copiar el código: I, O, 0 y 1.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CUERPO = new RegExp(`^[${ALFABETO}]{12}$`);

/** Código de equipo para compartir en voz alta o por chat: QRM-XXXX-XXXX-XXXX (60 bits). */
export function nuevoCodigo(): string {
  const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  return `QRM-${bloque()}-${bloque()}-${bloque()}`;
}

/** Acepta el código en minúsculas, con espacios o sin guiones. Devuelve null si no tiene la forma esperada. */
export function normalizarCodigo(codigo: string): string | null {
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cuerpo = limpio.length === 15 && limpio.startsWith('QRM') ? limpio.slice(3) : limpio;
  return CUERPO.test(cuerpo) ? `QRM-${cuerpo.slice(0, 4)}-${cuerpo.slice(4, 8)}-${cuerpo.slice(8)}` : null;
}

export async function leerPerfil(directorio: string): Promise<PerfilGuardado | null> {
  try {
    const p = JSON.parse(await fs.readFile(path.join(directorio, ARCHIVO), 'utf8')) as Partial<PerfilGuardado>;
    return p.nombre && p.equipo ? { nombre: p.nombre, equipo: p.equipo } : null;
  } catch {
    return null;
  }
}

export async function guardarPerfil(directorio: string, perfil: PerfilGuardado) {
  await fs.mkdir(directorio, { recursive: true });
  await fs.writeFile(path.join(directorio, ARCHIVO), `${JSON.stringify(perfil, null, 2)}\n`);
}
