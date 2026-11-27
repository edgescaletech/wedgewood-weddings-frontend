import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));

const pageEntries = {
  '/about': '/about/index.html',
  '/invite': '/invite/index.html',
  '/staffing': '/staffing/index.html',
  '/staffing.html': '/staffing/index.html',
  '/goals': '/goals/index.html',
  '/goals.html': '/goals/index.html',
  '/admin': '/admin/users.html',
  '/admin/users': '/admin/users.html',
  '/admin/labor-targets': '/admin/labor-targets.html',
};

function servePageEntries(server) {
  server.middlewares.use((request, _response, next) => {
    const path = request.url?.split('?', 1)[0] ?? '';
    const route = path.replace(/\/$/, '');
    const entry = Object.hasOwn(pageEntries, route) ? pageEntries[route] : undefined;
    if (entry) {
      request.url = entry + request.url.slice(path.length);
    }
    next();
  });
}

export default defineConfig({
  plugins: [{
    name: 'page-entries',
    configureServer: servePageEntries,
    configurePreviewServer: servePageEntries,
  }],
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
        users: resolve(projectDir, 'admin/users.html'),
        events: resolve(projectDir, 'index.html'),
        login: resolve(projectDir, 'login/index.html'),
        invite: resolve(projectDir, 'invite/index.html'),
        resetPassword: resolve(projectDir, 'reset-password/index.html'),
        staffing: resolve(projectDir, 'staffing/index.html'),
        goals: resolve(projectDir, 'goals/index.html'),
        profile: resolve(projectDir, 'about/index.html'),
        laborTargets: resolve(projectDir, 'admin/labor-targets.html'),
      },
    },
  },
});
