// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),   // 👈 alias “@” -> src
    },
  },
  server: {
    // https: {
    //   key:  fs.readFileSync(path.resolve(__dirname, 'localhost+1-key.pem')),
    //   cert: fs.readFileSync(path.resolve(__dirname, 'localhost+1.pem')),
    // },
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  css: {
    postcss: {
      // ⚡️ Esto evita que Vite busque postcss.config.js (y por ende el error ESM)
      plugins: [
        tailwindcss(),     // opcional: tailwindcss({ config: './tailwind.config.js' })
        autoprefixer(),
      ],
    },
  },
});
