import { Alert } from 'antd';
import type { Proxima } from '../../agenda';

const cuando = (dias: number) => (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`);

function renglon(a: Proxima) {
  const partes = [cuando(a.diasRestantes), a.hora, a.expedienteId.caratula, ...(a.esVencimientoFatal ? ['Vencimiento fatal'] : [])];
  return partes.join(' · ');
}

/** What is due in the next days. Red when something is urgent or cannot be extended: urgency is decided by the API (ADR 0003). */
export function AvisoProximas({ proximas }: { proximas: Proxima[] }) {
  if (proximas.length === 0) {
    return null;
  }
  const grave = proximas.some((a) => a.urgente || a.esVencimientoFatal);

  return (
    <Alert
      type={grave ? 'error' : 'warning'}
      showIcon
      title="Próximos vencimientos"
      description={
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {proximas.map((a) => (
            <li key={a._id}>{renglon(a)}</li>
          ))}
        </ul>
      }
    />
  );
}
