import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource-variable/playwrite-us-modern';
import './index.css';
import { initialize } from './lib/db';
import { requestPersistentStorage } from './lib/storage';

requestPersistentStorage(navigator.storage).catch((error) => {
  console.error('Persistent storage request failed:', error);
});

initialize().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});