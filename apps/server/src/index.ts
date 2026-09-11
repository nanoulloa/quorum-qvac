import Fastify from 'fastify';
import cors from '@fastify/cors';
import { extraer } from './captura/extraccion.ts';
import { VOCABULARIO } from './captura/vocabulario.ts';
import { transcribir } from './qvac/inferir.ts';
import { cerrarModelos } from './qvac/modelos.ts';
import { leerRegistro } from './qvac/perf.ts';

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 30 * 1024 * 1024 });

await app.register(cors, { origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] });

app.addContentTypeParser(/^audio\//, { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

// Toda la inferencia corre en este proceso con @qvac/sdk. Nunca se llama a una API de IA remota.
app.get('/api/health', async () => ({ ok: true, inferencia: 'local' }));

app.post('/api/transcribir', async (req, reply) => {
  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.byteLength === 0) {
    return reply.code(400).send({ error: 'Envía el audio en el cuerpo con Content-Type audio/wav o audio/webm.' });
  }
  return transcribir(audio, req.headers['content-type'] ?? 'audio/wav', VOCABULARIO);
});

app.post<{ Body: { texto?: string } }>('/api/extraer', async (req, reply) => {
  const texto = req.body?.texto?.trim();
  if (!texto) return reply.code(400).send({ error: 'Falta "texto".' });
  return extraer(texto);
});

app.get<{ Querystring: { limite?: string } }>('/api/perf', async (req) => leerRegistro(Number(req.query.limite ?? 100)));

const cerrar = async () => {
  await app.close();
  await cerrarModelos();
  process.exit(0);
};
process.once('SIGINT', cerrar);
process.once('SIGTERM', cerrar);

// Variable propia: herramientas de desarrollo suelen definir PORT para el front.
const port = Number(process.env.QUORUM_API_PORT ?? 4000);
await app.listen({ port, host: '127.0.0.1' });
