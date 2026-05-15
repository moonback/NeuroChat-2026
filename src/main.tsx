import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runOneShotStorageMigration } from './lib/storage/bootstrapMigration';

runOneShotStorageMigration().catch((error) => {
  console.warn('Storage migration skipped/failed:', error);
}).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}
