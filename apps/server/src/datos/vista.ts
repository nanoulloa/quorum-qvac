import {
  confianza,
  esDecision,
  type BaseInstalada,
  type ClienteBase,
  type DatoExtraido,
  type EntradaLog,
  type EquipoBase,
  type Estado,
  type Evidencia,
  type Testigo,
} from '@quorum/shared';
import { normalizar } from '../captura/texto.ts';

const DIA_MS = 86_400_000;
const FUERZA: Estado[] = ['Desconocido', 'Estimado', 'Reportado', 'Confirmado'];

/** Se queda con el dato más fuerte; a igual fuerza, con el más reciente (`a`). */
const masFuerte = <T>(a: DatoExtraido<T>, b: DatoExtraido<T>) => (FUERZA.indexOf(b.estado) > FUERZA.indexOf(a.estado) ? b : a);

const idCliente = (nombre: string) => normalizar(nombre).replace(/\s+/g, '-');

type Parcial = Omit<EquipoBase, 'evidencia' | 'diasDesdeVerificacion' | 'confianza'>;

/**
 * Dos reportes son el mismo equipo si coinciden cliente, modalidad y marca, el modelo es
 * compatible y la antigüedad no difiere más de 2 años. Sin marca no se une nada automáticamente:
 * eso lo decide una persona con una fusión.
 */
function mismoEquipo(a: Parcial, b: Parcial) {
  if (a.clienteId !== b.clienteId || a.modalidad !== b.modalidad) return false;
  if (!a.marca.valor || !b.marca.valor || normalizar(a.marca.valor) !== normalizar(b.marca.valor)) return false;
  const [ma, mb] = [a.modelo.valor, b.modelo.valor].map((m) => (m ? normalizar(m) : null));
  if (ma && mb && !ma.startsWith(mb) && !mb.startsWith(ma)) return false;
  const [aa, ab] = [a.antiguedad.valor, b.antiguedad.valor];
  return aa === null || ab === null || Math.abs(aa - ab) <= 2;
}

function unir(destino: Parcial, otro: Parcial) {
  destino.marca = masFuerte(destino.marca, otro.marca);
  destino.modelo = masFuerte(destino.modelo, otro.modelo);
  destino.antiguedad = masFuerte(destino.antiguedad, otro.antiguedad);
  destino.serie = masFuerte(destino.serie, otro.serie);
  destino.cantidad = Math.max(destino.cantidad, otro.cantidad);
  destino.testigos.push(...otro.testigos);
  destino.refs.push(...otro.refs);
}

/** Arma la base instalada a partir de todas las entradas de los logs (propias y replicadas). */
export function construirBase(entradas: EntradaLog[], ahora = Date.now()): BaseInstalada {
  const clientes = new Map<string, ClienteBase>();
  const equipos: Parcial[] = [];
  const decisiones = entradas.filter(esDecision).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const observaciones = entradas.filter((e) => !esDecision(e)).sort((a, b) => b.fecha.localeCompare(a.fecha));

  for (const o of observaciones) {
    if (esDecision(o) || !o.cliente.valor) continue;
    const clienteId = idCliente(o.cliente.valor);
    const cliente = clientes.get(clienteId) ?? { id: clienteId, nombre: o.cliente.valor, ciudad: null, pais: null };
    cliente.ciudad ??= o.ciudad.valor;
    cliente.pais ??= o.pais.valor;
    clientes.set(clienteId, cliente);

    o.equipos.forEach((e, i) => {
      const testigo: Testigo = { clave: o.autor, nombre: o.autorNombre, fecha: o.fecha, evidencia: e.evidencia ?? o.fuente };
      const nuevo: Parcial = {
        id: `${o.id}-${i}`,
        refs: [`${o.id}-${i}`],
        clienteId,
        modalidad: e.modalidad,
        cantidad: e.cantidad,
        marca: e.marca,
        modelo: e.modelo,
        antiguedad: e.antiguedad,
        serie: e.serie ?? { valor: null, estado: 'Desconocido' },
        testigos: [testigo],
      };
      const existente = equipos.find((x) => mismoEquipo(x, nuevo));
      if (existente) unir(existente, nuevo);
      else equipos.push(nuevo);
    });
  }

  // Fusiones confirmadas por personas del equipo, en el orden en que se decidieron.
  for (const d of decisiones) {
    if (d.tipo !== 'fusion') continue;
    const a = equipos.find((e) => e.refs.includes(d.refs[0]));
    const b = equipos.find((e) => e.refs.includes(d.refs[1]));
    if (!a || !b || a === b) continue;
    unir(a, b);
    equipos.splice(equipos.indexOf(b), 1);
  }

  return {
    clientes: [...clientes.values()],
    equipos: equipos.map((e) => {
      const ultima = Math.max(...e.testigos.map((t) => Date.parse(t.fecha)));
      const diasDesdeVerificacion = Math.max(0, Math.floor((ahora - ultima) / DIA_MS));
      const evidencia: Evidencia = e.testigos.some((t) => t.evidencia === 'foto') ? 'foto' : e.testigos[0].evidencia;
      return {
        ...e,
        evidencia,
        diasDesdeVerificacion,
        confianza: confianza({
          campos: [e.marca.estado, e.modelo.estado, e.antiguedad.estado],
          testigos: new Set(e.testigos.map((t) => t.clave)).size,
          evidencia,
          diasDesdeVerificacion,
        }),
      };
    }),
    distintos: decisiones.filter((d) => d.tipo === 'distintos').map((d) => d.refs),
    generado: new Date(ahora).toISOString(),
  };
}
