import { z } from 'zod';
import { crearAudienciaSchema, editarAudienciaSchema, proximasSchema } from '../audiencias/audiencias.routes.js';
import { crearClienteSchema, editarClienteSchema, listarClientesSchema } from '../clientes/clientes.routes.js';
import { crearExpedienteSchema, editarExpedienteSchema, listarExpedientesSchema } from '../expedientes/expedientes.routes.js';
import { crearHonorarioSchema, crearPagoSchema } from '../honorarios/honorarios.routes.js';
import {
  AUDIENCIA_ESTADOS,
  AUDIENCIA_TIPOS,
  CLIENTE_TIPOS,
  EXPEDIENTE_ESTADOS,
  FUEROS,
  HONORARIO_ESTADOS,
  MOVIMIENTO_TIPOS,
  ROLES,
} from '../models/index.js';
import { crearMovimientoSchema } from '../movimientos/movimientos.routes.js';

type Schema = Record<string, unknown>;

/**
 * Request schemas come straight from the Zod schemas the routes validate with, so the documented bodies and
 * queries are the ones the API accepts. `io: 'input'` documents what the client sends (before coercion and transforms).
 */
function fromZod(schema: z.ZodType): Schema {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  }) as Schema;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const id = { type: 'string', description: 'MongoDB ObjectId' };
const timestamps = { createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } };

const schemas: Record<string, Schema> = {
  Health: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['ok', 'degraded'] },
      database: { type: 'string', enum: ['connected', 'connecting', 'disconnected'] },
    },
  },
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string' },
          details: {
            type: 'array',
            description: 'Only on VALIDATION_ERROR: one entry per invalid field.',
            items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
    },
  },
  Usuario: {
    type: 'object',
    properties: {
      _id: id,
      nombre: { type: 'string' },
      email: { type: 'string', format: 'email' },
      rol: { type: 'string', enum: ROLES },
      esTitular: { type: 'boolean' },
      activo: { type: 'boolean' },
      debeCambiarPassword: { type: 'boolean' },
      id: { ...id, description: 'Same value as _id' },
      ...timestamps,
    },
  },
  Cliente: {
    type: 'object',
    properties: {
      _id: id,
      tipo: { type: 'string', enum: CLIENTE_TIPOS },
      nombre: { type: 'string' },
      dni: { type: 'string', description: 'Only for FISICA' },
      cuit: { type: 'string', description: 'Only for JURIDICA' },
      email: { type: 'string', format: 'email' },
      telefono: { type: 'string' },
      direccion: { type: 'string' },
      ...timestamps,
    },
  },
  Expediente: {
    type: 'object',
    properties: {
      _id: id,
      numero: { type: 'string' },
      caratula: { type: 'string' },
      fuero: { type: 'string', enum: FUEROS },
      estado: { type: 'string', enum: EXPEDIENTE_ESTADOS },
      clienteId: id,
      abogadoResponsableId: id,
      fechaInicio: { type: 'string', format: 'date-time' },
      observaciones: { type: 'string' },
      ...timestamps,
    },
  },
  Movimiento: {
    type: 'object',
    properties: {
      _id: id,
      expedienteId: id,
      usuarioId: { ...id, description: 'Who loaded it, taken from the session' },
      tipo: { type: 'string', enum: MOVIMIENTO_TIPOS },
      descripcion: { type: 'string' },
      fecha: { type: 'string', format: 'date-time' },
      ...timestamps,
    },
  },
  Audiencia: {
    type: 'object',
    properties: {
      _id: id,
      expedienteId: id,
      abogadoId: { ...id, description: 'The ABOGADO who attends' },
      fecha: { type: 'string', format: 'date-time', description: 'Calendar day, at UTC midnight' },
      hora: { type: 'string', example: '09:30', description: 'Local time at the firm' },
      tipo: { type: 'string', enum: AUDIENCIA_TIPOS },
      estado: { type: 'string', enum: AUDIENCIA_ESTADOS },
      esVencimientoFatal: { type: 'boolean' },
      ...timestamps,
    },
  },
  AudienciaProxima: {
    allOf: [
      ref('Audiencia'),
      {
        type: 'object',
        properties: {
          diasRestantes: { type: 'integer', description: 'Calendar days left, counted in Argentina; 0 is today' },
          urgente: { type: 'boolean', description: 'Due within 2 calendar days' },
        },
      },
    ],
  },
  Honorario: {
    type: 'object',
    properties: {
      _id: id,
      expedienteId: id,
      montoPactado: { type: 'number' },
      pagos: {
        type: 'array',
        items: {
          type: 'object',
          properties: { monto: { type: 'number' }, fecha: { type: 'string', format: 'date-time' }, usuarioId: id },
        },
      },
      estado: { type: 'string', enum: HONORARIO_ESTADOS, description: 'Derived from the payments; cannot be set' },
      montoPagado: { type: 'number' },
      saldo: { type: 'number' },
      ...timestamps,
    },
  },
};

