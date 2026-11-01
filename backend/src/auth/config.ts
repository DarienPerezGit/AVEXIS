export interface AuthConfig {
  jwtSecret: string;
  /** Token lifetime in `jsonwebtoken` notation, e.g. `8h`. */
  jwtExpiresIn: string;
  /** Sends the session cookie only over HTTPS. Disable only for local HTTP and tests. */
  secureCookie: boolean;
  /** Failed login attempts allowed per IP within the window. */
  loginRateLimit: { limit: number; windowMs: number };
}
