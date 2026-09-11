import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { guardarPerfil, leerPerfil, normalizarCodigo, nuevoCodigo } from './perfil.ts';

const FORMA = /^QRM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

describe('código de equipo', () => {
  it('se genera con la forma QRM-XXXX-XXXX-XXXX y sin caracteres que se confunden', () => {
    for (let i = 0; i < 50; i++) assert.match(nuevoCodigo(), FORMA);
  });

  it('no repite códigos', () => {
    assert.equal(new Set(Array.from({ length: 200 }, nuevoCodigo)).size, 200);
  });

  it('acepta el código en minúsculas, con espacios o sin guiones', () => {
    assert.equal(normalizarCodigo(' qrm-abcd-efgh-jkmn '), 'QRM-ABCD-EFGH-JKMN');
    assert.equal(normalizarCodigo('abcd efgh jkmn'), 'QRM-ABCD-EFGH-JKMN');
    assert.equal(normalizarCodigo('QRMABCDEFGHJKMN'), 'QRM-ABCD-EFGH-JKMN');
  });

  it('rechaza códigos incompletos o con caracteres que el generador no usa', () => {
    assert.equal(normalizarCodigo('QRM-ABCD-EFGH'), null);
    assert.equal(normalizarCodigo('QRM-ABCD-EFGH-JKM0'), null);
    assert.equal(normalizarCodigo(''), null);
  });
});

describe('perfil guardado', () => {
  it('no existe antes del primer uso y se lee igual que se guardó', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quorum-perfil-'));
    try {
      assert.equal(await leerPerfil(dir), null);
      await guardarPerfil(dir, { nombre: 'Ana Rodríguez', equipo: 'QRM-ABCD-EFGH-JKMN' });
      assert.deepEqual(await leerPerfil(dir), { nombre: 'Ana Rodríguez', equipo: 'QRM-ABCD-EFGH-JKMN' });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
