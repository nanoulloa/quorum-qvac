# Guion del video · 5 minutos

Guion de grabación para E-02. Todo lo que aparece aquí existe en el código de `main`.
Lo que no existe está en la última sección, no en las tomas.

## 1 · Presupuesto de tiempo

| # | Segmento | Duración | Acumulado |
|---|---|---|---|
| 1 | Problema, promesa y modo avión | 0:25 | 0:25 |
| 2 | Dictado y extracción en el dispositivo | 1:05 | 1:30 |
| 3 | Pregunta por el dato que falta y guardar | 0:20 | 1:50 |
| 4 | **VisionPsy lee la placa** (toma del track Psy) | 0:55 | 2:45 |
| 5 | Ficha del hospital y confianza | 0:20 | 3:05 |
| 6 | **Red P2P entre dos laptops** y duplicado | 0:55 | 4:00 |
| 7 | Consulta en lenguaje natural y renovación | 0:20 | 4:20 |
| 8 | Rendimiento y cierre | 0:25 | 4:45 |

Total grabado 4:45. Quedan 15 s de margen sobre el límite de 5:00.
El peso está donde puntúa: núcleo técnico (2, 4, 6, 8) = 3:20 de 4:45.

## 2 · Antes de grabar

Laptop A (la que se graba):

```bash
nvm use && npm install
QUORUM_EQUIPO="<secreto-del-dia>" QUORUM_NOMBRE="Carlos Méndez" npm run dev
npm run semilla -w @quorum/server    # POST /api/semilla · 18 visitas ficticias
```

Laptop B (solo aparece en la toma 6, no se siembra):

```bash
QUORUM_EQUIPO="<el mismo secreto>" QUORUM_NOMBRE="Ana Ríos" npm run dev
```

- **Precalentar los modelos antes de grabar.** La primera carga tarda decenas de segundos
  (`docs/perf/smoke-apple-m4.json`: visión 28.682 ms, extracción 64.254 ms). Dicta una visita,
  lee una placa y haz una consulta antes de la primera toma. Después **no reinicies el servidor**.
- Deja `perf.jsonl` con esas inferencias: la toma 8 las muestra.
- **Modo avión encendido en la laptop A** desde antes de la toma 1 y hasta la toma 6.
- Ventana del navegador a 1440×900, sin barra de marcadores, pestaña única en `http://localhost:5173`.
- **Tema claro** en toda la grabación (el conmutador está abajo en el riel izquierdo).
- `/captura` carga con un dictado de ejemplo ya puesto. Dicta de una: el resultado real lo reemplaza.
  No digas que la pantalla está vacía.
- Fuera de cámara: terminales con rutas de usuario, notificaciones, nombres de clientes reales,
  cualquier cifra de dinero. Los datos de la demo son ficticios y así se dicen.

## 3 · Guion por toma

