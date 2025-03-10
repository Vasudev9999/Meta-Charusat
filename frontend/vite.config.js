import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), // Add this plugin
  ],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../backend/cert/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../backend/cert/server.cert'))
    },
    host: true
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis', // Fix for global object
      },
    },
  },
  resolve: {
    alias: {
      // Remove the manual aliases for util and stream
    },
  },
});