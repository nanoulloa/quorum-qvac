import type { CampoPlaca, Estado, LecturaPlaca } from '@quorum/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { IconArrowRight, IconCamera, IconCheck } from '../components/icons';
import { PageHeader, StatusPill } from '../components/ui';
import './Placa.css';

// Lectura de ejemplo hasta que se lea una foto real.
const EJEMPLO: CampoPlaca[] = [
  { campo: 'Marca', valor: 'Philips', confianza: 95, estado: 'Confirmado' },
  { campo: 'Modelo', valor: 'Ingenia 1.5T', confianza: 92, estado: 'Confirmado' },
  { campo: 'Número de serie', valor: '45021', confianza: 80, estado: 'Confirmado' },
  { campo: 'Fabricación', valor: '2017-03', confianza: 88, estado: 'Confirmado' },
];

/** Lo que el registro tenía del resonador 01 antes de la foto (viene del dictado). */
const ANTES: Record<string, { valor: string; estado: Estado }> = {
  Marca: { valor: 'Philips', estado: 'Reportado' },
  Modelo: { valor: 'Ingenia', estado: 'Reportado' },
  Antigüedad: { valor: '~8 años', estado: 'Estimado' },
  'Número de serie': { valor: '—', estado: 'Desconocido' },
};

type Fase = 'listo' | 'leyendo' | 'error';

export function Placa() {
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [lectura, setLectura] = useState<LecturaPlaca | null>(null);
  const [fase, setFase] = useState<Fase>('listo');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto);
  }, [foto]);

  const leer = async (imagen: Blob) => {
    setFoto(URL.createObjectURL(imagen));
    setLectura(null);
    setError(null);
    setFase('leyendo');
    try {
      setLectura(await api.leerPlaca(imagen));
      setFase('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la placa.');
      setFase('error');
    }
  };

  const usarEjemplo = async () => {
    const respuesta = await fetch('/placa-ejemplo.png');
    await leer(await respuesta.blob());
  };

  const campos = lectura?.campos ?? EJEMPLO;
  const valorDe = (nombre: CampoPlaca['campo']) => campos.find((c) => c.campo === nombre);
  const antiguedad = lectura?.antiguedad ?? { valor: 9, estado: 'Confirmado' as Estado };
  const despues: Record<string, { valor: string; estado: Estado }> = {
    Marca: { valor: valorDe('Marca')?.valor ?? '—', estado: valorDe('Marca')?.estado ?? 'Desconocido' },
    Modelo: { valor: valorDe('Modelo')?.valor ?? '—', estado: valorDe('Modelo')?.estado ?? 'Desconocido' },
    Antigüedad: { valor: antiguedad.valor === null ? '—' : `${antiguedad.valor} años`, estado: antiguedad.estado },
    'Número de serie': { valor: valorDe('Número de serie')?.valor ?? '—', estado: valorDe('Número de serie')?.estado ?? 'Desconocido' },
  };

  const pie =
    fase === 'leyendo'
      ? 'Leyendo la placa en este dispositivo…'
      : lectura
        ? `${lectura.modelo} · en este dispositivo · ${(lectura.duracionMs / 1000).toFixed(1).replace('.', ',')} s`
        : 'visionpsy-nano-460m · Q8_0 · lectura de ejemplo';

  return (
    <>
      <PageHeader
        eyebrow="Captura de visita · resonador 01"
        title="Lectura de placa"
        subtitle="Hospital DemoCare Pacific · Resonador magnético"
        actions={
          <>
            <Link to="/captura" className="btn btn-ghost">Descartar</Link>
            <Link to="/captura" className="btn btn-primary" aria-disabled={fase === 'leyendo'}><IconCheck /> Aplicar al resonador</Link>
          </>
        }
      />

      <div className="split placa">
        <section className="card placa-foto">
          <div className="placa-visor" aria-label="Foto de la placa del equipo" aria-busy={fase === 'leyendo'}>
            <span className="visor-corner tl" /><span className="visor-corner tr" />
            <span className="visor-corner bl" /><span className="visor-corner br" />
            {foto ? (
              <img className={`placa-imagen${fase === 'leyendo' ? ' leyendo' : ''}`} src={foto} alt="Placa del equipo" />
            ) : (
              <div className="placa-metal">
                <span className="tornillo a" /><span className="tornillo b" /><span className="tornillo c" /><span className="tornillo d" />
                <span className="linea leida grande">PHILIPS</span>
                <span className="linea leida media">Ingenia 1.5T</span>
                <span className="linea">Model 781341</span>
                <span className="linea leida">SN 45021</span>
                <span className="linea leida">Mfg. date 2017-03</span>
                <span className="linea">400 V 3~ 50/60 Hz</span>
              </div>
            )}
          </div>
          <div className="placa-foto-pie">
            <div className="placa-acciones">
              <input
                ref={entrada}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) void leer(archivo);
                  e.target.value = '';
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => entrada.current?.click()} disabled={fase === 'leyendo'}>
                <IconCamera /> {foto ? 'Repetir foto' : 'Tomar foto'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void usarEjemplo()} disabled={fase === 'leyendo'}>
                Usar placa de ejemplo
              </button>
            </div>
            <span className="mono faint">{pie}</span>
          </div>
        </section>

        <div className="placa-col">
          <section className="card card-body">
            <h2 className="title-lg">Campos leídos</h2>
            {error && <p className="note">{error}</p>}
            <div className="placa-leidos">
              {campos.map((c) => (
                <div key={c.campo} className="placa-leido">
                  <span className="kv-key">{c.campo}</span>
                  <span className={c.valor ? 'placa-valor' : 'placa-valor faint'}>{c.valor ?? '—'}</span>
                  <div className="confidence" title="Confianza por validación contra catálogo y formato">
                    <span className="mono confidence-num">{c.confianza}</span>
                    <div className="bar-track confidence-track"><div className="bar-fill" style={{ width: `${c.confianza}%`, opacity: c.confianza >= 70 ? 1 : 0.5 }} /></div>
                  </div>
                  <StatusPill estado={c.estado} />
                </div>
              ))}
            </div>
          </section>

          <section className="card card-body">
            <div className="eyebrow">Cambios en el registro</div>
            <div className="placa-cambios">
              {Object.keys(ANTES).map((k) => (
                <div key={k} className="placa-cambio">
                  <span className="muted">{k}</span>
                  <span className="placa-antes"><s className="faint">{ANTES[k].valor}</s><StatusPill estado={ANTES[k].estado} /></span>
                  <IconArrowRight width={16} height={16} className="faint" />
                  <span className="placa-despues"><strong>{despues[k].valor}</strong><StatusPill estado={despues[k].estado} /></span>
                </div>
              ))}
            </div>
            <p className="note">Las placas gastadas o con reflejos pueden leerse mal. Cada campo se valida contra el catálogo y su formato; lo que no llega a 70 queda como Estimado hasta que alguien lo confirme.</p>
          </section>
        </div>
      </div>
    </>
  );
}
