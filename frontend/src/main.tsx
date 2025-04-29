import './main.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import mitt from 'mitt';
import App from './app';
import { ErrorBoundary } from './components/error-boundary';
import { Terminal } from './terminal';

window.backend = mitt();
window.terminals = window.config.services.map((service) => new Terminal(service));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