const ERRORS: Record<number, string> = {
  400: 'Invalid input: VALIDATION_ERROR (with details), INVALID_ID or INVALID_JSON',
  401: 'UNAUTHORIZED: no valid session (or INVALID_CREDENTIALS where noted)',
  403: 'FORBIDDEN (role or case not allowed), PASSWORD_CHANGE_REQUIRED, or ACCOUNT_DISABLED on login',
  404: 'NOT_FOUND',
  409: 'Conflict: DUPLICATE_KEY or a rule noted in the description',
  429: 'TOO_MANY_REQUESTS: too many failed logins from this IP',
};

/** The example shown for each error status: its most common code. An operation can name another one. */
const EXAMPLES: Record<number, { code: string; message: string; details?: { path: string; message: string }[] }> = {
  400: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: [{ path: 'email', message: 'Invalid email address' }] },
  401: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  403: { code: 'FORBIDDEN', message: 'Your role cannot perform this action' },
  404: { code: 'NOT_FOUND', message: 'Case not found' },
  409: { code: 'DUPLICATE_KEY', message: 'Duplicate value for: numero' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Too many failed login attempts. Try again later.' },
};

function errorResponse(status: number, example = EXAMPLES[status]) {
  return { description: ERRORS[status], content: { 'application/json': { schema: ref('Error'), example: { error: example } } } };
}

interface Operation {
  tag: string;
  summary: string;
  /** Who may call it; omitted for public operations. */
  roles?: string;
  description?: string;
  query?: z.ZodObject;
  body?: z.ZodType | Schema;
  /** Success status, its description and, unless empty, the response schema. */
  ok: [number, string, Schema?];
  /** Non-error responses besides `ok`, in the same shape. */
  alsoResponds?: [number, string, Schema?][];
  errors?: number[];
  /** The route opts out of the PASSWORD_CHANGE_REQUIRED block and checks no role, so it never answers 403. */
  allowsPendingPasswordChange?: boolean;
  /** Example error bodies that differ from the usual one for their status. */
  errorExamples?: Partial<typeof EXAMPLES>;
}

const json = (schema: Schema) => ({ 'application/json': { schema } });
const wrap = (key: string, schema: Schema) => ({ type: 'object', properties: { [key]: schema } });
const list = (key: string, item: string) => wrap(key, { type: 'array', items: ref(item) });

