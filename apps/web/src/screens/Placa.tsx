import type { CampoPlaca, Estado, LecturaPlaca, Modalidad } from '@quorum/shared';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { IconArrowRight, IconCamera, IconCheck } from '../components/icons';
import { PageHeader, StatusPill } from '../components/ui';
import { useBase, type EquipoUI } from '../datos/base';
import './Placa.css';

// Lectura de ejemplo hasta que se lea una foto real.
const EJEMPLO: CampoPlaca[] = [
  { campo: 'Marca', valor: 'Philips', confianza: 95, estado: 'Confirmado' },
  { campo: 'Modelo', valor: 'Ingenia 1.5T', confianza: 92, estado: 'Confirmado' },
  { campo: 'Número de serie', valor: '45021', confianza: 80, estado: 'Confirmado' },
  { campo: 'Fabricación', valor: '2017-03', confianza: 88, estado: 'Confirmado' },
];

const NUEVO = 'nuevo';
const MODALIDADES: Modalidad[] = ['Resonancia magnética', 'Tomografía', 'Ecografía', 'Rayos X', 'Otro'];

type Fase = 'listo' | 'leyendo' | 'aplicando' | 'error';
type Valor = { valor: string; estado: Estado };
type Cambios = Record<'Marca' | 'Modelo' | 'Antigüedad' | 'Número de serie', Valor>;
type Aplicada = { clienteId: string; equipo: string; confirmados: number; antes: Cambios };

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const campoDe = (campos: CampoPlaca[], nombre: CampoPlaca['campo']) => campos.find((c) => c.campo === nombre);
const valor = (v: string | null | undefined, estado: Estado | undefined): Valor => ({ valor: v ?? '—', estado: v ? (estado ?? 'Desconocido') : 'Desconocido' });

/** Equipo del cliente que coincide con la placa: misma marca y modelo compatible, o uno sin marca todavía. */
function sugerirEquipo(equipos: EquipoUI[], marca?: string | null, modelo?: string | null) {
  const conMarca = equipos.filter((e) => marca && norm(e.marca.valor) === norm(marca));
  const compatible = (m: string | null) => Boolean(modelo && m && (norm(modelo).startsWith(norm(m)) || norm(m).startsWith(norm(modelo))));
  return conMarca.find((e) => compatible(e.modelo.valor)) ?? conMarca[0] ?? equipos.find((e) => !e.marca.valor);
}

const antesDe = (equipo?: EquipoUI): Cambios => ({
  Marca: valor(equipo?.marca.valor, equipo?.marca.estado),
  Modelo: valor(equipo?.modelo.valor, equipo?.modelo.estado),
  Antigüedad: valor(equipo?.antiguedad.valor, equipo?.antiguedad.estado),
  'Número de serie': valor(equipo?.serie.valor, equipo?.serie.estado),
});

