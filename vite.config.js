import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        events: resolve(projectDir, 'index.html'),
        login: resolve(projectDir, 'login/index.html'),
        signup: resolve(projectDir, 'signup/index.html'),
        resetPassword: resolve(projectDir, 'reset-password/index.html'),
        staffing: resolve(projectDir, 'staffing.html'),
        staffingRoute: resolve(projectDir, 'staffing/index.html'),
        goals: resolve(projectDir, 'goals.html'),
        goalsRoute: resolve(projectDir, 'goals/index.html'),
        adminGoals: resolve(projectDir, 'admin-goals.html'),
        adminGoalsRoute: resolve(projectDir, 'admin-goals/index.html'),
      },
    },
  },
});
