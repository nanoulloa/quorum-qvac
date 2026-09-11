import type { Perfil } from '@quorum/shared';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { iniciales, useBase } from '../datos/base';
import { PrimerUso, type ContextoPerfil } from '../screens/PrimerUso';
import { IconBuilding, IconChart, IconGauge, IconMic, IconMoon, IconNetwork, IconSearch, IconSun } from './icons';
import { useTheme } from './useTheme';

const links = [
  { to: '/captura', label: 'Captura de visita', Icon: IconMic },
  { to: '/hospitales', label: 'Hospitales', Icon: IconBuilding },
  { to: '/base', label: 'Base instalada', Icon: IconChart },
  { to: '/consultas', label: 'Consultas', Icon: IconSearch },
  { to: '/red', label: 'Red P2P', Icon: IconNetwork },
  { to: '/rendimiento', label: 'Rendimiento', Icon: IconGauge },
];

export function Layout() {
  const { theme, toggle } = useTheme();
  const { red, origen, actualizado, recargar } = useBase();
  // undefined: todavía no se sabe. null: el servidor local no responde.
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  const nombre = perfil?.nombre ?? red?.este.nombre ?? 'Este dispositivo';
  const nextLabel = theme === 'dark' ? 'Tema claro' : 'Tema oscuro';

  useEffect(() => {
    let vivo = true;
    let reintento = 0;
    const cargar = () =>
      api.perfil().then(
        (p) => {
          if (vivo) setPerfil(p);
        },
        () => {
          if (!vivo) return;
          setPerfil((actual) => actual ?? null);
          reintento = window.setTimeout(() => void cargar(), 3000);
        },
      );
    void cargar();
    return () => {
      vivo = false;
      window.clearTimeout(reintento);
    };
  }, []);

  const alGuardarPerfil = (p: Perfil) => {
    setPerfil(p);
    void recargar();
  };

  if (perfil === undefined) return <div className="app" />;
  // Antes de capturar nada, la persona dice quién es y a qué equipo pertenece.
  if (perfil && !perfil.configurado) return <PrimerUso perfil={perfil} modo="nuevo" alGuardar={alGuardarPerfil} />;

  const contexto: ContextoPerfil = { perfil, alGuardarPerfil };

  return (
    <div className="app">
      <nav className="rail" aria-label="Principal">
        <div className="rail-logo" aria-label="Quorum">Q</div>
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} aria-label={label} data-label={label} className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}>
            <Icon />
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <button type="button" className="rail-link rail-theme" onClick={toggle} aria-label={nextLabel} data-label={nextLabel}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <NavLink to="/perfil" className="avatar" title={`${nombre} · cambiar nombre o equipo`} aria-label="Nombre y equipo">
          {iniciales(nombre)}
        </NavLink>
      </nav>
      <main className="main">
        {/* Imposible de pasar por alto: sin servidor no hay datos nuevos ni se puede capturar (#54). */}
        {origen === 'sin-servidor' && (
          <div className="aviso-servidor" role="alert">
            <strong>El servidor local no responde.</strong>{' '}
            {actualizado
              ? `Lo que ves es lo último que llegó de este dispositivo, a las ${new Date(actualizado).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}. Capturar, consultar y sincronizar vuelven cuando responda.`
              : 'No hay datos que mostrar. Inícialo con npm run dev en la carpeta del proyecto.'}
          </div>
        )}
        <Outlet context={contexto} />
      </main>
    </div>
  );
}