export function Placa() {
  const entrada = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const { clientes, equipos, origen, recargar } = useBase();
  const [foto, setFoto] = useState<string | null>(null);
  const [lectura, setLectura] = useState<LecturaPlaca | null>(null);
  const [fase, setFase] = useState<Fase>('listo');
  const [error, setError] = useState<string | null>(null);
  const [clienteElegido, setClienteElegido] = useState(params.get('cliente'));
  // null: el equipo que mejor coincide con la placa. La base se refresca cada 3 s y los ids cambian al unir.
  const [equipoElegido, setEquipoElegido] = useState<string | null>(null);
  const [modalidadNueva, setModalidadNueva] = useState<Modalidad>('Resonancia magnética');
  const [aplicada, setAplicada] = useState<Aplicada | null>(null);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto);
  }, [foto]);

  const campos = lectura?.campos ?? EJEMPLO;
  const cliente = clientes.find((c) => c.id === clienteElegido) ?? clientes[0];
  const delCliente = equipos.filter((e) => e.clienteId === cliente?.id);
  const sugerido = sugerirEquipo(delCliente, campoDe(campos, 'Marca')?.valor, campoDe(campos, 'Modelo')?.valor);
  const equipoId =
    equipoElegido !== null && (equipoElegido === NUEVO || delCliente.some((e) => e.id === equipoElegido)) ? equipoElegido : (sugerido?.id ?? NUEVO);
  const equipo = delCliente.find((e) => e.id === equipoId);

  const leer = async (imagen: Blob) => {
    setFoto(URL.createObjectURL(imagen));
    setLectura(null);
    setAplicada(null);
    setEquipoElegido(null);
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

  const aplicar = async () => {
    if (!lectura || !cliente) return;
    const destino = equipo;
    setError(null);
    setFase('aplicando');
    const dato = (nombre: CampoPlaca['campo']) => {
      const c = campoDe(lectura.campos, nombre);
      return { valor: c?.valor ?? null, estado: c?.valor ? c.estado : ('Desconocido' as Estado) };
    };
    const reportado = (v: string) => (v === '—' ? { valor: null, estado: 'Desconocido' as Estado } : { valor: v, estado: 'Reportado' as Estado });
    try {
      const guardada = await api.guardarObservacion({
        fuente: 'foto',
        cliente: { valor: cliente.nombre, estado: 'Reportado' },
        ciudad: reportado(cliente.ciudad),
        pais: reportado(cliente.pais),
        equipos: [
          {
            modalidad: destino?.modalidad ?? modalidadNueva,
            cantidad: 1,
            marca: dato('Marca'),
            modelo: dato('Modelo'),
            antiguedad: lectura.antiguedad,
            serie: dato('Número de serie'),
            evidencia: 'foto',
          },
        ],
      });
      // Las reglas unen la foto con el equipo si coinciden marca, modelo y antigüedad. Si no se unió
      // (por ejemplo, el equipo no tenía marca), la persona lo confirma con una fusión firmada.
      if (destino) {
        const ref = `${guardada.id}-0`;
        const base = await api.base();
        if (!base.equipos.some((e) => e.refs.includes(ref) && e.refs.includes(destino.refs[0]))) {
          await api.decidir({ tipo: 'fusion', refs: [ref, destino.refs[0]] });
        }
      }
      await recargar();
      setAplicada({
        clienteId: cliente.id,
        equipo: destino?.nombre ?? modalidadNueva,
        confirmados: lectura.campos.filter((c) => c.valor && c.estado === 'Confirmado').length,
        antes: antesDe(destino),
      });
      setFase('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar la lectura.');
      setFase('error');
    }
  };

  const antes = aplicada?.antes ?? antesDe(equipo);
  const antiguedad = lectura?.antiguedad ?? { valor: 9, estado: 'Confirmado' as Estado };
  const despues: Cambios = {
    Marca: valor(campoDe(campos, 'Marca')?.valor, campoDe(campos, 'Marca')?.estado),
    Modelo: valor(campoDe(campos, 'Modelo')?.valor, campoDe(campos, 'Modelo')?.estado),
    Antigüedad: valor(antiguedad.valor === null ? null : `${antiguedad.valor} años`, antiguedad.estado),
    'Número de serie': valor(campoDe(campos, 'Número de serie')?.valor, campoDe(campos, 'Número de serie')?.estado),
  };

  const ocupado = fase === 'leyendo' || fase === 'aplicando';
  const elegir = (cambio: () => void) => {
    cambio();
    setAplicada(null);
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
        eyebrow="Captura de visita"
        title="Lectura de placa"
        subtitle={cliente ? `${cliente.nombre} · ${equipo?.nombre ?? 'equipo nuevo'}` : 'Todavía no hay hospitales en la base'}
        actions={
          <>
            <Link to="/captura" className="btn btn-ghost">Volver</Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void aplicar()}
              disabled={!lectura || !cliente || ocupado || Boolean(aplicada) || origen === 'ejemplo'}
              title={lectura ? undefined : 'Primero toma o elige una foto de la placa'}
            >
              <IconCheck /> {fase === 'aplicando' ? 'Aplicando…' : aplicada ? 'Lectura aplicada' : 'Aplicar al equipo'}
            </button>
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
              <button type="button" className="btn btn-primary btn-sm" onClick={() => entrada.current?.click()} disabled={ocupado}>
                <IconCamera /> {foto ? 'Repetir foto' : 'Tomar foto'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void usarEjemplo()} disabled={ocupado}>
                Usar placa de ejemplo
              </button>
            </div>
            <span className="mono faint">{pie}</span>
          </div>
        </section>

        <div className="placa-col">
          <section className="card card-body placa-destino">
            <div className="eyebrow">Aplicar a</div>
            <div className="placa-selectores">
              <select
                className="input"
                aria-label="Hospital"
                value={cliente?.id ?? ''}
                disabled={ocupado || clientes.length === 0}
                onChange={(e) => elegir(() => { setClienteElegido(e.target.value); setEquipoElegido(null); })}
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Equipo"
                value={equipoId}
                disabled={ocupado || !cliente}
                onChange={(e) => elegir(() => setEquipoElegido(e.target.value))}
              >
                {delCliente.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} · {[e.marca.valor, e.modelo.valor].filter(Boolean).join(' ') || 'sin marca'}
                  </option>
                ))}
                <option value={NUEVO}>Equipo nuevo</option>
              </select>
              {equipoId === NUEVO && (
                <select
                  className="input"
                  aria-label="Modalidad del equipo nuevo"
                  value={modalidadNueva}
                  disabled={ocupado}
                  onChange={(e) => elegir(() => setModalidadNueva(e.target.value as Modalidad))}
                >
                  {MODALIDADES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
            {aplicada && (
              <p className="placa-aplicada" role="status">
                <IconCheck width={16} height={16} />
                <span>
                  {aplicada.confirmados === 1 ? '1 dato confirmado' : `${aplicada.confirmados} datos confirmados`} con foto en {aplicada.equipo}.
                </span>
                <Link to={`/hospitales/${aplicada.clienteId}`} className="btn-link">Ver ficha</Link>
              </p>
            )}
            {error && <p className="note">{error}</p>}
          </section>

          <section className="card card-body">
            <h2 className="title-lg">Campos leídos</h2>
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
              {(Object.keys(antes) as (keyof Cambios)[]).map((k) => (
                <div key={k} className="placa-cambio">
                  <span className="muted">{k}</span>
                  <span className="placa-antes"><s className="faint">{antes[k].valor}</s><StatusPill estado={antes[k].estado} /></span>
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
