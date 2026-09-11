// Pista para Whisper: los nombres propios que más se equivoca al transcribir.
// Cuando exista la base real (P0-04), agregar aquí los clientes conocidos.
const CLIENTES = ['Hospital DemoCare Pacific', 'Centro Médico Bahía Azul', 'Clínica Horizonte Norte', 'Hospital Aurora Paulista'];
const LUGARES = ['Ciudad de Panamá', 'Colón', 'Bogotá', 'San José', 'São Paulo'];
const MARCAS = ['Philips', 'Siemens', 'GE', 'Canon'];
const MODELOS = ['Ingenia', 'Achieva', 'Incisive', 'EPIQ', 'Signa', 'Revolution', 'Somatom', 'Avanto'];

export const VOCABULARIO = [
  'Visita de servicio a un hospital.',
  `Clientes: ${CLIENTES.join(', ')}.`,
  `Lugares: ${LUGARES.join(', ')}.`,
  'Equipos: resonador, tomógrafo, ecógrafo.',
  `Marcas: ${MARCAS.join(', ')}. Modelos: ${MODELOS.join(', ')}.`,
].join(' ');
