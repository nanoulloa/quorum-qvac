import type { Perfil } from '@quorum/shared';
import { useState, type FormEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { IconCheck } from '../components/icons';
import './PrimerUso.css';

/** Lo que el Layout comparte con las pantallas: quién es este dispositivo y en qué equipo está. */
export type ContextoPerfil = { perfil: Perfil | null; alGuardarPerfil: (perfil: Perfil) => void };

type Opcion = 'mantener' | 'crear' | 'unirme';

type Props = {
  perfil: Perfil | null;
  modo: 'nuevo' | 'editar';
  alGuardar: (perfil: Perfil) => void;
  alTerminar?: () => void;
};

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** Primer uso: nombre con el que firma este dispositivo y el equipo con el que sincroniza. */
export function PrimerUso({ perfil, modo, alGuardar, alTerminar }: Props) {
  const [nombre, setNombre] = useState(modo === 'editar' ? (perfil?.nombre ?? '') : '');
  const [opcion, setOpcion] = useState<Opcion>(modo === 'editar' && perfil?.equipo ? 'mantener' : 'crear');
  const [codigo, setCodigo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<Perfil | null>(null);
  const [copiado, setCopiado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const guardado = await api.guardarPerfil({ nombre, ...(opcion === 'crear' ? { crear: true } : opcion === 'unirme' ? { equipo: codigo } : {}) });
      // Al crear un equipo primero se muestra el código para compartirlo con la otra laptop.
      if (opcion === 'crear') setCreado(guardado);
      else {
        alGuardar(guardado);
        alTerminar?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const clase = modo === 'nuevo' ? 'primer-uso' : 'primer-uso primer-uso-editar';

  if (creado?.equipo) {
    const equipo = creado.equipo;
    return (
      <div className={clase}>
        <section className="card primer-uso-card" aria-live="polite">
          <div className="eyebrow">Equipo creado</div>
          <h1 className="title-lg">Comparte este código con tu equipo</h1>
          <p className="muted">En la otra laptop abre Quorum, elige "Unirme con un código" y escríbelo. Solo quien lo tiene encuentra a este dispositivo.</p>
          <div className="codigo-equipo mono">{equipo}</div>
          <div className="primer-uso-acciones">
            <button type="button" className="btn btn-ghost" onClick={() => void copiar(equipo).then(setCopiado)}>
              {copiado ? <><IconCheck /> Copiado</> : 'Copiar código'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                alGuardar(creado);
                alTerminar?.();
              }}
            >
              Continuar
            </button>
          </div>
        </section>
      </div>
    );
  }

  const opciones: [Opcion, string][] = [
    ...(modo === 'editar' && perfil?.equipo ? ([['mantener', 'Mantener el equipo actual']] as [Opcion, string][]) : []),
    ['crear', 'Crear un equipo'],
    ['unirme', 'Unirme con un código'],
  ];

  return (
    <div className={clase}>
      <form className="card primer-uso-card" onSubmit={(e) => void enviar(e)}>
        {modo === 'nuevo' && (
          <div className="primer-uso-marca">
            <span className="primer-uso-logo" aria-hidden="true">Q</span>
            <span className="eyebrow">Este dispositivo</span>
          </div>
        )}
        <h1 className={modo === 'nuevo' ? 'title-xl' : 'title-lg'}>{modo === 'nuevo' ? 'Bienvenido a Quorum' : 'Nombre y equipo'}</h1>
        <p className="muted">Tu nombre firma lo que reportas. El código del equipo conecta solo a sus dispositivos, sin servidor.</p>

        <label className="primer-uso-campo">
          <span className="eyebrow">Tu nombre</span>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Ana Rodríguez" maxLength={60} autoFocus disabled={guardando} />
        </label>

        <div className="primer-uso-campo">
          <span className="eyebrow" id="equipo-opcion">Equipo</span>
          <div className="primer-uso-opciones" role="radiogroup" aria-labelledby="equipo-opcion">
            {opciones.map(([valor, texto]) => (
              <button key={valor} type="button" role="radio" aria-checked={opcion === valor} className={`chip${opcion === valor ? ' on' : ''}`} onClick={() => setOpcion(valor)} disabled={guardando}>
                {texto}
              </button>
            ))}
          </div>
        </div>

        {opcion === 'unirme' && (
          <label className="primer-uso-campo">
            <span className="eyebrow">Código del equipo</span>
            <input className="input mono" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="QRM-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} disabled={guardando} />
          </label>
        )}
        {modo === 'editar' && opcion !== 'mantener' && <p className="note">Al cambiar de equipo, este dispositivo deja de sincronizar con el equipo actual.</p>}
        {error && <p className="note" role="alert">{error}</p>}

        <div className="primer-uso-acciones">
          {modo === 'editar' && (
            <button type="button" className="btn btn-ghost" onClick={alTerminar} disabled={guardando}>Cancelar</button>
          )}
          <button type="submit" className="btn btn-primary" disabled={guardando || !nombre.trim() || (opcion === 'unirme' && !codigo.trim())}>
            {guardando ? 'Guardando…' : modo === 'nuevo' ? 'Empezar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Ruta /perfil: cambiar el nombre o el equipo desde la app. */
export function EditarPerfil() {
  const { perfil, alGuardarPerfil } = useOutletContext<ContextoPerfil>();
  const navigate = useNavigate();
  return <PrimerUso perfil={perfil} modo="editar" alGuardar={alGuardarPerfil} alTerminar={() => navigate('/red')} />;
}

/** Panel de Red P2P: el código para sumar otra laptop al equipo. */
export function AgregarDispositivo({ equipo }: { equipo: string | null }) {
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  return (
    <section className="card card-body agregar-dispositivo" aria-label="Agregar un dispositivo al equipo">
      <div>
        <div className="eyebrow">Agregar un dispositivo al equipo</div>
        <ol className="agregar-pasos">
          <li>Abre Quorum en el otro dispositivo.</li>
          <li>Elige "Unirme con un código" y escribe este código.</li>
          <li>Los dos se encuentran solos y sincronizan en segundos, sin servidor.</li>
        </ol>
      </div>
      <div className="agregar-codigo">
        {equipo ? <span className="codigo-equipo mono">{equipo}</span> : <span className="muted">Este dispositivo todavía no tiene equipo.</span>}
        <div className="agregar-acciones">
          {equipo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copiar(equipo).then(setCopiado)}>
              {copiado ? <><IconCheck /> Copiado</> : 'Copiar código'}
            </button>
          )}
          <button type="button" className="btn btn-link" onClick={() => navigate('/perfil')}>Cambiar nombre o equipo</button>
        </div>
      </div>
    </section>
  );
}
