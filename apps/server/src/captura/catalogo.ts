/** Líneas de producto conocidas por marca. Lo usan la extracción del dictado y la lectura de placas. */
export const CATALOGO: Record<string, string[]> = {
  Philips: ['Ingenia', 'Achieva', 'Incisive', 'Brilliance', 'EPIQ', 'Affiniti', 'Azurion'],
  Siemens: ['Magnetom', 'Avanto', 'Skyra', 'Somatom', 'Acuson'],
  GE: ['Signa', 'Revolution', 'Optima', 'Discovery', 'Logiq', 'Voluson'],
  Canon: ['Vantage', 'Aquilion', 'Aplio'],
};

export const MARCA_DE_MODELO = new Map(
  Object.entries(CATALOGO).flatMap(([marca, modelos]) => modelos.map((m) => [m.toLowerCase(), marca] as const)),
);

/** "PHILIPS" → "Philips"; "GE Healthcare" → "GE". Devuelve null si no es una marca conocida. */
export function marcaConocida(texto: string | null): string | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  return Object.keys(CATALOGO).find((m) => t === m.toLowerCase() || t.startsWith(`${m.toLowerCase()} `)) ?? null;
}
