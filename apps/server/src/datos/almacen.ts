import Corestore from 'corestore';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { NuevaObservacion, ObservacionGuardada } from '@quorum/shared';

export const DIRECTORIO = path.resolve(process.env.QUORUM_DATA_DIR ?? path.join(process.cwd(), '.quorum'));
export const NOMBRE_DISPOSITIVO = process.env.QUORUM_NOMBRE ?? 'Carlos Méndez';

/** Un log de observaciones (Hypercore). Su clave pública identifica a quien lo escribe. */
type Nucleo = { core: any; clave: string; nombre: string; local: boolean };

type Registro = {
  /** Logs de otros dispositivos que ya conocemos, para replicarlos al reiniciar. */
  pares: { clave: string; nombre: string }[];
  /** Logs extra de este dispositivo (semillas de ingenieros ficticios, cada uno con su clave). */
  locales: { interno: string; nombre: string }[];
};

/**
 * Almacén local solo-agregar. Cada dispositivo escribe en su propio Hypercore y replica los
 * de sus pares; nadie puede escribir en el log de otro. No hay servidor central.
 */
export class Almacen extends EventEmitter {
  private readonly store: any;
  private readonly archivoRegistro: string;
  private readonly nucleos = new Map<string, Nucleo>();
  private propio!: Nucleo;
  private registro: Registro = { pares: [], locales: [] };

  constructor(
    private readonly directorio = DIRECTORIO,
    private readonly nombreDispositivo = NOMBRE_DISPOSITIVO,
  ) {
    super();
    this.store = new Corestore(path.join(directorio, 'corestore'));
    this.archivoRegistro = path.join(directorio, 'registro.json');
  }

  async abrir() {
    await fs.mkdir(this.directorio, { recursive: true });
    await this.store.ready();
    try {
      this.registro = JSON.parse(await fs.readFile(this.archivoRegistro, 'utf8')) as Registro;
    } catch {
      // Primer arranque.
    }
    this.propio = await this.abrirLocal('observaciones', this.nombreDispositivo);
    for (const l of this.registro.locales) await this.abrirLocal(l.interno, l.nombre);
    for (const p of this.registro.pares) await this.agregarPar(p.clave, p.nombre, false);
  }

  get clave() {
    return this.propio.clave;
  }

  get nombre() {
    return this.propio.nombre;
  }

  private async abrirLocal(interno: string, nombre: string): Promise<Nucleo> {
    const core = this.store.get({ name: interno, valueEncoding: 'json' });
    await core.ready();
    const nucleo = { core, clave: core.key.toString('hex') as string, nombre, local: true };
    this.nucleos.set(nucleo.clave, nucleo);
    return nucleo;
  }

  /** Abre (o crea) un log local adicional con su propia clave. Lo usan las semillas. */
  async nucleoLocal(interno: string, nombre: string): Promise<string> {
    const nucleo = await this.abrirLocal(interno, nombre);
    if (!this.registro.locales.some((l) => l.interno === interno)) {
      this.registro.locales.push({ interno, nombre });
      await this.guardarRegistro();
    }
    return nucleo.clave;
  }

  /** Empieza a replicar el log de otro dispositivo. Devuelve false si ya se conocía. */
  async agregarPar(clave: string, nombre: string, persistir = true): Promise<boolean> {
    if (this.nucleos.has(clave)) return false;
    const core = this.store.get({ key: Buffer.from(clave, 'hex'), valueEncoding: 'json' });
    await core.ready();
    core.download({ start: 0, end: -1 });
    core.on('append', () => this.emit('cambio', { clave, nombre }));
    this.nucleos.set(clave, { core, clave, nombre, local: false });
    if (persistir) {
      this.registro.pares.push({ clave, nombre });
      await this.guardarRegistro();
    }
    return true;
  }

  async guardar(nueva: NuevaObservacion, clave = this.propio.clave): Promise<ObservacionGuardada> {
    const nucleo = this.nucleos.get(clave);
    if (!nucleo?.local) throw new Error('Solo se puede escribir en los logs de este dispositivo.');
    const observacion: ObservacionGuardada = {
      ...nueva,
      id: randomUUID(),
      autor: nucleo.clave,
      autorNombre: nucleo.nombre,
      fecha: nueva.fecha ?? new Date().toISOString(),
    };
    await nucleo.core.append(observacion);
    this.emit('cambio', { clave: nucleo.clave, nombre: nucleo.nombre });
    return observacion;
  }

  /** Todas las observaciones que ya están en disco, propias y replicadas. */
  async observaciones(): Promise<ObservacionGuardada[]> {
    const todas: ObservacionGuardada[] = [];
    for (const { core } of this.nucleos.values()) {
      for (let i = 0; i < core.length; i++) {
        const valor = (await core.get(i, { wait: false })) as ObservacionGuardada | null;
        if (valor) todas.push(valor);
      }
    }
    return todas;
  }

  /** Logs conocidos. Se anuncian a los pares para que la red converja aunque no todos se vean. */
  conocidos() {
    return [...this.nucleos.values()].map(({ clave, nombre, local, core }) => ({ clave, nombre, local, bloques: core.length as number }));
  }

  replicar(conexion: unknown) {
    return this.store.replicate(conexion);
  }

  async cerrar() {
    await this.store.close();
  }

  private async guardarRegistro() {
    await fs.writeFile(this.archivoRegistro, `${JSON.stringify(this.registro, null, 2)}\n`);
  }
}
