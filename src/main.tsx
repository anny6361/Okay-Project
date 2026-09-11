import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AI OCR compatibility: cache /api/ocr response bodies once, then return
// a real Response object so native Response getters/methods keep a valid receiver.
const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const input = args[0];
  const url = typeof input === 'string'
    ? input
    : input instanceof Request
      ? input.url
      : String(input);

  const response = await originalFetch(...args);
  if (!url.includes('/api/ocr')) {
    return response;
  }

  const bodyText = await response.text();
  return new Response(bodyText, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
