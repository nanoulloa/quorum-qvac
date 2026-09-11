import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anclarLugar, nombrado } from './anclaje.ts';

describe('anclarLugar (#44)', () => {
  it('descarta el hospital, la ciudad y el país del ejemplo del prompt cuando el dictado no los nombra', () => {
    const r = anclarLugar('Hay dos resonadores Philips y un tomógrafo de unos seis años.', { cliente: 'Hospital San Ejemplo', ciudad: 'Lima', pais: 'Perú' });
    assert.deepEqual(r, { cliente: null, ciudad: null, pais: { valor: null, estado: 'Desconocido' } });
  });

  it('conserva lo que el dictado dice tal cual', () => {
    const r = anclarLugar('Visité la Clínica Horizonte Norte en Bogotá, Colombia. El resonador es un Achieva.', { cliente: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia' });
    assert.deepEqual(r, { cliente: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: { valor: 'Colombia', estado: 'Reportado' } });
  });

  it('tolera un nombre mal transcrito', () => {
    const r = anclarLugar('Estoy en Hospital de Mocar el Pacific, en Ciudad de Panamá.', { cliente: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá' });
    assert.equal(r.cliente, 'Hospital DemoCare Pacific');
    assert.equal(r.ciudad, 'Ciudad de Panamá');
    assert.deepEqual(r.pais, { valor: 'Panamá', estado: 'Reportado' });
  });

  it('marca Estimado el país que el modelo deduce de una ciudad dicha', () => {
    const r = anclarLugar('Estoy en el Hospital Maré Alta, en Recife. Hay un resonador.', { cliente: 'Hospital Maré Alta', ciudad: 'Recife', pais: 'Brasil' });
    assert.deepEqual(r.pais, { valor: 'Brasil', estado: 'Estimado' });
  });

  it('descarta un país que no se dijo si tampoco hay ciudad', () => {
    assert.deepEqual(anclarLugar('Hay un ecógrafo Canon.', { cliente: null, ciudad: null, pais: 'Perú' }).pais, { valor: null, estado: 'Desconocido' });
  });

  it('descarta solo la ciudad inventada cuando el hospital sí se nombra', () => {
    const r = anclarLugar('Visité el Hospital Valle Sereno. Tienen un ecógrafo Canon nuevo.', { cliente: 'Hospital Valle Sereno', ciudad: 'Lima', pais: null });
    assert.equal(r.cliente, 'Hospital Valle Sereno');
    assert.equal(r.ciudad, null);
  });
});

describe('nombrado', () => {
  it('no se deja engañar por palabras genéricas', () => {
    assert.equal(nombrado('Estoy en un hospital de la ciudad.', 'Hospital San Ejemplo'), false);
  });

  it('acepta "San José" cuando el dictado dice "San José"', () => {
    assert.equal(nombrado('Hospital Valle Sereno, en San José de Costa Rica.', 'San José'), true);
  });
});
