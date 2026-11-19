import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const ISSUER = 'AVEXIS';

function totpDe(secret: string, email: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1', // The only algorithm every authenticator app supports.
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export const nuevoSecreto = () => new OTPAuth.Secret({ size: 20 }).base32;

/** Accepts the previous and next 30 s step too, to tolerate a phone clock slightly off. */
export function codigoValido(secret: string | undefined, email: string, codigo: unknown) {
  if (!secret || typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
    return false;
  }
  return totpDe(secret, email).validate({ token: codigo, window: 1 }) !== null;
}

/** What the app needs to enroll: the otpauth URL, its QR as a data URL, and the secret to type by hand. */
export async function datosDeAlta(secret: string, email: string) {
  const otpauthUrl = totpDe(secret, email).toString();
  return { otpauthUrl, qr: await QRCode.toDataURL(otpauthUrl), secret };
}
