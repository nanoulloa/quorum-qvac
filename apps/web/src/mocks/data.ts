// Datos 100% ficticios para construir la UI mientras el servidor no expone la API.
import { confianza, type Desglose, type Estado, type Evidencia } from '@quorum/shared';

export const yo = { nombre: 'Carlos Méndez', iniciales: 'CM', rol: 'Ingeniero de servicio', clave: '7f3a…c91e' };

export const conexion = { online: false, ultimaSync: '09:31' };

export type Persona = { id: string; nombre: string; iniciales: string; clave: string };

export const personas = {
  cm: { id: 'cm', nombre: 'Carlos Méndez', iniciales: 'CM', clave: '7f3a…c91e' },
  ar: { id: 'ar', nombre: 'Ana Ríos', iniciales: 'AR', clave: 'b21d…04af' },
  lp: { id: 'lp', nombre: 'Luis Pérez', iniciales: 'LP', clave: 'e9c0…7b12' },
} satisfies Record<string, Persona>;

export type PersonaId = keyof typeof personas;

export type Cliente = { id: string; nombre: string; ciudad: string; pais: string };

export const clientes: Cliente[] = [
  { id: 'democare', nombre: 'Hospital DemoCare Pacific', ciudad: 'Ciudad de Panamá', pais: 'Panamá' },
  { id: 'bahia-azul', nombre: 'Centro Médico Bahía Azul', ciudad: 'Colón', pais: 'Panamá' },
  { id: 'horizonte-norte', nombre: 'Clínica Horizonte Norte', ciudad: 'Bogotá', pais: 'Colombia' },
  { id: 'valle-sereno', nombre: 'Hospital Valle Sereno', ciudad: 'San José', pais: 'Costa Rica' },
  { id: 'aurora', nombre: 'Hospital Aurora Paulista', ciudad: 'São Paulo', pais: 'Brasil' },
  { id: 'horizonte-sul', nombre: 'Instituto Horizonte Sul', ciudad: 'Porto Alegre', pais: 'Brasil' },
  { id: 'vale-verde', nombre: 'Clínica Vale Verde', ciudad: 'Curitiba', pais: 'Brasil' },
  { id: 'mare-alta', nombre: 'Hospital Maré Alta', ciudad: 'Recife', pais: 'Brasil' },
];

export type Dato = { valor: string | null; estado: Estado };
export type Modalidad = 'Resonancia magnética' | 'Tomografía' | 'Ecografía';

export type Equipo = {
  id: string;
  clienteId: string;
  modalidad: Modalidad;
  nombre: string;
  marca: Dato;
  modelo: Dato;
  antiguedad: Dato;
  anios: number | null;
  testigos: PersonaId[];
  evidencia: Evidencia;
  dias: number;
  confianza: Desglose;
};

const rep = (valor: string): Dato => ({ valor, estado: 'Reportado' });
const conf = (valor: string): Dato => ({ valor, estado: 'Confirmado' });
const est = (valor: string): Dato => ({ valor, estado: 'Estimado' });
const falta: Dato = { valor: null, estado: 'Desconocido' };

type Base = Omit<Equipo, 'confianza'>;

