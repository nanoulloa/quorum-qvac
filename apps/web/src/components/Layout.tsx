import { NavLink, Outlet } from 'react-router-dom';
import { iniciales, useBase } from '../datos/base';
import { yo } from '../mocks/data';
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
  const { red } = useBase();
  const nombre = red?.este.nombre ?? yo.nombre;
  const nextLabel = theme === 'dark' ? 'Tema claro' : 'Tema oscuro';

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
        <div className="avatar" title={`${nombre} · este dispositivo`}>{iniciales(nombre)}</div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
