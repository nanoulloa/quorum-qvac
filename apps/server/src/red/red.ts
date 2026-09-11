import c from 'compact-encoding';
import crypto from 'hypercore-crypto';
import Hyperswarm from 'hyperswarm';
import Protomux from 'protomux';
import { EventEmitter } from 'node:events';
import type { Dispositivo, EstadoRed } from '@quorum/shared';
import type { Almacen } from '../datos/almacen.ts';

/** Solo los dispositivos que conocen este secreto encuentran el tópico del equipo. */
const SECRETO_EQUIPO = process.env.QUORUM_EQUIPO ?? 'quorum-demo';
const PROTOCOLO = 'quorum/directorio/v1';

type Anuncio = {
  dispositivo: { clave: string; nombre: string };
  registros: { clave: string; nombre: string }[];
};

type Par = { clave: string; nombre: string; conexiones: number; ultimaVez: string | null };

const abreviar = (clave: string) => `${clave.slice(0, 4)}…${clave.slice(-4)}`;

/**
 * Sincronización de dispositivo a dispositivo con Hyperswarm. Cada conexión abre un canal de
 * Protomux donde los dispositivos se anuncian los logs que conocen; el Corestore los replica
 * cifrados. Cuando alguien aprende un log nuevo lo reanuncia, así la red converge aunque no
 * todos los dispositivos se vean directamente.
 */
export class Red extends EventEmitter {
  private swarm: any = null;
  private readonly pares = new Map<string, Par>();
  private readonly eventos: { fecha: string; texto: string }[] = [];
  private readonly anunciadores = new Set<() => void>();

  constructor(
    private readonly almacen: Almacen,
    private readonly secreto = SECRETO_EQUIPO,
  ) {
    super();
    almacen.on('cambio', ({ clave, nombre }: { clave: string; nombre: string }) => {
      const registro = almacen.conocidos().find((r) => r.clave === clave);
      if (registro && !registro.local) this.evento(`Llegaron observaciones de ${nombre}`);
    });
  }

  iniciar() {
    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (conexion: any) => this.alConectar(conexion));
    this.swarm.join(crypto.hash(Buffer.from(`quorum:${this.secreto}`)), { server: true, client: true });
    this.evento('Buscando dispositivos del equipo');
  }

  /** Vuelve a enviar la lista de logs conocidos a todas las conexiones abiertas. */
  anunciar() {
    for (const enviar of this.anunciadores) enviar();
  }

  private anuncio(): Anuncio {
    return {
      dispositivo: { clave: this.almacen.clave, nombre: this.almacen.nombre },
      registros: this.almacen.conocidos().map(({ clave, nombre }) => ({ clave, nombre })),
    };
  }

  private alConectar(conexion: any) {
    conexion.on('error', () => {});
    const mux = Protomux.from(conexion);
    let clavePar: string | null = null;

    const canal = mux.createChannel({
      protocol: PROTOCOLO,
      onclose: () => {
        this.anunciadores.delete(enviar);
        const par = clavePar ? this.pares.get(clavePar) : undefined;
        if (!par) return;
        par.conexiones = Math.max(0, par.conexiones - 1);
        par.ultimaVez = new Date().toISOString();
        if (par.conexiones === 0) this.evento(`${par.nombre} se desconectó`);
      },
    });
    if (!canal) return;

    let conectado = false;
    const mensaje = canal.addMessage({
      encoding: c.json,
      onmessage: async (anuncio: Anuncio) => {
        clavePar = anuncio.dispositivo.clave;
        const par = this.pares.get(clavePar) ?? { clave: clavePar, nombre: anuncio.dispositivo.nombre, conexiones: 0, ultimaVez: null };
        par.nombre = anuncio.dispositivo.nombre;
        par.ultimaVez = new Date().toISOString();
        if (!conectado) {
          conectado = true;
          par.conexiones++;
          if (par.conexiones === 1) this.evento(`Conectado con ${par.nombre} · clave ${abreviar(clavePar)}`);
        }
        this.pares.set(clavePar, par);

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

    const enviar = () => mensaje.send(this.anuncio());
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
    };
    const dispositivos = [...this.pares.values()].map<Dispositivo>((p) => ({
      clave: p.clave,
      nombre: p.nombre,
      esEste: false,
      enLinea: p.conexiones > 0,
      observaciones: bloques(p.clave),
      ultimaVez: p.ultimaVez,
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
    await this.swarm?.destroy();
  }
}
