import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { NuevaDecision, NuevaObservacion } from '@quorum/shared';
import { extraer } from './captura/extraccion.ts';
import { Almacen } from './datos/almacen.ts';
import { sembrar } from './datos/semilla.ts';
import { construirBase } from './datos/vista.ts';
import { leerPlaca } from './placa/lectura.ts';
import { transcribir } from './qvac/inferir.ts';
import { cerrarModelos } from './qvac/modelos.ts';
import { leerRegistro } from './qvac/perf.ts';
import { Red } from './red/red.ts';

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 30 * 1024 * 1024 });

await app.register(cors, { origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] });

app.addContentTypeParser(/^(audio|image)\//, { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

const sinCuerpo = (body: unknown) => !Buffer.isBuffer(body) || body.byteLength === 0;

const almacen = new Almacen();
await almacen.abrir();
const red = new Red(almacen);
if (process.env.QUORUM_P2P !== 'off') red.iniciar();

// Toda la inferencia corre en este proceso con @qvac/sdk. Nunca se llama a una API de IA remota.
app.get('/api/health', async () => ({ ok: true, inferencia: 'local', dispositivo: almacen.nombre }));

app.post('/api/transcribir', async (req, reply) => {
  if (sinCuerpo(req.body)) {
    return reply.code(400).send({ error: 'Envía el audio en el cuerpo con Content-Type audio/wav o audio/webm.' });
  }
  return transcribir(req.body as Buffer, req.headers['content-type'] ?? 'audio/wav');
});

app.post<{ Body: { texto?: string } }>('/api/extraer', async (req, reply) => {
  const texto = req.body?.texto?.trim();
  if (!texto) return reply.code(400).send({ error: 'Falta "texto".' });
  return extraer(texto);
});

app.post('/api/placa', async (req, reply) => {
  if (sinCuerpo(req.body)) {
    return reply.code(400).send({ error: 'Envía la foto en el cuerpo con Content-Type image/png o image/jpeg.' });
  }
  return leerPlaca(req.body as Buffer, req.headers['content-type'] ?? 'image/png');
});

app.get('/api/observaciones', async () => almacen.observaciones());

app.post<{ Body: NuevaObservacion }>('/api/observaciones', async (req, reply) => {
  const o = req.body;
  if (!o?.cliente || !o.ciudad || !o.pais || !Array.isArray(o.equipos)) {
    return reply.code(400).send({ error: 'Observación incompleta: faltan cliente, ciudad, país o equipos.' });
  }
  const guardada = await almacen.guardar(o);
  red.evento(`Visita guardada en este dispositivo · ${o.cliente.valor ?? 'cliente sin identificar'}`);
  return guardada;
});

app.post<{ Body: NuevaDecision }>('/api/decisiones', async (req, reply) => {
  const d = req.body;
  const refsValidas = Array.isArray(d?.refs) && d.refs.length === 2 && d.refs.every((r) => typeof r === 'string' && r.length > 0);
  if ((d?.tipo !== 'fusion' && d?.tipo !== 'distintos') || !refsValidas) {
    return reply.code(400).send({ error: 'La decisión necesita tipo "fusion" o "distintos" y dos refs.' });
  }
  const decision = await almacen.guardarDecision({ tipo: d.tipo, refs: [d.refs[0], d.refs[1]] });
  red.evento(d.tipo === 'fusion' ? 'Dos reportes confirmados como el mismo equipo' : 'Dos reportes marcados como equipos distintos');
  return decision;
});

app.get('/api/base', async () => construirBase(await almacen.entradas()));

app.get('/api/red', async () => red.estado());

app.post('/api/semilla', async () => {
  const sembradas = await sembrar(almacen);
  if (sembradas) red.anunciar();
  return { sembradas };
});

app.get<{ Querystring: { limite?: string } }>('/api/perf', async (req) => leerRegistro(Number(req.query.limite ?? 100)));

const cerrar = async () => {
  await app.close();
  await red.cerrar();
  await almacen.cerrar();
  await cerrarModelos();
  process.exit(0);
};
process.once('SIGINT', cerrar);
process.once('SIGTERM', cerrar);

// Variable propia: herramientas de desarrollo suelen definir PORT para el front.
const port = Number(process.env.QUORUM_API_PORT ?? 4000);
await app.listen({ port, host: '127.0.0.1' });
