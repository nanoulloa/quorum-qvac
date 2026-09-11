# Quorum

Inteligencia de base instalada para equipos de campo. Los ingenieros dictan lo que ven en un hospital y Quorum lo convierte en un inventario confiable de equipos médicos, con IA que corre en el dispositivo (QVAC) y sincronización de dispositivo a dispositivo (Pears). Sin nube.

## Correr en local

Requisitos: Node ≥ 22.17 y npm ≥ 10.9.

```bash
nvm use
npm install
npm run dev
```

- Web: http://localhost:5173
- API local: http://127.0.0.1:4000/api/health (puerto configurable con `QUORUM_API_PORT`)

Otros comandos: `npm run typecheck`, `npm run build`, `npm run dev:web`, `npm run dev:server`.

## Estructura

| Carpeta | Qué contiene |
|---|---|
| `apps/web` | Interfaz en React + Vite. Pantallas en `src/screens`, componentes en `src/components`, datos de ejemplo en `src/mocks`. |
| `apps/server` | Servidor Fastify local donde corre la inferencia con `@qvac/sdk`. |
| `packages/shared` | Esquemas zod compartidos (observación, equipo, estado de cada dato) y el cálculo de confianza. |

## Diseño

- Blanco, azul marino y negro, con tema claro y oscuro. Todas las variables están en `apps/web/src/styles/theme.css`; los componentes no usan colores sueltos.
- Tipografías empaquetadas con Fontsource (Instrument Serif, Geist y Geist Mono) para que la app se vea igual en modo avión.
- Estados de cada dato: **Confirmado**, **Reportado**, **Estimado** y **Desconocido**.

## Reglas del proyecto

- Cero inferencia en la nube. Toda llamada a modelos pasa por `@qvac/sdk` en el dispositivo.
- La lectura de placas con VisionPsy corre siempre en el mismo dispositivo, nunca delegada.
- Datos 100% ficticios.

## Base preexistente y componentes de terceros

- No se partió de código preexistente.
- Dependencias: React, React Router, Vite, Fastify, zod y Fontsource.
- APIs remotas: ninguna.

## Modelos y resultados medidos

Todo corre en el dispositivo con `@qvac/sdk` 0.19. Medido en Apple M4 · 16 GB · macOS 26.5, en GPU.

| Tarea | Modelo | Cuantización | Resultado | Latencia |
|---|---|---|---|---|
| Voz a texto | `PARAKEET_TDT_0_6B_V3_Q8_0` | Q8_0 | 14% de error por palabra (whisper-base: 25–31%) | ~1 s por 13 s de audio |
| Extracción del dictado | `QWEN3_1_7B_INST_Q4` + reglas | Q4 | 100% de campos en 6 dictados de ajuste · 96% en 4 dictados nuevos | 3–5 s |
| Lectura de placa | `VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` + `MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` | Q8_0 | 95% de campos en 30 placas sintéticas · 99% de los Confirmados correctos | 2,3 s (mediana) |
| Duplicados | `EMBEDDINGGEMMA_300M_Q8_0` | Q8_0 | En integración | 0,6 s |

Detalle de VisionPsy por campo y por variación (rotada, desenfocada, reflejo, bajo contraste) en [`docs/eval/vision.md`](docs/eval/vision.md). Prueba de humo en [`docs/perf/smoke-apple-m4.json`](docs/perf/smoke-apple-m4.json).

**Por qué VisionPsy:** con 460M de parámetros cabe en hardware de teléfono y lee texto impreso en imágenes (757 en OCRBench), que es justo lo que hay en una placa. La confianza de cada campo no es una probabilidad del modelo: se calcula validando contra el catálogo de marcas y modelos y contra el formato de serie y fecha. Lo que no llega a 70 queda como Estimado.

Para reproducir:

```bash
npm run smoke -w @quorum/server
npm run eval:voz -w @quorum/server
npm run eval:extraccion -w @quorum/server
npm run placas:generar -w @quorum/server && npm run eval:placas -w @quorum/server
```

Cada inferencia del servidor queda en `apps/server/perf.jsonl` (modelo, cuantización, tokens, tiempo al primer token y tokens por segundo) y se consulta en `GET /api/perf`.

## Estado

La interfaz funciona con datos de ejemplo mientras se conectan los modelos y la sincronización. El plan y el reparto están en los issues del repositorio.

## Licencia

Apache-2.0
