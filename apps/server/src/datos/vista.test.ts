import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DecisionDuplicado, EquipoObservado, ObservacionGuardada } from '@quorum/shared';
import { construirBase } from './vista.ts';

const AHORA = Date.parse('2026-09-10T12:00:00Z');
const hace = (dias: number) => new Date(AHORA - dias * 86_400_000).toISOString();

const equipo = (marca: string | null, modelo: string | null, anios: number | null): EquipoObservado => ({
  modalidad: 'Resonancia magnética',
  cantidad: 1,
  marca: { valor: marca, estado: marca ? 'Reportado' : 'Desconocido' },
  modelo: { valor: modelo, estado: modelo ? 'Reportado' : 'Desconocido' },
  antiguedad: { valor: anios, estado: anios === null ? 'Desconocido' : 'Reportado' },
});

const visita = (id: string, autor: string, dias: number, equipos: EquipoObservado[]): ObservacionGuardada => ({
  tipo: 'observacion',
  id,
  autor,
  autorNombre: autor,
  fecha: hace(dias),
  fuente: 'voz',
  cliente: { valor: 'Hospital DemoCare Pacific', estado: 'Reportado' },
  ciudad: { valor: 'Ciudad de Panamá', estado: 'Reportado' },
  pais: { valor: 'Panama', estado: 'Reportado' },
  equipos,
});

const decision = (tipo: DecisionDuplicado['tipo'], refs: [string, string]): DecisionDuplicado => ({
  tipo,
  id: `${tipo}-${refs.join('-')}`,
  autor: 'ana',
  autorNombre: 'Ana',
  fecha: hace(0),
  refs,
});

test('une reportes de distintas personas con misma marca, modelo compatible y antigüedad ±2', () => {
  const base = construirBase([visita('a', 'ana', 3, [equipo('Philips', 'Ingenia', 8)]), visita('b', 'luis', 1, [equipo('Philips', 'Ingenia 1.5T', 9)])], AHORA);
  assert.equal(base.equipos.length, 1);
  const [e] = base.equipos;
  assert.deepEqual(new Set(e.testigos.map((t) => t.clave)), new Set(['ana', 'luis']));
  assert.equal(e.diasDesdeVerificacion, 1);
  assert.equal(e.confianza.testigos, 0.8);
});

test('no une automáticamente cuando falta la marca o la antigüedad difiere más de 2 años', () => {
  const sinMarca = construirBase([visita('a', 'ana', 3, [equipo('Philips', 'Ingenia', 8)]), visita('b', 'luis', 1, [equipo(null, null, 8)])], AHORA);
  assert.equal(sinMarca.equipos.length, 2);
  const lejos = construirBase([visita('a', 'ana', 3, [equipo('Philips', 'Ingenia', 4)]), visita('b', 'luis', 1, [equipo('Philips', 'Ingenia', 9)])], AHORA);
  assert.equal(lejos.equipos.length, 2);
});

test('una fusión decidida por una persona une los reportes y conserva los testigos', () => {
  const base = construirBase(
    [visita('a', 'ana', 3, [equipo('Siemens', null, 12)]), visita('b', 'carlos', 0, [equipo(null, null, null)]), decision('fusion', ['b-0', 'a-0'])],
    AHORA,
  );
  assert.equal(base.equipos.length, 1);
  const [e] = base.equipos;
  assert.equal(e.marca.valor, 'Siemens');
  assert.equal(e.refs.length, 2);
  assert.equal(new Set(e.testigos.map((t) => t.clave)).size, 2);
});

test('los pares marcados como distintos se exponen y no se unen', () => {
  const base = construirBase([visita('a', 'ana', 3, [equipo(null, null, 1)]), visita('b', 'luis', 2, [equipo(null, null, 1)]), decision('distintos', ['a-0', 'b-0'])], AHORA);
  assert.equal(base.equipos.length, 2);
  assert.deepEqual(base.distintos, [['a-0', 'b-0']]);
});

test('el país del cliente se guarda con su nombre canónico', () => {
  const base = construirBase([visita('a', 'ana', 0, [equipo('Philips', 'Ingenia', 8)])], AHORA);
  assert.equal(base.clientes[0].pais, 'Panamá');
});