const base: Base[] = [
  { id: 'e1', clienteId: 'democare', modalidad: 'Resonancia magnética', nombre: 'Resonador 1.5T', marca: conf('Philips'), modelo: conf('Ingenia 1.5T'), antiguedad: conf('9 años'), anios: 9, testigos: ['cm', 'ar', 'lp'], evidencia: 'foto', dias: 2 },
  { id: 'e2', clienteId: 'democare', modalidad: 'Resonancia magnética', nombre: 'Resonador', marca: rep('Siemens'), modelo: falta, antiguedad: est('~12 años'), anios: 12, testigos: ['ar'], evidencia: 'voz', dias: 3 },
  { id: 'e3', clienteId: 'democare', modalidad: 'Tomografía', nombre: 'Tomógrafo', marca: falta, modelo: falta, antiguedad: rep('1 año'), anios: 1, testigos: ['cm'], evidencia: 'voz', dias: 2 },
  { id: 'e4', clienteId: 'democare', modalidad: 'Ecografía', nombre: 'Ecógrafo', marca: rep('Philips'), modelo: rep('EPIQ Elite'), antiguedad: rep('5 años'), anios: 5, testigos: ['lp', 'ar'], evidencia: 'texto', dias: 214 },
  { id: 'e5', clienteId: 'bahia-azul', modalidad: 'Resonancia magnética', nombre: 'Resonador', marca: rep('GE'), modelo: rep('Signa'), antiguedad: est('~8 años'), anios: 8, testigos: ['lp'], evidencia: 'voz', dias: 190 },
  { id: 'e6', clienteId: 'bahia-azul', modalidad: 'Tomografía', nombre: 'Tomógrafo', marca: conf('Philips'), modelo: conf('Incisive CT'), antiguedad: conf('3 años'), anios: 3, testigos: ['cm', 'lp'], evidencia: 'foto', dias: 20 },
  { id: 'e7', clienteId: 'bahia-azul', modalidad: 'Ecografía', nombre: 'Ecógrafo', marca: rep('Siemens'), modelo: falta, antiguedad: rep('4 años'), anios: 4, testigos: ['cm'], evidencia: 'texto', dias: 40 },
  { id: 'e8', clienteId: 'horizonte-norte', modalidad: 'Tomografía', nombre: 'Tomógrafo', marca: conf('GE'), modelo: conf('Revolution'), antiguedad: conf('11 años'), anios: 11, testigos: ['ar', 'lp'], evidencia: 'foto', dias: 30 },
  { id: 'e9', clienteId: 'horizonte-norte', modalidad: 'Resonancia magnética', nombre: 'Resonador', marca: rep('Philips'), modelo: rep('Achieva'), antiguedad: rep('10 años'), anios: 10, testigos: ['ar'], evidencia: 'voz', dias: 60 },
  { id: 'e10', clienteId: 'horizonte-norte', modalidad: 'Ecografía', nombre: 'Ecógrafo', marca: rep('Canon'), modelo: falta, antiguedad: est('~6 años'), anios: 6, testigos: ['ar'], evidencia: 'voz', dias: 60 },
  { id: 'e11', clienteId: 'valle-sereno', modalidad: 'Tomografía', nombre: 'Tomógrafo', marca: rep('Siemens'), modelo: falta, antiguedad: est('~10 años'), anios: 10, testigos: ['lp'], evidencia: 'voz', dias: 263 },
  { id: 'e12', clienteId: 'valle-sereno', modalidad: 'Resonancia magnética', nombre: 'Resonador', marca: rep('Philips'), modelo: rep('Ingenia'), antiguedad: rep('6 años'), anios: 6, testigos: ['lp'], evidencia: 'texto', dias: 263 },
  { id: 'e13', clienteId: 'aurora', modalidad: 'Resonancia magnética', nombre: 'Resonador 1.5T', marca: conf('Philips'), modelo: conf('Achieva 1.5T'), antiguedad: conf('11 años'), anios: 11, testigos: ['cm', 'ar'], evidencia: 'foto', dias: 15 },
  { id: 'e14', clienteId: 'aurora', modalidad: 'Tomografía', nombre: 'Tomógrafo', marca: rep('Siemens'), modelo: rep('Somatom'), antiguedad: rep('5 años'), anios: 5, testigos: ['ar'], evidencia: 'voz', dias: 15 },
  { id: 'e15', clienteId: 'horizonte-sul', modalidad: 'Resonancia magnética', nombre: 'Resonador 1.5T', marca: rep('Siemens'), modelo: rep('Avanto'), antiguedad: rep('13 años'), anios: 13, testigos: ['ar'], evidencia: 'voz', dias: 45 },
  { id: 'e16', clienteId: 'vale-verde', modalidad: 'Resonancia magnética', nombre: 'Resonador 3T', marca: rep('GE'), modelo: rep('Signa'), antiguedad: est('~9 años'), anios: 9, testigos: ['lp'], evidencia: 'voz', dias: 50 },
  { id: 'e17', clienteId: 'mare-alta', modalidad: 'Resonancia magnética', nombre: 'Resonador', marca: falta, modelo: falta, antiguedad: est('~8 años'), anios: 8, testigos: ['lp'], evidencia: 'voz', dias: 80 },
];

export const equipos: Equipo[] = base.map((e) => ({
  ...e,
  confianza: confianza({
    campos: [e.marca.estado, e.modelo.estado, e.antiguedad.estado],
    testigos: e.testigos.length,
    evidencia: e.evidencia,
    diasDesdeVerificacion: e.dias,
  }),
}));

export const clientePorId = (id: string) => clientes.find((c) => c.id === id);
export const equiposDe = (clienteId: string) => equipos.filter((e) => e.clienteId === clienteId);

/** Resonador o tomógrafo de más de 7 años con confianza media o alta (issue P1-10). */
export const esRenovacion = (e: Equipo) => e.modalidad !== 'Ecografía' && (e.anios ?? 0) > 7 && e.confianza.total >= 50;
export const sinVerificar = (e: Equipo) => e.dias > 180;

const ORDEN_ESTADO: Estado[] = ['Desconocido', 'Estimado', 'Reportado', 'Confirmado'];

/** El estado de un equipo es el de su dato más débil. */
export const estadoGeneral = (e: Equipo): Estado => {
  const estados = [e.marca.estado, e.modelo.estado, e.antiguedad.estado];
  return ORDEN_ESTADO.find((s) => estados.includes(s)) ?? 'Desconocido';
};

export const haceDias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`);

export const evidenciaTexto: Record<Evidencia, string> = { foto: 'Foto de placa', voz: 'Voz', texto: 'Texto', sync: 'Sincronización' };

export type Segmento = string | { texto: string; etiqueta: string; estimado?: boolean };

export const captura = {
  hora: '09:42',
  clienteId: 'democare',
  transcripcion: [
    'Estoy en ', { texto: 'Hospital DemoCare Pacific', etiqueta: 'cliente' },
    ', en ', { texto: 'Ciudad de Panamá', etiqueta: 'ciudad' },
    '. Hay ', { texto: 'dos resonadores', etiqueta: 'equipo' },
    ' y ', { texto: 'un tomógrafo', etiqueta: 'equipo' },
    '. Uno de los resonadores es ', { texto: 'Philips', etiqueta: 'marca' },
    ', un ', { texto: 'Ingenia', etiqueta: 'modelo' },
    ', y parece de ', { texto: 'unos ocho años', etiqueta: 'estimado', estimado: true },
    '. El tomógrafo lo cambiaron ', { texto: 'el año pasado', etiqueta: 'antigüedad' },
    '.',
  ] as Segmento[],
  equipos: [
    { id: 'n1', nombre: 'Resonador magnético', campos: { Marca: rep('Philips'), Modelo: rep('Ingenia'), Antigüedad: est('~8 años') } },
    { id: 'n2', nombre: 'Resonador magnético', campos: { Marca: falta, Modelo: falta, Antigüedad: falta } },
    { id: 'n3', nombre: 'Tomógrafo', campos: { Marca: falta, Modelo: falta, Antigüedad: rep('1 año') } },
  ],
};