| # | Dur. | En pantalla | Ruta y clics | Narración |
|---|---|---|---|---|
| 1 | 0:25 | Laptop A, `/captura`. Plano de la pantalla completa; a los 0:10, plano corto del icono de modo avión | Abrir `http://localhost:5173` (redirige a `/captura`) | "Un ingeniero de campo sale de un hospital y sabe qué equipos hay adentro. Ese dato se pierde. Quorum lo captura hablando, y lo procesa en la misma laptop. Enciendo el modo avión ahora. Nada de lo que sigue sale de este dispositivo." |
| 2a | 0:20 | Botón de micrófono, onda en movimiento, reloj corriendo, texto "Grabando · la voz no sale del dispositivo" | `/captura` → clic en el botón de micrófono | "Dicto lo que vi." Luego dictar: *"Estoy en el Hospital DemoCare Pacific, en Ciudad de Panamá. Hay dos resonadores y un tomógrafo. Uno de los resonadores es Philips, un Ingenia, que parece de unos ocho años. El tomógrafo lo cambiaron el año pasado."* |
| 2b | 0:15 | Pie de la transcripción: "Transcribiendo en este dispositivo…", luego "Extrayendo datos…"; pasos Dictado → Extracción | Clic en el mismo botón para terminar | "Parakeet transcribe. Qwen extrae. Los dos corren aquí." |
| 2c | 0:30 | Transcripción con los valores subrayados y su etiqueta (cliente, ciudad, marca, modelo). Panel Registro: tres equipos con Marca, Modelo, Antigüedad y su estado. Pie: `parakeet 1,2 s · qwen3-1.7b 4,1 s · en este dispositivo` (los tiempos son los de la toma) | Ninguno; dejar que el panel se llene | "Cliente, ciudad, país. Tres equipos, con marca, modelo y antigüedad. Cada dato lleva su estado: Reportado si lo dijo la persona, Estimado si dudó, Desconocido si no lo dijo. Del segundo resonador no dijo nada, y eso no rompe nada." |
| 3 | 0:20 | Tarjeta "Falta un dato clave · resonador magnético 02", pregunta "¿Cuántos años tiene, más o menos?" con tres respuestas. Después, "Anotado: 5 a 10 años como Estimado". Botón Guardar visita → "Visita guardada" y la línea de firma | `/captura` → clic en "5 a 10" → clic en "Guardar visita" | "Cuando falta algo, Quorum lo pide. La respuesta entra como Estimado, no como dato duro. Guardo: queda firmada por este dispositivo y se comparte al sincronizar." |
| 4 | 0:55 | Ver sección 4 | `/captura` → "Foto de placa" en el resonador 01 → `/captura/placa` | Ver sección 4 |
| 5 | 0:20 | Ficha de DemoCare: resumen, tabla de equipos con testigos y confianza; a la derecha, Desglose de confianza con Completitud 35%, Testigos independientes 35%, Evidencia 20%, Frescura 10% | Riel izquierdo → Hospitales → clic en "Hospital DemoCare Pacific" → clic en la fila del resonador | "Esta es la ficha del cliente. La confianza no es una probabilidad del modelo: son cuatro factores que se pueden auditar. Cuántos datos hay, cuántas personas distintas lo vieron, con qué evidencia, y hace cuánto." |
| 6 | 0:55 | Ver sección 5 | `/red` en ambas laptops | Ver sección 5 |
| 7 | 0:20 | Consultas con la pregunta escrita; chips "País **Brasil**", "Modalidad **Resonancia magnética**", "Antigüedad **desde 8 años**"; tabla de resultados; pie `qwen3-1.7b · Q4 + reglas · en este dispositivo · <t> s` | Riel → Consultas → clic en el ejemplo "Clientes en Brasil con resonadores de más de siete años" | "Pregunto con mis palabras. País, modalidad y años los leen reglas; el modelo solo propone cliente y ciudad, y solo se aceptan si existen en la base. Nada de código generado. Quedan los filtros a la vista, y se pueden quitar. Estos son los equipos a los que les toca renovación." |
| 8 | 0:25 | Rendimiento: "Inferencia en APIs remotas · 0", hardware, inferencias registradas, primer token mediano; tabla de modelos con cuantización, "Dónde corre · Este dispositivo", carga, primer token y tok/s; registro `perf.jsonl` | Riel → Rendimiento | "Todo lo que vieron quedó registrado: modelo, cuantización, carga, primer token y tokens por segundo. Cero llamadas a APIs remotas. Está en `perf.jsonl` y se puede abrir." |

## 4 · La toma que gana el track Psy (toma 4 · 0:55)

Esta es la toma que prueba que VisionPsy es central y local. Grabarla sin cortes.

1. En `/captura`, clic en **Foto de placa** del resonador 01 → `/captura/placa`.
2. Clic en **Tomar foto** y fotografiar con la webcam una placa impresa, o **Usar placa de ejemplo**
   si la luz falla. Modo avión sigue encendido: se ve en la misma toma.
3. Mientras lee, el visor muestra la foto atenuada y el pie dice
   **"Leyendo la placa en este dispositivo…"**. No cortar aquí.
4. Al terminar, en pantalla:
   - **Campos leídos**: Marca, Modelo, Número de serie, Fabricación, cada uno con su número de
     confianza, su barra y su estado.
   - **Pie**: `visionpsy-nano-460m · Q8_0 · en este dispositivo · 2,3 s` — el tiempo real de la toma.
   - **Cambios en el registro**: Modelo `Ingenia` Reportado → `Ingenia 1.5T` Confirmado;
     Número de serie Desconocido → `45021` Confirmado.
5. Sin salir, ir a **Rendimiento** y dejar 4 segundos el renglón `visionpsy-nano-460m`, con
   **Cuantización Q8_0**, **Dónde corre: Este dispositivo**, **Carga**, **Primer token** y **tok/s**.
   Esa fila es la prueba de que no se delegó.

Narración: *"La placa es la fuente más confiable que hay en el hospital. VisionPsy Nano, 460 millones
de parámetros, lee marca, modelo, serie y fecha en esta misma laptop, en modo avión. La confianza de
cada campo no la inventa el modelo: se valida contra el catálogo de marcas y contra el formato de
serie y de fecha. Lo que no llega a 70 queda Estimado. Medido sobre 30 placas sintéticas: 95% de los
campos, y de lo que marca Confirmado, 99% correcto."*

