import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devHost = env.VITE_DEV_HOST || 'localhost';

  return {
    plugins: [
      laravel({
        input: ['resources/css/app.css', 'resources/js/app.tsx'],
        refresh: true,
        fonts: [
          bunny('Instrument Sans', {
            weights: [400, 500, 600],
          }),
        ],
      }),

      inertia(),

      react({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),

      tailwindcss(),

      ...(process.env.VERCEL
        ? []
        : [
            wayfinder({
              formVariants: true,
            }),
          ]),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      cors: true,
      origin: `http://${devHost}:5173`,
      hmr: { host: devHost },
      watch: {
        usePolling: true,
        interval: 2000,
        ignored: [
          '**/node_modules/**',
          '**/vendor/**',
          '**/storage/**',
          '**/bootstrap/ssr/**',
          '**/public/build/**',
        ],
      },
    },
  };
});
