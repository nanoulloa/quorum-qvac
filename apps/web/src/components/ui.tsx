import type { ReactNode } from 'react';
import type { Estado } from '@quorum/shared';
import { conexion } from '../mocks/data';
import { IconCheck, IconPlane } from './icons';

export function Connection() {
  return (
    <div className="connection mono">
      <span className="connection-item">
        <IconPlane width={14} height={14} />
        {conexion.online ? 'En línea' : 'Sin conexión'}
      </span>
      <span className="divider-v" />
      <span>IA en este dispositivo</span>
      <span className="divider-v" />
      <span>Sincronizado {conexion.ultimaSync}</span>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="title-xl">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="page-header-side">
        <Connection />
        {actions}
      </div>
    </header>
  );
}

export function StatusPill({ estado }: { estado: Estado }) {
  return <span className={`pill pill-${estado.toLowerCase()}`}>{estado}</span>;
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="steps" aria-label="Progreso de la visita">
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-dot">{state === 'done' ? <IconCheck width={12} height={12} /> : i + 1}</span>
            <span className="step-label">{label}</span>
            {i < labels.length - 1 && <span className="step-line" />}
          </li>
        );
      })}
    </ol>
  );
}

export function nivelConfianza(valor: number) {
  return valor >= 70 ? 'Alta' : valor >= 50 ? 'Media' : 'Baja';
}

export function ConfidenceBar({ valor, conNivel = false }: { valor: number; conNivel?: boolean }) {
  return (
    <div className="confidence" title={`Confianza ${valor} · ${nivelConfianza(valor)}`}>
      <span className="mono confidence-num">{valor}</span>
      <div className="bar-track confidence-track">
        <div className="bar-fill" style={{ width: `${valor}%`, opacity: valor >= 70 ? 1 : valor >= 50 ? 0.7 : 0.45 }} />
      </div>
      {conNivel && <span className="faint confidence-level">{nivelConfianza(valor)}</span>}
    </div>
  );
}

export function Avatars({ iniciales }: { iniciales: string[] }) {
  return (
    <div className="avatars">
      {iniciales.map((i) => (
        <span key={i} className="avatar avatar-sm">{i}</span>
      ))}
    </div>
  );
}
