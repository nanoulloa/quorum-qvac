import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confianza } from './confianza.ts';

test('equipo completo, 3 testigos, foto de placa y verificado hoy da 100', () => {
  const r = confianza({ campos: ['Confirmado', 'Confirmado', 'Confirmado'], testigos: 3, evidencia: 'foto', diasDesdeVerificacion: 0 });
  assert.equal(r.total, 100);
});

test('un testigo, datos incompletos y estimados, 90 días da 48', () => {
  const r = confianza({ campos: ['Reportado', 'Desconocido', 'Estimado'], testigos: 1, evidencia: 'voz', diasDesdeVerificacion: 90 });
  assert.equal(r.completitud, 2 / 3);
  assert.equal(r.testigos, 0.4);
  assert.equal(r.evidencia, 0.3);
  assert.equal(r.frescura, 0.5);
  assert.equal(r.total, 48);
});

test('dos testigos que reportan todo sin foto, a los 180 días da 75', () => {
  const r = confianza({ campos: ['Reportado', 'Reportado', 'Reportado'], testigos: 2, evidencia: 'texto', diasDesdeVerificacion: 180 });
  assert.equal(r.frescura, 0);
  assert.equal(r.total, 75);
});

test('la frescura nunca es negativa', () => {
  const r = confianza({ campos: ['Reportado'], testigos: 1, evidencia: 'texto', diasDesdeVerificacion: 400 });
  assert.equal(r.frescura, 0);
});

test('sin campos ni testigos solo suma evidencia y frescura', () => {
  const r = confianza({ campos: [], testigos: 0, evidencia: 'voz', diasDesdeVerificacion: 0 });
  assert.equal(r.completitud, 0);
  assert.equal(r.testigos, 0);
  assert.equal(r.total, 22);
});
