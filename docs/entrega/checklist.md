# Checklist final de entrega

Se corre de arriba hacia abajo en la última hora. Cada fila lleva su prueba: un comando, un
`archivo:línea` o una URL. Lo que no se verificó dice **pendiente**, no "listo".

Estado de esta revisión: `origin/main` en `3fa9518`, 11 sep 2026. Todas las filas se volvieron a
correr contra ese commit; ninguna arrastra el veredicto de la revisión anterior (`5ea1c81`).
Los PR [#32](https://github.com/nanoulloa/quorum-qvac/pull/32) (README),
[#33](https://github.com/nanoulloa/quorum-qvac/pull/33) (rendimiento) y
[#34](https://github.com/nanoulloa/quorum-qvac/pull/34) (prueba sin red) ya están mergeados
(`gh pr list --state all`). Siguen abiertos los issues #28 (README), #29 (video) y #31 (este documento).

## 1 · Bloqueantes de descalificación

| # | Qué se revisa | Comando o clic | Se espera | Estado |
|---|---|---|---|---|
| 1.1 | Todo construido con el SDK de QVAC | `git grep -n "@qvac/sdk" -- apps packages` | Toda inferencia entra por el SDK | ✅ `apps/server/src/qvac/modelos.ts:2-12` importa los 5 modelos; `inferir.ts:6` usa `completion` y `transcribe`; `apps/server/package.json:25` fija `@qvac/sdk ^0.19.0` |
| 1.2 | Cero APIs de IA en la nube | `git grep -nEi 'openai\|anthropic\|api[_.-]?key\|googleapis\|gemini\|cohere\|replicate\|huggingface\|groq\|deepseek\|bedrock\|azure' -- . ':!package-lock.json' ':!docs'` | Solo aciertos explicables | ✅ dos aciertos, ninguno es un proveedor: `apps/server/src/datos/almacen.ts:139` → `this.store.replicate(conexion)`, replicación de Corestore; y `apps/server/scripts/prueba-sin-red.ts:28` → `fetch('https://huggingface.co')`, que es la **sonda que comprueba que NO hay internet** y falla la prueba si responde (`prueba-sin-red.ts:26-32`) |
| 1.3 | El servidor no hace salidas HTTP | `git grep -nE "fetch\(\|axios\|https?\.request\|node:https\|XMLHttpRequest" -- apps/server/src packages` | Salida vacía | ✅ salida vacía (exit 1). El único `fetch(` del servidor vive en `scripts/prueba-sin-red.ts`, fuera del código que corre la app |
| 1.4 | No hay URLs remotas en el código | `git grep -nEo "https?://[^\"' ]+" -- . ':!package-lock.json' ':!docs'` | Solo localhost y enlaces documentales | ✅ `localhost:5173` y `127.0.0.1:4000` (`README.md:22-23`, `apps/web/vite.config.ts:10`, `apps/server/package.json:18`), `apache.org` en `LICENSE:3,195`, el namespace SVG de `w3.org` en `apps/web/index.html:6`, comentarios de `.gitignore`, el changelog del SDK citado en `README.md:62` y la sonda de 1.2 |
| 1.5 | El lockfile no trae SDK de nube | `grep -nE '"node_modules/(openai\|@anthropic-ai[^"]*\|@google[^"]*\|replicate\|@aws-sdk[^"]*)"' package-lock.json` | Salida vacía | ✅ salida vacía (exit 1) |
| 1.6 | El tráfico P2P no es nube de IA | Leer `apps/server/src/red/red.ts:96-98` | Hyperswarm se une a un tópico de la DHT | ✅ DHT de Holepunch entre dispositivos del equipo; el tópico es `hash("quorum:" + código)`. Transporta observaciones firmadas y, desde el PR #49, consultas delegadas (ver 1.6b). Nunca un servidor de terceros |
| 1.6b | La inferencia delegada no se confunde con nube | `git grep -n "delegarConsulta" -- apps packages` | Un solo llamador, y va a un par | ✅ `apps/server/src/red/red.ts:134` se llama desde un único punto, `apps/server/src/index.ts:139` (`POST /api/consulta`). Lo que sale es la pregunta escrita más el esquema (`red.ts:25-30`), por el mismo canal Protomux cifrado del equipo; el par lo resuelve con **su** Qwen3 4B local (`index.ts:34`). **Qué decir si un juez pregunta:** no hay endpoint remoto, hay otra laptop del mismo equipo; si no responde en 30 s la consulta corre aquí (`red.ts:18`, `consulta.ts:125-129`) |
| 1.7 | Licencia Apache-2.0 detectada por GitHub | `gh api repos/nanoulloa/quorum-qvac/license --jq .license.spdx_id` | `Apache-2.0` | ✅ devuelve `Apache-2.0`; `LICENSE:1-3` es el texto completo |
| 1.8 | Repo público y alcanzable | `gh repo view nanoulloa/quorum-qvac --json visibility,isPrivate` | `PUBLIC` | ✅ `{"isPrivate":false,"visibility":"PUBLIC"}` · confirmar además abriendo la URL en una ventana privada |
| 1.9 | README declara base preexistente, modelos y APIs remotas | Abrir `README.md` | Las tres secciones presentes | ✅ `README.md:117-123`: "No se partió de código preexistente", terceros enumerados y "APIs remotas: ninguna". El issue #28 sigue abierto, pero el texto ya está en `main` |
| 1.10 | Video ≤ 5 min, link sin login | Abrir el link en ventana privada y cronometrar | Reproduce sin sesión, ≤ 5:00 | ⚠️ pendiente · no existe todavía · issue [#29](https://github.com/nanoulloa/quorum-qvac/issues/29). Guion listo en `docs/entrega/guion-video.md` (4:45 planificados) |
| 1.11 | Datos 100% ficticios | `git grep -n "PERSONAS\|semilla-" -- apps/server/src/datos/semilla.ts` | Nombres y hospitales inventados | ✅ `apps/server/src/datos/semilla.ts:1-2,23-26`: encabezado marcado como ficticio y personas con prefijo `semilla-` |
| 1.12 | Elegibilidad confirmada con ISD | Confirmación escrita del organizador | Respuesta por escrito | ⚠️ pendiente · fuera del repo, no verificable desde aquí |
| 1.13 | Formulario de entrega enviado | Enviar antes de las 7:00 am hora Panamá (límite 8:00) | Acuse recibido | ⚠️ pendiente · último paso |
| 1.14 | La interfaz no muestra datos de ejemplo en cámara | Abrir la web con el servidor local apagado | Debería avisar, no inventar | ✅ resuelto en [#56](https://github.com/nanoulloa/quorum-qvac/pull/56).<br>• `apps/web/src/datos/base.tsx` ya no trae datos de ejemplo; `origen` es `cargando` · `dispositivo` · `sin-servidor`.<br>• Con el servidor caído, `apps/web/src/components/Layout.tsx` muestra la banda **"El servidor local no responde"** y conserva lo último que llegó del dispositivo. Si nunca llegó nada, las pantallas quedan vacías.<br>• Verificado apagando el servidor en una instancia de prueba.<br>**Antes de grabar, confirmar que esa banda no aparece** |

## 2 · Mínimo obligatorio del reto Philips

| # | Requisito | Dónde lo ve un juez | Estado |
|---|---|---|---|
| 2.1 | Captura en lenguaje natural, texto o voz | `/captura` · botón de dictado y caja de texto | ✅ dictado en `apps/web/src/screens/Captura.tsx:324-326`, caja de texto en `:354-359`; el audio va a `POST /api/transcribir` (`apps/server/src/index.ts:76-81`) y se transcribe en el dispositivo (`apps/server/src/qvac/inferir.ts:89-111`) |
| 2.2 | Extrae cliente, ciudad y país | `/captura`, encabezado de la visita | ✅ esquema en `apps/server/src/captura/extraccion.ts:17-21` |
| 2.3 | Extrae modalidad, cantidad, marca, modelo y antigüedad | `/captura`, tarjetas de equipo | ✅ esquema en `apps/server/src/captura/extraccion.ts:22-37` |
| 2.4 | Tolera datos incompletos | Dictar una frase sin marca ni año | ✅ todos los campos aceptan `null` (`extraccion.ts:10,30-35`) y caen a `Desconocido` (`extraccion.ts:172,176`) |
| 2.5 | Pregunta por lo que falta | `/captura`, tarjeta "Falta un dato clave" | ✅ la regla elige el dato y el modelo redacta: `apps/server/src/index.ts:89-95` con `elegirFaltante` / `redactarPregunta`; la tarjeta solo muestra (`Captura.tsx:378-402`). Se puede responder por botón, texto o voz (`:385-401`) |
| 2.6 | Estado por dato: Confirmado / Reportado / Estimado / Desconocido | Píldora de estado en `/captura`, `/hospitales`, `/consultas`, `/captura/placa` | ✅ enum en `packages/shared/src/index.ts:11`; `StatusPill` en `apps/web/src/components/ui.tsx:63`, usado en `Captura.tsx:431`, `Hospitales.tsx:98`, `Consultas.tsx:196` y `Placa.tsx:297` |
| 2.7 | Vista por cliente | `/hospitales` y `/hospitales/:id` | ✅ `apps/web/src/App.tsx:19-20`; tabla en `Hospitales.tsx:80-101` con equipo, antigüedad, estado, confianza, testigos y última verificación |
| 2.8 | Vista agregada de todos los clientes | `/base` | ✅ `apps/web/src/App.tsx:21`; tabla en `BaseInstalada.tsx:116-120` con cliente, país, conteo por modalidad, antigüedad media y confianza media |
| 2.9 | La captura arranca vacía | Abrir `/captura` sin dictar nada | ✅ `Captura.tsx:20-24` (`VACIO`) es el estado inicial y el de "Nueva visita" (`:128-146`); el registro dice "Los equipos aparecen aquí a medida que dictas" (`:436`). Ya no hay una visita de ejemplo precargada en pantalla |
| 2.10 | La extracción no inventa el lugar del ejemplo | Dictar una frase sin nombrar hospital | ✅ `apps/server/src/captura/anclaje.ts:12-37`: cliente y ciudad que no aparecen en el dictado quedan en `null`; el país deducido de la ciudad queda `Estimado`. Se aplica en `extraccion.ts:199`. Pruebas en `apps/server/src/captura/anclaje.test.ts` — **no ejecutadas en esta revisión** (ver nota al pie) |

## 3 · Track Psy

| # | Requisito | Prueba | Estado |
|---|---|---|---|
| 3.1 | VisionPsy es central: lee las placas | `/captura` → "Foto de placa" en un equipo: el lector se abre dentro de la visita ([#57](https://github.com/nanoulloa/quorum-qvac/pull/57)). Para equipos ya guardados, `/captura/placa` desde Hospitales | ✅ `apps/server/src/placa/lectura.ts:53-87`, modelo `visionpsy-nano-460m` (`apps/server/src/qvac/modelos.ts`); la entrada acepta cámara trasera en `apps/web/src/components/PlacaEnVisita.tsx` y en `apps/web/src/screens/Placa.tsx` |
| 3.2 | VisionPsy corre local, nunca delegado | `git grep -n "leerPlaca\|delegarConsulta" -- apps packages` | ✅ `leerPlaca` llama a `completarJson`, que siempre registra `dondeCorre: 'este-dispositivo'` (`inferir.ts:47`). La delegación, que ahora existe, entra por otro camino: `red.delegarConsulta` solo se usa en `index.ts:139` (`POST /api/consulta`). `/api/placa` (`index.ts:103-108`) no recibe `delegar`. El contrato está escrito en `red.ts:25` y `index.ts:32-33`: fotos y dictados nunca salen del dispositivo |
| 3.3 | Licencia MIT o Apache | ver 1.7 | ✅ Apache-2.0 |
| 3.4 | Registro de rendimiento con carga, tokens, TTFT y tokens/s | `/rendimiento` o `GET /api/perf` | ✅ campos en `packages/shared/src/perf.ts:4-19`; se llenan en `inferir.ts:42-56` (`cargaMs`, `tokensEntrada`, `tokensSalida`, `ttftMs`, `tokensPorSegundo`, `backend`) y se leen en `apps/server/src/qvac/perf.ts` |
| 3.5 | El registro está en el repo | `git ls-files \| grep -i perf` | ✅ `docs/perf/perf-apple-m4.jsonl` (143 líneas, verificadas una a una: todas traen `cargaMs`, `ttftMs`, `tokensEntrada`, `tokensSalida`, `tokensPorSegundo` y `dondeCorre`), más `docs/perf/smoke-apple-m4.json` y `docs/perf/README.md` con el resumen por tarea. El `perf.jsonl` que escribe el servidor sigue ignorado (`.gitignore:4`): el del repo es la copia publicada |
| 3.6 | Evaluación de VisionPsy en el repo | `git ls-tree -r --name-only origin/main -- docs` | ✅ `docs/eval/vision.md` y `docs/eval/vision.json`: 30 placas sintéticas, acierto por campo y por variación, 114/120 total |
| 3.7 | README con hardware, modelos y cuantización | Tabla "Modelos y resultados medidos" del `README.md:73-89` | ⚠️ la tabla existe (Apple M4 · 16 GB · macOS 26.5, cuantización por modelo) y `docs/perf/README.md` declara el mismo hardware. Quedan dos desfases: (a) `docs/perf/smoke-apple-m4.json` todavía registra `WHISPER_BASE_Q8_0` en transcripción mientras el código y el README usan Parakeet; (b) el servidor que responde en `127.0.0.1:4000` en esta máquina reporta `Apple M3 · 8 GB` (`curl /api/sistema`), o sea que **no es la máquina donde se midió**. Rehacer la prueba de humo en la M4, o fechar el archivo y decir en el README que la transcripción se remidió · dueño: issue #28 |
| 3.8 | Flujo de usuario completo, no demo suelto | Recorrer primer uso → captura → placa → hospital → base → consultas → red → rendimiento | ⚠️ las ocho pantallas existen y están ruteadas (`apps/web/src/App.tsx:16-26`); falta el recorrido cronometrado de punta a punta contra el servidor local |
| 3.9 | Primer uso en una máquina limpia | Borrar `apps/server/.quorum/perfil.json` y abrir la web | ✅ sin perfil, `GET /api/perfil` devuelve `configurado:false` y el Layout muestra la bienvenida en vez de la app (`apps/web/src/components/Layout.tsx:54-56`). Pide nombre y **Crear un equipo** o **Unirme con un código** (`PrimerUso.tsx:104-128`); el código lo genera `apps/server/src/datos/perfil.ts:14-17` (`QRM-XXXX-XXXX-XXXX`, 60 bits) y se guarda solo en ese dispositivo (`perfil.ts:35-38`). Sin código, `Red.iniciar()` no busca a nadie (`red.ts:89-92`). Comprobado contra el servidor ya corriendo: `curl /api/perfil` → `{"configurado":false,...}` |
| 3.10 | Sumar un segundo dispositivo | `/red` → botón **Agregar dispositivo** | ✅ `apps/web/src/screens/Red.tsx:102-108` abre el panel `AgregarDispositivo` (`PrimerUso.tsx:153-178`) con el código y los tres pasos. En la otra laptop: "Unirme con un código". El tópico de la DHT sale del código (`red.ts:98`), así que dos equipos distintos no se mezclan. Procedimiento también en `README.md:27-36` |

## 4 · Extras que suman

| Extra | Dónde mostrarlo | Estado |
|---|---|---|
| Voz | `/captura`, botón de dictado | ✅ `apps/web/src/components/useGrabadora.ts:37` + `POST /api/transcribir` |
| Foto de placas | `/captura` → Foto de placa (y `/captura/placa` desde Hospitales) | ✅ ver 3.1 |
| Puntaje de confianza | Barra de confianza en `/hospitales` y `/consultas` | ✅ `packages/shared/src/confianza.ts:4,23`: completitud 35%, testigos 35%, evidencia 20%, frescura 10% |
| Duplicados | `/red`, tarjeta de duplicado con fusionar o marcar distintos | ✅ `apps/web/src/screens/Red.tsx:113-120` + `POST /api/decisiones` (`apps/server/src/index.ts:122-131`) |
| Alertas de datos viejos | Marca "sin verificar" en `/hospitales` y `/base` | ✅ `apps/web/src/datos/reglas.ts:8` (más de 180 días), usado en `Hospitales.tsx:35,101` y `BaseInstalada.tsx:75` |
| Oportunidades de renovación | Columna lateral de `/base` | ✅ `apps/web/src/datos/reglas.ts:5-6` y `BaseInstalada.tsx:74` |
| Preguntas de seguimiento | `/captura` | ✅ ver 2.5 |
| Consultas en lenguaje natural | `/consultas` | ✅ `apps/server/src/consultas/consulta.ts:104-142`: las reglas leen país, modalidad, marca y años; el modelo solo propone cliente y ciudad y se aceptan si aparecen en la pregunta y existen en la base (`:131-132`). Nunca se genera SQL |
| Inferencia delegada a un par | `/red` → "Ofrecer consultas al equipo"; `/consultas` dice dónde corrió | ✅ interruptor en `Red.tsx:189-196`, el par se anuncia como "Ofrece consultas · Qwen3 4B" (`Red.tsx:183`); la respuesta indica `en el par X` (`Consultas.tsx:97`) y `/rendimiento` separa las filas por dispositivo (`Rendimiento.tsx:52-63`). Ver 1.6b para el guion ante un juez |
| Exportar CSV | Botón "Exportar" en `/hospitales`, `/base` y `/consultas` | ✅ `apps/web/src/datos/csv.ts:62-64`; se descarga desde el navegador, sin servicio externo |
| P2P con Pears | `/red` | ✅ Hyperswarm, Corestore y Protomux (`apps/server/src/red/red.ts:1-4,96-98`); prueba con dos dispositivos simulados: `npm run prueba:p2p -w @quorum/server` (`apps/server/package.json:15`) |

## 5 · Últimos 60 minutos

1. `git fetch origin main` y confirmar que `docs/perf/perf-apple-m4.jsonl`, `docs/perf/README.md` y `docs/eval/vision.md` siguen versionados (`git ls-tree -r --name-only origin/main -- docs`).
2. Repo público: abrir `https://github.com/nanoulloa/quorum-qvac` en una ventana privada, sin sesión.
3. README al día: base preexistente, modelos con cuantización, hardware, APIs remotas ninguna, licencia. Resolver el desfase de 3.7 (Whisper en la prueba de humo, y en qué máquina se midió).
4. Levantar el servidor local y **precalentar los modelos** antes de grabar (la primera carga tarda decenas de segundos: `docs/perf/smoke-apple-m4.json`). No reiniciarlo después.
5. Primer uso, en las dos laptops y **antes** de grabar: nombre, Crear un equipo en A, Unirme con el código en B. El código no debe quedar en cámara. Para repetir la bienvenida, borrar `apps/server/.quorum/perfil.json`.
6. Con la web abierta, mirar el distintivo de la barra: si dice **"Servidor local sin respuesta"** la interfaz está mostrando datos de ejemplo (1.14). No grabar en ese estado.
7. Recorrer las ocho pantallas con el servidor encendido: captura, placa, hospital, base, consultas, red, rendimiento, perfil.
8. Prueba en modo avión: apagar Wi-Fi y correr captura por voz, extracción y lectura de placa. Todo debe responder. `/red` se queda sin pares — es lo esperado y se explica: la DHT necesita red, la inferencia no. Y si se va a mostrar la consulta delegada, hay que tener el Wi-Fi puesto y el par en línea.
9. Video: abrir el link en ventana privada y cronometrar que dure 5:00 o menos.
10. Enviar el formulario de entrega a las 7:00 am hora Panamá. El límite son las 8:00; la hora extra es el margen.

---

**Qué no se verificó en esta revisión y por qué.** No se corrieron `npm install`, compilaciones ni la
suite de pruebas (`apps/server/src/**/*.test.ts`, `packages/shared/src/confianza.test.ts`): la máquina
tiene los puertos 4000 y 5173 ocupados y 8 GB de memoria. Las filas que citan pruebas lo dicen. Los
`curl` a `127.0.0.1:4000` interrogan un servidor que ya estaba corriendo y que **no es necesariamente
este commit** — su `/api/perfil` no devuelve `ofreceConsultas`, campo que el PR #49 agregó, así que va
por detrás de `main`. Se usaron solo para observar comportamiento, nunca como prueba del código de
esta rama.
