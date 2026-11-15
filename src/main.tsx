import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './lib/themeContext.tsx';
import './index.css';

function isBenignViteWebSocketError(reasonOrMessage: unknown, source?: string): boolean {
  const text = (
    reasonOrMessage instanceof Error
      ? `${reasonOrMessage.message} ${reasonOrMessage.stack || ''}`
      : typeof reasonOrMessage === 'string'
        ? reasonOrMessage
        : String(reasonOrMessage ?? '')
  ).toLowerCase();
  const src = (source || '').toLowerCase();
  const isViteOrigin = src.includes('@vite/client') || text.includes('@vite/client');
  const isWsDisconnect =
    text.includes('websocket closed without opened') ||
    text.includes('failed to connect to websocket');
  return isWsDisconnect || (isViteOrigin && text.includes('websocket'));
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isBenignViteWebSocketError(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener(
    'error',
    (event) => {
      if (isBenignViteWebSocketError(event.error ?? event.message, event.filename)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
