import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DatoExtraido, EquipoExtraido, Extraccion, Modalidad } from '@quorum/shared';
import { elegirFaltante, enDocePalabras, interpretarRespuesta, preguntaSegura } from './pregunta.ts';

const dato = <T>(valor: T | null, estado: DatoExtraido<T>['estado'] = 'Reportado'): DatoExtraido<T> => ({ valor, estado: valor === null ? 'Desconocido' : estado });

const equipo = (modalidad: Modalidad, marca: string | null, modelo: string | null, antiguedad: number | null): EquipoExtraido => ({
  modalidad,
  cantidad: 1,
  marca: dato(marca),
  modelo: dato(modelo),
  antiguedad: dato(antiguedad),
});

const extraccion = (equipos: EquipoExtraido[]): Extraccion => ({
  cliente: dato('DemoCare Pacific'),
  ciudad: dato('Ciudad de Panamá'),
  pais: dato<string>(null),
  equipos,
});

/** Lo que la extracción devuelve para el dictado de DemoCare (fixture de scripts/eval-extraccion.ts). */
const DEMOCARE = extraccion([
  equipo('Resonancia magnética', 'Philips', 'Ingenia', 8),
  equipo('Resonancia magnética', null, null, null),
  equipo('Tomografía', null, null, 1),
]);

describe('elegirFaltante', () => {
  it('pregunta por la antigüedad del segundo resonador de DemoCare', () => {
    assert.deepEqual(elegirFaltante(DEMOCARE), { equipo: 1, campo: 'antiguedad' });
  });

  it('elige el equipo que sí tiene un dato faltante', () => {
    const base = extraccion([equipo('Resonancia magnética', 'Philips', 'Ingenia', 8), equipo('Ecografía', null, 'Logiq', 4)]);
    assert.deepEqual(elegirFaltante(base), { equipo: 1, campo: 'marca' });
  });

  it('la antigüedad de un resonador pesa más que la de un ecógrafo, aunque venga después', () => {
    const base = extraccion([equipo('Ecografía', 'GE', 'Logiq', null), equipo('Resonancia magnética', 'Philips', 'Ingenia', null)]);
    assert.deepEqual(elegirFaltante(base), { equipo: 1, campo: 'antiguedad' });
  });

  it('con el mismo puntaje gana el equipo de menor índice', () => {
    const base = extraccion([equipo('Ecografía', 'GE', 'Logiq', null), equipo('Ecografía', 'Canon', 'Aplio', null)]);
    assert.deepEqual(elegirFaltante(base), { equipo: 0, campo: 'antiguedad' });
  });

  it('no vuelve a preguntar por un campo ya preguntado', () => {
    assert.deepEqual(elegirFaltante(DEMOCARE, [{ equipo: 1, campo: 'antiguedad' }]), { equipo: 1, campo: 'modelo' });
  });

  it('sin faltantes no hay pregunta', () => {
    assert.equal(elegirFaltante(extraccion([equipo('Tomografía', 'Canon', 'Aquilion', 3)])), null);
  });
});

