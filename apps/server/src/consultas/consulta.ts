import { performance } from 'node:perf_hooks';
import type { FiltrosConsulta, Modalidad, RespuestaConsulta } from '@quorum/shared';
import { CATALOGO, marcaConocida } from '../captura/catalogo.ts';
import { clienteConocido } from '../captura/clientes.ts';
import { paisCanonico } from '../captura/paises.ts';
import { normalizar, numero } from '../captura/texto.ts';
import { completarJson } from '../qvac/inferir.ts';
import { CATALOGO as MODELOS } from '../qvac/modelos.ts';

/** Clientes y ciudades que existen en la base; la consulta solo acepta entidades que se pueden anclar. */
export type Conocidos = { clientes: string[]; ciudades: string[] };

const nulo = (tipo: string) => ({ anyOf: [{ type: tipo }, { type: 'null' }] });

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cliente', 'ciudad'],
  properties: { cliente: nulo('string'), ciudad: nulo('string') },
};

const SISTEMA =
  'De una pregunta sobre equipos médicos, extrae solo el nombre del hospital o clínica (cliente) y la ciudad si se mencionan. ' +
  'Copia las palabras tal como aparecen en la pregunta. Si no se mencionan, usa null. /no_think';

const PAISES = ['Panamá', 'Colombia', 'Costa Rica', 'México', 'Perú', 'Ecuador', 'Brasil', 'Chile', 'Argentina', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'República Dominicana', 'Brazil', 'Mexico', 'Peru', 'Panama'];

const MODALIDAD: [Modalidad, RegExp][] = [
  ['Resonancia magnética', /\b(resonador(es)?|resonancias?|rm|mri)\b/],
  ['Tomografía', /\b(tomografos?|tomografias?|tc|ct)\b/],
  ['Ecografía', /\b(ecografos?|ecografias?|ultrasonidos?)\b/],
  ['Rayos X', /\brayos x\b/],
];

const NUMERO = '(\\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte)';
const NUMEROS_EXTRA: Record<string, number> = { once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20 };
const aNumero = (s: string) => NUMEROS_EXTRA[s] ?? numero(s) ?? null;

const contiene = (texto: string, valor: string) => ` ${texto} `.includes(` ${normalizar(valor)} `);

/** Todo lo que se puede leer de la pregunta sin modelo: es predecible y explicable. */
function porReglas(pregunta: string, conocidos: Conocidos): Partial<FiltrosConsulta> {
  const n = normalizar(pregunta);
  const f: Partial<FiltrosConsulta> = {};

  const pais = PAISES.find((p) => contiene(n, p));
  if (pais) f.pais = paisCanonico(pais);
  const modalidad = MODALIDAD.find(([, r]) => r.test(n));
  if (modalidad) f.modalidad = modalidad[0];
  const marca = Object.keys(CATALOGO).find((m) => contiene(n, m));
  if (marca) f.marca = marca;
  const ciudad = conocidos.ciudades.find((c) => contiene(n, c));
  if (ciudad) f.ciudad = ciudad;

  const entre = n.match(new RegExp(`entre ${NUMERO} y ${NUMERO} anos`));
  const masDe = n.match(new RegExp(`mas de ${NUMERO} anos`));
  const menosDe = n.match(new RegExp(`menos de ${NUMERO} anos`));
  const oMas = n.match(new RegExp(`${NUMERO} anos o mas`));
  if (entre) [f.antiguedadMin, f.antiguedadMax] = [aNumero(entre[1]), aNumero(entre[2])];
  if (masDe) f.antiguedadMin = (aNumero(masDe[1]) ?? 0) + 1;
  if (oMas) f.antiguedadMin = aNumero(oMas[1]);
  if (menosDe) f.antiguedadMax = Math.max(0, (aNumero(menosDe[1]) ?? 1) - 1);

  if (/\b(sin verificar|no se (han|ha) verificado|datos viejos|desactualizad\w*)\b/.test(n)) f.soloSinVerificar = true;
  if (/\b(renovacion|renovar|reemplaz\w*)\b/.test(n)) f.soloRenovacion = true;
  const confianza = n.match(/confianza (alta|media|de al menos \d+|mayor (a|de) \d+)/);
  if (confianza) f.confianzaMin = confianza[1] === 'alta' ? 70 : confianza[1] === 'media' ? 50 : Number(confianza[1].match(/\d+/)![0]);
  return f;
}

const VACIO: FiltrosConsulta = {
  pais: null,
  ciudad: null,
  cliente: null,
  modalidad: null,
  marca: null,
  antiguedadMin: null,
  antiguedadMax: null,
  confianzaMin: null,
  soloRenovacion: false,
  soloSinVerificar: false,
};

/**
 * Traduce una pregunta a filtros. Las reglas leen país, modalidad, marca, años y banderas; el modelo
 * (en este dispositivo) propone cliente y ciudad, y solo se aceptan si aparecen en la pregunta y
 * existen en la base. Así un modelo pequeño no puede inventar filtros.
 */
export async function interpretarConsulta(pregunta: string, conocidos: Conocidos): Promise<RespuestaConsulta> {
  const t0 = performance.now();
  const reglas = porReglas(pregunta, conocidos);
  const n = normalizar(pregunta);

  const propuesta = await completarJson<{ cliente: string | null; ciudad: string | null }>({
    clave: 'extraccion',
    tarea: 'consulta',
    nombreEsquema: 'entidades',
    esquema: ESQUEMA,
    history: [
      { role: 'system', content: SISTEMA },
      { role: 'user', content: pregunta },
    ],
  });

  const cliente = propuesta.cliente && contiene(n, propuesta.cliente) ? clienteConocido(propuesta.cliente, conocidos.clientes) : null;
  const ciudad = propuesta.ciudad ? (conocidos.ciudades.find((c) => contiene(n, c) && normalizar(c) === normalizar(propuesta.ciudad!)) ?? null) : null;

  const filtros: FiltrosConsulta = { ...VACIO, cliente, ciudad, ...reglas };
  filtros.marca = marcaConocida(filtros.marca) ?? filtros.marca;
  return { filtros, modelo: `${MODELOS.extraccion.nombre} · ${MODELOS.extraccion.cuantizacion} + reglas`, duracionMs: Math.round(performance.now() - t0) };
}
