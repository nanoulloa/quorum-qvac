import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCamera, IconCheck, IconMic, IconSend } from '../components/icons';
import { PageHeader, StatusPill, Steps } from '../components/ui';
import { captura, clientePorId, type Dato } from '../mocks/data';

const PASOS = ['Dictado', 'Extracción', 'Preguntas', 'Foto de placa', 'Guardar'];
const RESPUESTAS = ['Menos de 5', '5 a 10', 'Más de 10'];
const ONDA = [6, 10, 16, 24, 14, 28, 20, 10, 22, 32, 18, 8, 14, 26, 22, 12, 6, 20, 34, 24, 14, 10, 22, 30, 12, 20, 8, 14, 24, 30, 18, 10, 20, 12, 26, 22, 8, 14, 10, 6, 12, 20, 26, 16, 10, 14, 8, 6, 10, 7, 5, 6, 4, 5, 4, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 3];

export function Captura() {
  const cliente = clientePorId(captura.clienteId);
  const [grabando, setGrabando] = useState(true);
  const [equipos, setEquipos] = useState(captura.equipos);
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  const responder = (r: string) => {
    setRespuesta(r);
    setEquipos((prev) =>
      prev.map((e) => (e.id === 'n2' ? { ...e, campos: { ...e.campos, Antigüedad: { valor: `${r} años`, estado: 'Estimado' } } } : e)),
    );
  };

  const deshacer = () => {
    setRespuesta(null);
    setEquipos(captura.equipos);
  };

  return (
    <>
      <PageHeader
        eyebrow={`Visita en curso · ${captura.hora}`}
        title={cliente?.nombre ?? 'Nueva visita'}
        subtitle={cliente ? `${cliente.ciudad}, ${cliente.pais}` : undefined}
        actions={
          <button type="button" className="btn btn-primary">
            <IconCheck /> Guardar visita
          </button>
        }
      />

      <Steps labels={PASOS} current={respuesta ? 3 : 2} />

      <div className="split captura">
        <div className="captura-col">
          <div className="recorder">
            <button type="button" className="recorder-btn" onClick={() => setGrabando((g) => !g)} aria-label={grabando ? 'Detener dictado' : 'Dictar'}>
              {grabando ? <span className="recorder-stop" /> : <IconMic width={22} height={22} />}
            </button>
            <div className="wave" aria-hidden="true">
              {ONDA.map((h, i) => (
                <i key={i} className={grabando && i < 46 ? '' : 'off'} style={{ height: h }} />
              ))}
            </div>
            <div className="recorder-meta">
              <span className="mono recorder-time">00:42</span>
              <span className="recorder-note">{grabando ? 'La voz no sale del dispositivo' : 'Dictado en pausa'}</span>
            </div>
          </div>

          <section className="card transcript">
            <div className="eyebrow">Transcripción</div>
            <p className="transcript-text">
              {captura.transcripcion.map((s, i) =>
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
            <form
              className="transcript-form"
              onSubmit={(e) => {
                e.preventDefault();
                setTexto('');
              }}
            >
              <input className="input" placeholder="O escribe lo que viste…" value={texto} onChange={(e) => setTexto(e.target.value)} />
              <button type="submit" className="btn btn-ghost">
                <IconSend /> Enviar
              </button>
            </form>
            <div className="mono faint transcript-meta">whisper-small · qwen3-1.7b · procesado en este dispositivo</div>
          </section>

          {respuesta ? (
            <section className="card answered">
              <IconCheck width={18} height={18} />
              <span>
                Anotado: resonador 02 · <strong>{respuesta} años</strong> como Estimado
              </span>
              <button type="button" className="btn btn-link" onClick={deshacer}>Deshacer</button>
            </section>
          ) : (
            <section className="question" aria-label="Pregunta de seguimiento">
              <div>
                <div className="question-kicker">Falta un dato clave · resonador 02</div>
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
        </section>
      </div>
    </>
  );
}