describe('interpretarRespuesta', () => {
  it('los chips de antigüedad son estimaciones con el punto medio del rango', () => {
    assert.deepEqual(interpretarRespuesta('antiguedad', 'Menos de 5'), { valor: 3, estado: 'Estimado' });
    assert.deepEqual(interpretarRespuesta('antiguedad', '5 a 10'), { valor: 7, estado: 'Estimado' });
    assert.deepEqual(interpretarRespuesta('antiguedad', 'Más de 10'), { valor: 12, estado: 'Estimado' });
    assert.deepEqual(interpretarRespuesta('antiguedad', 'No sé'), { valor: null, estado: 'Desconocido' });
  });

  it('un número dicho con duda queda Estimado y uno dicho seco queda Reportado', () => {
    assert.deepEqual(interpretarRespuesta('antiguedad', 'unos nueve'), { valor: 9, estado: 'Estimado' });
    assert.deepEqual(interpretarRespuesta('antiguedad', '7'), { valor: 7, estado: 'Reportado' });
  });

  it('sin número en el texto la antigüedad sigue desconocida', () => {
    assert.deepEqual(interpretarRespuesta('antiguedad', 'está bastante viejo'), { valor: null, estado: 'Desconocido' });
  });

  it('"no sé", "ni idea" o "no" dejan el campo desconocido', () => {
    for (const texto of ['no sé', 'No lo sé', 'ni idea', 'No']) {
      assert.deepEqual(interpretarRespuesta('marca', texto), { valor: null, estado: 'Desconocido' });
    }
  });

  it('la marca se guarda con su nombre canónico', () => {
    assert.deepEqual(interpretarRespuesta('marca', 'philips'), { valor: 'Philips', estado: 'Reportado' });
    assert.deepEqual(interpretarRespuesta('marca', 'Toshiba'), { valor: 'Toshiba', estado: 'Reportado' });
  });

  it('el modelo se empareja con el catálogo aunque venga mal escrito', () => {
    assert.deepEqual(interpretarRespuesta('modelo', 'ingenia'), { valor: 'Ingenia', estado: 'Reportado' });
    assert.deepEqual(interpretarRespuesta('modelo', 'Ingenio'), { valor: 'Ingenia', estado: 'Reportado' });
    assert.deepEqual(interpretarRespuesta('modelo', 'MX-200'), { valor: 'MX-200', estado: 'Reportado' });
  });

  it('una frase que niega o comenta no se guarda como marca ni modelo', () => {
    assert.deepEqual(interpretarRespuesta('modelo', 'No hay un segundo modelo, es solo uno.'), { valor: null, estado: 'Desconocido' });
    assert.deepEqual(interpretarRespuesta('marca', 'no lo vi bien'), { valor: null, estado: 'Desconocido' });
    assert.deepEqual(interpretarRespuesta('modelo', 'creo que era uno grande de los nuevos que trajeron'), { valor: null, estado: 'Desconocido' });
  });
});

describe('preguntaSegura', () => {
  it('descarta un orden que el equipo no tiene y usa la plantilla', () => {
    assert.equal(preguntaSegura('¿Cuántos años tiene el segundo resonador Philips?', 'el resonador Philips', 'antiguedad'), '¿Cuántos años tiene el resonador Philips?');
    assert.equal(preguntaSegura('¿Cuál es el modelo del segundo resonador Philips en el hospital?', 'el resonador Philips', 'modelo'), '¿Qué modelo es el resonador Philips?');
  });

  it('respeta el orden cuando el equipo sí es el segundo', () => {
    assert.equal(preguntaSegura('¿Cuántos años tiene el segundo resonador?', 'el segundo resonador', 'antiguedad'), '¿Cuántos años tiene el segundo resonador?');
  });

  it('descarta el contexto que el modelo inventa y deja pasar una pregunta corta', () => {
    assert.equal(preguntaSegura('¿Cuál es el modelo del resonador Philips que se utilizó en el caso?', 'el resonador Philips', 'modelo'), '¿Qué modelo es el resonador Philips?');
    assert.equal(preguntaSegura('¿Cuántos años tiene el resonador Philips?', 'el resonador Philips', 'antiguedad'), '¿Cuántos años tiene el resonador Philips?');
  });

  it('si el modelo no devolvió una pregunta, usa la plantilla', () => {
    assert.equal(preguntaSegura('Dime la marca', 'el tomógrafo', 'marca'), '¿De qué marca es el tomógrafo?');
  });
});

describe('enDocePalabras', () => {
  it('deja pasar una razón corta sin tocarla', () => {
    assert.equal(enDocePalabras('La antigüedad decide si es una oportunidad de renovación'), 'La antigüedad decide si es una oportunidad de renovación');
  });

  it('recorta a doce palabras la razón larga que deforma la tarjeta', () => {
    const larga = 'La antigüedad determina la necesidad de mantenimiento y la eficiencia del equipo en el hospital';
    assert.equal(enDocePalabras(larga), 'La antigüedad determina la necesidad de mantenimiento y la eficiencia del equipo…');
  });

  it('normaliza espacios y quita el punto final', () => {
    assert.equal(enDocePalabras('  El modelo   define los repuestos.  '), 'El modelo define los repuestos');
  });
});
