import c from 'compact-encoding';
import crypto from 'hypercore-crypto';
import Hyperswarm from 'hyperswarm';
import Protomux from 'protomux';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Dispositivo, EstadoRed, RegistroInferencia } from '@quorum/shared';
import type { Almacen } from '../datos/almacen.ts';

/**
 * Solo los dispositivos que conocen este secreto encuentran el tópico del equipo. Normalmente es el
 * código que la persona crea o recibe al abrir Quorum; la variable queda para scripts. Sin secreto no
 * se busca a nadie, así un dispositivo nuevo no se mezcla con otro equipo.
 */
export const SECRETO_EQUIPO = process.env.QUORUM_EQUIPO ?? null;
const PROTOCOLO = 'quorum/directorio/v1';
/** Si el par no responde en este tiempo, la consulta corre en este dispositivo. */
const ESPERA_CONSULTA_MS = 30_000;

type Anuncio = {
  dispositivo: { clave: string; nombre: string; ofreceConsultas?: boolean };
  registros: { clave: string; nombre: string }[];
};

/** Lo que se le pide a un par. Solo existe para consultas: fotos de placa y dictados nunca salen del dispositivo. */
export type PedidoConsulta = {
  history: { role: 'system' | 'user'; content: string }[];
  nombreEsquema: string;
  esquema: Record<string, unknown>;
};

export type ConsultaDelegada<T> = { valor: T; registro: RegistroInferencia; par: string };

type Pedido = PedidoConsulta & { id: string };
type Respuesta = { id: string; valor?: unknown; registro?: RegistroInferencia; error?: string };

type Par = { clave: string; nombre: string; conexiones: number; ultimaVez: string | null; ofreceConsultas: boolean };

type Pendiente = {
  clave: string;
  nombre: string;
  temporizador: ReturnType<typeof setTimeout>;
  resolver: (respuesta: Respuesta) => void;
  rechazar: (error: Error) => void;
};

const abreviar = (clave: string) => `${clave.slice(0, 4)}…${clave.slice(-4)}`;

const pedidoValido = (p: Pedido) =>
  typeof p?.id === 'string' &&
  Array.isArray(p.history) &&
  p.history.length <= 4 &&
  p.history.every((m) => (m?.role === 'system' || m?.role === 'user') && typeof m.content === 'string' && m.content.length <= 4000) &&
  typeof p.nombreEsquema === 'string' &&
  typeof p.esquema === 'object' &&
  p.esquema !== null;

/**
 * Sincronización de dispositivo a dispositivo con Hyperswarm. Cada conexión abre un canal de
 * Protomux donde los dispositivos se anuncian los logs que conocen; el Corestore los replica
 * cifrados. Cuando alguien aprende un log nuevo lo reanuncia, así la red converge aunque no
 * todos los dispositivos se vean directamente.
 *
 * El mismo canal lleva la inferencia delegada: el SDK 0.19 de QVAC quitó el modo proveedor, así
 * que un dispositivo que ofrece consultas las atiende con su modelo local y devuelve el resultado.
 */
export class Red extends EventEmitter {
  private swarm: any = null;
  private readonly pares = new Map<string, Par>();
  private readonly eventos: { fecha: string; texto: string }[] = [];
  private readonly anunciadores = new Set<() => void>();
  /** Cómo enviarle un pedido a cada par conectado. */
  private readonly remitentes = new Map<string, (pedido: Pedido) => void>();
  private readonly pendientes = new Map<string, Pendiente>();
  /** Los pares pueden pedirle a este dispositivo que corra sus consultas. */
  ofreceConsultas = false;
  /** Corre una consulta pedida por un par. Lo define el servidor con el modelo de consultas local. */
  atenderConsulta: ((pedido: PedidoConsulta) => Promise<{ valor: unknown; registro: RegistroInferencia }>) | null = null;

  constructor(
    private readonly almacen: Almacen,
    private secreto: string | null = SECRETO_EQUIPO,
  ) {
    super();
    almacen.on('cambio', ({ clave, nombre }: { clave: string; nombre: string }) => {
      const registro = almacen.conocidos().find((r) => r.clave === clave);
      if (registro && !registro.local) this.evento(`Llegaron observaciones de ${nombre}`);
    });
  }

