import type { Estado } from '@quorum/shared';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconCamera, IconCheck } from '../components/icons';
import { PageHeader, StatusPill } from '../components/ui';
import './Placa.css';

type Lectura = { campo: string; valor: string; confianza: number; estado: Estado };

const LEIDOS: Lectura[] = [
  { campo: 'Marca', valor: 'Philips', confianza: 97, estado: 'Confirmado' },
  { campo: 'Modelo', valor: 'Ingenia 1.5T', confianza: 93, estado: 'Confirmado' },
  { campo: 'Número de serie', valor: '45021', confianza: 61, estado: 'Estimado' },
  { campo: 'Fabricación', valor: 'Marzo 2017', confianza: 88, estado: 'Confirmado' },
];

type Cambio = { campo: string; antes: string; estadoAntes: Estado; despues: string; estadoDespues: Estado };

const CAMBIOS: Cambio[] = [
  { campo: 'Marca', antes: 'Philips', estadoAntes: 'Reportado', despues: 'Philips', estadoDespues: 'Confirmado' },
  { campo: 'Modelo', antes: 'Ingenia', estadoAntes: 'Reportado', despues: 'Ingenia 1.5T', estadoDespues: 'Confirmado' },
  { campo: 'Antigüedad', antes: '~8 años', estadoAntes: 'Estimado', despues: '9 años', estadoDespues: 'Confirmado' },
  { campo: 'Número de serie', antes: '—', estadoAntes: 'Desconocido', despues: '45021', estadoDespues: 'Estimado' },
];

export function Placa() {
  return (
    <>
      <PageHeader
        eyebrow="Captura de visita · resonador 01"
        title="Lectura de placa"
        subtitle="Hospital DemoCare Pacific · Resonador magnético"
        actions={
          <>
            <Link to="/captura" className="btn btn-ghost">Descartar</Link>
            <Link to="/captura" className="btn btn-primary"><IconCheck /> Aplicar al resonador</Link>
          </>
        }
      />

      <div className="split placa">
        <section className="card placa-foto">
          <div className="placa-visor" aria-label="Foto de la placa del equipo">
            <span className="visor-corner tl" /><span className="visor-corner tr" />
            <span className="visor-corner bl" /><span className="visor-corner br" />
            <div className="placa-metal">
              <span className="tornillo a" /><span className="tornillo b" /><span className="tornillo c" /><span className="tornillo d" />
              <span className="linea leida grande">PHILIPS</span>
              <span className="linea leida media">Ingenia 1.5T</span>
              <span className="linea">Model 781341</span>
              <span className="linea dudosa">SN 45021</span>
              <span className="linea leida">Mfg. date 2017-03</span>
              <span className="linea">400 V 3~ 50/60 Hz</span>
            </div>
          </div>
          <div className="placa-foto-pie">
            <button type="button" className="btn btn-ghost btn-sm"><IconCamera /> Repetir foto</button>
            <span className="mono faint">VisionPsy-Nano 460M · Q8_0 · en este dispositivo · 2,4 s</span>
          </div>
        </section>

        <div className="placa-col">
          <section className="card card-body">
            <h2 className="title-lg">Campos leídos</h2>
            <div className="placa-leidos">
              {LEIDOS.map((l) => (
                <div key={l.campo} className="placa-leido">
                  <span className="kv-key">{l.campo}</span>
                  <span className="placa-valor">{l.valor}</span>
                  <div className="confidence">
                    <span className="mono confidence-num">{l.confianza}</span>
                    <div className="bar-track confidence-track"><div className="bar-fill" style={{ width: `${l.confianza}%`, opacity: l.confianza >= 70 ? 1 : 0.5 }} /></div>
                  </div>
                  <StatusPill estado={l.estado} />
                </div>
              ))}
            </div>
          </section>

          <section className="card card-body">
            <div className="eyebrow">Cambios en el registro</div>
            <div className="placa-cambios">
              {CAMBIOS.map((c) => (
                <div key={c.campo} className="placa-cambio">
                  <span className="muted">{c.campo}</span>
                  <span className="placa-antes"><s className="faint">{c.antes}</s><StatusPill estado={c.estadoAntes} /></span>
                  <IconArrowRight width={16} height={16} className="faint" />
                  <span className="placa-despues"><strong>{c.despues}</strong><StatusPill estado={c.estadoDespues} /></span>
                </div>
              ))}
            </div>
            <p className="note">Las placas gastadas o con reflejos pueden leerse mal. Lo que tenga confianza menor a 70 queda como Estimado hasta que alguien lo confirme.</p>
          </section>
        </div>
      </div>
    </>
  );
}
