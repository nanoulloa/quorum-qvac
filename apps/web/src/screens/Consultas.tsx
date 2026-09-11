import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClose, IconDownload, IconMic, IconSearch } from '../components/icons';
import { ConfidenceBar, PageHeader, StatusPill } from '../components/ui';
import { clientePorId, equipos, esRenovacion, estadoGeneral, sinVerificar, type Modalidad } from '../mocks/data';
import './Consultas.css';

type Filtros = {
  pais?: string;
  modalidad?: Modalidad;
  antiguedadMin?: number;
  soloRenovacion?: boolean;
  soloSinVerificar?: boolean;
};

type Consulta = { texto: string; filtros: Filtros };

// Mientras P1-08 no está conectado, cada consulta trae los filtros que devolvería el modelo.
const RECIENTES: Consulta[] = [
  { texto: 'Clientes en Brasil con resonadores de más de siete años', filtros: { pais: 'Brasil', modalidad: 'Resonancia magnética', antiguedadMin: 7 } },
  { texto: 'Equipos en Panamá sin verificar en 6 meses', filtros: { pais: 'Panamá', soloSinVerificar: true } },
  { texto: 'Tomógrafos de más de 10 años', filtros: { modalidad: 'Tomografía', antiguedadMin: 10 } },
  { texto: 'Oportunidades de renovación en Colombia', filtros: { pais: 'Colombia', soloRenovacion: true } },
];

const describir: Record<keyof Filtros, (f: Filtros) => [string, string]> = {
  pais: (f) => ['País', f.pais!],
  modalidad: (f) => ['Modalidad', f.modalidad!],
  antiguedadMin: (f) => ['Antigüedad', `más de ${f.antiguedadMin} años`],
  soloRenovacion: () => ['Solo', 'oportunidades de renovación'],
  soloSinVerificar: () => ['Solo', 'sin verificar +180 días'],
};

export function Consultas() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState(RECIENTES[0].texto);
  const [filtros, setFiltros] = useState<Filtros>(RECIENTES[0].filtros);

  const resultados = useMemo(
    () =>
      equipos.filter((e) => {
        const c = clientePorId(e.clienteId)!;
        return (
          (!filtros.pais || c.pais === filtros.pais) &&
          (!filtros.modalidad || e.modalidad === filtros.modalidad) &&
          (filtros.antiguedadMin === undefined || (e.anios ?? 0) > filtros.antiguedadMin) &&
          (!filtros.soloRenovacion || esRenovacion(e)) &&
          (!filtros.soloSinVerificar || sinVerificar(e))
        );
      }),
    [filtros],
  );
  const nClientes = new Set(resultados.map((e) => e.clienteId)).size;
  const activos = (Object.keys(filtros) as (keyof Filtros)[]).filter((k) => filtros[k] !== undefined && filtros[k] !== false);

  const quitar = (k: keyof Filtros) => setFiltros((f) => ({ ...f, [k]: undefined }));
  const usar = (c: Consulta) => {
    setTexto(c.texto);
    setFiltros(c.filtros);
  };
  const consultar = () => usar(RECIENTES.find((r) => r.texto.toLowerCase() === texto.trim().toLowerCase()) ?? { texto, filtros });

  return (
    <>
      <PageHeader eyebrow="Análisis" title="Consultas" subtitle="Pregunta con tus palabras. La pregunta se convierte en filtros que puedes revisar." />

      <div className="split consultas">
        <div className="consultas-col">
          <section className="card consulta-box">
            <form className="consulta-form" onSubmit={(e) => { e.preventDefault(); consultar(); }}>
              <IconSearch width={20} height={20} className="faint" />
              <input className="consulta-input" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Consulta" placeholder="Ej.: tomógrafos de más de 10 años en Colombia" />
              <button type="button" className="btn btn-ghost consulta-mic" aria-label="Consultar por voz"><IconMic /></button>
              <button type="submit" className="btn btn-primary">Consultar</button>
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
              <span className="mono faint consulta-meta">qwen3-4b · en este dispositivo · 3,1 s</span>
            </div>
          </section>

          <section className="card resultados">
            <div className="resultados-head">
              <span><span className="section-title">{resultados.length} equipos</span> <span className="faint">en {nClientes} clientes</span></span>
              <button type="button" className="btn btn-ghost btn-sm"><IconDownload /> Exportar CSV</button>
            </div>
            <div className="table-head consulta-cols">
              <span>Cliente</span><span>Ciudad</span><span>Equipo</span><span>Marca y modelo</span><span>Antigüedad</span><span>Estado</span><span>Confianza</span>
            </div>
            {resultados.map((e) => {
              const c = clientePorId(e.clienteId)!;
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
            {resultados.length === 0 && <p className="faint resultados-vacio">Ningún equipo cumple estos filtros.</p>}
          </section>
        </div>

        <aside className="consultas-col">
          <section className="card card-body">
            <div className="eyebrow">Consultas recientes</div>
            <div className="recientes">
              {RECIENTES.map((r) => (
                <button key={r.texto} type="button" className={`reciente${r.texto === texto ? ' on' : ''}`} onClick={() => usar(r)}>{r.texto}</button>
              ))}
            </div>
          </section>
          <p className="note">La pregunta se traduce a filtros que se aplican en código. No se ejecuta código generado por el modelo y ningún dato sale del dispositivo.</p>
        </aside>
      </div>
    </>
  );
}
