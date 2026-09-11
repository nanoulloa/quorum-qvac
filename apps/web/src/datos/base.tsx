import type { BaseInstalada, Desglose, EstadoRed, Evidencia, Modalidad } from '@quorum/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as ejemplo from '../mocks/data';
import type { Dato } from '../mocks/data';

export type Persona = { id: string; nombre: string; iniciales: string; clave: string };
export type TestigoUI = Persona & { evidencia: Evidencia; dias: number };
export type ClienteUI = { id: string; nombre: string; ciudad: string; pais: string };
export type EquipoUI = {
  id: string;
  clienteId: string;
  modalidad: Modalidad;
  nombre: string;
  marca: Dato;
  modelo: Dato;
  antiguedad: Dato;
  anios: number | null;
  testigos: TestigoUI[];
  evidencia: Evidencia;
  dias: number;
  confianza: Desglose;
};

type Contexto = {
  clientes: ClienteUI[];
  equipos: EquipoUI[];
  red: EstadoRed | null;
  /** `dispositivo`: datos del almacén local. `ejemplo`: el servidor local no respondió. */
  origen: 'dispositivo' | 'ejemplo';
  recargar: () => Promise<void>;
};

const NOMBRE: Record<Modalidad, string> = {
  'Resonancia magnética': 'Resonador',
  Tomografía: 'Tomógrafo',
  Ecografía: 'Ecógrafo',
  'Rayos X': 'Rayos X',
  Otro: 'Equipo',
};

const DIA_MS = 86_400_000;

export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const abreviarClave = (clave: string) => (clave.length > 12 ? `${clave.slice(0, 4)}…${clave.slice(-4)}` : clave);

const textoAnios = (n: number | null) => (n === null ? null : n === 1 ? '1 año' : `${n} años`);

function desdeApi(base: BaseInstalada) {
  const ahora = Date.parse(base.generado);
  const clientes: ClienteUI[] = base.clientes.map((c) => ({ id: c.id, nombre: c.nombre, ciudad: c.ciudad ?? '—', pais: c.pais ?? '—' }));
  const equipos: EquipoUI[] = base.equipos.map((e) => {
    // Un testigo por clave: su reporte más reciente, y foto si alguna vez aportó una.
    const testigos = new Map<string, TestigoUI>();
    for (const t of e.testigos) {
      const dias = Math.max(0, Math.floor((ahora - Date.parse(t.fecha)) / DIA_MS));
      const previo = testigos.get(t.clave);
      testigos.set(t.clave, {
        id: t.clave,
        nombre: t.nombre,
        iniciales: iniciales(t.nombre),
        clave: abreviarClave(t.clave),
        evidencia: previo?.evidencia === 'foto' ? 'foto' : t.evidencia,
        dias: Math.min(dias, previo?.dias ?? dias),
      });
    }
    const campo = e.modelo.valor?.match(/\b\d(?:[.,]\d)?T\b/)?.[0];
    return {
      id: e.id,
      clienteId: e.clienteId,
      modalidad: e.modalidad,
      nombre: `${NOMBRE[e.modalidad]}${campo ? ` ${campo}` : ''}${e.cantidad > 1 ? ` ×${e.cantidad}` : ''}`,
      marca: e.marca,
      modelo: e.modelo,
      antiguedad: { valor: textoAnios(e.antiguedad.valor), estado: e.antiguedad.estado },
      anios: e.antiguedad.valor,
      testigos: [...testigos.values()].sort((a, b) => a.dias - b.dias),
      evidencia: e.evidencia,
      dias: e.diasDesdeVerificacion,
      confianza: e.confianza,
    };
  });
  return { clientes, equipos };
}

function desdeEjemplo() {
  return {
    clientes: ejemplo.clientes,
    equipos: ejemplo.equipos.map<EquipoUI>((e) => ({
      ...e,
      testigos: e.testigos.map((t, i) => ({ ...ejemplo.personas[t], evidencia: i === 0 ? e.evidencia : 'voz', dias: e.dias + i * 4 })),
    })),
  };
}

const BaseContexto = createContext<Contexto | null>(null);

async function json<T>(ruta: string): Promise<T> {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return (await r.json()) as T;
}

/** Mantiene la base instalada y el estado de la red al día consultando el servidor local. */
export function BaseProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState(() => ({ ...desdeEjemplo(), red: null as EstadoRed | null, origen: 'ejemplo' as Contexto['origen'] }));

  const recargar = useCallback(async () => {
    try {
      const [base, red] = await Promise.all([json<BaseInstalada>('/api/base'), json<EstadoRed>('/api/red')]);
      setDatos({ ...desdeApi(base), red, origen: 'dispositivo' });
    } catch {
      setDatos((d) => (d.origen === 'ejemplo' ? d : { ...desdeEjemplo(), red: null, origen: 'ejemplo' }));
    }
  }, []);

  useEffect(() => {
    void recargar();
    const id = window.setInterval(() => void recargar(), 3000);
    return () => window.clearInterval(id);
  }, [recargar]);

  return <BaseContexto.Provider value={{ ...datos, recargar }}>{children}</BaseContexto.Provider>;
}

export function useBase(): Contexto {
  const contexto = useContext(BaseContexto);
  if (!contexto) throw new Error('useBase necesita <BaseProvider>');
  return contexto;
}
