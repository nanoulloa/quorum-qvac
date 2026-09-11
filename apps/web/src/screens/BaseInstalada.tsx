import type { Modalidad } from '@quorum/shared';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClock, IconDownload } from '../components/icons';
import { ConfidenceBar, PageHeader } from '../components/ui';
import { useBase } from '../datos/base';
import { exportarCsv } from '../datos/csv';
import { esRenovacion, haceDias, sinVerificar } from '../datos/reglas';
import './BaseInstalada.css';

const MODALIDADES: ('Todas' | Modalidad)[] = ['Todas', 'Resonancia magnética', 'Tomografía', 'Ecografía'];
const CONFIANZAS = [
  { label: 'Todas', min: 0 },
  { label: '50+', min: 50 },
  { label: '70+', min: 70 },
];

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function ChipGroup<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      <span className="eyebrow">{label}</span>
      {options.map((o) => (
        <button key={o} type="button" className={`chip${o === value ? ' on' : ''}`} onClick={() => onChange(o)} aria-pressed={o === value}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function BaseInstalada() {
  const navigate = useNavigate();
  const { clientes, equipos } = useBase();
  const [pais, setPais] = useState('Todos');
  const [modalidad, setModalidad] = useState<'Todas' | Modalidad>('Todas');
  const [confianzaMin, setConfianzaMin] = useState('Todas');

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const paises = useMemo(() => ['Todos', ...Array.from(new Set(clientes.map((c) => c.pais)))], [clientes]);

  const filtrados = useMemo(() => {
    const min = CONFIANZAS.find((c) => c.label === confianzaMin)?.min ?? 0;
    return equipos.filter((e) => {
      const c = clientePorId.get(e.clienteId);
      return c && (pais === 'Todos' || c.pais === pais) && (modalidad === 'Todas' || e.modalidad === modalidad) && e.confianza.total >= min;
    });
  }, [equipos, clientePorId, pais, modalidad, confianzaMin]);

  const porPais = paises
    .slice(1)
    .map((p) => ({ pais: p, total: filtrados.filter((e) => clientePorId.get(e.clienteId)?.pais === p).length }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const maximo = Math.max(1, ...porPais.map((p) => p.total));

  const filas = clientes
    .map((c) => {
      const suyos = filtrados.filter((e) => e.clienteId === c.id);
      const cuenta = (m: Modalidad) => suyos.filter((e) => e.modalidad === m).length;
      return {
        ...c,
        total: suyos.length,
        rm: cuenta('Resonancia magnética'),
        tc: cuenta('Tomografía'),
        eco: cuenta('Ecografía'),
        edad: promedio(suyos.map((e) => e.anios ?? 0).filter(Boolean)),
        confianza: Math.round(promedio(suyos.map((e) => e.confianza.total))),
      };
    })
    .filter((f) => f.total > 0);

  const renovacion = filtrados.filter(esRenovacion).sort((a, b) => (b.anios ?? 0) - (a.anios ?? 0));
  const viejos = filtrados.filter(sinVerificar).sort((a, b) => b.dias - a.dias);

  return (
    <>
      <PageHeader
        eyebrow="Análisis"
        title="Base instalada"
        subtitle={`${filtrados.length} ${filtrados.length === 1 ? 'equipo' : 'equipos'} en ${filas.length} ${filas.length === 1 ? 'cliente' : 'clientes'}`}
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => exportarCsv('base-instalada', filtrados, clientes)} disabled={filtrados.length === 0}>
            <IconDownload /> Exportar CSV
          </button>
        }
      />

      <div className="filtros">
        <ChipGroup label="País" options={paises} value={pais} onChange={setPais} />
        <ChipGroup label="Modalidad" options={MODALIDADES} value={modalidad} onChange={setModalidad} />
        <ChipGroup label="Confianza" options={CONFIANZAS.map((c) => c.label)} value={confianzaMin} onChange={setConfianzaMin} />
      </div>

      <div className="split base">
        <div className="base-col">
          <section className="card card-body">
            <h2 className="section-title">Equipos por país</h2>
            <div className="barras">
              {porPais.map((p) => (
                <div key={p.pais} className="barra" title={`${p.pais}: ${p.total} equipos`}>
                  <span className="barra-label">{p.pais}</span>
                  <div className="barra-track">
                    <div className="barra-fill" style={{ width: `${(p.total / maximo) * 100}%` }} />
                    <span className="mono barra-valor">{p.total}</span>
                  </div>
                </div>
              ))}
              {porPais.length === 0 && <p className="faint lista-vacia">Sin equipos con estos filtros.</p>}
            </div>
          </section>

          <section className="card base-tabla">
            <div className="table-head base-cols">
              <span>Cliente</span><span>País</span><span>Resonadores</span><span>Tomógrafos</span><span>Ecógrafos</span><span>Antigüedad media</span><span>Confianza media</span>
            </div>
            {filas.map((f) => (
              <div key={f.id} role="link" tabIndex={0} className="table-row selectable base-cols" onClick={() => navigate(`/hospitales/${f.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/hospitales/${f.id}`)}>
                <span className="section-title">{f.nombre}</span>
                <span className="muted">{f.pais}</span>
                <span className="mono">{f.rm}</span>
                <span className="mono">{f.tc}</span>
                <span className="mono">{f.eco}</span>
                <span>{f.edad ? `${f.edad.toFixed(1).replace('.', ',')} años` : '—'}</span>
                <ConfidenceBar valor={f.confianza} />
              </div>
            ))}
          </section>
        </div>

        <div className="base-col">
          <section className="card lista-lateral">
            <div className="lista-lateral-head"><h2 className="section-title">Oportunidades de renovación</h2><span className="faint">{renovacion.length}</span></div>
            {renovacion.map((e) => {
              const c = clientePorId.get(e.clienteId)!;
              return (
                <button key={e.id} type="button" className="lista-item" onClick={() => navigate(`/hospitales/${c.id}`)}>
                  <span className="lista-item-main"><strong>{e.nombre} · {e.marca.valor ?? 'marca sin dato'}</strong><span className="faint">{c.nombre} · {c.ciudad}</span></span>
                  <span className="lista-item-side"><strong>{e.antiguedad.valor}</strong><span className="mono faint">conf. {e.confianza.total}</span></span>
                </button>
              );
            })}
            {renovacion.length === 0 && <p className="faint lista-vacia">Ninguna con estos filtros.</p>}
          </section>

          <section className="card lista-lateral">
            <div className="lista-lateral-head"><h2 className="section-title">Sin verificar hace más de 180 días</h2><span className="faint">{viejos.length}</span></div>
            {viejos.map((e) => {
              const c = clientePorId.get(e.clienteId)!;
              return (
                <button key={e.id} type="button" className="lista-item" onClick={() => navigate(`/hospitales/${c.id}`)}>
                  <IconClock width={18} height={18} className="faint" />
                  <span className="lista-item-main"><strong>{e.nombre}</strong><span className="faint">{c.nombre}</span></span>
                  <span className="muted">{haceDias(e.dias)}</span>
                </button>
              );
            })}
            {viejos.length === 0 && <p className="faint lista-vacia">Todo verificado recientemente.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
