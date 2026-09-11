import type { AntiguedadExtraida, DatoExtraido, Extraccion, Modalidad } from '@quorum/shared';
import { completarJson } from '../qvac/inferir.ts';
import type { ClaveModelo } from '../qvac/modelos.ts';
import { anclarLugar } from './anclaje.ts';
import { CATALOGO, MARCA_DE_MODELO } from './catalogo.ts';
import { clienteConocido, sinCiudad } from './clientes.ts';
import { paisCanonico } from './paises.ts';
import { mencionaParecido, normalizar, numero, oraciones } from './texto.ts';

const nulo = (tipo: string) => ({ anyOf: [{ type: tipo }, { type: 'null' }] });

const MODALIDADES = ['Resonancia magnética', 'Tomografía', 'Ecografía', 'Rayos X', 'Otro'] as const;

/** Esquema que el modelo está obligado a respetar (salida JSON por gramática). */
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cliente', 'ciudad', 'pais', 'equipos'],
  properties: {
    cliente: nulo('string'),
    ciudad: nulo('string'),
    pais: nulo('string'),
    equipos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['modalidad', 'cantidad', 'marca', 'modelo', 'antiguedad_anios', 'antiguedad_frase'],
        properties: {
          modalidad: { type: 'string', enum: MODALIDADES },
          cantidad: { type: 'integer' },
          marca: nulo('string'),
          modelo: nulo('string'),
          antiguedad_anios: nulo('integer'),
          antiguedad_frase: nulo('string'),
        },
      },
    },
  },
};

const EJEMPLO_DICTADO =
  'Pasé por el Hospital San Ejemplo en Lima, Perú. Tienen dos tomógrafos Canon de unos cinco años y un resonador que no pude ver.';

const EJEMPLO_JSON = JSON.stringify({
  cliente: 'Hospital San Ejemplo',
  ciudad: 'Lima',
  pais: 'Perú',
  equipos: [
    { modalidad: 'Tomografía', cantidad: 2, marca: 'Canon', modelo: null, antiguedad_anios: 5, antiguedad_frase: 'de unos cinco años' },
    { modalidad: 'Resonancia magnética', cantidad: 1, marca: null, modelo: null, antiguedad_anios: null, antiguedad_frase: null },
  ],
});

const sistema = (anioActual: number) =>
  [
    'Extraes datos de equipos médicos de lo que dicta un ingeniero de campo al salir de un hospital.',
    'Reglas:',
    '- Incluye TODOS los equipos mencionados. Resonador = Resonancia magnética, tomógrafo = Tomografía, ecógrafo = Ecografía.',
    '- Agrupa equipos iguales en un solo elemento con su cantidad. Si de un grupo solo se describe una parte, sepárala del resto.',
    '- Si un dato no se menciona, usa null. Nunca escribas "unknown" ni "desconocido".',
    `- El año actual es ${anioActual}. Si dice el año de instalación o fabricación, calcula la antigüedad. "El año pasado" es 1 año.`,
    '- En antiguedad_frase copia las palabras exactas del dictado sobre la antigüedad, o null.',
    `Ejemplo de dictado: ${EJEMPLO_DICTADO}`,
    `Ejemplo de respuesta: ${EJEMPLO_JSON}`,
    '/no_think',
  ].join('\n');

type EquipoCrudo = {
  modalidad: (typeof MODALIDADES)[number];
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  antiguedad_anios: number | null;
  antiguedad_frase: string | null;
};

type Crudo = { cliente: string | null; ciudad: string | null; pais: string | null; equipos: EquipoCrudo[] };

const VACIOS = /^(unknown|desconocid[oa]|n\/?a|null|none|ninguno|sin dato|no se sabe|-+)$/i;
/** Palabras que vuelven Estimado un número: quien habla no está seguro. */
export const DUDA = /\b(parece|parecen|unos|unas|como|más o menos|aprox\w*|calculo|quiz[aá]s?|tal vez|creo|alrededor|supongo|estimo)\b/i;

/** Cómo se nombra cada modalidad en un dictado, con la palabra anterior para leer la cantidad. */
const MENCIONES: [Modalidad, RegExp][] = [
  ['Resonancia magnética', /(\S+)\s+(?:resonador(?:es)?|resonancias?)\b/i],
  ['Tomografía', /(\S+)\s+(?:tom[oó]grafos?|tomograf[ií]as?)\b/i],
  ['Ecografía', /(\S+)\s+(?:ec[oó]grafos?|ecograf[ií]as?|ultrasonidos?)\b/i],
];

const limpiar = (s: string | null) => {
  const t = s?.trim() ?? '';
  return t && !VACIOS.test(t) ? t : null;
};

/** Años que describe una oración sobre un equipo, si los dice de forma explícita. */
function aniosEnOracion(oracion: string, anioActual: number): { anios: number; frase: string } | null {
  const n = normalizar(oracion);
  if (/\b(el|del) ano pasado\b/.test(n)) return { anios: 1, frase: 'el año pasado' };
  const anio = oracion.match(/\b(?:instal\w*|fabric\w*|compr\w*|desde)\D{0,15}((?:19|20)\d{2})\b/i);
  if (anio) return { anios: anioActual - Number(anio[1]), frase: anio[0] };
  // "Un tomógrafo GE Revolution de 2019": el año del equipo, sin verbo.
  const deAnio = oracion.match(/\b(?:de|del año)\s+((?:19|20)\d{2})\b/i);
  if (deAnio && Number(deAnio[1]) <= anioActual) return { anios: anioActual - Number(deAnio[1]), frase: deAnio[0] };
  return null;
}

