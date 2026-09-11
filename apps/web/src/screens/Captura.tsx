import type { CampoPregunta, DatoExtraido, Evidencia, Extraccion, Faltante, Pregunta, Respuesta } from '@quorum/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { IconCamera, IconCheck, IconMic, IconSend } from '../components/icons';
import { PageHeader, StatusPill, Steps } from '../components/ui';
import { useGrabadora } from '../components/useGrabadora';
import { useBase } from '../datos/base';
import { captura, clientePorId, type Dato, type Segmento } from '../mocks/data';

const PASOS = ['Dictado', 'Extracción', 'Preguntas', 'Foto de placa', 'Guardar'];
const ONDA = [6, 10, 16, 24, 14, 28, 20, 10, 22, 32, 18, 8, 14, 26, 22, 12, 6, 20, 34, 24, 14, 10, 22, 30, 12, 20, 8, 14, 24, 30, 18, 10, 20, 12, 26, 22, 8, 14, 10, 6, 12, 20, 26, 16, 10, 14, 8, 6, 10, 7, 5, 6, 4, 5, 4, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 3];

type Fase = 'listo' | 'grabando' | 'transcribiendo' | 'extrayendo' | 'guardando' | 'error';
type EquipoVista = { id: string; nombre: string; campos: Record<string, Dato> };
type Encabezado = { cliente: string | null; lugar: string | null };

const NOMBRE: Record<string, string> = { 'Resonancia magnética': 'Resonador magnético', Tomografía: 'Tomógrafo', Ecografía: 'Ecógrafo', 'Rayos X': 'Equipo de rayos X', Otro: 'Otro equipo' };

const anios = (n: number | null) => (n === null ? null : n === 1 ? '1 año' : `${n} años`);
const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const reloj = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
/** Mismo identificador de cliente que arma el servidor en la base instalada. */
const idCliente = (nombre: string) =>
  nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9ñ\s]/g, ' ').trim().replace(/\s+/g, '-');

function aVista(r: Extraccion): { equipos: EquipoVista[]; encabezado: Encabezado } {
  return {
    encabezado: { cliente: r.cliente.valor, lugar: [r.ciudad.valor, r.pais.valor].filter(Boolean).join(', ') || null },
    equipos: r.equipos.map((e, i) => ({
      id: `r${i}`,
      nombre: `${NOMBRE[e.modalidad] ?? e.modalidad}${e.cantidad > 1 ? ` ×${e.cantidad}` : ''}`,
      campos: { Marca: e.marca, Modelo: e.modelo, Antigüedad: { valor: anios(e.antiguedad.valor), estado: e.antiguedad.estado } },
    })),
  };
}

/** La extracción es la fuente: la respuesta se escribe ahí y la vista se deriva de nuevo. */
function conRespuesta(r: Extraccion, indice: number, campo: CampoPregunta, dato: Respuesta): Extraccion {
  const equipos = r.equipos.map((e, i) => {
    if (i !== indice) return e;
    const { estado } = dato;
    if (campo === 'antiguedad') return { ...e, antiguedad: { valor: typeof dato.valor === 'number' ? dato.valor : null, estado } };
    const texto: DatoExtraido<string> = { valor: dato.valor === null ? null : String(dato.valor), estado };
    if (campo === 'marca') return { ...e, marca: texto };
    if (campo === 'modelo') return { ...e, modelo: texto };
    return e;
  });
  return { ...r, equipos };
}