function operation(path: string, method: string, op: Operation) {
  const isPublic = !op.roles;
  const pathParams = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true, schema: id }));
  const queryParams = op.query
    ? Object.entries((fromZod(op.query).properties ?? {}) as Record<string, Schema>).map(([name, schema]) => ({ name, in: 'query', schema }))
    : [];
  // Every protected route answers 401 without a session and 403 while a password change is pending.
  const automatic = isPublic ? [] : op.allowsPendingPasswordChange ? [401] : [401, 403];
  const errors = new Set([...(op.errors ?? []), ...automatic]);
  const response = ([status, description, schema]: [number, string, Schema?]) => [
    status,
    { description, ...(schema && { content: json(schema) }) },
  ];

  return {
    tags: [op.tag],
    summary: op.summary,
    description: [op.roles && `**Roles:** ${op.roles}`, op.description].filter(Boolean).join('\n\n'),
    ...(isPublic ? { security: [] } : {}),
    parameters: [...pathParams, ...queryParams],
    ...(op.body && {
      // A PATCH may send only the fields it changes, even none.
      requestBody: { required: method !== 'patch', content: json(op.body instanceof z.ZodType ? fromZod(op.body) : op.body) },
    }),
    responses: {
      ...Object.fromEntries([op.ok, ...(op.alsoResponds ?? [])].map(response)),
      ...Object.fromEntries([...errors].sort().map((code) => [code, errorResponse(code, op.errorExamples?.[code])])),
    },
  };
}

const ALL = 'any role';
const OWN_CASE = 'titular; ABOGADO on own cases; ASISTENTE on any case';

