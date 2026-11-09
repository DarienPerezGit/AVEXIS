import { StyleProvider } from '@ant-design/cssinjs';
import { render } from '@testing-library/react';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { SesionProvider } from '../sesion';

/**
 * Where Ant Design writes its styles under test: an element outside the document. jsdom reads every rule in the
 * document to compute an element's style, and role queries ask for it on each node they name, so with Ant Design's
 * rules in the document a single `getByRole` took seconds (#26). No test depends on how a component looks.
 */
const estilosFueraDelDocumento = document.createElement('div');

/** The whole app at `ruta`, as `main.tsx` mounts it but with a router that needs no browser URL. */
export function renderApp(ruta = '/') {
  return render(
    <StyleProvider container={estilosFueraDelDocumento}>
      <ConfigProvider locale={esES}>
        <MemoryRouter initialEntries={[ruta]}>
          <AntApp>
            <SesionProvider>
              <App />
            </SesionProvider>
          </AntApp>
        </MemoryRouter>
      </ConfigProvider>
    </StyleProvider>,
  );
}
