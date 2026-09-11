import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

await app.register(cors, { origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] });

// Toda la inferencia corre en este proceso con @qvac/sdk. Nunca se llama a una API de IA remota.
app.get('/api/health', async () => ({ ok: true, inferencia: 'local' }));

// Variable propia: herramientas de desarrollo suelen definir PORT para el front.
const port = Number(process.env.QUORUM_API_PORT ?? 4000);
await app.listen({ port, host: '127.0.0.1' });