/** Resalta en la transcripción los valores que la IA extrajo. */
function anotar(texto: string, r: Extraccion): Segmento[] {
  const marcas = [
    [r.cliente.valor, 'cliente'],
    [r.ciudad.valor, 'ciudad'],
    [r.pais.valor, 'país'],
    ...r.equipos.flatMap((e) => [[e.marca.valor, 'marca'], [e.modelo.valor, 'modelo']]),
  ].filter((m): m is [string, string] => Boolean(m[0]));
  const segmentos: Segmento[] = [];
  let resto = texto;
  while (resto) {
    let mejor: { i: number; valor: string; etiqueta: string } | null = null;
    for (const [valor, etiqueta] of marcas) {
      const i = resto.toLowerCase().indexOf(valor.toLowerCase());
      if (i >= 0 && (!mejor || i < mejor.i)) mejor = { i, valor, etiqueta };
    }
    if (!mejor) {
      segmentos.push(resto);
      break;
    }
    if (mejor.i > 0) segmentos.push(resto.slice(0, mejor.i));
    segmentos.push({ texto: resto.slice(mejor.i, mejor.i + mejor.valor.length), etiqueta: mejor.etiqueta });
    resto = resto.slice(mejor.i + mejor.valor.length);
  }
  return segmentos;
}

