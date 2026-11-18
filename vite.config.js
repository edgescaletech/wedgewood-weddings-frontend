import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        events: resolve(projectDir, 'index.html'),
        login: resolve(projectDir, 'login/index.html'),
        resetPassword: resolve(projectDir, 'reset-password/index.html'),
        staffing: resolve(projectDir, 'staffing.html'),
        staffingRoute: resolve(projectDir, 'staffing/index.html'),
        goals: resolve(projectDir, 'goals.html'),
        goalsRoute: resolve(projectDir, 'goals/index.html'),
      },
    },
  },
});
