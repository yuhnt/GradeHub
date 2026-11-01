/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // The browser calls /api on the dev server, which forwards to the
      // backend. Same origin, so no CORS setup is needed in development.
      proxy: {
        '/api': env.DEV_API_PROXY_TARGET || 'http://localhost:3000',
      },
    },
    preview: { port: 4173 },
    build: {
      sourcemap: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
