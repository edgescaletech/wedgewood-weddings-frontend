import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Events, { styles as eventStyles } from './pages/index.jsx';
import Staffing, { styles as staffingStyles } from './pages/staffing.jsx';
import Goals, { styles as goalsStyles } from './pages/goals.jsx';
import Login from './pages/login.jsx';
import '../style.css';

const pages = {
  events: [Events, eventStyles],
  staffing: [Staffing, staffingStyles],
  goals: [Goals, goalsStyles],
  login: [Login, ""],
};

function getPage() {
  const path = window.location.pathname;
  if (['/login', '/login/', '/login/index.html', '/reset-password', '/reset-password/', '/reset-password/index.html'].includes(path)) return 'login';
  for (const page of ['staffing', 'goals']) {
    if ([`/${page}`, `/${page}/`, `/${page}.html`].includes(path)) {
      if (path !== `/${page}/`) {
        history.replaceState(history.state, '', `/${page}/${location.search}${location.hash}`);
      }
      return page;
    }
  }
  if (path === '/index.html') history.replaceState(history.state, '', `/${location.search}${location.hash}`);
  return 'events';
}

const page = getPage();

const apiBase = window.API_BASE_URL || (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : ''
);

// Check the server session before rendering or starting application controllers.
function ProtectedPage() {
  const [status, setStatus] = useState('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          window.location.replace('/login/');
          return;
        }
        setStatus(response.ok ? 'authenticated' : 'unavailable');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('unavailable');
      }
    }

    checkSession();
    return () => controller.abort();
  }, [attempt]);

  if (status === 'authenticated') return <Page />;
  if (status === 'unavailable') {
    return <main role="alert">Unable to check your session. <button onClick={() => { setStatus('checking'); setAttempt(attempt + 1); }}>Try again</button></main>;
  }
  return <main role="status">Checking your session…</main>;
}

function Page() {
  const [Content, css] = pages[page];

  useEffect(() => {
    const styleNodes = (css ? [css] : []).map(css => {
      const node = document.createElement('style');
      node.dataset.reactPageStyle = page;
      node.textContent = css;
      document.head.appendChild(node);
      return node;
    });

    let cancelled = false;
    if (page === 'login') return () => styleNodes.forEach(node => node.remove());

    const startController = async () => {
      try {
        if (page === 'events') {
          await import('../app.js');
        } else if (page === 'staffing') {
          const controller = await import('./legacy/staffing.js');
          if (!cancelled) controller.mount();
        } else if (page === 'goals') {
          const controller = await import('./legacy/goals.js');
          if (!cancelled) controller.mount();
        }
      } catch (error) {
        console.error(`Unable to start ${page} page controller`, error);
      }
    };
    startController();
    return () => {
      cancelled = true;
      styleNodes.forEach(node => node.remove());
    };
  }, [page, css]);

  return <div className={`react-page react-page-${page}`} ><Content /></div>;
}

createRoot(document.getElementById('root')).render(page === 'login' ? <Page /> : <ProtectedPage />);
