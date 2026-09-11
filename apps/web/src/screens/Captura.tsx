import type { Extraccion } from '@quorum/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { IconCamera, IconCheck, IconMic, IconSend } from '../components/icons';
import { PageHeader, StatusPill, Steps } from '../components/ui';
import { useGrabadora } from '../components/useGrabadora';
import { captura, clientePorId, type Dato, type Segmento } from '../mocks/data';

const PASOS = ['Dictado', 'Extracción', 'Preguntas', 'Foto de placa', 'Guardar'];
const RESPUESTAS = ['Menos de 5', '5 a 10', 'Más de 10'];
const ONDA = [6, 10, 16, 24, 14, 28, 20, 10, 22, 32, 18, 8, 14, 26, 22, 12, 6, 20, 34, 24, 14, 10, 22, 30, 12, 20, 8, 14, 24, 30, 18, 10, 20, 12, 26, 22, 8, 14, 10, 6, 12, 20, 26, 16, 10, 14, 8, 6, 10, 7, 5, 6, 4, 5, 4, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 3];

type Fase = 'listo' | 'grabando' | 'transcribiendo' | 'extrayendo' | 'error';
type EquipoVista = { id: string; nombre: string; campos: Record<string, Dato> };
type Encabezado = { cliente: string | null; lugar: string | null };

const NOMBRE: Record<string, string> = { 'Resonancia magnética': 'Resonador magnético', Tomografía: 'Tomógrafo', Ecografía: 'Ecógrafo', 'Rayos X': 'Equipo de rayos X', Otro: 'Otro equipo' };

const anios = (n: number | null) => (n === null ? null : n === 1 ? '1 año' : `${n} años`);

function aVista(r: Extraccion): { equipos: EquipoVista[]; encabezado: Encabezado } {
  return {
    encabezado: { cliente: r.cliente.valor, lugar: [r.ciudad.valor, r.pais.valor].filter(Boolean).join(', ') || null },
    equipos: r.equipos.map((e, i) => ({
      id: `r${i}`,
      nombre: `${NOMBRE[e.modalidad] ?? e.modalidad}${e.cantidad > 1 ? ` ×${e.cantidad}` : ''}`,
      campos: {
        Marca: e.marca,
        Modelo: e.modelo,
        Antigüedad: { valor: anios(e.antiguedad.valor), estado: e.antiguedad.estado },
      },
    })),
  };
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

const reloj = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function Captura() {
  const demo = clientePorId(captura.clienteId);
  const grabadora = useGrabadora();
  const [fase, setFase] = useState<Fase>('listo');
  const [error, setError] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState<Segmento[]>(captura.transcripcion);
  const [equipos, setEquipos] = useState<EquipoVista[]>(captura.equipos);
  const [encabezado, setEncabezado] = useState<Encabezado>({ cliente: demo?.nombre ?? null, lugar: demo ? `${demo.ciudad}, ${demo.pais}` : null });
  const [modelos, setModelos] = useState('parakeet · qwen3-1.7b · datos de ejemplo');
  const [respuesta, setRespuesta] = useState<{ id: string; texto: string } | null>(null);
  const [texto, setTexto] = useState('');

  const procesar = async (dictado: string, msTranscripcion?: number) => {
    setFase('extrayendo');
    const t0 = performance.now();
    const r = await api.extraer(dictado);
    const vista = aVista(r);
    setTranscripcion(anotar(dictado, r));
    setEquipos(vista.equipos);
    setEncabezado(vista.encabezado);
    setRespuesta(null);
    const partes = [msTranscripcion !== undefined ? `parakeet ${(msTranscripcion / 1000).toFixed(1)} s` : null, `qwen3-1.7b ${((performance.now() - t0) / 1000).toFixed(1)} s`];
    setModelos(`${partes.filter(Boolean).join(' · ')} · en este dispositivo`);
    setFase('listo');
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
      await procesar(t.texto, t.duracionMs);
    } catch (e) {
      conError(e);
    }
  };

  const enviarTexto = async () => {
    const dictado = texto.trim();
    if (!dictado) return;
    setError(null);
    setTexto('');
    setTranscripcion([dictado]);
    await procesar(dictado).catch(conError);
  };

  const pendiente = useMemo(() => {
    const i = equipos.findIndex((e) => e.campos['Antigüedad']?.estado === 'Desconocido');
    return i >= 0 ? { id: equipos[i].id, etiqueta: `${equipos[i].nombre.toLowerCase()} ${String(i + 1).padStart(2, '0')}` } : null;
  }, [equipos]);

  const responder = (r: string) => {
    if (!pendiente) return;
    setRespuesta({ id: pendiente.id, texto: r });
    setEquipos((prev) => prev.map((e) => (e.id === pendiente.id ? { ...e, campos: { ...e.campos, Antigüedad: { valor: `${r} años`, estado: 'Estimado' } } } : e)));
  };

  const ocupado = fase === 'transcribiendo' || fase === 'extrayendo';
  const paso = grabadora.grabando || fase === 'transcribiendo' ? 0 : fase === 'extrayendo' ? 1 : pendiente ? 2 : 3;
  const onda = grabadora.grabando ? grabadora.niveles.map((n) => 4 + n * 36) : ONDA;
  const nota = grabadora.grabando ? 'Grabando · la voz no sale del dispositivo' : fase === 'transcribiendo' ? 'Transcribiendo en este dispositivo…' : fase === 'extrayendo' ? 'Extrayendo datos…' : 'Toca para dictar la visita';

  return (
    <>
      <PageHeader
        eyebrow={`Visita en curso · ${captura.hora}`}
        title={encabezado.cliente ?? 'Nueva visita'}
        subtitle={encabezado.lugar ?? 'Cliente sin identificar'}
        actions={
          <button type="button" className="btn btn-primary" disabled={ocupado}>
            <IconCheck /> Guardar visita
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

          {respuesta ? (
            <section className="card answered">
              <IconCheck width={18} height={18} />
              <span>Anotado: <strong>{respuesta.texto} años</strong> como Estimado</span>
            </section>
          ) : (
            pendiente && (
              <section className="question" aria-label="Pregunta de seguimiento">
                <div>
                  <div className="question-kicker">Falta un dato clave · {pendiente.etiqueta}</div>
                  <div className="question-text">¿Cuántos años tiene, más o menos?</div>
                </div>
                <div className="question-answers">
                  {RESPUESTAS.map((r) => (
                    <button key={r} type="button" className="answer" onClick={() => responder(r)}>{r}</button>
                  ))}
                  <button type="button" className="answer answer-icon" aria-label="Responder por voz">
                    <IconMic width={17} height={17} />
                  </button>
                </div>
              </section>
            )
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
