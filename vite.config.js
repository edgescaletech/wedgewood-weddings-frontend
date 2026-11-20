import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));

function serveInvitePage(server) {
  server.middlewares.use((request, _response, next) => {
    const path = request.url?.split('?', 1)[0];
    if (path === '/invite' || path === '/invite/') {
      // Serve the dedicated entry before Vite's fallback to the protected app.
      request.url = '/invite/index.html' + request.url.slice(path.length);
    }
    next();
  });
}

export default defineConfig({
  plugins: [{
    name: 'invite-page',
    configureServer: serveInvitePage,
    configurePreviewServer: serveInvitePage,
  }],
  build: {
    rollupOptions: {
      input: {
        users: resolve(projectDir, 'admin/users.html'),
        events: resolve(projectDir, 'index.html'),
        login: resolve(projectDir, 'login/index.html'),
        invite: resolve(projectDir, 'invite/index.html'),
        resetPassword: resolve(projectDir, 'reset-password/index.html'),
        staffing: resolve(projectDir, 'staffing.html'),
        staffingRoute: resolve(projectDir, 'staffing/index.html'),
        goals: resolve(projectDir, 'goals.html'),
        goalsRoute: resolve(projectDir, 'goals/index.html'),
      },
    },
  },
});
