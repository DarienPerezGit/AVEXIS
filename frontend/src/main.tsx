import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { SesionProvider } from './sesion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={esES}>
      <AntApp>
        <BrowserRouter>
          <SesionProvider>
            <App />
          </SesionProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
