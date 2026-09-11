// Evaluación de consultas en lenguaje natural (issue P1-08). Uso: npm run eval:consultas -w @quorum/server
import type { FiltrosConsulta } from '@quorum/shared';
import { CLIENTES_CONOCIDOS } from '../src/captura/clientes.ts';
import { interpretarConsulta } from '../src/consultas/consulta.ts';
import { cerrarModelos } from '../src/qvac/modelos.ts';

const conocidos = {
  clientes: CLIENTES_CONOCIDOS,
  ciudades: ['Ciudad de Panamá', 'Colón', 'Bogotá', 'San José', 'São Paulo', 'Porto Alegre', 'Curitiba', 'Recife'],
};

const base: FiltrosConsulta = { pais: null, ciudad: null, cliente: null, modalidad: null, marca: null, antiguedadMin: null, antiguedadMax: null, confianzaMin: null, soloRenovacion: false, soloSinVerificar: false };

const CASOS: [string, Partial<FiltrosConsulta>][] = [
  ['Clientes en Brasil con resonadores de más de siete años', { pais: 'Brasil', modalidad: 'Resonancia magnética', antiguedadMin: 8 }],
  ['Tomógrafos de más de 10 años', { modalidad: 'Tomografía', antiguedadMin: 11 }],
  ['Equipos en Panamá sin verificar en 6 meses', { pais: 'Panamá', soloSinVerificar: true }],
  ['Oportunidades de renovación en Colombia', { pais: 'Colombia', soloRenovacion: true }],
  ['Ecógrafos Philips', { modalidad: 'Ecografía', marca: 'Philips' }],
  ['¿Qué tiene el Hospital Aurora Paulista?', { cliente: 'Hospital Aurora Paulista' }],
  ['Resonadores Siemens en Porto Alegre', { modalidad: 'Resonancia magnética', marca: 'Siemens', ciudad: 'Porto Alegre' }],
  ['Equipos de menos de cinco años con confianza alta', { antiguedadMax: 4, confianzaMin: 70 }],
];

const norm = (v: unknown) => (typeof v === 'string' ? v.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') : v);

let ok = 0;
let total = 0;
for (const [pregunta, parcial] of CASOS) {
  const esperado = { ...base, ...parcial };
  const { filtros, duracionMs } = await interpretarConsulta(pregunta, conocidos);
  const fallos = (Object.keys(esperado) as (keyof FiltrosConsulta)[]).filter((k) => {
    total++;
    const bien = norm(filtros[k]) === norm(esperado[k]);
    if (bien) ok++;
    return !bien;
  });
  console.log(`${fallos.length ? '✖' : '✓'} ${pregunta} (${duracionMs} ms)${fallos.length ? `: ${fallos.map((k) => `${k}=${JSON.stringify(filtros[k])}`).join(' · ')}` : ''}`);
}
console.log(`\nFiltros correctos: ${ok}/${total} (${((ok / total) * 100).toFixed(0)}%)`);
await cerrarModelos();
process.exit(0);
