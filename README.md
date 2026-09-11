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

## Estado

La interfaz funciona con datos de ejemplo mientras se conectan los modelos y la sincronización. El plan y el reparto están en los issues del repositorio.

## Licencia

Apache-2.0
