import { assertPasswordPolicy, hashPassword } from '../auth/password.js';
import { Usuario } from '../models/index.js';

export interface TitularInicial {
  nombre: string;
  email: string;
  password: string;
}

/**
 * Installs the firm's first owner, so a fresh production database can be used at all (there is no public sign-up).
 * Unlike the demo seed it deletes nothing and is safe in production. The password is temporary: the owner
 * must replace it on first login. Once the firm has an active owner it does nothing; owners manage users from then on.
 */
export async function crearTitularInicial({ nombre, email, password }: TitularInicial) {
  if (await Usuario.exists({ esTitular: true, activo: true })) {
    return { creado: false };
  }
  assertPasswordPolicy(password);
  if (await Usuario.exists({ email: email.trim().toLowerCase() })) {
    throw new Error(`A user already has the email ${email}; reactivate them as titular or use another email`);
  }

  await Usuario.create({
    nombre,
    email,
    rol: 'ABOGADO',
    esTitular: true,
    passwordHash: await hashPassword(password),
    debeCambiarPassword: true,
  });
  return { creado: true };
}
