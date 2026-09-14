import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/index.css';
import { App } from './App';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