export function Captura() {
  const demo = clientePorId(captura.clienteId);
  const grabadora = useGrabadora();
  const grabadoraRespuesta = useGrabadora();
  const { red, recargar } = useBase();
  const [fase, setFase] = useState<Fase>('listo');
  const [error, setError] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState<Segmento[]>(captura.transcripcion);
  const [dictado, setDictado] = useState<{ texto: string; fuente: Evidencia } | null>(null);
  const [extraccion, setExtraccion] = useState<Extraccion | null>(null);
  const [equipos, setEquipos] = useState<EquipoVista[]>(captura.equipos);
  const [encabezado, setEncabezado] = useState<Encabezado>({ cliente: demo?.nombre ?? null, lugar: demo ? `${demo.ciudad}, ${demo.pais}` : null });
  const [modelos, setModelos] = useState('parakeet · qwen3-1.7b · datos de ejemplo');
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [preguntadas, setPreguntadas] = useState<Faltante[]>([]);
  const [preguntando, setPreguntando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ texto: string; estado: Respuesta['estado'] } | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [guardada, setGuardada] = useState<{ cliente: string | null } | null>(null);
  const [texto, setTexto] = useState('');

  /** El servidor elige el dato que más falta y redacta la pregunta; la tarjeta solo la muestra. */
  const preguntar = async (fuente: Extraccion, omitidos: Faltante[]) => {
    setPreguntando(true);
    try {
      setPregunta(await api.pregunta(fuente, omitidos));
    } catch (e) {
      // La extracción ya quedó guardada en estado: que falle la pregunta no debe tirar la captura a error.
      console.error(e);
    } finally {
      setPreguntando(false);
    }
  };

  const procesar = async (contenido: string, fuente: Evidencia, msTranscripcion?: number) => {
    setFase('extrayendo');
    const t0 = performance.now();
    const r = await api.extraer(contenido);
    const vista = aVista(r);
    setDictado({ texto: contenido, fuente });
    setExtraccion(r);
    setTranscripcion(anotar(contenido, r));
    setEquipos(vista.equipos);
    setEncabezado(vista.encabezado);
    setRespuesta(null);
    setPregunta(null);
    setPreguntadas([]);
    setGuardada(null);
    const partes = [msTranscripcion !== undefined ? `parakeet ${segundos(msTranscripcion)}` : null, `qwen3-1.7b ${segundos(performance.now() - t0)}`];
    setModelos(`${partes.filter(Boolean).join(' · ')} · en este dispositivo`);
    setFase('listo');
    await preguntar(r, []);
  };

  const conError = (e: unknown) => {
    setError(e instanceof Error ? e.message : 'No se pudo procesar el dictado.');
    setFase('error');
  };

  const alternarGrabacion = async () => {
    setError(null);
    try {
      if (!grabadora.grabando) {
        await grabadora.iniciar();
        setFase('grabando');
        return;
      }
      const audio = await grabadora.detener();
      setFase('transcribiendo');
      const t = await api.transcribir(audio);
      setTranscripcion([t.texto]);
      await procesar(t.texto, 'voz', t.duracionMs);
    } catch (e) {
      conError(e);
    }
  };

  const enviarTexto = async () => {
    const contenido = texto.trim();
    if (!contenido) return;
    setError(null);
    setTexto('');
    setTranscripcion([contenido]);
    await procesar(contenido, 'texto').catch(conError);
  };

  const responder = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || !pregunta || !extraccion) {
      setPreguntando(false);
      return;
    }
    const { equipo, campo } = pregunta;
    // Un campo respondido no se vuelve a preguntar, aunque la respuesta haya sido "No sé".
    const omitidos = [...preguntadas, { equipo, campo }];
    setPreguntando(true);
    setPreguntadas(omitidos);
    setRespuestaTexto('');
    try {
      const dato = await api.responder(campo, limpio);
      const actualizada = conRespuesta(extraccion, equipo, campo, dato);
      setExtraccion(actualizada);
      setEquipos(aVista(actualizada).equipos);
      setRespuesta({ texto: limpio, estado: dato.estado });
      await preguntar(actualizada, omitidos);
    } catch (e) {
      conError(e);
    } finally {
      setPreguntando(false);
    }
  };

  const responderPorVoz = async () => {
    setError(null);
    try {
      if (!grabadoraRespuesta.grabando) {
        await grabadoraRespuesta.iniciar();
        return;
      }
      const audio = await grabadoraRespuesta.detener();
      setPreguntando(true);
      await responder((await api.transcribir(audio)).texto);
    } catch (e) {
      setPreguntando(false);
      conError(e);
    }
  };

  const guardar = async () => {
    if (!extraccion || !dictado) return;
    setError(null);
    setFase('guardando');
    try {
      await api.guardarObservacion({
        fuente: dictado.fuente,
        transcripcion: dictado.texto,
        cliente: extraccion.cliente,
        ciudad: extraccion.ciudad,
        pais: extraccion.pais,
        equipos: extraccion.equipos.map((e) => ({ ...e, evidencia: dictado.fuente })),
      });
      await recargar();
      setGuardada({ cliente: extraccion.cliente.valor });
      setFase('listo');
    } catch (e) {
      conError(e);
    }
  };

  const ocupado = fase === 'transcribiendo' || fase === 'extrayendo' || fase === 'guardando';
  const paso = guardada ? 5 : grabadora.grabando || fase === 'transcribiendo' ? 0 : fase === 'extrayendo' ? 1 : pregunta || preguntando ? 2 : extraccion ? 4 : 0;
  const onda = grabadora.grabando ? grabadora.niveles.map((n) => 4 + n * 36) : ONDA;
  const nota = grabadora.grabando ? 'Grabando · la voz no sale del dispositivo' : fase === 'transcribiendo' ? 'Transcribiendo en este dispositivo…' : fase === 'extrayendo' ? 'Extrayendo datos…' : 'Toca para dictar la visita';

  return (
    <>
      <PageHeader
        eyebrow="Visita en curso"
        title={encabezado.cliente ?? 'Nueva visita'}
        subtitle={encabezado.lugar ?? 'Cliente sin identificar'}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void guardar()}
            disabled={!extraccion || ocupado || Boolean(guardada)}
            title={extraccion ? undefined : 'Dicta o escribe una visita primero'}
          >
            <IconCheck /> {fase === 'guardando' ? 'Guardando…' : guardada ? 'Visita guardada' : 'Guardar visita'}
          </button>
        }
      />

      <Steps labels={PASOS} current={paso} />

      <div className="split captura">
        <div className="captura-col">
          <div className="recorder">
            <button type="button" className="recorder-btn" onClick={alternarGrabacion} disabled={ocupado} aria-label={grabadora.grabando ? 'Terminar dictado' : 'Dictar'}>
              {grabadora.grabando ? <span className="recorder-stop" /> : <IconMic width={22} height={22} />}
            </button>
            <div className="wave" aria-hidden="true">
              {onda.map((h, i) => (
                <i key={i} className={grabadora.grabando || ocupado ? '' : 'off'} style={{ height: h }} />
              ))}
            </div>
            <div className="recorder-meta">
              <span className="mono recorder-time">{reloj(grabadora.segundos)}</span>
              <span className="recorder-note">{nota}</span>
            </div>
          </div>

          <section className="card transcript" aria-busy={ocupado}>
            <div className="eyebrow">Transcripción</div>
            <p className="transcript-text">
              {transcripcion.map((s, i) =>
                typeof s === 'string' ? (
                  s
                ) : (
                  <span key={i} className={`tag${s.estimado ? ' tag-estimado' : ''}`}>
                    {s.texto}
                    <sup>{s.etiqueta}</sup>
                  </span>
                ),
              )}
            </p>
            {error && <p className="note">{error}</p>}
            <form className="transcript-form" onSubmit={(e) => { e.preventDefault(); void enviarTexto(); }}>
              <input className="input" placeholder="O escribe lo que viste…" value={texto} onChange={(e) => setTexto(e.target.value)} disabled={ocupado} />
              <button type="submit" className="btn btn-ghost" disabled={ocupado}>
                <IconSend /> Enviar
              </button>
            </form>
            <div className="mono faint transcript-meta">{modelos}</div>
          </section>

          {guardada ? (
            <section className="card answered">
              <IconCheck width={18} height={18} />
              <span>Guardada en este dispositivo y firmada por <strong>{red?.este.nombre ?? 'este dispositivo'}</strong>. Se comparte al sincronizar.</span>
              {guardada.cliente && <Link to={`/hospitales/${idCliente(guardada.cliente)}`} className="btn btn-link">Ver en Hospitales</Link>}
            </section>
          ) : (
            <>
              {respuesta && (
                <section className="card answered">
                  <IconCheck width={18} height={18} />
                  <span>Anotado: <strong>{respuesta.texto}</strong> como {respuesta.estado}</span>
                </section>
              )}
              {(pregunta || preguntando) && (
                <section className="question" aria-label="Pregunta de seguimiento" aria-busy={preguntando}>
                  <div className="question-body">
                    <div className="question-kicker">{preguntando || !pregunta ? 'Pensando la pregunta…' : `Falta un dato clave · ${pregunta.razon}`}</div>
                    <div className="question-text">{pregunta?.pregunta ?? '…'}</div>
                  </div>
                  <div className="question-answers">
                    {pregunta?.respuestas.map((r) => (
                      <button key={r} type="button" className="answer" onClick={() => void responder(r)} disabled={preguntando}>{r}</button>
                    ))}
                    <form onSubmit={(e) => { e.preventDefault(); void responder(respuestaTexto); }}>
                      <input className="input" placeholder="O escribe la respuesta…" value={respuestaTexto} onChange={(e) => setRespuestaTexto(e.target.value)} disabled={preguntando} />
                    </form>
                    <button
                      type="button"
                      className="answer answer-icon"
                      onClick={() => void responderPorVoz()}
                      disabled={preguntando}
                      aria-label={grabadoraRespuesta.grabando ? 'Terminar respuesta' : 'Responder por voz'}
                    >
                      {grabadoraRespuesta.grabando ? <span className="recorder-stop" /> : <IconMic width={17} height={17} />}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <section className="card registro">
          <div className="registro-head">
            <h2 className="title-lg">Registro</h2>
            <div className="registro-legend">
              <StatusPill estado="Reportado" />
              <StatusPill estado="Estimado" />
              <StatusPill estado="Desconocido" />
            </div>
          </div>
          {equipos.map((e, i) => (
            <div key={e.id} className="registro-equipo">
              <div className="registro-equipo-head">
                <div className="registro-equipo-name">
                  <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="section-title">{e.nombre}</span>
                </div>
                <Link to="/captura/placa" className="btn btn-link">
                  <IconCamera width={15} height={15} /> Foto de placa
                </Link>
              </div>
              {(Object.entries(e.campos) as [string, Dato][]).map(([clave, dato]) => (
                <div key={clave} className="kv-row">
                  <span className="kv-key">{clave}</span>
                  <span className={dato.valor ? '' : 'faint'}>{dato.valor ?? '—'}</span>
                  <StatusPill estado={dato.estado} />
                </div>
              ))}
            </div>
          ))}
          {equipos.length === 0 && <p className="faint">No se detectaron equipos en el dictado.</p>}
        </section>
      </div>
    </>
  );
}
