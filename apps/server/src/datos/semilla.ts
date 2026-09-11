// Datos ficticios (issue P0-11). Cada ingeniero tiene su propio log con su propia clave, así que
// los testigos independientes son reales. Sembrar un solo dispositivo: los demás lo reciben por P2P.
import type { DatoExtraido, EquipoObservado, Estado, Evidencia, Modalidad } from '@quorum/shared';
import type { Almacen } from './almacen.ts';

const DIA_MS = 86_400_000;

const dato = <T>(valor: T | null, estado: Estado): DatoExtraido<T> => ({ valor, estado: valor === null ? 'Desconocido' : estado });
const SIN: DatoExtraido<never> = { valor: null, estado: 'Desconocido' };
const R = <T>(v: T | null) => dato(v, 'Reportado');
const C = <T>(v: T | null) => dato(v, 'Confirmado');
const E = <T>(v: T | null) => dato(v, 'Estimado');

const equipo = (
  modalidad: Modalidad,
  marca: DatoExtraido<string>,
  modelo: DatoExtraido<string>,
  antiguedad: DatoExtraido<number>,
  evidencia: Evidencia,
  cantidad = 1,
): EquipoObservado => ({ modalidad, cantidad, marca, modelo, antiguedad, evidencia });

const PERSONAS = {
  luis: { interno: 'semilla-luis', nombre: 'Luis Pérez' },
  sofia: { interno: 'semilla-sofia', nombre: 'Sofía Castro' },
  marta: { interno: 'semilla-marta', nombre: 'Marta Solís' },
};

type Visita = { quien: keyof typeof PERSONAS; dias: number; cliente: string; ciudad: string; pais: string; fuente: Evidencia; equipos: EquipoObservado[] };

const RM = 'Resonancia magnética';
const TC = 'Tomografía';
const US = 'Ecografía';

const VISITAS: Visita[] = [
  { quien: 'sofia', dias: 2, cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá', fuente: 'foto', equipos: [equipo(RM, C('Philips'), C('Ingenia 1.5T'), C(9), 'foto'), equipo(TC, SIN, SIN, R(1), 'voz')] },
  { quien: 'marta', dias: 3, cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá', fuente: 'voz', equipos: [equipo(RM, R('Philips'), R('Ingenia'), R(9), 'voz'), equipo(RM, R('Siemens'), SIN, E(12), 'voz')] },
  { quien: 'luis', dias: 41, cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá', fuente: 'texto', equipos: [equipo(RM, R('Philips'), R('Ingenia 1.5T'), R(9), 'texto')] },
  { quien: 'luis', dias: 214, cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá', fuente: 'texto', equipos: [equipo(US, R('Philips'), R('EPIQ Elite'), R(5), 'texto')] },
  { quien: 'marta', dias: 220, cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá', fuente: 'voz', equipos: [equipo(US, R('Philips'), R('EPIQ'), R(5), 'voz')] },
  { quien: 'luis', dias: 190, cliente: 'Centro Médico Bahía Azul', ciudad: 'Colón', pais: 'Panamá', fuente: 'voz', equipos: [equipo(RM, R('GE'), R('Signa'), E(8), 'voz')] },
  { quien: 'sofia', dias: 20, cliente: 'Centro Médico Bahía Azul', ciudad: 'Colón', pais: 'Panamá', fuente: 'foto', equipos: [equipo(TC, C('Philips'), C('Incisive CT'), C(3), 'foto')] },
  { quien: 'luis', dias: 25, cliente: 'Centro Médico Bahía Azul', ciudad: 'Colón', pais: 'Panamá', fuente: 'texto', equipos: [equipo(TC, R('Philips'), R('Incisive'), R(3), 'texto')] },
  { quien: 'sofia', dias: 40, cliente: 'Centro Médico Bahía Azul', ciudad: 'Colón', pais: 'Panamá', fuente: 'texto', equipos: [equipo(US, R('Siemens'), SIN, R(4), 'texto')] },
  { quien: 'marta', dias: 30, cliente: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia', fuente: 'foto', equipos: [equipo(TC, C('GE'), C('Revolution'), C(11), 'foto')] },
  { quien: 'luis', dias: 35, cliente: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia', fuente: 'voz', equipos: [equipo(TC, R('GE'), R('Revolution'), R(11), 'voz')] },
  { quien: 'marta', dias: 60, cliente: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia', fuente: 'voz', equipos: [equipo(RM, R('Philips'), R('Achieva'), R(10), 'voz'), equipo(US, R('Canon'), SIN, E(6), 'voz')] },
  { quien: 'luis', dias: 263, cliente: 'Hospital Valle Sereno', ciudad: 'San José', pais: 'Costa Rica', fuente: 'voz', equipos: [equipo(TC, R('Siemens'), SIN, E(10), 'voz'), equipo(RM, R('Philips'), R('Ingenia'), R(6), 'voz')] },
  { quien: 'sofia', dias: 15, cliente: 'Hospital Aurora Paulista', ciudad: 'São Paulo', pais: 'Brasil', fuente: 'foto', equipos: [equipo(RM, C('Philips'), C('Achieva 1.5T'), C(11), 'foto')] },
  { quien: 'marta', dias: 18, cliente: 'Hospital Aurora Paulista', ciudad: 'São Paulo', pais: 'Brasil', fuente: 'voz', equipos: [equipo(RM, R('Philips'), R('Achieva'), R(11), 'voz'), equipo(TC, R('Siemens'), R('Somatom'), R(5), 'voz')] },
  { quien: 'marta', dias: 45, cliente: 'Instituto Horizonte Sul', ciudad: 'Porto Alegre', pais: 'Brasil', fuente: 'voz', equipos: [equipo(RM, R('Siemens'), R('Avanto'), R(13), 'voz')] },
  { quien: 'luis', dias: 50, cliente: 'Clínica Vale Verde', ciudad: 'Curitiba', pais: 'Brasil', fuente: 'voz', equipos: [equipo(RM, R('GE'), R('Signa'), E(9), 'voz')] },
  { quien: 'luis', dias: 80, cliente: 'Hospital Maré Alta', ciudad: 'Recife', pais: 'Brasil', fuente: 'voz', equipos: [equipo(RM, SIN, SIN, E(8), 'voz')] },
];

/** Escribe las visitas de ejemplo. Si ya se sembró, no hace nada. Devuelve cuántas escribió. */
export async function sembrar(almacen: Almacen, ahora = Date.now()): Promise<number> {
  const claves: Record<string, string> = {};
  for (const [id, p] of Object.entries(PERSONAS)) claves[id] = await almacen.nucleoLocal(p.interno, p.nombre);
  const yaSembrado = almacen.conocidos().some((r) => r.clave === claves.luis && r.bloques > 0);
  if (yaSembrado) return 0;

  const orden = [...VISITAS].sort((a, b) => b.dias - a.dias);
  for (const v of orden) {
    await almacen.guardar(
      {
        fecha: new Date(ahora - v.dias * DIA_MS).toISOString(),
        fuente: v.fuente,
        cliente: R(v.cliente),
        ciudad: R(v.ciudad),
        pais: R(v.pais),
        equipos: v.equipos,
      },
      claves[v.quien],
    );
  }
  return orden.length;
}
