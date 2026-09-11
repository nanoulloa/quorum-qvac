import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { IconArrowRight, IconCheck, IconMinus, IconQr } from '../components/icons';
import { PageHeader } from '../components/ui';
import { abreviarClave, iniciales, useBase, type EquipoUI } from '../datos/base';
import { haceDias } from '../datos/reglas';
import { AgregarDispositivo, type ContextoPerfil } from './PrimerUso';
import './Red.css';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });

function vistoHace(iso: string | null) {
  if (!iso) return 'Nunca conectado';
  const minutos = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return minutos < 1 ? 'Visto hace un momento' : minutos < 60 ? `Visto hace ${minutos} min` : `Visto a las ${hora(iso)}`;
}

/**
 * Posibles duplicados que la unión automática no resolvió: mismo cliente y modalidad,
 * sin marcas que choquen, antigüedad compatible, reportados por personas distintas
 * y que nadie haya marcado ya como equipos distintos.
 */
function posiblesDuplicados(equipos: EquipoUI[], distintos: [string, string][]) {
  const yaDecididos = (a: EquipoUI, b: EquipoUI) =>
    distintos.some(([x, y]) => (a.refs.includes(x) && b.refs.includes(y)) || (a.refs.includes(y) && b.refs.includes(x)));
  const pares: [EquipoUI, EquipoUI][] = [];
  equipos.forEach((a, i) => {
    for (const b of equipos.slice(i + 1)) {
      if (a.clienteId !== b.clienteId || a.modalidad !== b.modalidad) continue;
      if (a.marca.valor && b.marca.valor && a.marca.valor.toLowerCase() !== b.marca.valor.toLowerCase()) continue;
      if (a.anios !== null && b.anios !== null && Math.abs(a.anios - b.anios) > 2) continue;
      const personasA = new Set(a.testigos.map((t) => t.id));
      if (b.testigos.some((t) => personasA.has(t.id)) || yaDecididos(a, b)) continue;
      pares.push([a, b]);
    }
  });
  return pares;
}

type Comparacion = { campo: string; a: string; b: string; resultado: 'Coincide' | 'Falta en uno' | 'Compatible' };

function comparar(a: EquipoUI, b: EquipoUI): Comparacion[] {
  const fila = (campo: string, va: string | null, vb: string | null): Comparacion => ({
    campo,
    a: va ?? '—',
    b: vb ?? '—',
    resultado: !va || !vb ? 'Falta en uno' : va.toLowerCase() === vb.toLowerCase() ? 'Coincide' : 'Compatible',
  });
  return [fila('Equipo', a.nombre, b.nombre), fila('Marca', a.marca.valor, b.marca.valor), fila('Modelo', a.modelo.valor, b.modelo.valor), fila('Antigüedad', a.antiguedad.valor, b.antiguedad.valor)];
}

