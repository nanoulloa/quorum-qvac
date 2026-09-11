import type { LecturaPlaca } from '@quorum/shared';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { IconCamera, IconCheck, IconClose } from './icons';
import { StatusPill } from './ui';
import './PlacaEnVisita.css';

type Props = {
  /** Nombre del equipo del registro al que se aplica la lectura. */
  equipo: string;
  alAplicar: (lectura: LecturaPlaca) => void;
  alCerrar: () => void;
};

/**
 * Lector de placa dentro de la visita en curso. Se abre encima de Captura para no perder lo que todavía
 * no se guardó: la foto se lee en este dispositivo y sus datos se aplican al equipo del registro.
 */
export function PlacaEnVisita({ equipo, alAplicar, alCerrar }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [lectura, setLectura] = useState<LecturaPlaca | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto);
  }, [foto]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  const leer = async (imagen: Blob) => {
    setFoto(URL.createObjectURL(imagen));
    setLectura(null);
    setError(null);
    setLeyendo(true);
    try {
      setLectura(await api.leerPlaca(imagen));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la placa.');
    } finally {
      setLeyendo(false);
    }
  };

  const usarEjemplo = async () => {
    const respuesta = await fetch('/placa-ejemplo.png');
    await leer(await respuesta.blob());
  };

  return (
    <div
      className="modal-fondo"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <section className="card modal-placa" role="dialog" aria-modal="true" aria-labelledby="titulo-placa">
        <div className="modal-placa-head">
          <div>
            <div className="eyebrow">Foto de placa · visita en curso</div>
            <h2 id="titulo-placa" className="title-lg">{equipo}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={alCerrar} aria-label="Cerrar">
            <IconClose width={16} height={16} />
          </button>
        </div>

        <div className="modal-placa-cuerpo">
          <div className="placa-visor modal-placa-visor" aria-busy={leyendo}>
            <span className="visor-corner tl" /><span className="visor-corner tr" />
            <span className="visor-corner bl" /><span className="visor-corner br" />
            {foto ? (
              <img className={`placa-imagen${leyendo ? ' leyendo' : ''}`} src={foto} alt="Placa del equipo" />
            ) : (
              <span className="modal-placa-guia">Encuadra la placa del equipo</span>
            )}
          </div>

          <div className="modal-placa-datos">
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
              <button type="button" className="btn btn-primary btn-sm" onClick={() => entrada.current?.click()} disabled={leyendo}>
                <IconCamera /> {foto ? 'Repetir foto' : 'Tomar foto'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void usarEjemplo()} disabled={leyendo}>
                Usar placa de ejemplo
              </button>
            </div>
            {!lectura && (
              <p className="note">{leyendo ? 'Leyendo la placa en este dispositivo…' : 'La foto se lee aquí mismo y sus datos se aplican a este equipo de la visita.'}</p>
            )}
            {error && <p className="note" role="alert">{error}</p>}
            {lectura && (
              <>
                <div className="placa-leidos">
                  {lectura.campos.map((c) => (
                    <div key={c.campo} className="modal-placa-campo">
                      <span className="kv-key">{c.campo}</span>
                      <span className={c.valor ? 'placa-valor' : 'placa-valor faint'}>{c.valor ?? '—'}</span>
                      <StatusPill estado={c.estado} />
                    </div>
                  ))}
                </div>
                <span className="mono faint modal-placa-pie">
                  {lectura.modelo} · en este dispositivo · {(lectura.duracionMs / 1000).toFixed(1).replace('.', ',')} s
                </span>
              </>
            )}
          </div>
        </div>

        <div className="modal-placa-acciones">
          <button type="button" className="btn btn-ghost" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => lectura && alAplicar(lectura)} disabled={!lectura || leyendo}>
            <IconCheck /> Aplicar a este equipo
          </button>
        </div>
      </section>
    </div>
  );
}
