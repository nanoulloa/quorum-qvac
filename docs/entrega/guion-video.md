# Guion del video · 5 minutos

Guion de grabación para E-02. Todo lo que aparece aquí existe en el código de `main`.
Lo que no existe está en la última sección, no en las tomas.

## 1 · Presupuesto de tiempo

| # | Segmento | Duración | Acumulado |
|---|---|---|---|
| 1 | Problema, promesa y modo avión | 0:25 | 0:25 |
| 2 | Dictado y extracción en el dispositivo | 0:55 | 1:20 |
| 3 | Pregunta por el dato que falta y guardar | 0:20 | 1:40 |
| 4 | **VisionPsy lee la placa** (toma del track Psy) | 0:55 | 2:35 |
| 5 | Ficha del hospital y confianza | 0:20 | 2:55 |
| 5b | **Base instalada**: mapa, filtros y renovación | 0:15 | 3:10 |
| 6 | **Red P2P entre dos laptops** y duplicado | 0:55 | 4:05 |
| 7 | Consulta en lenguaje natural y renovación | 0:20 | 4:25 |
| 8 | Rendimiento y cierre | 0:25 | 4:50 |

Total grabado 4:50. Quedan 10 s de margen sobre el límite de 5:00.
El peso está donde puntúa: núcleo técnico (2, 4, 6, 8) = 3:10 de 4:50.

La toma 5b existe porque la **vista agregada de todos los clientes es uno de los seis puntos
obligatorios de Philips** y el guion no la mostraba. Los 15 s salen del dictado (toma 2), que tenía
el margen más holgado.

## 2 · Antes de grabar

Laptop A (la que se graba):

```bash
nvm use && npm ci
npm run dev
```

En el navegador aparece **Bienvenido a Quorum**: escribe `Carlos Méndez`, elige **Crear un equipo**
y copia el código `QRM-XXXX-XXXX-XXXX`. Después, la base de ejemplo:

```bash
npm run semilla -w @quorum/server    # POST /api/semilla · 18 visitas ficticias
```

Dispositivo B (solo aparece en la toma 6, no se siembra). Si no hay una segunda laptop, corre en la
**misma Mac** como otra instancia, con su propio servidor, almacén y clave:

```bash
npm run dev:b    # servidor en :4001 · web en http://localhost:5174 · datos en apps/server/.quorum-b
```

- **Perfil:** `Ana Ríos`, unido al código de A. Se deja escrito en `apps/server/.quorum-b/perfil.json`
  antes de grabar, así B no pasa por la bienvenida.
- **Arrancar B con el modo avión ya encendido.** Sin red no encuentra a A y sigue vacío, que es justo
  lo que la toma 6 necesita mostrar.
- **Ventanas:** B se abre en una segunda ventana del navegador, a la derecha de la de A.

**Ensayar la toma 6 una vez antes de grabar.** Con las dos ventanas abiertas, apagar el modo avión y
cronometrar hasta "Conectado con 1 dispositivo". Si tarda más de 20 s, cortar la espera en la edición.

El perfil queda en `apps/server/.quorum/perfil.json` de cada máquina. Para volver a ver la pantalla
de bienvenida, borrar ese archivo. El código se recupera en cualquier momento desde
**Red P2P → Agregar dispositivo**.

- **Precalentar los modelos antes de grabar.** La primera carga tarda decenas de segundos
  (`docs/perf/smoke-apple-m4.json`: visión 28.682 ms, extracción 64.254 ms). Dicta una visita,
  lee una placa y haz una consulta antes de la primera toma. Después **no reinicies el servidor**.
- Deja `perf.jsonl` con esas inferencias: la toma 8 las muestra.
- **Modo avión encendido en la laptop A** desde antes de la toma 1 y hasta la toma 6.
- Ventana del navegador a 1440×900, sin barra de marcadores, pestaña única en `http://localhost:5173`.
- **Tema claro** en toda la grabación (el conmutador está abajo en el riel izquierdo).
- **El primer uso se hace ANTES de grabar, en las dos laptops.** La toma 1 empieza con `/captura`
  ya abierta, no con la bienvenida: el código de equipo no debe quedar grabado.
