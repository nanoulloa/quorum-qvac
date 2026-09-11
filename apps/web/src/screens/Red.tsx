import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconQr } from '../components/icons';
import { PageHeader } from '../components/ui';
import { abreviarClave, iniciales, useBase, type EquipoUI } from '../datos/base';
import { haceDias } from '../datos/reglas';
import './Red.css';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });

function vistoHace(iso: string | null) {
  if (!iso) return 'Nunca conectado';
  const minutos = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return minutos < 1 ? 'Visto hace un momento' : minutos < 60 ? `Visto hace ${minutos} min` : `Visto a las ${hora(iso)}`;
}

/**
 * Posibles duplicados que la unión automática no resolvió: mismo cliente y modalidad,
 * sin marcas que choquen, antigüedad compatible y reportados por personas distintas.
 */
function posiblesDuplicados(equipos: EquipoUI[]) {
  const pares: [EquipoUI, EquipoUI][] = [];
  equipos.forEach((a, i) => {
    for (const b of equipos.slice(i + 1)) {
      if (a.clienteId !== b.clienteId || a.modalidad !== b.modalidad) continue;
      if (a.marca.valor && b.marca.valor) continue;
      if (a.anios !== null && b.anios !== null && Math.abs(a.anios - b.anios) > 2) continue;
      const personasA = new Set(a.testigos.map((t) => t.id));
      if (b.testigos.some((t) => personasA.has(t.id))) continue;
      pares.push([a, b]);
    }
  });
  return pares;
}

const describir = (e: EquipoUI) =>
  `${e.nombre} ${[e.marca.valor, e.modelo.valor].filter(Boolean).join(' ') || 'sin marca'}${e.antiguedad.valor ? ` · ${e.antiguedad.valor}` : ''} · ${e.testigos.map((t) => t.nombre).join(', ')}`;

export function Red() {
  const { red, equipos, clientes, origen } = useBase();
  const pares = red?.dispositivos.filter((d) => !d.esEste) ?? [];
  const enLinea = pares.filter((d) => d.enLinea).length;
  const duplicados = useMemo(() => posiblesDuplicados(equipos), [equipos]);
  const nombreCliente = (id: string) => clientes.find((c) => c.id === id)?.nombre ?? id;

  if (origen === 'ejemplo' || !red) {
    return (
      <>
        <PageHeader eyebrow="Sistema" title="Red P2P" subtitle="Tu equipo sincroniza de dispositivo a dispositivo, sin servidor central." />
        <p className="note">El servidor local no responde. Inícialo con <span className="mono">npm run dev</span> para ver los dispositivos del equipo.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Red P2P"
        subtitle="Tu equipo sincroniza de dispositivo a dispositivo, sin servidor central."
        actions={<button type="button" className="btn btn-ghost"><IconQr /> Agregar dispositivo</button>}
      />

      <div className="split red">
        <div className="red-col">
          <section className="card card-body estado-red">
            <div className="eyebrow">Estado</div>
            <div className="title-lg">{enLinea > 0 ? `Conectado con ${enLinea} ${enLinea === 1 ? 'dispositivo' : 'dispositivos'}` : 'Buscando dispositivos del equipo'}</div>
            <p className="muted">
              {enLinea > 0
                ? 'Las visitas nuevas llegan en segundos, cifradas y firmadas por quien las reporta.'
                : 'Lo que captures queda guardado aquí y se sincroniza en cuanto aparezca otro dispositivo del equipo.'}
            </p>
          </section>

          <section className="card lista-lateral">
            <div className="lista-lateral-head"><h2 className="section-title">Posibles duplicados</h2><span className="faint">{duplicados.length}</span></div>
            {duplicados.map(([a, b]) => (
              <Link key={`${a.id}-${b.id}`} to={`/hospitales/${a.clienteId}`} className="lista-item">
                <span className="lista-item-main">
                  <strong>{nombreCliente(a.clienteId)}</strong>
                  <span className="faint">{describir(a)}</span>
                  <span className="faint">{describir(b)}</span>
                </span>
                <IconArrowRight width={16} height={16} className="faint" />
              </Link>
            ))}
            {duplicados.length === 0 && <p className="faint lista-vacia">Ningún reporte parece repetido.</p>}
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
                  <span className="faint">{d.observaciones} {d.observaciones === 1 ? 'visita propia' : 'visitas propias'}</span>
                </span>
                <span className={`dispositivo-estado${d.enLinea ? ' on' : ''}`}>{d.esEste ? 'Este' : d.enLinea ? 'En línea' : vistoHace(d.ultimaVez)}</span>
              </div>
            ))}
          </section>

          <p className="note">
            Cada dispositivo firma lo que reporta con su clave y solo se conecta con quien conoce el secreto del equipo. Los datos viajan cifrados, sin pasar por un servidor. Base actualizada {haceDias(0)}.
          </p>
        </div>
      </div>
    </>
  );
}
