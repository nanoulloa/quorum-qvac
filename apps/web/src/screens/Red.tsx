import { useState } from 'react';
import { IconCheck, IconMinus, IconQr } from '../components/icons';
import { PageHeader } from '../components/ui';
import { personas, yo } from '../mocks/data';
import './Red.css';

type Dispositivo = { id: string; nombre: string; iniciales: string; clave: string; detalle: string; esEste?: boolean };

const DISPOSITIVOS: Dispositivo[] = [
  { id: 'cm', nombre: `${yo.nombre} · este dispositivo`, iniciales: yo.iniciales, clave: yo.clave, detalle: '42 observaciones propias', esEste: true },
  { id: 'ar', nombre: personas.ar.nombre, iniciales: personas.ar.iniciales, clave: personas.ar.clave, detalle: '38 observaciones' },
  { id: 'lp', nombre: personas.lp.nombre, iniciales: personas.lp.iniciales, clave: personas.lp.clave, detalle: '17 observaciones' },
  { id: 'lb', nombre: 'Laptop base', iniciales: 'LB', clave: '5c8e…19d0', detalle: 'Ofrece inferencia delegada · qwen3-4b' },
];

const COMPARACION = [
  { campo: 'Hospital', mia: 'Hospital DemoCare Pacific', suya: 'Hospital DemoCare Pacific', coincide: true },
  { campo: 'Equipo', mia: 'Resonador magnético', suya: 'Resonador magnético', coincide: true },
  { campo: 'Marca', mia: 'Philips', suya: 'Philips', coincide: true },
  { campo: 'Modelo', mia: 'Ingenia', suya: 'Ingenia 1.5T', coincide: false },
  { campo: 'Antigüedad', mia: '~8 años', suya: '9 años', coincide: false },
];

const LOG_OFFLINE = [
  { hora: '09:42', texto: 'Sin conexión · 4 observaciones guardadas en este dispositivo' },
  { hora: '09:31', texto: 'Sincronizado con Ana Ríos y Laptop base' },
];

const LOG_ONLINE = [
  { hora: '09:48', texto: '1 posible duplicado detectado' },
  { hora: '09:48', texto: 'Recibidas 6 observaciones de Ana Ríos' },
  { hora: '09:48', texto: 'Enviadas 4 observaciones a Ana Ríos y Laptop base' },
  { hora: '09:47', texto: 'Conectado con Laptop base · clave verificada' },
];

export function Red() {
  const [conectado, setConectado] = useState(false);
  const [decision, setDecision] = useState<'fusionado' | 'distintos' | null>(null);
  const log = conectado ? [...LOG_ONLINE, ...LOG_OFFLINE] : LOG_OFFLINE;

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
          {conectado && decision === null && (
            <section className="card duplicado">
              <div className="duplicado-head">
                <div>
                  <div className="eyebrow">Posible duplicado · 1 de 1</div>
                  <h2 className="title-lg">¿Es el mismo resonador que reportó Ana?</h2>
                </div>
                <div className="duplicado-score"><span className="serif">91%</span><span className="faint">coincidencia</span></div>
              </div>
              <div className="duplicado-grid duplicado-cabecera">
                <span />
                <span className="autor"><span className="avatar avatar-sm">{yo.iniciales}</span><span><strong>Tu observación</strong><span className="faint">Voz · hace 2 días</span></span></span>
                <span className="autor"><span className="avatar avatar-sm">{personas.ar.iniciales}</span><span><strong>{personas.ar.nombre}</strong><span className="faint">Foto de placa · hace 3 días</span></span></span>
                <span />
              </div>
              {COMPARACION.map((c) => (
                <div key={c.campo} className="duplicado-grid duplicado-fila">
                  <span className="kv-key">{c.campo}</span>
                  <span>{c.mia}</span>
                  <span>{c.suya}</span>
                  <span className="coincidencia">{c.coincide ? <IconCheck width={14} height={14} /> : <IconMinus width={14} height={14} />}{c.coincide ? 'Coincide' : 'Compatible'}</span>
                </div>
              ))}
              <div className="duplicado-acciones">
                <span className="faint">Al fusionar, el equipo suma un testigo independiente y sube su confianza.</span>
                <button type="button" className="btn btn-ghost" onClick={() => setDecision('distintos')}>Son distintos</button>
                <button type="button" className="btn btn-primary" onClick={() => setDecision('fusionado')}>Es el mismo, fusionar</button>
              </div>
            </section>
          )}

          {conectado && decision && (
            <section className="card answered">
              <IconCheck width={18} height={18} />
              <span>{decision === 'fusionado' ? <>Fusionado: el resonador ahora tiene <strong>2 testigos</strong> y su confianza pasó de <strong>53 a 84</strong>.</> : 'Anotado: se mantienen como dos equipos distintos.'}</span>
              <button type="button" className="btn btn-link" onClick={() => setDecision(null)}>Deshacer</button>
            </section>
          )}

          <section className="card card-body actividad">
            <div className="eyebrow">Actividad de sincronización</div>
            {log.map((l, i) => (
              <div key={i} className="actividad-fila">
                <span className="mono faint">{l.hora}</span>
                <span className="actividad-punto" />
                <span>{l.texto}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="red-col">
          <section className="card card-body estado-red">
            <div className="eyebrow">Estado</div>
            <div className="title-lg">{conectado ? 'Conectado' : 'Sin conexión'}</div>
            <p className="muted">{conectado ? 'Todo sincronizado con 2 dispositivos en línea.' : '4 observaciones esperando para sincronizar.'}</p>
            <button type="button" className={`btn ${conectado ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { setConectado((c) => !c); setDecision(null); }}>
              {conectado ? 'Simular desconexión' : 'Sincronizar ahora'}
            </button>
          </section>

          <section className="card dispositivos">
            <div className="eyebrow dispositivos-title">Dispositivos del equipo</div>
            {DISPOSITIVOS.map((d) => {
              const enLinea = d.esEste || (conectado && d.id !== 'lp');
              return (
                <div key={d.id} className="dispositivo">
                  <span className="avatar">{d.iniciales}</span>
                  <span className="dispositivo-info">
                    <strong>{d.nombre}</strong>
                    <span className="mono faint">ed25519 · {d.clave}</span>
                    <span className="faint">{d.detalle}</span>
                  </span>
                  <span className={`dispositivo-estado${enLinea ? ' on' : ''}`}>{d.esEste ? 'Este' : enLinea ? 'En línea' : d.id === 'lp' ? 'Visto hace 2 h' : 'Visto 09:31'}</span>
                </div>
              );
            })}
          </section>

          <p className="note">Cada dispositivo firma lo que reporta con su clave y solo sincroniza con claves del equipo. Los datos viajan cifrados, sin pasar por un servidor.</p>
        </div>
      </div>
    </>
  );
}