/** OpenAPI path (with `{param}`) → HTTP method → operation. */
const PATHS: Record<string, Record<string, Operation>> = {
  '/api/health': {
    get: {
      tag: 'System',
      summary: 'Health check',
      ok: [200, 'API and database are up', ref('Health')],
      alsoResponds: [[503, 'The database is not connected (status degraded)', ref('Health')]],
    },
  },
  '/api/auth/login': {
    post: {
      tag: 'Auth',
      summary: 'Log in',
      description: 'Sets the `token` session cookie (httpOnly). In Swagger UI, run this first: the browser keeps the cookie and sends it with the next calls.',
      body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'titular@avexis.demo' }, password: { type: 'string', example: 'demo avexis 2026' } } },
      ok: [200, 'Logged in', wrap('usuario', ref('Usuario'))],
      errors: [401, 403, 429],
      errorExamples: {
        401: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        403: { code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact the firm owner.' },
      },
    },
  },
  '/api/auth/logout': {
    post: { tag: 'Auth', summary: 'Log out (clears the session cookie)', ok: [204, 'Logged out'] },
  },
  '/api/auth/me': {
    get: { tag: 'Auth', summary: 'Current user', roles: `${ALL}, also while a password change is pending`, allowsPendingPasswordChange: true, ok: [200, 'The logged-in user', wrap('usuario', ref('Usuario'))] },
  },
  '/api/auth/me/password': {
    patch: {
      tag: 'Auth',
      summary: 'Change own password',
      roles: `${ALL}, also while a password change is pending`,
      allowsPendingPasswordChange: true,
      description: 'Requires the current password (401 INVALID_CREDENTIALS otherwise). New password: 15 to 64 characters. Ends every other session.',
      body: { type: 'object', required: ['actual', 'nueva'], properties: { actual: { type: 'string' }, nueva: { type: 'string', minLength: 15, maxLength: 64 } } },
      ok: [204, 'Password changed; this device gets a fresh session cookie'],
      errors: [400],
    },
  },
  '/api/usuarios': {
    get: { tag: 'Usuarios', summary: 'List users', roles: 'titular', ok: [200, 'All users', list('usuarios', 'Usuario')] },
    post: {
      tag: 'Usuarios',
      summary: 'Create a user',
      roles: 'titular',
      description: 'The user must change the initial password on first login.',
      body: {
        type: 'object',
        required: ['nombre', 'email', 'rol', 'password'],
        properties: { nombre: { type: 'string' }, email: { type: 'string', format: 'email' }, rol: { type: 'string', enum: ROLES }, esTitular: { type: 'boolean' }, password: { type: 'string', minLength: 15, maxLength: 64 } },
      },
      ok: [201, 'Created', wrap('usuario', ref('Usuario'))],
      errors: [400, 409],
    },
  },
  '/api/usuarios/{id}': {
    patch: {
      tag: 'Usuarios',
      summary: 'Change role, owner status or active status',
      roles: 'titular',
      description: '409 CANNOT_CHANGE_OWN_ACCESS when a titular edits their own access.',
      body: { type: 'object', properties: { rol: { type: 'string', enum: ROLES }, esTitular: { type: 'boolean' }, activo: { type: 'boolean' } } },
      ok: [200, 'Updated', wrap('usuario', ref('Usuario'))],
      errors: [400, 404, 409],
    },
  },
  '/api/usuarios/{id}/reset-password': {
    post: {
      tag: 'Usuarios',
      summary: 'Reset a user password',
      roles: 'titular',
      description: 'The user must change it on next login; their open sessions end.',
      body: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 15, maxLength: 64 } } },
      ok: [204, 'Password reset'],
      errors: [400, 404],
    },
  },
  '/api/clientes': {
    get: { tag: 'Clientes', summary: 'List clients', roles: ALL, description: '`q` searches name, DNI or CUIT.', query: listarClientesSchema, ok: [200, 'Clients', list('clientes', 'Cliente')], errors: [400] },
    post: { tag: 'Clientes', summary: 'Register a client', roles: ALL, body: crearClienteSchema, ok: [201, 'Created', wrap('cliente', ref('Cliente'))], errors: [400, 409] },
  },
  '/api/clientes/{id}': {
    get: { tag: 'Clientes', summary: 'Get a client', roles: ALL, ok: [200, 'The client', wrap('cliente', ref('Cliente'))], errors: [400, 404] },
    patch: { tag: 'Clientes', summary: 'Correct name or contact details', roles: ALL, body: editarClienteSchema, ok: [200, 'Updated', wrap('cliente', ref('Cliente'))], errors: [400, 404] },
    delete: {
      tag: 'Clientes',
      summary: 'Delete a client loaded by mistake',
      roles: 'titular',
      description: 'The only hard delete. 409 CLIENTE_HAS_EXPEDIENTES once the client has cases.',
      ok: [204, 'Deleted'],
      errors: [400, 404, 409],
    },
  },
  '/api/expedientes': {
    get: {
      tag: 'Expedientes',
      summary: 'List cases (paginated and filtered)',
      roles: 'titular and ASISTENTE: every case; ABOGADO: own cases',
      description: 'Newest first. `q` is a text search on the caratula. Filters combine with the role visibility. `limit` above 100 answers 400.',
      query: listarExpedientesSchema,
      ok: [200, 'One page of cases', { type: 'object', properties: { data: { type: 'array', items: ref('Expediente') }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } }],
      errors: [400],
    },
    post: {
      tag: 'Expedientes',
      summary: 'Open a case',
      roles: 'ABOGADO (always in their own name) and titular (for any active lawyer)',
      description: 'An ABOGADO\'s `abogadoResponsableId` is ignored. An unknown client or a non-lawyer in charge answers 400.',
      body: crearExpedienteSchema,
      ok: [201, 'Created', wrap('expediente', ref('Expediente'))],
      errors: [400, 409],
    },
  },
  '/api/expedientes/{id}': {
    get: { tag: 'Expedientes', summary: 'Get a case', roles: 'titular, ASISTENTE, or the responsible ABOGADO', ok: [200, 'The case', wrap('expediente', ref('Expediente'))], errors: [400, 404] },
    patch: {
      tag: 'Expedientes',
      summary: 'Update or archive a case',
      roles: 'the responsible ABOGADO and titular; only the titular reassigns',
      description: 'No DELETE: archive with `estado: ARCHIVADO`.',
      body: editarExpedienteSchema,
      ok: [200, 'Updated', wrap('expediente', ref('Expediente'))],
      errors: [400, 404],
    },
  },
  '/api/expedientes/{expedienteId}/movimientos': {
    get: { tag: 'Movimientos', summary: 'List a case\'s entries, newest first', roles: OWN_CASE, ok: [200, 'Entries', list('movimientos', 'Movimiento')], errors: [400, 404] },
    post: {
      tag: 'Movimientos',
      summary: 'Record an entry',
      roles: OWN_CASE,
      description: 'Entries are immutable. Who loaded it comes from the session.',
      body: crearMovimientoSchema,
      ok: [201, 'Created', wrap('movimiento', ref('Movimiento'))],
      errors: [400, 404],
    },
  },
  '/api/expedientes/{expedienteId}/honorario': {
    get: { tag: 'Honorarios', summary: 'Get the case\'s fee with paid amount and balance', roles: 'the responsible ABOGADO and titular', ok: [200, 'The fee', wrap('honorario', ref('Honorario'))], errors: [400, 404] },
    post: {
      tag: 'Honorarios',
      summary: 'Agree the case\'s fee',
      roles: 'the responsible ABOGADO and titular',
      description: 'One fee per case (409). `estado` is derived and cannot be set.',
      body: crearHonorarioSchema,
      ok: [201, 'Created', wrap('honorario', ref('Honorario'))],
      errors: [400, 404, 409],
    },
  },
  '/api/expedientes/{expedienteId}/honorario/pagos': {
    post: {
      tag: 'Honorarios',
      summary: 'Record a payment',
      roles: 'the responsible ABOGADO and titular',
      description: 'Payments are immutable; who recorded it comes from the session.',
      body: crearPagoSchema,
      ok: [201, 'The fee with the new payment', wrap('honorario', ref('Honorario'))],
      errors: [400, 404],
    },
  },
  '/api/audiencias': {
    get: { tag: 'Audiencias', summary: 'Agenda', roles: 'titular and ASISTENTE: the whole firm; ABOGADO: hearings they attend and those on their own cases', ok: [200, 'Hearings by date', list('audiencias', 'Audiencia')] },
    post: {
      tag: 'Audiencias',
      summary: 'Schedule a hearing or deadline',
      roles: OWN_CASE,
      description: '`fecha` is a calendar day (YYYY-MM-DD). An ABOGADO is always the attendee; the titular and the ASISTENTE pick any active lawyer.',
      body: crearAudienciaSchema,
      ok: [201, 'Created', wrap('audiencia', ref('Audiencia'))],
      errors: [400],
    },
  },
  '/api/audiencias/proximas': {
    get: {
      tag: 'Audiencias',
      summary: 'Upcoming hearings and deadlines alert',
      roles: 'same visibility as the agenda',
      description: 'Pending ones from today (in Argentina) through the next `dias` days. Fatal deadlines lead their day.',
      query: proximasSchema,
      ok: [200, 'Upcoming hearings', list('audiencias', 'AudienciaProxima')],
      errors: [400],
    },
  },
  '/api/audiencias/{id}': {
    patch: {
      tag: 'Audiencias',
      summary: 'Reschedule, mark as held, or cancel',
      roles: 'titular, ASISTENTE, or an ABOGADO who sees it in their agenda',
      description: 'No DELETE: cancel with `estado: CANCELADA`. An ABOGADO cannot reassign the attendee.',
      body: editarAudienciaSchema,
      ok: [200, 'Updated', wrap('audiencia', ref('Audiencia'))],
      errors: [400, 404],
    },
  },
};

export function buildOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'AVEXIS API',
      version: '0.1.0',
      description:
        'Legal-practice management API. Authentication uses an httpOnly session cookie, not a Bearer header (ADR 0001): ' +
        'run `POST /api/auth/login` with "Try it out" and the browser sends the cookie with every later call. ' +
        'Demo users are listed in the README.',
    },
    components: {
      securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' } },
      schemas,
    },
    security: [{ cookieAuth: [] }],
    paths: Object.fromEntries(
      Object.entries(PATHS).map(([path, methods]) => [
        path,
        Object.fromEntries(Object.entries(methods).map(([method, op]) => [method, operation(path, method, op)])),
      ]),
    ),
  };
}
