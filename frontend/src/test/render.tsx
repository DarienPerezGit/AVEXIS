import { render } from '@testing-library/react';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { SesionProvider } from '../sesion';

/** The whole app at `ruta`, as `main.tsx` mounts it but with a router that needs no browser URL. */
export function renderApp(ruta = '/') {
  return render(
    <ConfigProvider locale={esES}>
      <MemoryRouter initialEntries={[ruta]}>
        <AntApp>
          <SesionProvider>
            <App />
          </SesionProvider>
        </AntApp>
      </MemoryRouter>
    </ConfigProvider>,
  );
}
