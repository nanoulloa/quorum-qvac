import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Una segunda instancia en la misma máquina usa su propia caché para no recargar la primera.
  cacheDir: process.env.QUORUM_VITE_CACHE ?? 'node_modules/.vite',
  // Los puertos se pueden cambiar para levantar dos instancias en la misma máquina y probar la sincronización.
  server: {
    port: Number(process.env.QUORUM_WEB_PORT ?? 5173),
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.QUORUM_API_PORT ?? 4000}` },
  },
});