/**
 * Correcciones deterministas sobre la salida del modelo. Cada una responde a un patrón
 * explícito del dictado, así que se pueden explicar y probar. Varias existen porque la
 * transcripción comete errores ("ingenio" por "Ingenia", "en un tomógrafo" por "y un tomógrafo").
 */
function corregir(crudo: Crudo, texto: string, anioActual: number): EquipoCrudo[] {
  let equipos = crudo.equipos.map((e) => ({ ...e, marca: limpiar(e.marca), modelo: limpiar(e.modelo), cantidad: Math.max(1, e.cantidad || 1) }));

  // Todo equipo nombrado en el dictado debe estar en el resultado.
  for (const [modalidad, patron] of MENCIONES) {
    const mencion = texto.match(patron);
    if (mencion && !equipos.some((e) => e.modalidad === modalidad)) {
      equipos.push({ modalidad, cantidad: numero(mencion[1]) ?? 1, marca: null, modelo: null, antiguedad_anios: null, antiguedad_frase: null });
    }
  }

  for (const e of equipos) {
    // Marca y modelo cruzados: "Achieva" como marca.
    const marcaComoModelo = e.marca && MARCA_DE_MODELO.get(e.marca.toLowerCase());
    if (marcaComoModelo && !e.modelo) {
      e.modelo = e.marca;
      e.marca = marcaComoModelo;
    }
    // Modelo que el dictado nombra junto a la marca, aunque venga mal transcrito.
    if (e.marca && !e.modelo) {
      const candidatos = (CATALOGO[e.marca] ?? []).filter((m) => mencionaParecido(texto, m) && !equipos.some((o) => o.modelo?.toLowerCase() === m.toLowerCase()));
      if (candidatos.length === 1) e.modelo = candidatos[0];
    }
  }

  // Antigüedad imposible: a veces el modelo devuelve un año en vez de años. Se descarta y la lee la regla de abajo.
  for (const e of equipos) {
    if (e.antiguedad_anios !== null && (e.antiguedad_anios < 0 || e.antiguedad_anios > 60)) {
      e.antiguedad_anios = null;
      e.antiguedad_frase = null;
    }
  }

  // Antigüedad dicha en una oración que habla de un solo tipo de equipo.
  for (const oracion of oraciones(texto)) {
    const tipos = MENCIONES.filter(([, patron]) => patron.test(` ${oracion}`)).map(([m]) => m);
    const dicho = tipos.length === 1 ? aniosEnOracion(oracion, anioActual) : null;
    const candidatos = dicho ? equipos.filter((e) => e.modalidad === tipos[0] && e.antiguedad_anios === null) : [];
    if (dicho && candidatos.length === 1) {
      candidatos[0].antiguedad_anios = dicho.anios;
      candidatos[0].antiguedad_frase = dicho.frase;
    }
  }

  // "Uno de los resonadores es Philips": el grupo se separa en la parte descrita y el resto.
  if (/\b(uno|una) de (los|las)\b/i.test(texto)) {
    equipos = equipos.flatMap((e) =>
      e.cantidad > 1 && (e.marca || e.modelo || e.antiguedad_anios !== null)
        ? [
            { ...e, cantidad: 1 },
            { ...e, cantidad: e.cantidad - 1, marca: null, modelo: null, antiguedad_anios: null, antiguedad_frase: null },
          ]
        : [e],
    );
  }

  return equipos;
}

const dicho = <T>(valor: T | null): DatoExtraido<T> => ({ valor, estado: valor === null ? 'Desconocido' : 'Reportado' });

/** La duda la decide una regla sobre las palabras del dictado, no el modelo. */
function antiguedad(e: EquipoCrudo): AntiguedadExtraida {
  if (e.antiguedad_anios === null || e.antiguedad_anios < 0) return { valor: null, estado: 'Desconocido' };
  return {
    valor: e.antiguedad_anios,
    estado: e.antiguedad_frase && DUDA.test(e.antiguedad_frase) ? 'Estimado' : 'Reportado',
    frase: e.antiguedad_frase ?? undefined,
  };
}

const MODELO_EXTRACCION = (process.env.QUORUM_MODELO_EXTRACCION as ClaveModelo | undefined) ?? 'extraccion';

/** Convierte un dictado en datos estructurados con su estado. Tolera datos incompletos. */
export async function extraer(texto: string, anioActual = new Date().getFullYear()): Promise<Extraccion> {
  const crudo = await completarJson<Crudo>({
    clave: MODELO_EXTRACCION,
    tarea: 'extraccion',
    nombreEsquema: 'observacion',
    esquema: ESQUEMA,
    history: [
      { role: 'system', content: sistema(anioActual) },
      { role: 'user', content: texto },
    ],
  });
  // El modelo a veces rellena el lugar con el del ejemplo del prompt: solo queda lo que el dictado nombra.
  const lugar = anclarLugar(texto, { cliente: limpiar(crudo.cliente), ciudad: limpiar(crudo.ciudad), pais: limpiar(crudo.pais) });
  const ciudad = lugar.ciudad;
  const cliente = sinCiudad(lugar.cliente, ciudad);
  return {
    cliente: dicho(clienteConocido(cliente) ?? cliente),
    ciudad: dicho(ciudad),
    pais: { valor: paisCanonico(lugar.pais.valor), estado: lugar.pais.estado },
    equipos: corregir(crudo, texto, anioActual).map((e) => ({
      modalidad: e.modalidad,
      cantidad: e.cantidad,
      marca: dicho(e.marca),
      modelo: dicho(e.modelo),
      antiguedad: antiguedad(e),
    })),
  };
}