- Fuera de cámara: terminales con rutas de usuario, notificaciones, nombres de clientes reales,
  cualquier cifra de dinero. Los datos de la demo son ficticios y así se dicen.

## 3 · Guion por toma

| # | Dur. | En pantalla | Ruta y clics | Narración |
|---|---|---|---|---|
| 1 | 0:25 | Laptop A, `/captura` **vacía**: "Dicta o escribe lo que viste y Quorum arma el registro" y el Registro sin equipos. A los 0:10, plano corto del icono de modo avión | Abrir `http://localhost:5173` (con el perfil ya creado, redirige a `/captura`) | "Un ingeniero de campo sale de un hospital y sabe qué equipos hay adentro. Ese dato se pierde. Quorum lo captura hablando, y lo procesa en la misma laptop. Enciendo el modo avión ahora. Nada de lo que sigue sale de este dispositivo." |
| 2a | 0:20 | Botón de micrófono, onda en movimiento, reloj corriendo, texto "Grabando · la voz no sale del dispositivo" | `/captura` → clic en el botón de micrófono | "Dicto lo que vi." Luego dictar: *"Estoy en el Hospital DemoCare Pacific, en Ciudad de Panamá. Hay dos resonadores y un tomógrafo. Uno de los resonadores es Philips, un Ingenia, que parece de unos ocho años. El tomógrafo lo cambiaron el año pasado."* |
| 2b | 0:15 | Pie de la transcripción: "Transcribiendo en este dispositivo…", luego "Extrayendo datos…"; pasos Dictado → Extracción | Clic en el mismo botón para terminar | "Parakeet transcribe. Qwen extrae. Los dos corren aquí." |
| 2c | 0:30 | Transcripción con los valores subrayados y su etiqueta (cliente, ciudad, marca, modelo). Panel Registro: tres equipos con Marca, Modelo, Antigüedad y su estado. Pie: `parakeet 1,2 s · qwen3-1.7b 4,1 s · en este dispositivo` (los tiempos son los de la toma) | Ninguno; dejar que el panel se llene | "Cliente, ciudad, país. Tres equipos, con marca, modelo y antigüedad. Cada dato lleva su estado: Reportado si lo dijo la persona, Estimado si dudó, Desconocido si no lo dijo. Del segundo resonador no dijo nada, y eso no rompe nada." |
| 3 | 0:20 | Tarjeta azul: kicker "Falta un dato clave · " con la razón que redactó el modelo, pregunta **"¿Cuántos años tiene el segundo resonador?"**, el botón **Leer en voz alta** y las respuestas `Menos de 5` · `5 a 10` · `Más de 10` · `No sé`, más el campo de texto y el micrófono. Después, "Anotado: 5 a 10 como Estimado" y el Registro con `7 años` Estimado. **Todavía no se guarda:** la visita se guarda al final de la toma 4, ya con la foto | `/captura` → (opcional, antes de responder) clic en "Leer en voz alta" → clic en "5 a 10" | "Cuando falta algo, Quorum lo pide, y me lo puede leer en voz alta sin internet. Qué preguntar lo decide una regla, no el modelo: la antigüedad de un resonador pesa más que la marca de un ecógrafo. El modelo solo redacta. La respuesta entra como Estimado, no como dato duro." |
| 4 | 0:55 | Ver sección 4 | `/captura` → "Foto de placa" en el resonador 01 → el lector se abre encima de la visita → "Aplicar a este equipo" → "Guardar visita" | Ver sección 4 |
| 5 | 0:20 | Ficha de DemoCare: resumen, tabla de equipos con testigos y confianza; a la derecha, Desglose de confianza con Completitud 35%, Testigos independientes 35%, Evidencia 20%, Frescura 10% | Riel izquierdo → Hospitales → clic en "Hospital DemoCare Pacific" → clic en la fila del resonador | "Esta es la ficha del cliente. La confianza no es una probabilidad del modelo: son cuatro factores que se pueden auditar. Cuántos datos hay, cuántas personas distintas lo vieron, con qué evidencia, y hace cuánto." |
| 5b | 0:15 | Base instalada: mapa de Latinoamérica con los países coloreados por cantidad, filtros de país, modalidad y confianza, tabla por cliente y los paneles de renovación y datos sin verificar | Riel → Base instalada → clic en un país del mapa | "Y esta es la base instalada completa, sumando todos los clientes. Filtro por país tocando el mapa, y a la derecha quedan los equipos a los que les toca renovación y los que nadie verifica hace más de seis meses." |
| 6 | 0:55 | Ver sección 5 | `/red` en ambas laptops | Ver sección 5 |
| 7 | 0:20 | Consultas con la pregunta escrita; chips "País **Brasil**", "Modalidad **Resonancia magnética**", "Antigüedad **desde 8 años**"; tabla de resultados; pie `qwen3-1.7b · Q4 + reglas · en este dispositivo · <t> s` | Riel → Consultas → clic en el ejemplo "Clientes en Brasil con resonadores de más de siete años" | "Pregunto con mis palabras. País, modalidad y años los leen reglas; el modelo solo propone cliente y ciudad, y solo se aceptan si existen en la base. Nada de código generado. Quedan los filtros a la vista, y se pueden quitar. Estos son los equipos a los que les toca renovación." |
| 8 | 0:25 | Rendimiento: "Inferencia en APIs remotas · 0", hardware, inferencias registradas, primer token mediano; tabla de modelos con cuantización, "Dónde corre · Este dispositivo", carga, primer token y tok/s; registro `perf.jsonl` | Riel → Rendimiento | "Todo lo que vieron quedó registrado: modelo, cuantización, carga, primer token y tokens por segundo. Cero llamadas a APIs remotas. Está en `perf.jsonl` y se puede abrir." |

