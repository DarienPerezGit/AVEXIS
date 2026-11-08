import { api } from './api';

/** An option of a Select, Radio or legend. */
export interface Opcion {
  value: string;
  label: string;
}

/** A label map as options. */
export const opciones = <T extends string>(valores: Record<T, { etiqueta: string }>): Opcion[] =>
  (Object.keys(valores) as T[]).map((value) => ({ value, label: valores[value].etiqueta }));

/** The active lawyers, to pick who carries a case or attends a hearing. */
export const cargarAbogados = () =>
  api<{ abogados: { _id: string; nombre: string }[] }>('/usuarios/abogados').then((res) =>
    res.abogados.map((a): Opcion => ({ value: a._id, label: a.nombre })),
  );
