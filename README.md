# Quorum

**Inteligencia de base instalada para equipos de campo, con IA en el dispositivo y sin servidor central.**

Los ingenieros de servicio y vendedores de Philips visitan hospitales todos los días y ven qué equipos tiene cada cliente. Hoy ese conocimiento se pierde en notas y memoria. Con Quorum lo dictan al salir de la visita y queda un inventario estructurado y confiable:

- **Captura hablando.** El dictado se transcribe y se convierte en cliente, ciudad, país, modalidad, cantidad, marca, modelo y antigüedad, cada dato con su estado: Confirmado, Reportado, Estimado o Desconocido.
- **Pregunta lo que falta.** Una regla elige el dato más valioso que falta y el modelo solo redacta la pregunta. La pregunta se puede escuchar en voz alta, también sin internet.
- **Confirma con una foto.** Dentro de la misma visita, VisionPsy lee la placa del equipo y pasa marca, modelo, antigüedad y serie a Confirmado.
- **Se confirma entre colegas.** Cada dispositivo firma lo que reporta y sincroniza directo con los demás. Cuando personas distintas reportan el mismo equipo, su confianza sube.
- **Consulta y ubica la base.** Preguntas en lenguaje natural, escritas o por voz, un mapa por país y exportación a CSV. Si un colega ofrece su laptop, las consultas corren allá con un modelo más grande.
- **Sin nube.** Toda la inferencia corre con `@qvac/sdk` en los dispositivos del equipo; fotos y dictados nunca salen de cada uno. No hay APIs de IA remotas.

**Pitch deck:** [`docs/entrega/pitch-deck.pdf`](docs/entrega/pitch-deck.pdf)

