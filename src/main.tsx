import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AI OCR compatibility: the OCR client may inspect an error response as JSON
// and then fall back to text. Cache the /api/ocr body once so either reader is safe.
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
  const safeResponse = Object.create(response) as Response;
  safeResponse.json = async () => JSON.parse(bodyText);
  safeResponse.text = async () => bodyText;
  return safeResponse;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
