# Checklist final de entrega

Se corre de arriba hacia abajo en la última hora. Cada fila lleva su prueba: un comando, un
`archivo:línea` o una URL. Lo que no se verificó dice **pendiente**, no "listo".

Estado de esta revisión: `origin/main` en `f3b391a`, 11 sep 2026.
Al momento de escribirla siguen abiertos los PR [#32](https://github.com/nanoulloa/quorum-qvac/pull/32) (README),
[#33](https://github.com/nanoulloa/quorum-qvac/pull/33) (registro de rendimiento) y
[#34](https://github.com/nanoulloa/quorum-qvac/pull/34) (prueba sin red). Varias filas dependen de que entren.

## 1 · Bloqueantes de descalificación

| # | Qué se revisa | Comando o clic | Se espera | Estado |
|---|---|---|---|---|
| 1.1 | Todo construido con el SDK de QVAC | `git grep -n "@qvac/sdk" -- apps packages` | Toda inferencia entra por el SDK | ✅ `apps/server/src/qvac/modelos.ts:2-12` carga los 5 modelos; `apps/server/src/qvac/inferir.ts:6` usa `completion` y `transcribe`; `apps/server/package.json:22` fija `@qvac/sdk ^0.19.0` |
| 1.2 | Cero APIs de IA en la nube | `git grep -nEi 'openai\|anthropic\|api[_.-]?key\|googleapis\|gemini\|cohere\|replicate\|huggingface\|groq\|deepseek\|bedrock\|azure' -- . ':!package-lock.json'` | Sin resultados reales | ✅ un solo acierto, `apps/server/src/datos/almacen.ts:134` → `this.store.replicate(conexion)`, que es replicación de Corestore, no el proveedor Replicate |
| 1.3 | El servidor no hace salidas HTTP | `git grep -nE "fetch\(\|axios\|https?\.request\|node:https\|XMLHttpRequest" -- apps/server packages` | Salida vacía | ✅ salida vacía (exit 1) |
| 1.4 | No hay URLs remotas en el código | `git grep -nEo "https?://[^\"' ]+" -- . ':!package-lock.json' ':!docs'` | Solo localhost y avisos legales | ✅ `localhost:5173`, `127.0.0.1:4000`, `apache.org` en `LICENSE`, el namespace SVG de `w3.org` en `apps/web/index.html:6` y comentarios de `.gitignore` |
| 1.5 | El lockfile no trae SDK de nube | `grep -nE '"node_modules/(openai\|@anthropic-ai[^"]*\|@google[^"]*\|replicate\|@aws-sdk[^"]*)"' package-lock.json` | Salida vacía | ✅ salida vacía (exit 1) |
| 1.6 | El tráfico P2P no es nube de IA | Leer `apps/server/src/red/red.ts:46-48` | Hyperswarm se une a un tópico de la DHT | ✅ es DHT de Holepunch entre dispositivos: transporta observaciones, nunca prompts ni inferencia. Decirlo así si un juez pregunta por tráfico de red |
| 1.7 | Licencia Apache-2.0 detectada por GitHub | `gh api repos/nanoulloa/quorum-qvac/license --jq .license.spdx_id` | `Apache-2.0` | ✅ devuelve `Apache-2.0`; `LICENSE:1-3` es el texto completo |
| 1.8 | Repo público y alcanzable | `gh repo view nanoulloa/quorum-qvac --json visibility` | `PUBLIC` | ✅ `{"isPrivate":false,"visibility":"PUBLIC"}` · confirmar además abriendo la URL en una ventana privada |
| 1.9 | README declara base preexistente, modelos y APIs remotas | Abrir `README.md` | Las tres secciones presentes | ⚠️ están en `README.md` ("Base preexistente", "Modelos y resultados medidos", "APIs remotas: ninguna") pero el texto definitivo llega en el PR #32 · dueño: issue [#28](https://github.com/nanoulloa/quorum-qvac/issues/28) |
| 1.10 | Video ≤ 5 min, link sin login | Abrir el link en ventana privada y cronometrar | Reproduce sin sesión, ≤ 5:00 | ⚠️ pendiente · issue [#29](https://github.com/nanoulloa/quorum-qvac/issues/29) |
| 1.11 | Datos 100% ficticios | `git grep -n "PERSONAS\|semilla-" -- apps/server/src/datos/semilla.ts` | Nombres y hospitales inventados | ✅ `apps/server/src/datos/semilla.ts:1-2,22-26`: la semilla está marcada como ficticia en el encabezado |
| 1.12 | Elegibilidad confirmada con ISD | Confirmación escrita del organizador | Respuesta por escrito | ⚠️ pendiente · fuera del repo |
| 1.13 | Formulario de entrega enviado | Enviar antes de las 7:00 am hora Panamá (límite 8:00) | Acuse recibido | ⚠️ pendiente · último paso |

## 2 · Mínimo obligatorio del reto Philips

| # | Requisito | Dónde lo ve un juez | Estado |
|---|---|---|---|
| 2.1 | Captura en lenguaje natural, texto o voz | `/captura` · botón de dictado y caja de texto | ✅ `apps/web/src/screens/Captura.tsx:105-130`; el audio va a `POST /api/transcribir` (`apps/server/src/index.ts:34-39`) y se transcribe en el dispositivo (`apps/server/src/qvac/inferir.ts:80-103`) |
| 2.2 | Extrae cliente, ciudad y país | `/captura`, encabezado de la visita | ✅ esquema en `apps/server/src/captura/extraccion.ts:17-21` |
| 2.3 | Extrae modalidad, cantidad, marca, modelo y antigüedad | `/captura`, tarjetas de equipo | ✅ esquema en `apps/server/src/captura/extraccion.ts:27-35` |
| 2.4 | Tolera datos incompletos | Dictar una frase sin marca ni año | ✅ todos los campos aceptan `null` (`extraccion.ts:19-34`) y caen a `Desconocido` (`extraccion.ts:159,163`) |
| 2.5 | Pregunta por lo que falta | `/captura`, tarjeta "Falta un dato clave" | ✅ `apps/web/src/screens/Captura.tsx:132-142,249`: busca el primer equipo con antigüedad `Desconocido` y ofrece responderla |
| 2.6 | Estado por dato: Confirmado / Reportado / Estimado / Desconocido | Píldora de estado en `/captura`, `/hospitales`, `/consultas`, `/captura/placa` | ✅ enum en `packages/shared/src/index.ts:11`; se pinta con `StatusPill` (`Captura.tsx:289`, `Hospitales.tsx:91`, `Consultas.tsx:150`, `Placa.tsx:145`) |
| 2.7 | Vista por cliente | `/hospitales` y `/hospitales/:id` | ✅ `apps/web/src/App.tsx:18-19`; tabla en `Hospitales.tsx:74` con equipo, antigüedad, estado, confianza, testigos y última verificación |
| 2.8 | Vista agregada de todos los clientes | `/base` | ✅ `apps/web/src/App.tsx:20`; tabla en `BaseInstalada.tsx:111` con cliente, país, conteo por modalidad, antigüedad media y confianza media |

## 3 · Track Psy

| # | Requisito | Prueba | Estado |
|---|---|---|---|
| 3.1 | VisionPsy es central: lee las placas | `/captura/placa`, subir o tomar la foto | ✅ `apps/server/src/placa/lectura.ts:53-79`, modelo `visionpsy-nano-460m` (`apps/server/src/qvac/modelos.ts:40-48`); la entrada acepta cámara (`apps/web/src/screens/Placa.tsx:109-116`) |
| 3.2 | VisionPsy corre local, nunca delegado | Leer `apps/server/src/placa/lectura.ts:49-52` | ✅ la lectura solo llama a `completarJson`, que registra `dondeCorre: 'este-dispositivo'` (`apps/server/src/qvac/inferir.ts:43`). No existe ruta de delegación: `git grep -n "'par'"` solo aparece en tipos y en la pantalla de rendimiento |
| 3.3 | Licencia MIT o Apache | ver 1.7 | ✅ Apache-2.0 |
| 3.4 | Registro de rendimiento con carga, tokens, TTFT y tokens/s | `/rendimiento` o `GET /api/perf` | ✅ campos en `packages/shared/src/perf.ts:4-19`; se llenan en `apps/server/src/qvac/inferir.ts:44-51` (`cargaMs`, `tokensEntrada`, `tokensSalida`, `ttftMs`, `tokensPorSegundo`, `backend`) y se leen en `apps/server/src/qvac/perf.ts:21-35` |
| 3.5 | El registro está en el repo | `git ls-files \| grep -i perf` | ❌ `perf.jsonl` está ignorado (`.gitignore:4`) y no hay ninguno versionado. Lo agrega el PR #33 como `docs/perf/perf-apple-m4.jsonl` · issue [#30](https://github.com/nanoulloa/quorum-qvac/issues/30) |
| 3.6 | Evaluación de VisionPsy en el repo | `docs/eval/vision.md` y `docs/eval/vision.json` | ✅ ambos versionados (`git ls-tree -r --name-only origin/main -- docs`): 30 placas sintéticas, acierto por campo y por variación |
| 3.7 | README con hardware, modelos y cuantización | Tabla "Modelos y resultados medidos" del `README.md` | ⚠️ la tabla existe (Apple M4 · 16 GB · macOS 26.5, con cuantización por modelo) pero `docs/perf/smoke-apple-m4.json` todavía registra `WHISPER_BASE_Q8_0` en transcripción mientras el código y el README usan Parakeet. **Rehacer la prueba de humo o fechar el archivo antes de entregar** · dueño: issue #28 |
| 3.8 | Flujo de usuario completo, no demo suelto | Recorrer captura → placa → hospital → base → consultas → red → rendimiento | ⚠️ las siete pantallas existen (`apps/web/src/App.tsx:16-23`); falta el recorrido cronometrado de punta a punta contra el servidor local |

## 4 · Extras que suman

| Extra | Dónde mostrarlo | Estado |
|---|---|---|
| Voz | `/captura`, botón de dictado | ✅ `apps/web/src/components/useGrabadora.ts` + `POST /api/transcribir` |
| Foto de placas | `/captura/placa` | ✅ ver 3.1 |
| Puntaje de confianza | Barra de confianza en `/hospitales` y `/consultas` | ✅ `packages/shared/src/confianza.ts:23` |
| Duplicados | `/red`, tarjeta de duplicado con fusionar o marcar distintos | ✅ `apps/web/src/screens/Red.tsx` + `POST /api/decisiones` (`apps/server/src/index.ts:66-75`) |
| Alertas de datos viejos | Marca "sin verificar" en `/hospitales` | ✅ `apps/web/src/datos/reglas.ts:8` (más de 180 días) |
| Oportunidades de renovación | Columna lateral de `/base` | ✅ `apps/web/src/datos/reglas.ts:5-6` y `BaseInstalada.tsx:129-139` |
| Preguntas de seguimiento | `/captura` | ✅ ver 2.5 |
| Consultas en lenguaje natural | `/consultas` | ✅ `apps/server/src/consultas/consulta.ts:89-101`: reglas más modelo local, y los filtros se aplican en código |
| P2P con Pears | `/red` | ✅ Hyperswarm, Corestore y Protomux (`apps/server/src/red/red.ts:1-4,46-48`); prueba con dos dispositivos: `npm run prueba:p2p -w @quorum/server` |

## 5 · Últimos 60 minutos

1. `git fetch origin main` y confirmar que entraron los PR #32, #33 y #34. Si el #33 no entró, el punto 3.5 queda rojo.
2. Repo público: abrir `https://github.com/nanoulloa/quorum-qvac` en una ventana privada, sin sesión.
3. README al día: base preexistente, modelos con cuantización, hardware, APIs remotas ninguna, licencia. Resolver el desfase de 3.7.
4. Confirmar que `docs/perf/*.jsonl` y `docs/eval/vision.md` están versionados y coinciden con lo que dice el README.
5. Video: abrir el link en ventana privada, cronometrar que dure 5:00 o menos.
6. Prueba en modo avión: apagar Wi-Fi y correr captura por voz, extracción y lectura de placa. Todo debe responder. La pantalla `/red` se queda sin pares — eso es esperado y se explica: la DHT necesita red, la inferencia no.
7. Con el Wi-Fi de vuelta, recorrer las siete pantallas con el servidor local encendido y verificar que el distintivo de la barra no diga "Servidor local sin respuesta" (`apps/web/src/components/ui.tsx:25`); si lo dice, la interfaz está mostrando datos de ejemplo.
8. Enviar el formulario de entrega a las 7:00 am hora Panamá. El límite son las 8:00; la hora extra es el margen.
