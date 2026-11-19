import { App as AntApp } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { SesionProvider } from './sesion';
import { Tema } from './tema';
import './tema.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tema>
      <AntApp>
        <BrowserRouter>
          <SesionProvider>
            <App />
          </SesionProvider>
        </BrowserRouter>
      </AntApp>
    </Tema>
  </StrictMode>,
);