export function Red() {
  const { red, equipos, clientes, distintos, origen, recargar } = useBase();
  const [decidiendo, setDecidiendo] = useState(false);
  const { perfil } = useOutletContext<ContextoPerfil>();
  const [agregando, setAgregando] = useState(false);
  const pares = red?.dispositivos.filter((d) => !d.esEste) ?? [];
  const enLinea = pares.filter((d) => d.enLinea).length;
  const duplicados = useMemo(() => posiblesDuplicados(equipos, distintos), [equipos, distintos]);
  const nombreCliente = (id: string) => clientes.find((c) => c.id === id)?.nombre ?? id;

  if (origen === 'ejemplo' || !red) {
    return (
      <>
        <PageHeader eyebrow="Sistema" title="Red P2P" subtitle="Tu equipo sincroniza de dispositivo a dispositivo, sin servidor central." />
        <p className="note">El servidor local no responde. Inícialo con <span className="mono">npm run dev</span> para ver los dispositivos del equipo.</p>
      </>
    );
  }

  const [actual, otro] = duplicados[0] ?? [];
  const decidir = async (tipo: 'fusion' | 'distintos') => {
    if (!actual || !otro) return;
    setDecidiendo(true);
    try {
      await api.decidir({ tipo, refs: [actual.refs[0], otro.refs[0]] });
      await recargar();
    } finally {
      setDecidiendo(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Red P2P"
        subtitle="Tu equipo sincroniza de dispositivo a dispositivo, sin servidor central."
        actions={
          <button type="button" className={`btn ${agregando ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAgregando((v) => !v)} aria-expanded={agregando}>
            <IconQr /> Agregar dispositivo
          </button>
        }
      />

      {agregando && <AgregarDispositivo equipo={perfil?.equipo ?? null} />}

      <div className="split red">
        <div className="red-col">
          {actual && otro ? (
            <section className="card duplicado">
              <div className="duplicado-head">
                <div>
                  <div className="eyebrow">Posible duplicado · 1 de {duplicados.length} · {nombreCliente(actual.clienteId)}</div>
                  <h2 className="title-lg">¿Es el mismo {actual.nombre.toLowerCase()} que reportó {otro.testigos[0]?.nombre.split(' ')[0]}?</h2>
                </div>
              </div>
              <div className="duplicado-grid duplicado-cabecera">
                <span />
                {[actual, otro].map((e) => (
                  <span key={e.id} className="autor">
                    <span className="avatar avatar-sm">{e.testigos[0]?.iniciales}</span>
                    <span><strong>{e.testigos.map((t) => t.nombre).join(', ')}</strong><span className="faint">{haceDias(e.dias)}</span></span>
                  </span>
                ))}
                <span />
              </div>
              {comparar(actual, otro).map((c) => (
                <div key={c.campo} className="duplicado-grid duplicado-fila">
                  <span className="kv-key">{c.campo}</span>
                  <span>{c.a}</span>
                  <span>{c.b}</span>
                  <span className="coincidencia">{c.resultado === 'Coincide' ? <IconCheck width={14} height={14} /> : <IconMinus width={14} height={14} />}{c.resultado}</span>
                </div>
              ))}
              <div className="duplicado-acciones">
                <span className="faint">Al unirlos, el equipo suma un testigo independiente y sube su confianza. La decisión queda firmada y se sincroniza.</span>
                <button type="button" className="btn btn-ghost" disabled={decidiendo} onClick={() => void decidir('distintos')}>Son distintos</button>
                <button type="button" className="btn btn-primary" disabled={decidiendo} onClick={() => void decidir('fusion')}>Es el mismo, unir</button>
              </div>
            </section>
          ) : (
            <section className="card card-body estado-red">
              <div className="eyebrow">Posibles duplicados</div>
              <p className="muted">Ningún reporte parece repetido.</p>
            </section>
          )}

          <section className="card card-body estado-red">
            <div className="eyebrow">Estado</div>
            <div className="title-lg">{enLinea > 0 ? `Conectado con ${enLinea} ${enLinea === 1 ? 'dispositivo' : 'dispositivos'}` : 'Buscando dispositivos del equipo'}</div>
            <p className="muted">
              {enLinea > 0
                ? 'Las visitas nuevas llegan en segundos, cifradas y firmadas por quien las reporta.'
                : 'Lo que captures queda guardado aquí y se sincroniza en cuanto aparezca otro dispositivo del equipo.'}
            </p>
          </section>

          <section className="card card-body actividad">
            <div className="eyebrow">Actividad de sincronización</div>
            {red.eventos.map((e, i) => (
              <div key={`${e.fecha}-${i}`} className="actividad-fila">
                <span className="mono faint">{hora(e.fecha)}</span>
                <span className="actividad-punto" />
                <span>{e.texto}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="red-col">
          <section className="card dispositivos">
            <div className="eyebrow dispositivos-title">Dispositivos del equipo</div>
            {red.dispositivos.map((d) => (
              <div key={d.clave} className="dispositivo">
                <span className="avatar">{iniciales(d.nombre)}</span>
                <span className="dispositivo-info">
                  <strong>{d.nombre}{d.esEste ? ' · este dispositivo' : ''}</strong>
                  <span className="mono faint">ed25519 · {abreviarClave(d.clave)}</span>
                  <span className="faint">{d.observaciones} {d.observaciones === 1 ? 'entrada propia' : 'entradas propias'}</span>
                </span>
                <span className={`dispositivo-estado${d.enLinea ? ' on' : ''}`}>{d.esEste ? 'Este' : d.enLinea ? 'En línea' : vistoHace(d.ultimaVez)}</span>
              </div>
            ))}
          </section>

          {duplicados.length > 1 && (
            <section className="card lista-lateral">
              <div className="lista-lateral-head"><h2 className="section-title">Otros posibles duplicados</h2><span className="faint">{duplicados.length - 1}</span></div>
              {duplicados.slice(1).map(([a, b]) => (
                <Link key={`${a.id}-${b.id}`} to={`/hospitales/${a.clienteId}`} className="lista-item">
                  <span className="lista-item-main">
                    <strong>{nombreCliente(a.clienteId)} · {a.nombre}</strong>
                    <span className="faint">{a.testigos[0]?.nombre} y {b.testigos[0]?.nombre}</span>
                  </span>
                  <IconArrowRight width={16} height={16} className="faint" />
                </Link>
              ))}
            </section>
          )}

          <p className="note">Cada dispositivo firma lo que reporta con su clave y solo se conecta con quien conoce el secreto del equipo. Los datos viajan cifrados, sin pasar por un servidor.</p>
        </div>
      </div>
    </>
  );
}
