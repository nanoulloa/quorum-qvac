import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import mundo from 'world-atlas/countries-110m.json';
import './MapaPaises.css';

/** Países de Latinoamérica como se llaman en world-atlas, con su nombre en español. */
const LATAM: Record<string, string> = {
  Mexico: 'México',
  Guatemala: 'Guatemala',
  Belize: 'Belice',
  Honduras: 'Honduras',
  'El Salvador': 'El Salvador',
  Nicaragua: 'Nicaragua',
  'Costa Rica': 'Costa Rica',
  Panama: 'Panamá',
  Cuba: 'Cuba',
  Haiti: 'Haití',
  'Dominican Rep.': 'República Dominicana',
  'Puerto Rico': 'Puerto Rico',
  Jamaica: 'Jamaica',
  Bahamas: 'Bahamas',
  'Trinidad and Tobago': 'Trinidad y Tobago',
  Colombia: 'Colombia',
  Venezuela: 'Venezuela',
  Guyana: 'Guyana',
  Suriname: 'Surinam',
  Ecuador: 'Ecuador',
  Peru: 'Perú',
  Bolivia: 'Bolivia',
  Brazil: 'Brasil',
  Paraguay: 'Paraguay',
  Chile: 'Chile',
  Argentina: 'Argentina',
  Uruguay: 'Uruguay',
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
/** Nombre en español, como se guarda en la base → nombre en el atlas. */
const ATLAS = new Map(Object.entries(LATAM).map(([atlas, espanol]) => [norm(espanol), atlas]));

const ANCHO = 300;
const ALTO = 380;

// Las formas se calculan una vez: el mapa es un archivo local, sin tiles ni conexión.
const topologia = mundo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const paises = (feature(topologia, topologia.objects.countries) as FeatureCollection<Geometry, { name: string }>).features.filter((f) => f.properties.name in LATAM);
const trazo = geoPath(geoMercator().fitExtent([[6, 6], [ANCHO - 6, ALTO - 6]], { type: 'FeatureCollection', features: paises }));
const FORMAS = paises.map((f) => ({ atlas: f.properties.name, d: trazo(f) ?? '' }));

type Props = {
  /** Equipos por país, con el nombre del país como está en la base. */
  conteos: Record<string, number>;
  seleccionado: string;
  alElegir: (pais: string) => void;
};

/** Mapa de Latinoamérica con la cantidad de equipos por país. Más oscuro, más equipos. */
export function MapaPaises({ conteos, seleccionado, alElegir }: Props) {
  const [encima, setEncima] = useState<string | null>(null);
  const datos = new Map<string, { pais: string; total: number }>();
  for (const [pais, total] of Object.entries(conteos)) {
    const atlas = ATLAS.get(norm(pais));
    if (atlas) datos.set(atlas, { pais, total });
  }
  const maximo = Math.max(1, ...[...datos.values()].map((d) => d.total));
  const foco = encima ?? (seleccionado === 'Todos' ? null : seleccionado);
  const totalFoco = foco ? (conteos[foco] ?? 0) : 0;
  // El país elegido se dibuja al final para que su borde no quede tapado por los vecinos.
  const formas = [...FORMAS].sort((a, b) => Number(datos.get(a.atlas)?.pais === seleccionado) - Number(datos.get(b.atlas)?.pais === seleccionado));

  return (
    <figure className="mapa">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-label="Mapa de equipos por país">
        {formas.map(({ atlas, d }) => {
          const dato = datos.get(atlas);
          if (!dato) {
            return (
              <path key={atlas} d={d} className="mapa-pais">
                <title>{`${LATAM[atlas]} · sin equipos`}</title>
              </path>
            );
          }
          const texto = `${dato.pais}: ${dato.total} ${dato.total === 1 ? 'equipo' : 'equipos'}`;
          const elegido = dato.pais === seleccionado;
          return (
            <path
              key={atlas}
              d={d}
              role="button"
              tabIndex={0}
              aria-label={texto}
              aria-pressed={elegido}
              className={`mapa-pais con-datos${elegido ? ' elegido' : ''}`}
              style={{ fillOpacity: 0.3 + 0.7 * (dato.total / maximo) }}
              onClick={() => alElegir(dato.pais)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                alElegir(dato.pais);
              }}
              onMouseEnter={() => setEncima(dato.pais)}
              onMouseLeave={() => setEncima(null)}
              onFocus={() => setEncima(dato.pais)}
              onBlur={() => setEncima(null)}
            >
              <title>{texto}</title>
            </path>
          );
        })}
      </svg>
      <figcaption className="mapa-pie">
        {foco ? (
          <>
            <strong>{foco}</strong> · {totalFoco} {totalFoco === 1 ? 'equipo' : 'equipos'}
          </>
        ) : (
          'Más oscuro, más equipos'
        )}
      </figcaption>
    </figure>
  );
}