  iniciar() {
    if (!this.secreto) {
      this.evento('Sin equipo: crea uno o únete con un código');
      return;
    }
    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (conexion: any) => this.alConectar(conexion));
    this.swarm.join(crypto.hash(Buffer.from(`quorum:${this.secreto}`)), { server: true, client: true });
    this.evento('Buscando dispositivos del equipo');
  }

  /** Vuelve a enviar la lista de logs conocidos a todas las conexiones abiertas. */
  anunciar() {
    for (const enviar of this.anunciadores) enviar();
  }

  get equipo() {
    return this.secreto;
  }

  /** Deja el equipo actual y, si `conectar`, busca a los dispositivos del nuevo. */
  async cambiarEquipo(secreto: string, conectar = true) {
    await this.swarm?.destroy();
    this.swarm = null;
    this.pares.clear();
    this.anunciadores.clear();
    this.remitentes.clear();
    this.rechazarPendientes(() => true, 'Cambió el equipo.');
    this.secreto = secreto;
    if (conectar) this.iniciar();
  }

  /** Activa o desactiva ofrecer consultas y avisa a los pares. */
  ofrecerConsultas(activo: boolean) {
    this.ofreceConsultas = activo;
    this.evento(activo ? 'Este dispositivo ofrece consultas al equipo' : 'Este dispositivo dejó de ofrecer consultas');
    this.anunciar();
  }

  /**
   * Pide a un par conectado que ofrece consultas que corra la inferencia. Rechaza si no hay ninguno,
   * si se desconecta o si no responde a tiempo; quien llama corre entonces la consulta en local.
   */
  delegarConsulta<T>(pedido: PedidoConsulta): Promise<ConsultaDelegada<T>> {
    const par = [...this.pares.values()].find((p) => p.conexiones > 0 && p.ofreceConsultas && this.remitentes.has(p.clave));
    if (!par) return Promise.reject(new Error('Ningún par ofrece consultas ahora.'));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const temporizador = setTimeout(() => {
        this.pendientes.delete(id);
        this.evento(`${par.nombre} no respondió a tiempo; la consulta corrió en este dispositivo`);
        reject(new Error(`${par.nombre} no respondió a tiempo.`));
      }, ESPERA_CONSULTA_MS);
      this.pendientes.set(id, {
        clave: par.clave,
        nombre: par.nombre,
        temporizador,
        rechazar: reject,
        resolver: (r) => {
          if (r.error || !r.registro) {
            this.evento(`${par.nombre} no pudo resolver la consulta; corrió en este dispositivo`);
            reject(new Error(r.error ?? 'Respuesta incompleta del par.'));
            return;
          }
          this.evento(`${par.nombre} resolvió una consulta de este dispositivo con ${r.registro.modelo}`);
          resolve({ valor: r.valor as T, registro: r.registro, par: par.nombre });
        },
      });
      this.remitentes.get(par.clave)!({ ...pedido, id });
    });
  }

  private rechazarPendientes(condicion: (p: Pendiente) => boolean, motivo: string) {
    for (const [id, p] of this.pendientes) {
      if (!condicion(p)) continue;
      clearTimeout(p.temporizador);
      this.pendientes.delete(id);
      p.rechazar(new Error(motivo));
    }
  }

  private anuncio(): Anuncio {
    return {
      dispositivo: { clave: this.almacen.clave, nombre: this.almacen.nombre, ofreceConsultas: this.ofreceConsultas },
      registros: this.almacen.conocidos().map(({ clave, nombre }) => ({ clave, nombre })),
    };
  }

  private async atender(pedido: Pedido, responder: (respuesta: Respuesta) => void) {
    if (!pedidoValido(pedido)) return responder({ id: String(pedido?.id ?? ''), error: 'Pedido inválido.' });
    if (!this.ofreceConsultas || !this.atenderConsulta) return responder({ id: pedido.id, error: 'Este dispositivo no ofrece consultas.' });
    try {
      const { valor, registro } = await this.atenderConsulta({ history: pedido.history, nombreEsquema: pedido.nombreEsquema, esquema: pedido.esquema });
      responder({ id: pedido.id, valor, registro });
    } catch (error) {
      responder({ id: pedido.id, error: error instanceof Error ? error.message : 'No se pudo resolver la consulta.' });
    }
  }

  private alConectar(conexion: any) {
    conexion.on('error', () => {});
    const mux = Protomux.from(conexion);
    let clavePar: string | null = null;

    const canal = mux.createChannel({
      protocol: PROTOCOLO,
      onclose: () => {
        this.anunciadores.delete(enviar);
        if (clavePar && this.remitentes.get(clavePar) === enviarPedido) this.remitentes.delete(clavePar);
        // Los pedidos a este par ya no van a llegar: quien los hizo corre la consulta en local.
        this.rechazarPendientes((p) => p.clave === clavePar, 'El par se desconectó.');
        const par = clavePar ? this.pares.get(clavePar) : undefined;
        if (!par) return;
        par.conexiones = Math.max(0, par.conexiones - 1);
        par.ultimaVez = new Date().toISOString();
        if (par.conexiones === 0) this.evento(`${par.nombre} se desconectó`);
      },
    });
    if (!canal) return;

    let conectado = false;
    // El orden de los mensajes es parte del protocolo: 0 anuncio, 1 pedido, 2 respuesta.
    const mensaje = canal.addMessage({
      encoding: c.json,
      onmessage: async (anuncio: Anuncio) => {
        clavePar = anuncio.dispositivo.clave;
        const par = this.pares.get(clavePar) ?? { clave: clavePar, nombre: anuncio.dispositivo.nombre, conexiones: 0, ultimaVez: null, ofreceConsultas: false };
        par.nombre = anuncio.dispositivo.nombre;
        par.ofreceConsultas = anuncio.dispositivo.ofreceConsultas === true;
        par.ultimaVez = new Date().toISOString();
        if (!conectado) {
          conectado = true;
          par.conexiones++;
          if (par.conexiones === 1) this.evento(`Conectado con ${par.nombre} · clave ${abreviar(clavePar)}`);
        }
        this.pares.set(clavePar, par);
        this.remitentes.set(clavePar, enviarPedido);

        let nuevos = 0;
        for (const r of anuncio.registros) {
          if (await this.almacen.agregarPar(r.clave, r.nombre)) nuevos++;
        }
        if (nuevos) {
          this.evento(`${nuevos} ${nuevos === 1 ? 'registro nuevo' : 'registros nuevos'} de ${par.nombre} para sincronizar`);
          this.anunciar();
        }
      },
    });
    const pedido = canal.addMessage({
      encoding: c.json,
      onmessage: (p: Pedido) => void this.atender(p, (r) => respuesta.send(r)),
    });
    const respuesta = canal.addMessage({
      encoding: c.json,
      onmessage: (r: Respuesta) => {
        const pendiente = this.pendientes.get(r?.id);
        if (!pendiente || pendiente.clave !== clavePar) return;
        clearTimeout(pendiente.temporizador);
        this.pendientes.delete(r.id);
        pendiente.resolver(r);
      },
    });

    const enviar = () => mensaje.send(this.anuncio());
    const enviarPedido = (p: Pedido) => pedido.send(p);
    this.anunciadores.add(enviar);
    canal.open();
    enviar();
    this.almacen.replicar(conexion);
  }

  estado(): EstadoRed {
    const registros = this.almacen.conocidos();
    const bloques = (clave: string) => registros.find((r) => r.clave === clave)?.bloques ?? 0;
    const este: Dispositivo = {
      clave: this.almacen.clave,
      nombre: this.almacen.nombre,
      esEste: true,
      enLinea: true,
      observaciones: bloques(this.almacen.clave),
      ultimaVez: null,
      ofreceConsultas: this.ofreceConsultas,
    };
    const dispositivos = [...this.pares.values()].map<Dispositivo>((p) => ({
      clave: p.clave,
      nombre: p.nombre,
      esEste: false,
      enLinea: p.conexiones > 0,
      observaciones: bloques(p.clave),
      ultimaVez: p.ultimaVez,
      ofreceConsultas: p.ofreceConsultas,
    }));
    return {
      este,
      dispositivos: [este, ...dispositivos],
      conexiones: this.swarm?.connections?.size ?? 0,
      eventos: [...this.eventos].reverse().slice(0, 20),
    };
  }

  evento(texto: string) {
    this.eventos.push({ fecha: new Date().toISOString(), texto });
    if (this.eventos.length > 100) this.eventos.shift();
  }

  async cerrar() {
    this.rechazarPendientes(() => true, 'El servidor se está cerrando.');
    await this.swarm?.destroy();
  }
}
