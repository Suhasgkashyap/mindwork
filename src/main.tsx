import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PaletteProvider } from './context/PaletteContext';

createRoot(document.getElementById('root')!).render(
  <PaletteProvider>
    <App />
  </PaletteProvider>
);

