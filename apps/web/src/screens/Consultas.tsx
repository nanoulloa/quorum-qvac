import type { FiltrosConsulta } from '@quorum/shared';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { IconClose, IconDownload, IconMic, IconSearch } from '../components/icons';
import { ConfidenceBar, PageHeader, StatusPill } from '../components/ui';
import { useGrabadora } from '../components/useGrabadora';
import { useBase } from '../datos/base';
import { exportarCsv } from '../datos/csv';
import { esRenovacion, estadoGeneral, sinVerificar } from '../datos/reglas';
import './Consultas.css';

const SIN_FILTROS: FiltrosConsulta = {
  pais: null,
  ciudad: null,
  cliente: null,
  modalidad: null,
  marca: null,
  antiguedadMin: null,
  antiguedadMax: null,
  confianzaMin: null,
  soloRenovacion: false,
  soloSinVerificar: false,
};

const EJEMPLOS = [
  'Clientes en Brasil con resonadores de más de siete años',
  'Equipos en Panamá sin verificar en 6 meses',
  'Tomógrafos de más de 10 años',
  'Oportunidades de renovación en Colombia',
];

const describir: Record<keyof FiltrosConsulta, (f: FiltrosConsulta) => [string, string]> = {
  pais: (f) => ['País', f.pais!],
  ciudad: (f) => ['Ciudad', f.ciudad!],
  cliente: (f) => ['Cliente', f.cliente!],
  modalidad: (f) => ['Modalidad', f.modalidad!],
  marca: (f) => ['Marca', f.marca!],
  antiguedadMin: (f) => ['Antigüedad', `desde ${f.antiguedadMin} años`],
  antiguedadMax: (f) => ['Antigüedad', `hasta ${f.antiguedadMax} años`],
  confianzaMin: (f) => ['Confianza', `desde ${f.confianzaMin}`],
  soloRenovacion: () => ['Solo', 'oportunidades de renovación'],
  soloSinVerificar: () => ['Solo', 'sin verificar +180 días'],
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

export function Consultas() {
  const navigate = useNavigate();
  const { clientes, equipos, origen } = useBase();
  const [texto, setTexto] = useState(EJEMPLOS[0]);
  const [filtros, setFiltros] = useState<FiltrosConsulta>(SIN_FILTROS);
  const [meta, setMeta] = useState('Escribe o elige una pregunta y toca Consultar');
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grabadora = useGrabadora();
  const [transcribiendo, setTranscribiendo] = useState(false);
  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const resultados = useMemo(
    () =>
      equipos.filter((e) => {
        const c = clientePorId.get(e.clienteId);
        if (!c) return false;
        const anios = e.anios ?? -1;
        return (
          (!filtros.pais || norm(c.pais) === norm(filtros.pais)) &&
          (!filtros.ciudad || norm(c.ciudad) === norm(filtros.ciudad)) &&
          (!filtros.cliente || norm(c.nombre).includes(norm(filtros.cliente))) &&
          (!filtros.modalidad || e.modalidad === filtros.modalidad) &&
          (!filtros.marca || (e.marca.valor !== null && norm(e.marca.valor) === norm(filtros.marca))) &&
          (filtros.antiguedadMin === null || anios >= filtros.antiguedadMin) &&
          (filtros.antiguedadMax === null || (anios >= 0 && anios <= filtros.antiguedadMax)) &&
          (filtros.confianzaMin === null || e.confianza.total >= filtros.confianzaMin) &&
          (!filtros.soloRenovacion || esRenovacion(e)) &&
          (!filtros.soloSinVerificar || sinVerificar(e))
        );
      }),
    [equipos, clientePorId, filtros],
  );
  const nClientes = new Set(resultados.map((e) => e.clienteId)).size;
  const activos = (Object.keys(filtros) as (keyof FiltrosConsulta)[]).filter((k) => filtros[k] !== null && filtros[k] !== false);

  const quitar = (k: keyof FiltrosConsulta) => setFiltros((f) => ({ ...f, [k]: typeof f[k] === 'boolean' ? false : null }));

  const consultar = async (pregunta: string) => {
    const limpia = pregunta.trim();
    if (!limpia) return;
    setTexto(limpia);
    setError(null);
    setConsultando(true);
    setMeta('Interpretando en este dispositivo…');
    try {
      const r = await api.consulta(limpia);
      setFiltros(r.filtros);
      setMeta(`${r.modelo} · ${r.par ? `en el par ${r.par}` : 'en este dispositivo'} · ${segundos(r.duracionMs)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo interpretar la pregunta.');
      setMeta('Sin interpretar');
    } finally {
      setConsultando(false);
    }
  };

  /** Primer toque graba; el segundo transcribe en el dispositivo y consulta lo dicho. */
  const dictar = async () => {
    setError(null);
    if (!grabadora.grabando) {
      try {
        await grabadora.iniciar();
      } catch {
        setError('No se pudo usar el micrófono. Revisa el permiso del navegador.');
      }
      return;
    }
    setTranscribiendo(true);
    setMeta('Transcribiendo en este dispositivo…');
    try {
      const { texto: dicho } = await api.transcribir(await grabadora.detener());
      setTranscribiendo(false);
      if (dicho.trim()) await consultar(dicho);
      else setMeta('No se escuchó ninguna pregunta');
    } catch (e) {
      setTranscribiendo(false);
      setError(e instanceof Error ? e.message : 'No se pudo transcribir la pregunta.');
      setMeta('Sin interpretar');
    }
  };

  const ocupado = consultando || transcribiendo;
  const metaVisible = grabadora.grabando ? `Escuchando · ${grabadora.segundos} s · la voz no sale del dispositivo` : meta;

  return (
    <>
      <PageHeader eyebrow="Análisis" title="Consultas" subtitle="Pregunta con tus palabras. La pregunta se convierte en filtros que puedes revisar." />

      <div className="split consultas">
        <div className="consultas-col">
          <section className="card consulta-box" aria-busy={ocupado}>
            <form className="consulta-form" onSubmit={(e) => { e.preventDefault(); void consultar(texto); }}>
              <IconSearch width={20} height={20} className="faint" />
              <input className="consulta-input" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Consulta" placeholder="Ej.: tomógrafos de más de 10 años en Colombia" disabled={ocupado || grabadora.grabando} />
              <button
                type="button"
                className={`btn consulta-mic ${grabadora.grabando ? 'btn-primary' : 'btn-ghost'}`}
                aria-label={grabadora.grabando ? 'Detener y consultar' : 'Consultar por voz'}
                aria-pressed={grabadora.grabando}
                onClick={() => void dictar()}
                disabled={ocupado || origen === 'ejemplo'}
              >
                {grabadora.grabando ? <span className="consulta-mic-stop" /> : <IconMic />}
              </button>
              <button type="submit" className="btn btn-primary" disabled={ocupado || grabadora.grabando || origen === 'ejemplo'}>{consultando ? 'Consultando…' : 'Consultar'}</button>
            </form>
            <div className="consulta-interpretacion">
              <span className="eyebrow">Interpretado como</span>
              {activos.map((k) => {
                const [campo, valor] = describir[k](filtros);
                return (
                  <span key={k} className="filtro">
                    {campo} <strong>{valor}</strong>
                    <button type="button" onClick={() => quitar(k)} aria-label={`Quitar filtro ${campo}`}><IconClose width={13} height={13} /></button>
                  </span>
                );
              })}
              {activos.length === 0 && <span className="faint">Sin filtros: se muestra toda la base.</span>}
              <span className="mono faint consulta-meta">{metaVisible}</span>
            </div>
            {error && <p className="note">{error}</p>}
          </section>

          <section className="card resultados">
            <div className="resultados-head">
              <span>
                <span className="section-title">{resultados.length} {resultados.length === 1 ? 'equipo' : 'equipos'}</span>{' '}
                <span className="faint">en {nClientes} {nClientes === 1 ? 'cliente' : 'clientes'}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportarCsv('consulta', resultados, clientes)} disabled={resultados.length === 0}>
                <IconDownload /> Exportar CSV
              </button>
            </div>
            <div className="table-head consulta-cols">
              <span>Cliente</span><span>Ciudad</span><span>Equipo</span><span>Marca y modelo</span><span>Antigüedad</span><span>Estado</span><span>Confianza</span>
            </div>
            {resultados.map((e) => {
              const c = clientePorId.get(e.clienteId)!;
              const marcaModelo = [e.marca.valor, e.modelo.valor].filter(Boolean).join(' ');
              return (
                <div key={e.id} role="link" tabIndex={0} className="table-row selectable consulta-cols" onClick={() => navigate(`/hospitales/${c.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/hospitales/${c.id}`)}>
                  <span className="section-title">{c.nombre}</span>
                  <span className="muted">{c.ciudad}</span>
                  <span>{e.nombre}</span>
                  <span className={marcaModelo ? '' : 'faint'}>{marcaModelo || 'Sin dato'}</span>
                  <span>{e.antiguedad.valor ?? '—'}</span>
                  <span><StatusPill estado={estadoGeneral(e)} /></span>
                  <ConfidenceBar valor={e.confianza.total} />
                </div>
              );
            })}
            {resultados.length === 0 && (
              <p className="faint resultados-vacio">{equipos.length === 0 ? 'Todavía no hay equipos en la base. Dicta una visita para empezar.' : 'Ningún equipo cumple estos filtros.'}</p>
            )}
          </section>
        </div>

        <aside className="consultas-col">
          <section className="card card-body">
            <div className="eyebrow">Preguntas de ejemplo</div>
            <div className="recientes">
              {EJEMPLOS.map((p) => (
                <button key={p} type="button" className={`reciente${p === texto ? ' on' : ''}`} onClick={() => void consultar(p)} disabled={ocupado || grabadora.grabando || origen === 'ejemplo'}>{p}</button>
              ))}
            </div>
          </section>
          <p className="note">La pregunta se traduce a filtros que se aplican en código. No se ejecuta código generado por el modelo y ningún dato sale del dispositivo.</p>
        </aside>
      </div>
    </>
  );
}
