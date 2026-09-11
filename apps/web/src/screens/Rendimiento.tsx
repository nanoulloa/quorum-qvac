import type { RegistroInferencia, Sistema, Tarea } from '@quorum/shared';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui';
import './Rendimiento.css';

const TAREA: Record<Tarea, string> = {
  transcripcion: 'Transcripción',
  extraccion: 'Extracción',
  pregunta: 'Pregunta',
  placa: 'Lectura de placa',
  embeddings: 'Duplicados',
  consulta: 'Consultas',
};

const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

const ms = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(v)} ms`);
const tps = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v.toFixed(1).replace('.', ',')} tok/s`);
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function Rendimiento() {
  const [registro, setRegistro] = useState<RegistroInferencia[]>([]);
  const [sistema, setSistema] = useState<Sistema | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const [r, s] = await Promise.all([fetch('/api/perf?limite=500').then((x) => x.json()), fetch('/api/sistema').then((x) => x.json())]);
        if (!vivo) return;
        setRegistro(r as RegistroInferencia[]);
        setSistema(s as Sistema);
        setError(false);
      } catch {
        if (vivo) setError(true);
      }
    };
    void cargar();
    const id = window.setInterval(() => void cargar(), 5000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, []);

  const modelos = useMemo(() => {
    const grupos = new Map<string, RegistroInferencia[]>();
    for (const r of registro.filter((x) => !x.error)) grupos.set(r.modelo, [...(grupos.get(r.modelo) ?? []), r]);
    return [...grupos.entries()].map(([modelo, rs]) => ({
      modelo,
      tareas: [...new Set(rs.map((r) => TAREA[r.tarea] ?? r.tarea))].join(', '),
      cuantizacion: rs[0].cuantizacion,
      donde: rs[0].dondeCorre === 'par' ? 'Par' : 'Este dispositivo',
      carga: Math.max(0, ...rs.map((r) => r.cargaMs ?? 0)) || null,
      ttft: mediana(rs.map((r) => r.ttftMs).filter((v): v is number => v !== undefined)),
      velocidad: mediana(rs.map((r) => r.tokensPorSegundo).filter((v): v is number => v !== undefined)),
      duracion: mediana(rs.map((r) => r.duracionMs)),
      llamadas: rs.length,
    }));
  }, [registro]);

  const ttftGlobal = mediana(registro.map((r) => r.ttftMs).filter((v): v is number => v !== undefined));

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Rendimiento"
        subtitle="Cada inferencia queda registrada en perf.jsonl con sus tiempos y tokens."
        actions={<a className="btn btn-ghost" href="/api/perf?limite=1000" target="_blank" rel="noreferrer">Ver perf.jsonl</a>}
      />

      {error && <p className="note">El servidor local no responde. Inícialo con <span className="mono">npm run dev</span>.</p>}

      <section className="card summary">
        <div className="summary-item">
          <span className="eyebrow">Inferencia en APIs remotas</span>
          <span className="summary-value">0</span>
          <span className="faint">Todo corre con @qvac/sdk local</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Hardware</span>
          <span className="summary-text">{sistema ? `${sistema.cpu} · ${sistema.memoriaGB} GB` : '—'}</span>
          <span className="faint">{sistema ? `Node ${sistema.node.replace('v', '')} · @qvac/sdk ${sistema.qvacSdk}` : ''}</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Inferencias registradas</span>
          <span className="summary-value">{registro.length}</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Primer token (mediana)</span>
          <span className="summary-text">{ms(ttftGlobal)}</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2 className="section-title">Modelos usados</h2></div>
        <div className="table-head rend-modelos">
          <span>Modelo</span><span>Tareas</span><span>Cuantización</span><span>Dónde corre</span><span>Carga</span><span>Primer token</span><span>Velocidad</span>
        </div>
        {modelos.map((m) => (
          <div key={m.modelo} className="table-row rend-modelos">
            <span className="mono">{m.modelo}</span>
            <span>{m.tareas} <span className="faint">· {m.llamadas}</span></span>
            <span className="mono faint">{m.cuantizacion}</span>
            <span><span className="pill pill-reportado">{m.donde}</span></span>
            <span className="mono">{ms(m.carga)}</span>
            <span className="mono">{ms(m.ttft)}</span>
            <span className="mono">{m.velocidad !== null ? tps(m.velocidad) : ms(m.duracion)}</span>
          </div>
        ))}
        {modelos.length === 0 && <p className="faint lista-vacia">Todavía no hay inferencias. Dicta una visita o lee una placa.</p>}
      </section>

      <section className="card rend-registro">
        <div className="card-head"><h2 className="section-title">Registro de inferencias</h2><span className="mono faint rend-archivo">perf.jsonl · últimas {Math.min(20, registro.length)}</span></div>
        <div className="table-head rend-log">
          <span>Hora</span><span>Tarea</span><span>Modelo</span><span>Tokens de entrada</span><span>Tokens de salida</span><span>Primer token</span><span>Duración</span>
        </div>
        {registro.slice(0, 20).map((r, i) => (
          <div key={`${r.fecha}-${i}`} className="table-row rend-log mono">
            <span className="faint">{hora(r.fecha)}</span>
            <span className="rend-tarea">{TAREA[r.tarea] ?? r.tarea}{r.error ? ' · error' : ''}</span>
            <span>{r.modelo}</span>
            <span>{r.tokensEntrada ?? '—'}</span>
            <span>{r.tokensSalida ?? '—'}</span>
            <span>{ms(r.ttftMs)}</span>
            <span>{ms(r.duracionMs)}</span>
          </div>
        ))}
        {registro.length === 0 && <p className="faint lista-vacia">Cada inferencia aparece aquí en cuanto ocurre.</p>}
      </section>
    </>
  );
}
