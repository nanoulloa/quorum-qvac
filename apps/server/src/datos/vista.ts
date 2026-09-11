import {
  confianza,
  type BaseInstalada,
  type ClienteBase,
  type DatoExtraido,
  type EquipoBase,
  type Estado,
  type Evidencia,
  type ObservacionGuardada,
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
 * compatible y la antigüedad no difiere más de 2 años. Sin marca no se une nada automáticamente.
 */
function mismoEquipo(a: Parcial, b: Parcial) {
  if (a.clienteId !== b.clienteId || a.modalidad !== b.modalidad) return false;
  if (!a.marca.valor || !b.marca.valor || normalizar(a.marca.valor) !== normalizar(b.marca.valor)) return false;
  const [ma, mb] = [a.modelo.valor, b.modelo.valor].map((m) => (m ? normalizar(m) : null));
  if (ma && mb && !ma.startsWith(mb) && !mb.startsWith(ma)) return false;
  const [aa, ab] = [a.antiguedad.valor, b.antiguedad.valor];
  return aa === null || ab === null || Math.abs(aa - ab) <= 2;
}

/** Arma la base instalada a partir de todas las observaciones (propias y replicadas). */
export function construirBase(observaciones: ObservacionGuardada[], ahora = Date.now()): BaseInstalada {
  const clientes = new Map<string, ClienteBase>();
  const equipos: Parcial[] = [];

  const recientesPrimero = [...observaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const o of recientesPrimero) {
    if (!o.cliente.valor) continue;
    const clienteId = idCliente(o.cliente.valor);
    const cliente = clientes.get(clienteId) ?? { id: clienteId, nombre: o.cliente.valor, ciudad: null, pais: null };
    cliente.ciudad ??= o.ciudad.valor;
    cliente.pais ??= o.pais.valor;
    clientes.set(clienteId, cliente);

    o.equipos.forEach((e, i) => {
      const testigo: Testigo = { clave: o.autor, nombre: o.autorNombre, fecha: o.fecha, evidencia: e.evidencia ?? o.fuente };
      const nuevo: Parcial = {
        id: `${o.id}-${i}`,
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
      if (!existente) {
        equipos.push(nuevo);
        return;
      }
      existente.marca = masFuerte(existente.marca, nuevo.marca);
      existente.modelo = masFuerte(existente.modelo, nuevo.modelo);
      existente.antiguedad = masFuerte(existente.antiguedad, nuevo.antiguedad);
      existente.serie = masFuerte(existente.serie, nuevo.serie);
      existente.cantidad = Math.max(existente.cantidad, nuevo.cantidad);
      existente.testigos.push(testigo);
    });
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
    generado: new Date(ahora).toISOString(),
  };
}