## 4 · La toma que gana el track Psy (toma 4 · 0:55)

Esta es la toma que prueba que VisionPsy es central y local. Grabarla sin cortes.

1. En `/captura`, clic en **Foto de placa** del resonador 01. El lector se abre **encima de la
   visita**: la transcripción y el Registro siguen debajo, sin guardar y sin perderse.
2. Clic en **Tomar foto** y fotografiar con la webcam una placa impresa, o **Usar placa de ejemplo**
   si la luz falla. Modo avión sigue encendido: se ve en la misma toma.
3. Mientras lee, la foto se ve atenuada y la nota dice **"Leyendo la placa en este dispositivo…"**.
   No cortar aquí.
4. Al terminar, en el lector:
   - **Campos leídos**: Marca, Modelo, Número de serie y Fabricación, cada uno con su estado.
   - **Pie**: `visionpsy-nano-460m · Q8_0 · en este dispositivo · <t> s`, con el tiempo real de la toma.
5. Clic en **Aplicar a este equipo**. El lector se cierra y en el Registro el resonador 01 queda
   `Philips` · `Ingenia 1.5T` · `9 años`, todo **Confirmado**, con el botón "Foto aplicada".
   Un campo solo se reemplaza si la foto es al menos tan firme como lo dictado.
6. Clic en **Guardar visita** → "Visita guardada" y la línea de firma. El resonador se guarda con la
   serie `45021` y evidencia de foto.
7. Ir a **Rendimiento** y dejar 4 segundos el renglón `visionpsy-nano-460m`, con
   **Cuantización Q8_0**, **Dónde corre: Este dispositivo**, **Carga**, **Primer token** y **tok/s**.
   Esa fila es la prueba de que no se delegó.

Narración: *"La placa es la fuente más confiable que hay en el hospital. VisionPsy Nano, 460 millones
de parámetros, lee marca, modelo, serie y fecha en esta misma laptop, en modo avión. La confianza de
cada campo no la inventa el modelo: se valida contra el catálogo de marcas y contra el formato de
serie y de fecha. Lo que no llega a 70 queda Estimado. Medido sobre 30 placas sintéticas: 95% de los
campos, y de lo que marca Confirmado, 99% correcto. Aplico la lectura a este resonador y guardo: queda
firmada por este dispositivo, con la foto como evidencia."* Si la toma pasa de 0:55, recortar la
primera frase.

