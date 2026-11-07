import type { Usuario } from '../permisos';

const base = { activo: true, debeCambiarPassword: false, esTitular: false };

export const TITULAR: Usuario = { ...base, _id: '1', nombre: 'Zoe Titular', email: 'titular@avexis.demo', rol: 'ABOGADO', esTitular: true };
export const ABOGADO: Usuario = { ...base, _id: '2', nombre: 'Ana Diaz', email: 'abogado@avexis.demo', rol: 'ABOGADO' };
export const ASISTENTE: Usuario = { ...base, _id: '3', nombre: 'Carla Ruiz', email: 'asistente@avexis.demo', rol: 'ASISTENTE' };
