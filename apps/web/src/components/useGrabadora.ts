import { useCallback, useEffect, useRef, useState } from 'react';

const TASA_WHISPER = 16000;
const BARRAS = 70;

type Estado = {
  ctx?: AudioContext;
  stream?: MediaStream;
  fuente?: MediaStreamAudioSourceNode;
  nodo?: ScriptProcessorNode;
  muestras: Float32Array[];
  inicio: number;
  temporizador?: number;
};

/**
 * Graba del micrófono y entrega un WAV PCM de 16 kHz mono, el formato que Whisper espera.
 * Se codifica en el navegador para no depender de decodificadores en el servidor.
 */
export function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [niveles, setNiveles] = useState<number[]>([]);
  const ref = useRef<Estado>({ muestras: [], inicio: 0 });

  const liberar = useCallback(() => {
    const r = ref.current;
    window.clearInterval(r.temporizador);
    r.nodo?.disconnect();
    r.fuente?.disconnect();
    r.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => liberar, [liberar]);

  const iniciar = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const ctx = new AudioContext();
    const fuente = ctx.createMediaStreamSource(stream);
    const nodo = ctx.createScriptProcessor(4096, 1, 1);
    const r = ref.current;
    r.muestras = [];
    r.inicio = performance.now();
    nodo.onaudioprocess = (e) => {
      const canal = e.inputBuffer.getChannelData(0);
      r.muestras.push(new Float32Array(canal));
      let suma = 0;
      for (let i = 0; i < canal.length; i += 32) suma += Math.abs(canal[i]);
      const nivel = Math.min(1, (suma / (canal.length / 32)) * 8);
      setNiveles((prev) => [...prev.slice(-(BARRAS - 1)), nivel]);
    };
    fuente.connect(nodo);
    nodo.connect(ctx.destination);
    Object.assign(r, { ctx, stream, fuente, nodo });
    r.temporizador = window.setInterval(() => setSegundos(Math.floor((performance.now() - r.inicio) / 1000)), 250);
    setSegundos(0);
    setNiveles([]);
    setGrabando(true);
  }, []);

  const detener = useCallback(async (): Promise<Blob> => {
    const r = ref.current;
    liberar();
    const tasa = r.ctx?.sampleRate ?? TASA_WHISPER;
    await r.ctx?.close();
    setGrabando(false);
    return aWav(remuestrear(unir(r.muestras), tasa, TASA_WHISPER), TASA_WHISPER);
  }, [liberar]);

  return { grabando, segundos, niveles, iniciar, detener };
}

function unir(partes: Float32Array[]) {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const salida = new Float32Array(total);
  let offset = 0;
  for (const p of partes) {
    salida.set(p, offset);
    offset += p.length;
  }
  return salida;
}

function remuestrear(datos: Float32Array, desde: number, hacia: number) {
  if (desde === hacia) return datos;
  const razon = desde / hacia;
  const salida = new Float32Array(Math.floor(datos.length / razon));
  for (let i = 0; i < salida.length; i++) {
    const inicio = Math.floor(i * razon);
    const fin = Math.min(datos.length, Math.floor((i + 1) * razon));
    let suma = 0;
    for (let j = inicio; j < fin; j++) suma += datos[j];
    salida[i] = suma / Math.max(1, fin - inicio);
  }
  return salida;
}

function aWav(muestras: Float32Array, tasa: number): Blob {
  const buffer = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(buffer);
  const texto = (offset: number, s: string) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, tasa, true);
  v.setUint32(28, tasa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, 'data');
  v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
