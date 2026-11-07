import { Tag } from 'antd';
import { ESTADOS, TIPOS } from '../../agenda';
import type { EstadoAudiencia, TipoAudiencia } from '../../agenda';

export const EtiquetaTipo = ({ tipo }: { tipo: TipoAudiencia }) => <Tag color={TIPOS[tipo].color}>{TIPOS[tipo].etiqueta}</Tag>;

export const EtiquetaEstado = ({ estado }: { estado: EstadoAudiencia }) => <Tag color={ESTADOS[estado].color}>{ESTADOS[estado].etiqueta}</Tag>;
