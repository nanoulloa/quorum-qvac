import type { CampoPregunta, EquipoExtraido, Extraccion, Faltante, Modalidad, Pregunta, Respuesta } from '@quorum/shared';
import { completarJson } from '../qvac/inferir.ts';
import { CATALOGO, marcaConocida } from './catalogo.ts';
import { DUDA } from './extraccion.ts';
import { mencionaParecido, normalizar, numero } from './texto.ts';

/** Cuánto aporta cada dato que falta. La regla es fija: el modelo nunca elige qué se pregunta. */
const PESO: Record<CampoPregunta, number> = { antiguedad: 4, modelo: 3, marca: 2, cantidad: 1 };

/** Equipos caros: un dato que falta ahí vale el doble. */
const PESADAS: Modalidad[] = ['Resonancia magnética', 'Tomografía'];

const CAMPOS = Object.keys(PESO) as CampoPregunta[];

/** `cantidad` no es un dato con estado: la extracción siempre deja al menos 1, así que nunca falta. */
const falta = (e: EquipoExtraido, campo: CampoPregunta) => (campo === 'cantidad' ? e.cantidad < 1 : e[campo].estado === 'Desconocido');

/** El dato que más aporta de los que faltan. Empate: gana el equipo de menor índice. */
export function elegirFaltante(extraccion: Extraccion, omitidos: Faltante[] = []): Faltante | null {
  let mejor: Faltante | null = null;
  let puntajeMejor = 0;
  for (const [equipo, e] of extraccion.equipos.entries()) {
    const factor = PESADAS.includes(e.modalidad) ? 2 : 1;
    for (const campo of CAMPOS) {
      const puntaje = PESO[campo] * factor;
      if (puntaje <= puntajeMejor || !falta(e, campo) || omitidos.some((o) => o.equipo === equipo && o.campo === campo)) continue;
      mejor = { equipo, campo };
      puntajeMejor = puntaje;
    }
  }
  return mejor;
}

const NO_SE = 'No sé';

/** Respuesta rápida de antigüedad → años que se guardan, el punto medio del rango. */
const RANGOS: [string, number][] = [
  ['Menos de 5', 3],
  ['5 a 10', 7],
  ['Más de 10', 12],
];

/** Los chips los fija el servidor, no el modelo: son los valores que la app sabe interpretar. */
function respuestasDe(e: EquipoExtraido, campo: CampoPregunta): string[] {
  if (campo === 'antiguedad') return [...RANGOS.map(([etiqueta]) => etiqueta), NO_SE];
  if (campo === 'marca') return [...Object.keys(CATALOGO), NO_SE];
  if (campo === 'modelo') {
    const marca = marcaConocida(e.marca.valor);
    return marca ? [...CATALOGO[marca], NO_SE] : [NO_SE];
  }
  return [NO_SE];
}

const NOMBRE: Record<Modalidad, string> = {
  'Resonancia magnética': 'resonador',
  Tomografía: 'tomógrafo',
  Ecografía: 'ecógrafo',
  'Rayos X': 'equipo de rayos X',
  Otro: 'equipo',
};

const ORDINALES = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto'];

/** "el segundo resonador": el ingeniero los distingue por modalidad y orden, no por índice. */
function comoSeLlama(extraccion: Extraccion, indice: number): string {
  const { modalidad } = extraccion.equipos[indice];
  const cuantos = extraccion.equipos.filter((e) => e.modalidad === modalidad).length;
  const posicion = extraccion.equipos.filter((e, i) => e.modalidad === modalidad && i <= indice).length;
  const orden = cuantos > 1 ? `${ORDINALES[posicion - 1] ?? `${posicion}.º`} ` : '';
  return `el ${orden}${NOMBRE[modalidad]}`;
}

const EN_PALABRAS: Record<CampoPregunta, string> = {
  antiguedad: 'la antigüedad en años',
  modelo: 'el modelo',
  marca: 'la marca',
  cantidad: 'la cantidad de equipos',
};

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pregunta', 'razon'],
  properties: { pregunta: { type: 'string' }, razon: { type: 'string' } },
};

const SISTEMA = [
  'Un ingeniero de campo acaba de dictar lo que vio en un hospital y falta un dato de un equipo médico.',
  'Escribe UNA sola pregunta corta y natural para pedirle ese dato, tuteándolo.',
  'Reglas:',
  '- Nombra el equipo tal como te lo dan ("el segundo resonador") y agrega la marca y el modelo si te los dan.',
  '- Pregunta solo por el dato que falta, nada más.',
  '- Escribe además una razón: por qué ese dato importa para el negocio, en 12 palabras o menos.',
  '- Todo en español, sin saludos ni comentarios.',
  'Ejemplo del largo exacto de la razón: La antigüedad decide si es una oportunidad de renovación',
  '/no_think',
].join('\n');

/** El modelo solo redacta: qué se pregunta y qué respuestas se ofrecen ya está decidido. */
export async function redactarPregunta(extraccion: Extraccion, faltante: Faltante): Promise<Pregunta> {
  const e = extraccion.equipos[faltante.equipo];
  const equipo = [comoSeLlama(extraccion, faltante.equipo), e.marca.valor, e.modelo.valor].filter(Boolean).join(' ');
  const redactado = await completarJson<{ pregunta: string; razon: string }>({
    clave: 'extraccion',
    tarea: 'pregunta',
    nombreEsquema: 'pregunta',
    esquema: ESQUEMA,
    history: [
      { role: 'system', content: SISTEMA },
      { role: 'user', content: `Equipo: ${equipo}.\nDato que falta: ${EN_PALABRAS[faltante.campo]}.` },
    ],
  });
  return { ...faltante, pregunta: redactado.pregunta.trim(), razon: redactado.razon.trim(), respuestas: respuestasDe(e, faltante.campo) };
}

const NEGATIVAS = ['no se', 'no lo se', 'ni idea', 'no'];

const MODELOS = Object.values(CATALOGO).flat();

/** Convierte la respuesta del ingeniero en un dato con estado. Determinista, sin modelo. */
export function interpretarRespuesta(campo: CampoPregunta, texto: string): Respuesta {
  const limpio = texto.trim();
  const n = normalizar(limpio);
  if (NEGATIVAS.includes(n)) return { valor: null, estado: 'Desconocido' };
  if (campo === 'marca') return { valor: marcaConocida(limpio) ?? limpio, estado: 'Reportado' };
  if (campo === 'modelo') return { valor: MODELOS.find((m) => mencionaParecido(limpio, m)) ?? limpio, estado: 'Reportado' };
  const rango = RANGOS.find(([etiqueta]) => normalizar(etiqueta) === n);
  if (rango) return { valor: rango[1], estado: 'Estimado' };
  const dicho = n.split(' ').map((p) => numero(p)).find((v) => v !== undefined);
  if (dicho === undefined) return { valor: null, estado: 'Desconocido' };
  return { valor: dicho, estado: campo === 'antiguedad' && DUDA.test(limpio) ? 'Estimado' : 'Reportado' };
}
