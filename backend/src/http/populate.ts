/**
 * Expands a reference to `{ _id, nombre }` on a GET response, so the client shows names instead of ids.
 * `lean` skips the model's toJSON, which would add the `id` virtual of a user.
 */
export const conNombre = (path: string) => ({ path, select: 'nombre', options: { lean: true } });