## 5 · La toma P2P (toma 6 · 0:55)

Las dos ventanas en el mismo encuadre: A (`localhost:5173`) a la izquierda, B (`localhost:5174`) a la
derecha. Si B corre en la misma Mac, se dice en cámara.

1. **0:00–0:10** · A en `/red`: "Buscando dispositivos del equipo". B en `/red`, sin sembrar:
   su lista tiene un solo dispositivo, "Ana Ríos · este dispositivo", 0 entradas propias.
   *"Este es un segundo dispositivo del equipo, aquí en la misma Mac, con su propio almacén y su
   propia clave. Está vacío. No hay servidor: no hay a quién preguntarle."*
2. **0:10–0:20** · Apagar el modo avión, en cámara.
   *"Enciendo la red. No hay backend que levantar."*
3. **0:20–0:40** · Sin tocar nada más, en las dos pantallas: **Estado** pasa a
   "Conectado con 1 dispositivo"; en **Actividad de sincronización** aparecen
   "Conectado con … · clave …" y "N registros nuevos de … para sincronizar";
   en **Dispositivos del equipo** el otro queda "En línea" con su clave `ed25519`.
   La ficha de DemoCare en B ya tiene los equipos.
   *"Se encuentran por un tópico derivado del secreto del equipo. Solo quien lo conoce entra.
   Cada dispositivo firma lo que reporta con su clave. Medido entre dos almacenes: 4 segundos la
   primera vez, medio segundo cuando ya están conectados."*
4. **0:40–0:55** · En A, tarjeta **Posible duplicado · 1 de 1 · Hospital DemoCare Pacific**:
   "¿Es el mismo tomógrafo que reportó Sofía?", con el tomógrafo dictado en la toma 2 y el que
   reportó Sofía Castro, comparados campo por campo.
   - La tarjeta sale de la visita grabada, no de B. Sin marca, Quorum no une dos reportes solo y se
     lo pregunta a una persona.
   - Clic en **Es el mismo, unir**. La tarjeta pasa a "Ningún reporte parece repetido".
   - Ir a Hospitales → DemoCare → fila del tomógrafo: queda con 2 testigos y confianza 62. Antes eran
     dos filas de 48; son los valores del ensayo y pueden variar un punto.

   *"Dos personas reportaron el mismo tomógrafo, sin marca. Quorum no los une por su cuenta: me lo
   pregunta. Al unirlo, suma un testigo independiente y la confianza sube. La decisión también va
   firmada y también se sincroniza."*

Cómo se ve que no hay servidor en medio: el modo avión estuvo encendido hasta el paso 2, B nunca se
sembró, y nadie abrió una consola ni una URL distinta de `localhost`. Los dos dispositivos se
encuentran por la DHT de Hyperswarm igual que dos laptops en casas distintas; así se probó también
con la laptop de Steven, desde otra casa.

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

- **El código de equipo no debe aparecer en cámara.** Es lo que deja entrar a un dispositivo al
  equipo. El primer uso y la pantalla "Agregar dispositivo" se hacen antes de grabar.
- **Duplicados sin embeddings.** `embeddinggemma-300m` está en el catálogo de modelos pero ninguna
  ruta lo llama; el emparejamiento de la pantalla Red es por reglas (mismo cliente, misma modalidad,
  marcas compatibles, antigüedad cercana, personas distintas). No atribuirlo a un modelo.
- **Qué modelo corre una consulta depende de si hay un par.** En este dispositivo la interpreta
  `qwen3-1.7b` más reglas; si un par del equipo está en línea puede resolverla con `qwen3-4b`. El pie
  de la pantalla dice cuál corrió y dónde: leerlo, no anticiparlo. Y si se muestra una consulta
  delegada, decir en voz alta que el par es otra laptop del equipo, no un servidor.
- **La lectura de placa nunca se delega.** Aunque las consultas puedan resolverse en un par, la
  columna "Dónde corre" de VisionPsy dice siempre "Este dispositivo", que es justo lo que exige el
  track Psy. Vale la pena señalarlo en la toma 8.

