import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress cross-origin "Script error." events (from parent Flutter frame or
// external image/resource load failures). These are harmless but trigger
// the webpack dev-server error overlay.
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || event.message === '') {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }
}, true);
window.onerror = (message, source, lineno, colno, error) => {
  if (message === 'Script error.' || !message) return true;
  return false;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
