import { Link } from 'react-router';
import type { Audiencia } from '../../agenda';
import { puedeVerExpediente } from '../../permisos';
import { useSesion } from '../../sesion';

/** The carátula of a hearing's case, as a link only when this user can open the case. */
export function Caratula({ expediente }: { expediente: Audiencia['expedienteId'] }) {
  const { usuario } = useSesion();

  if (usuario && puedeVerExpediente(usuario, expediente)) {
    return <Link to={`/expedientes/${expediente._id}`}>{expediente.caratula}</Link>;
  }
  return <>{expediente.caratula}</>;
}
