import { IconDownload } from '../components/icons';
import { PageHeader } from '../components/ui';
import './Rendimiento.css';

// Valores de ejemplo: P0-03 los reemplaza con lo que registra perf.jsonl.
const MODELOS = [
  { tarea: 'Transcripción', modelo: 'whisper-small', cuant: 'Q8_0', carga: '1,2 s', ttft: '—', velocidad: '0,31× tiempo real' },
  { tarea: 'Extracción', modelo: 'qwen3-1.7b', cuant: 'Q4_K_M', carga: '2,8 s', ttft: '410 ms', velocidad: '38 tok/s' },
  { tarea: 'Lectura de placa', modelo: 'visionpsy-nano-460m', cuant: 'Q8_0', carga: '1,6 s', ttft: '690 ms', velocidad: '52 tok/s' },
  { tarea: 'Duplicados', modelo: 'embeddinggemma-300m', cuant: 'Q8_0', carga: '0,9 s', ttft: '—', velocidad: '11 ms por texto' },
  { tarea: 'Consultas', modelo: 'qwen3-4b', cuant: 'Q4_K_M', carga: '5,4 s', ttft: '820 ms', velocidad: '24 tok/s' },
];

const REGISTRO = [
  { hora: '09:47:07', tarea: 'Consultas', modelo: 'qwen3-4b', entrada: '612', salida: '48', ttft: '822 ms', tps: '24,1' },
  { hora: '09:45:52', tarea: 'Lectura de placa', modelo: 'visionpsy-nano-460m', entrada: '1.184', salida: '71', ttft: '688 ms', tps: '51,7' },
  { hora: '09:43:15', tarea: 'Extracción', modelo: 'qwen3-1.7b', entrada: '944', salida: '163', ttft: '405 ms', tps: '38,4' },
  { hora: '09:43:10', tarea: 'Transcripción', modelo: 'whisper-small', entrada: '42 s de audio', salida: '96', ttft: '—', tps: '—' },
  { hora: '09:31:40', tarea: 'Duplicados', modelo: 'embeddinggemma-300m', entrada: '214', salida: '—', ttft: '—', tps: '—' },
  { hora: '09:12:03', tarea: 'Extracción', modelo: 'qwen3-1.7b', entrada: '871', salida: '140', ttft: '398 ms', tps: '38,9' },
];

export function Rendimiento() {
  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Rendimiento"
        subtitle="Cada inferencia queda registrada con sus tiempos y tokens."
        actions={<button type="button" className="btn btn-ghost"><IconDownload /> Exportar perf.jsonl</button>}
      />

      <section className="card summary">
        <div className="summary-item">
          <span className="eyebrow">Inferencias enviadas a internet</span>
          <span className="summary-value">0</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Hardware declarado</span>
          <span className="summary-text">MacBook Air M2 · 16 GB</span>
          <span className="faint">macOS 15 · Node 22.17</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Modelos en este dispositivo</span>
          <span className="summary-value">5</span>
        </div>
        <div className="summary-item">
          <span className="eyebrow">Memoria en uso</span>
          <span className="summary-text">5,8 GB</span>
          <span className="faint">de 16 GB</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2 className="section-title">Modelos cargados</h2></div>
        <div className="table-head rend-modelos">
          <span>Tarea</span><span>Modelo</span><span>Cuantización</span><span>Dónde corre</span><span>Tiempo de carga</span><span>Primer token</span><span>Velocidad</span>
        </div>
        {MODELOS.map((m) => (
          <div key={m.tarea} className="table-row rend-modelos">
            <span className="section-title">{m.tarea}</span>
            <span className="mono">{m.modelo}</span>
            <span className="mono faint">{m.cuant}</span>
            <span><span className="pill pill-reportado">Este dispositivo</span></span>
            <span className="mono">{m.carga}</span>
            <span className="mono">{m.ttft}</span>
            <span className="mono">{m.velocidad}</span>
          </div>
        ))}
      </section>

      <section className="card rend-registro">
        <div className="card-head"><h2 className="section-title">Registro de inferencias</h2><span className="mono faint rend-archivo">perf.jsonl</span></div>
        <div className="table-head rend-log">
          <span>Hora</span><span>Tarea</span><span>Modelo</span><span>Tokens de entrada</span><span>Tokens de salida</span><span>Primer token</span><span>tok/s</span>
        </div>
        {REGISTRO.map((r) => (
          <div key={r.hora} className="table-row rend-log mono">
            <span className="faint">{r.hora}</span>
            <span className="rend-tarea">{r.tarea}</span>
            <span>{r.modelo}</span>
            <span>{r.entrada}</span>
            <span>{r.salida}</span>
            <span>{r.ttft}</span>
            <span>{r.tps}</span>
          </div>
        ))}
      </section>
    </>
  );
}