No hay una versión en la nube a propósito: la IA corre en la laptop de cada ingeniero. Para probarlo, sigue [Correr en local](#correr-en-local).

## Correr en local

Requisitos: Node ≥ 22.17, npm ≥ 10.9 y ~3 GB libres para los modelos (se descargan la primera vez).

```bash
nvm use
npm install
npm run dev
```

- Web: http://localhost:5173
- API local: http://127.0.0.1:4000/api/health

Con el servidor corriendo, `npm run semilla -w @quorum/server` carga visitas ficticias de tres ingenieros para explorar la base.

### Demo con dos laptops (sincronización P2P)

1. **Laptop A:** `npm run dev` y abre la web.
   - Escribe tu nombre, elige **Crear un equipo** y copia el código (`QRM-XXXX-XXXX-XXXX`).
   - Para tener datos que explorar: `npm run semilla -w @quorum/server`.
2. **Laptop B:** `npm run dev`, escribe tu nombre, elige **Unirme con un código** y pega el código de A. Arranca vacía.
3. Las dos necesitan red para encontrarse. En segundos B recibe la base de A, y lo que cualquiera capture o decida en "Red P2P" aparece en la otra.
4. Para sumar otro dispositivo después, abre **Red P2P → Agregar dispositivo**: ahí está el código.

Sin una segunda laptop, `npm run dev:b` levanta un segundo dispositivo en la misma máquina. Tiene su propio servidor en el puerto 4001, su almacén en `apps/server/.quorum-b` y su propia clave, y su web queda en http://localhost:5174. Se encuentra con el primero por Hyperswarm, igual que dos laptops.

El nombre y el código se guardan solo en ese dispositivo (`apps/server/.quorum/perfil.json`). Sin código, el dispositivo no busca a nadie.

| Variable | Para qué |
|---|---|
| `QUORUM_NOMBRE` | Nombre del dispositivo mientras no se elija en la web (útil en scripts) |
| `QUORUM_EQUIPO` | Secreto del equipo mientras no se elija en la web; solo quien lo conoce encuentra a los demás |
| `QUORUM_DATA_DIR` | Carpeta del almacén local (por defecto `apps/server/.quorum`) |
| `QUORUM_API_PORT` | Puerto del servidor local (por defecto 4000); la web lo usa para su proxy |
| `QUORUM_WEB_PORT` | Puerto de la web (por defecto 5173); sirve para levantar dos instancias en la misma máquina |
| `QUORUM_P2P=off` | Desactiva la sincronización |

## Arquitectura

```
Navegador (React)
  └─ /api → Servidor local (Fastify, Node)
        ├─ @qvac/sdk ── Parakeet (voz) · Qwen3 1.7B (extracción y consultas) · VisionPsy-Nano (placas) · Supertonic (lee la pregunta)
        ├─ Almacén ─── un Hypercore solo-agregar por dispositivo (Corestore)
        └─ Red ─────── Hyperswarm + canal Protomux: anuncia logs, replica cifrado y lleva consultas delegadas
```

- **Inferencia delegada solo para consultas.**
  - Un dispositivo del equipo puede activar "Ofrecer consultas al equipo" en Red P2P. Las consultas de los demás corren entonces en ese dispositivo con Qwen3 4B, por el mismo canal cifrado de la sincronización.
  - Si ese par no está o no responde en 30 s, la consulta corre en el propio dispositivo con Qwen3 1.7B.
  - Fotos de placa (VisionPsy) y dictados nunca salen del dispositivo.
  - En `perf.jsonl` y en Rendimiento cada inferencia dice si corrió aquí o en un par.
  - Base declarada: `@qvac/sdk` 0.19 quitó el modo proveedor y la delegación por DHT (ver sus [notas de versión](https://github.com/tetherto/qvac/blob/main/packages/sdk/CHANGELOG.md)), así que Quorum implementa la delegación sobre su propio canal P2P en vez de partir de `examples/delegated-inference`.

- **Un log por dispositivo.** Cada visita y cada decisión ("es el mismo equipo" / "son distintos") se agrega al Hypercore del dispositivo, firmada con su clave. Nadie puede escribir en el log de otro.
- **Base instalada derivada.** La base (`GET /api/base`) se calcula uniendo todos los logs:
  - Une reportes del mismo cliente, modalidad y marca, con modelo compatible y antigüedad ±2 años.
  - Aplica las fusiones que decidieron las personas.
  - Calcula la confianza: 35% completitud, 35% testigos independientes (claves distintas), 20% evidencia y 10% frescura.
- **La IA propone y las reglas validan.**
  - En la extracción, la duda ("parece", "unos") sobre la frase exacta decide Estimado. Un catálogo corrige marcas y modelos mal transcritos y los clientes se comparan con los registrados.
  - En las consultas, el modelo solo propone cliente y ciudad, y se aceptan si aparecen en la pregunta y existen en la base. Nunca se genera SQL.

## Modelos y resultados medidos

Medido en Apple M4 · 16 GB · macOS 26.5, en GPU, con `@qvac/sdk` 0.19.

| Tarea | Modelo | Cuantización | Resultado | Latencia |
|---|---|---|---|---|
| Voz a texto | `PARAKEET_TDT_0_6B_V3_Q8_0` | Q8_0 | 14% de error por palabra (whisper-base: 25–31%) | ~1 s por 13 s de audio |
| Pregunta en voz alta | `TTS_MULTILINGUAL_SUPERTONIC3_Q8_0` (español) | Q8_0 | Parakeet transcribe el audio generado igual al texto; funciona sin internet | ~1,1 s por 2,3 s de audio |
| Extracción del dictado | `QWEN3_1_7B_INST_Q4` + reglas | Q4 | 100% de campos en 8 dictados de ajuste (uno sin hospital: no inventa el lugar) · 96% en 4 dictados nuevos | 3–5 s |
| Lectura de placa | `VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` + `MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` | Q8_0 | 95% de campos en 30 placas sintéticas · 99% de los Confirmados correctos | 2,3 s (mediana) |
| Consultas en lenguaje natural | `QWEN3_1_7B_INST_Q4` + reglas, o `QWEN3_4B_INST_Q4_K_M` en un par que ofrece consultas | Q4 · Q4_K_M | 80/80 filtros en 8 preguntas (solo con el modelo: 51/80) | ~0,5 s |
| Sincronización P2P | Hyperswarm + Hypercore | — | Visita de A llega a B en 4,0 s (incluye encontrarse); de B a A en 0,5 s | — |

- **Detalle de VisionPsy** por campo y por variación (rotada, desenfocada, reflejo, bajo contraste): [`docs/eval/vision.md`](docs/eval/vision.md).
- **Prueba de humo:** [`docs/perf/smoke-apple-m4.json`](docs/perf/smoke-apple-m4.json).
- **Registro de inferencias:** cada llamada queda en `apps/server/perf.jsonl` con modelo, cuantización, tokens, tiempo al primer token y tokens por segundo. Se ve en la pantalla Rendimiento y en `GET /api/perf`.

**Por qué VisionPsy:** con 460M de parámetros cabe en hardware de teléfono y lee texto impreso en imágenes, que es justo lo que hay en una placa. La confianza de cada campo no es una probabilidad del modelo: se calcula validando contra el catálogo de marcas y modelos y contra el formato de serie y fecha. Lo que no llega a 70 queda como Estimado.

Para reproducir:

```bash
npm run smoke -w @quorum/server
npm run eval:voz -w @quorum/server
npm run eval:extraccion -w @quorum/server
npm run eval:consultas -w @quorum/server
npm run placas:generar -w @quorum/server && npm run eval:placas -w @quorum/server
npm run prueba:p2p -w @quorum/server
```

## Estructura

| Carpeta | Qué contiene |
|---|---|
| `apps/web` | Interfaz en React + Vite. Pantallas en `src/screens`, datos en `src/datos`. |
| `apps/server` | Servidor local. IA en `src/qvac`, `src/captura`, `src/placa` y `src/consultas`; almacén y vista en `src/datos`; sincronización en `src/red`; evaluaciones en `scripts`. |
| `packages/shared` | Tipos y contratos de la API, esquemas y cálculo de confianza. |

## Privacidad y reglas

- Cero inferencia en la nube: todas las llamadas a modelos pasan por `@qvac/sdk` en el dispositivo.
- La lectura de placas con VisionPsy corre siempre en el mismo dispositivo, nunca delegada.
- Los datos viajan solo entre dispositivos del equipo, cifrados por Hyperswarm y firmados por quien los reporta.
- Todos los datos del repositorio son ficticios: hospitales, personas, dictados y placas.

## Base preexistente y componentes de terceros

- No se partió de código preexistente.
- IA: `@qvac/sdk` y modelos del catálogo QVAC.
- P2P: `corestore`, `hypercore`, `hyperswarm`, `protomux`, `compact-encoding` y `hypercore-crypto` (Holepunch).
- Mapa de Base instalada: `world-atlas` (Natural Earth 110m), `topojson-client` y `d3-geo`. El mapa va dentro del bundle, sin tiles de internet.
- App: React, React Router, Vite, Fastify, zod y Fontsource.
- APIs remotas: ninguna. La única conexión externa es la descarga inicial de modelos desde el registro de QVAC y el descubrimiento de pares de Hyperswarm.

## Límites conocidos

- Los dictados y placas de las evaluaciones son sintéticos (voz de macOS y placas generadas). Falta medir con voz real y placas fotografiadas.
- Quorum no es un dispositivo médico ni se usa para decisiones clínicas; registra inventario de equipos.
- Si la foto es mala o el dictado es ambiguo, el dato queda como Estimado o Desconocido hasta que alguien lo confirme.

## Licencia

Apache-2.0