## 5 · La toma P2P (toma 6 · 0:55)

Las dos laptops en el mismo encuadre, A a la izquierda, B a la derecha.

1. **0:00–0:10** · A en `/red`: "Buscando dispositivos del equipo". B en `/red`, sin sembrar:
   su lista tiene un solo dispositivo, "Ana Ríos · este dispositivo", 0 entradas propias.
   *"Esta segunda laptop está vacía. No hay servidor: no hay a quién preguntarle."*
2. **0:10–0:20** · Apagar el modo avión en ambas, en cámara.
   *"Enciendo la red. No hay backend que levantar."*
3. **0:20–0:40** · Sin tocar nada más, en las dos pantallas: **Estado** pasa a
   "Conectado con 1 dispositivo"; en **Actividad de sincronización** aparecen
   "Conectado con … · clave …" y "N registros nuevos de … para sincronizar";
   en **Dispositivos del equipo** el otro queda "En línea" con su clave `ed25519`.
   La ficha de DemoCare en B ya tiene los equipos.
   *"Se encuentran por un tópico derivado del secreto del equipo. Solo quien lo conoce entra.
   Cada dispositivo firma lo que reporta con su clave. Medido entre dos almacenes: 4 segundos la
   primera vez, medio segundo cuando ya están conectados."*
4. **0:40–0:55** · En A, tarjeta **Posible duplicado**: comparación campo por campo y
   "¿Es el mismo resonador magnético que reportó …?". Clic en **Es el mismo, unir** → volver a
   Hospitales y mostrar la confianza del equipo más alta que antes.
   *"Dos personas reportaron el mismo equipo. Al unirlo, suma un testigo independiente y la
   confianza sube. La decisión también va firmada y también se sincroniza."*

Cómo se ve que no hay servidor en medio: el modo avión estuvo encendido hasta el paso 2, B nunca se
sembró, y nadie abrió una consola ni una URL distinta de `localhost` en ninguna de las dos máquinas.

## 6 · Cierre (últimos 20 s)

Pantalla: `/rendimiento` con "Inferencia en APIs remotas · 0" a la vista.

*"Quorum: dictas lo que viste, la IA lo estructura, VisionPsy confirma con la placa, y el equipo
converge sin servidor. Cinco modelos, todos en el dispositivo. Datos ficticios, código abierto,
y el registro de cada inferencia en el repositorio."*

## 7 · Checklist de publicación

- [ ] Duración final ≤ 5:00.
- [ ] YouTube **no listado**; el enlace abre en ventana de incógnito sin iniciar sesión.
- [ ] Audio audible de principio a fin, sin recortes al inicio.
- [ ] Ninguna credencial, ruta personal, nombre real de cliente ni cifra de dinero en pantalla.
- [ ] Enlace pegado en el formulario de entrega y en el README.

## Lo que NO se muestra y por qué

- **Consulta y respuesta por voz.** Los botones de micrófono de Consultas y de la pregunta de
  seguimiento no tienen acción. Solo se dicta en Captura.
- **Exportar CSV** (Base instalada, Consultas, Hospitales) y **Agregar dispositivo** (Red P2P):
  botones sin acción todavía.
- **La pregunta de seguimiento la decide una regla, pero el texto lo redacta el modelo.** La regla fija
  elige el campo que más falta y ofrece las respuestas; el modelo local solo escribe la pregunta y su
  razón. Se puede decir las dos cosas: la decisión es determinista, la redacción es del modelo.
- **Exportar CSV y consulta por voz** llegaron con el PR #39; verificar en la máquina antes de
  guionizar una toma sobre ellos.
- **Duplicados sin embeddings.** `embeddinggemma-300m` está en el catálogo de modelos pero ninguna
  ruta lo llama; el emparejamiento de la pantalla Red es por reglas (mismo cliente, misma modalidad,
  marcas compatibles, antigüedad cercana, personas distintas). No atribuirlo a un modelo.
- **`qwen3-4b` no se usa.** Está en el catálogo de modelos, pero las consultas las interpreta
  `qwen3-1.7b` más reglas. El pie de la pantalla dice cuál corrió: leerlo, no anticiparlo.
- **Inferencia delegada a otro dispositivo** (P2-01): no existe. La columna "Dónde corre" siempre dice
  "Este dispositivo", que es justo lo que pide el track Psy.
- **Mapa** (P2-04): no existe. La distribución geográfica se muestra con las barras por país.
