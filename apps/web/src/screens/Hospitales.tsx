import { PESOS } from '@quorum/shared';
import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { IconCamera, IconDownload, IconMic } from '../components/icons';
import { Avatars, ConfidenceBar, PageHeader, StatusPill, nivelConfianza } from '../components/ui';
import { useBase } from '../datos/base';
import { exportarCsv } from '../datos/csv';
import { esRenovacion, estadoGeneral, evidenciaTexto, haceDias, sinVerificar } from '../datos/reglas';
import './Hospitales.css';

export function Hospitales() {
  const { clientes, equipos } = useBase();
  const { id } = useParams();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const cliente = clientes.find((c) => c.id === id) ?? clientes[0];

  if (!cliente) {
    return (
      <>
        <PageHeader eyebrow="Hospitales" title="Todavía no hay visitas" subtitle="Dicta una visita o espera a que se sincronice un dispositivo del equipo." />
        <Link to="/captura" className="btn btn-primary hospitales-vacio"><IconMic /> Nueva visita</Link>
      </>
    );
  }

  const lista = equipos.filter((e) => e.clienteId === cliente.id);
  const actual = lista.find((e) => e.id === seleccion) ?? lista[0];
  const personasAqui = new Set(lista.flatMap((e) => e.testigos.map((t) => t.id))).size;
  const ultima = lista.length ? Math.min(...lista.map((e) => e.dias)) : 0;

  const resumen = [
    { k: 'Equipos', v: lista.length },
    { k: 'Confirmados', v: lista.filter((e) => estadoGeneral(e) === 'Confirmado').length },
    { k: 'Oportunidades de renovación', v: lista.filter(esRenovacion).length },
    { k: 'Sin verificar hace +180 días', v: lista.filter(sinVerificar).length },
  ];

  return (
    <div className="hospitales">
      <aside className="hospitales-lista" aria-label="Clientes">
        <div className="eyebrow">{clientes.length} clientes</div>
        {clientes.map((c) => (
          <NavLink key={c.id} to={`/hospitales/${c.id}`} className={() => `cliente-item${c.id === cliente.id ? ' active' : ''}`}>
            <span className="cliente-nombre">{c.nombre}</span>
            <span className="faint">{c.ciudad} · {equipos.filter((e) => e.clienteId === c.id).length} equipos</span>
          </NavLink>
        ))}
      </aside>

      <div className="hospitales-detalle">
        <PageHeader
          eyebrow={`${cliente.pais} · ${cliente.ciudad}`}
          title={cliente.nombre}
          subtitle={`Última verificación ${haceDias(ultima)} · ${personasAqui} ${personasAqui === 1 ? 'persona ha' : 'personas han'} reportado aquí`}
          actions={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => exportarCsv(cliente.id, lista, clientes)} disabled={lista.length === 0}>
                <IconDownload /> Exportar CSV
              </button>
              <Link to={`/captura/placa?cliente=${cliente.id}`} className="btn btn-ghost"><IconCamera /> Foto de placa</Link>
              <Link to="/captura" className="btn btn-primary"><IconMic /> Nueva visita</Link>
            </>
          }
        />

        <section className="card summary">
          {resumen.map((r) => (
            <div key={r.k} className="summary-item">
              <span className="eyebrow">{r.k}</span>
              <span className="summary-value">{r.v}</span>
            </div>
          ))}
        </section>

        <div className="split hospital-grid">
          <section className="card hospital-tabla">
            <div className="table-head hospital-cols">
              <span>Equipo</span><span>Antigüedad</span><span>Estado</span><span>Confianza</span><span>Testigos</span><span>Verificado</span>
            </div>
            {lista.map((e) => (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                className={`table-row selectable hospital-cols${e.id === actual?.id ? ' selected' : ''}`}
                onClick={() => setSeleccion(e.id)}
                onKeyDown={(ev) => ev.key === 'Enter' && setSeleccion(e.id)}
              >
                <span className="equipo-cell">
                  <span className="section-title">{e.nombre}</span>
                  <span className="faint">{[e.marca.valor, e.modelo.valor].filter(Boolean).join(' · ') || 'Marca y modelo sin dato'}</span>
                  {esRenovacion(e) && <span className="marca-renovacion">Oportunidad de renovación</span>}
                </span>
                <span className={e.antiguedad.valor ? '' : 'faint'}>{e.antiguedad.valor ?? '—'}</span>
                <span><StatusPill estado={estadoGeneral(e)} /></span>
                <ConfidenceBar valor={e.confianza.total} />
                <Avatars iniciales={e.testigos.map((t) => t.iniciales)} />
                <span className={sinVerificar(e) ? 'dato-viejo' : ''}>{haceDias(e.dias)}</span>
              </div>
            ))}
          </section>

          {actual && (
            <section className="card card-body desglose" aria-label="Desglose de confianza">
              <div className="eyebrow">Desglose de confianza</div>
              <div className="section-title">{actual.nombre} · {actual.marca.valor ?? 'marca sin dato'}</div>
              <div className="desglose-total">
                <span className="serif">{actual.confianza.total}</span>
                <span className="faint">/ 100 · {nivelConfianza(actual.confianza.total)}</span>
              </div>
              {[
                { k: 'Completitud', peso: PESOS.completitud, v: actual.confianza.completitud, txt: `${[actual.marca, actual.modelo, actual.antiguedad].filter((d) => d.valor).length} de 3 datos` },
                { k: 'Testigos independientes', peso: PESOS.testigos, v: actual.confianza.testigos, txt: `${actual.testigos.length} ${actual.testigos.length === 1 ? 'persona' : 'personas'}` },
                { k: 'Evidencia', peso: PESOS.evidencia, v: actual.confianza.evidencia, txt: evidenciaTexto[actual.evidencia] },
                { k: 'Frescura', peso: PESOS.frescura, v: actual.confianza.frescura, txt: haceDias(actual.dias) },
              ].map((f) => (
                <div key={f.k} className="factor">
                  <div className="factor-top"><span>{f.k} <span className="faint">· {Math.round(f.peso * 100)}%</span></span><span className="muted">{f.txt}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(f.v * 100)}%` }} /></div>
                </div>
              ))}
              <div className="eyebrow desglose-testigos-title">Testigos</div>
              {actual.testigos.map((t) => (
                <div key={t.id} className="testigo">
                  <span className="avatar">{t.iniciales}</span>
                  <span className="testigo-info"><span>{t.nombre}</span><span className="mono faint">{t.clave}</span></span>
                  <span className="testigo-via"><span>{evidenciaTexto[t.evidencia]}</span><span className="faint">{haceDias(t.dias)}</span></span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
