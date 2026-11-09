# AVEXIS: gestión de un estudio jurídico

Trabajo Práctico Final de Programación III (UTN, 2026). Cátedra: Prof. Ing. Gastón A. Larriera.

AVEXIS organiza el trabajo diario de un estudio jurídico: clientes, expedientes, movimientos procesales, audiencias, vencimientos y honorarios. Cada instalación sirve a un solo estudio.

**Estado:** el backend y el frontend están terminados. El frontend tiene siete páginas: entrar, cambiar la contraseña, agenda, listado y detalle de expedientes, clientes y usuarios (esta última, solo para el titular).

## Cómo funciona

### Roles

Hay dos roles, y el titular es una capacidad extra de un abogado, no un tercer rol.

| Perfil | Qué hace |
|---|---|
| **Titular** (`ABOGADO` con `esTitular: true`) | Ve todo el estudio y es el único que administra usuarios. |
| **Abogado** (`ABOGADO`) | Ve solo sus expedientes y su agenda. |
| **Asistente** (`ASISTENTE`) | Hace la procuración: carga clientes, movimientos y audiencias en cualquier expediente. No ve honorarios. |

No hay registro público: los usuarios los crea el titular. Quien recibe una contraseña elegida por otro debe cambiarla antes de usar el sistema.

### Entidades

| Entidad | Qué representa |
|---|---|
| **Usuario** | Persona que entra al sistema. Nunca se borra, se desactiva. |
| **Cliente** | Persona física (con DNI) o jurídica (con CUIT). |
| **Expediente** | Caso del estudio, con un cliente y un abogado responsable. Nunca se borra, se archiva. |
| **Movimiento** | Entrada del historial procesal de un expediente: escrito, resolución, notificación, cédula, oficio, audiencia u otro. Es inmutable. |
| **Audiencia** | Audiencia, vencimiento o pericia de un expediente, con el abogado que asiste. Nunca se borra, se cancela. |
| **Honorario** | Monto pactado de un expediente y sus pagos. Su estado sale de los pagos. Solo lo ven el abogado responsable y el titular. |

Los términos están definidos en [`GLOSSARY.md`](GLOSSARY.md).

### Flujo de trabajo

1. El titular crea los usuarios del estudio.
2. Se da de alta el cliente y se abre su expediente, con un abogado responsable.
3. Abogados y asistentes cargan movimientos y agendan audiencias y vencimientos.
4. La alerta de próximas avisa lo pendiente de los siguientes 7 días y marca como urgente lo que vence en hasta 2 días.
5. El abogado responsable o el titular registran los honorarios y sus pagos.
6. Al terminar el caso, el expediente se archiva.

## Stack

**Backend:** Node.js, Express 5, TypeScript, MongoDB Atlas con Mongoose, JWT en cookie `httpOnly`, Zod, Pino, Vitest, Supertest y Swagger UI.

**Frontend:** React, TypeScript, Vite, Ant Design, React Router, Vitest y Testing Library.

## Levantar el proyecto

### 1. Prerrequisitos

- [Node.js](https://nodejs.org/) 20.19 o superior, con npm. Probado con Node 24.
- [Git](https://git-scm.com/).
- Una cuenta gratuita de [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

### 2. Crear el cluster de Atlas

1. Creá un proyecto y un cluster gratuito (**M0**).
2. En **Database Access**, creá un usuario con contraseña y permiso de lectura y escritura.
3. En **Network Access**, agregá tu IP actual.
4. En el cluster, entrá a **Connect > Drivers** y copiá la URI de conexión.

### 3. Instalar

```bash
git clone https://github.com/DarienPerezGit/AVEXIS.git
cd AVEXIS/backend
npm install
```

Los comandos de estos pasos se corren dentro de `backend/`. El frontend tiene su propio paso, el 8.

### 4. Configurar `.env`

```bash
cp .env.example .env
```

Abrí `.env` y completá estas dos variables:

| Variable | Valor |
|---|---|
| `MONGODB_URI` | La URI de Atlas, con tu usuario y contraseña, y `estudio_juridico` como nombre de base antes del `?`. |
| `JWT_SECRET` | Un texto largo y aleatorio. Podés generarlo con el comando de abajo. |

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

La URI queda con esta forma:

```text
mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/estudio_juridico?retryWrites=true&w=majority
```

Si la contraseña tiene caracteres especiales como `@`, `:` o `/`, escribilos con URL encoding. El resto de las variables ya trae un valor que sirve para desarrollo local, y `.env.example` explica cada una.

`.env` está ignorado por git: no subas tus credenciales.

### 5. Cargar los datos iniciales

```bash
npm run seed
```

> **Cuidado:** `npm run seed` **vacía la base** de `MONGODB_URI` antes de cargar los datos. No lo corras contra una base que quieras conservar.

El seed cumple el rol de migración inicial. Carga un estudio de demo con usuarios, clientes, expedientes en todos los estados, movimientos, audiencias y honorarios. Las fechas de las audiencias son relativas al momento en que se corre, así que la alerta de próximas siempre tiene datos. Se puede repetir las veces que haga falta y se niega a correr con `NODE_ENV=production`.

### 6. Iniciar

```bash
npm run dev
```

Cuando la consola muestra `API listening on http://localhost:3000`, el backend está listo. Para comprobarlo, abrí <http://localhost:3000/api/health>: debe responder `{"status":"ok","database":"connected"}`.

Si el puerto 3000 está ocupado, el proceso muestra el error y no arranca. Cambiá `PORT` en `.env`, o cerrá lo que lo esté usando, y volvé a correr el comando.

### 7. Probar la API

La documentación interactiva está en <http://localhost:3000/api/docs>. Para usarla, ejecutá `POST /api/auth/login` con uno de los usuarios de demo: la sesión queda en una cookie y las demás rutas ya funcionan desde la misma página.

### 8. Levantar el frontend

Con el backend andando, abrí otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La app queda en <http://localhost:5173>. Vite reenvía `/api` al backend, así que navegador y API comparten un solo origen y la cookie de sesión funciona sin configurar nada más.

| Variable | Valor |
|---|---|
| `VITE_API_URL` | Ruta base de la API. Por defecto, `/api`. |
| `VITE_PROXY_TARGET` | Adónde reenvía Vite las llamadas. Si cambiaste `PORT` en el backend, cambialo acá también. |

Las variables `VITE_` terminan en el código que descarga el navegador: nunca pongas un secreto ahí.

## Usuarios de demostración

Los crea `npm run seed`. Todos usan la contraseña `demo avexis 2026`, que es pública y solo existe en los datos de demo.

| Perfil | Email | Qué permite mostrar |
|---|---|---|
| Titular | `titular@avexis.demo` | Ve todo el estudio y administra usuarios. |
| Abogado | `abogado@avexis.demo` | Ve solo sus expedientes y su agenda. |
| Abogada | `abogada@avexis.demo` | Tampoco ve los expedientes del otro abogado. |
| Asistente | `asistente@avexis.demo` | Carga datos en todo el estudio, pero no ve honorarios. |

## Comandos

Dentro de `backend/`:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor y lo reinicia con cada cambio. |
| `npm start` | Inicia el servidor sin reinicio automático. |
| `npm run seed` | Vacía la base y carga el estudio de demo. |
| `npm run create-titular` | Crea el primer titular de una instalación real, sin borrar nada. |
| `npm test` | Corre todos los tests una vez. |
| `npm run test:watch` | Corre los tests cada vez que cambia un archivo. |
| `npm run test:coverage` | Corre los tests y genera el reporte de cobertura. Falla si baja del umbral. |
| `npm run typecheck` | Verifica los tipos de TypeScript. |
| `npm run build` | Hace la misma verificación de tipos: el servidor corre el TypeScript directamente con `tsx`. |

Dentro de `frontend/`:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la app con recarga automática. |
| `npm run build` | Verifica los tipos y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la versión generada por `build`. |
| `npm test` | Corre todos los tests una vez. |
| `npm run test:watch` | Corre los tests cada vez que cambia un archivo. |
| `npm run test:coverage` | Corre los tests y genera el reporte de cobertura. Falla si baja del umbral. |
| `npm run typecheck` | Verifica los tipos de TypeScript. |

## Tests

```bash
npm test
npm run test:coverage
```

Corren igual dentro de `backend/` y de `frontend/`. Los del backend no usan Atlas ni necesitan `.env`: levantan una base MongoDB en memoria. La primera vez descargan el binario de MongoDB, así que esa corrida necesita internet y tarda más.

El enunciado pide 40% de cobertura de statements. El backend y el frontend exigen 90%, cerca del valor real, para detectar código nuevo sin tests. Los reportes están versionados en [`backend/coverage/`](backend/coverage/index.html) y [`frontend/coverage/`](frontend/coverage/index.html), y [`docs/testing.md`](docs/testing.md) detalla qué test cubre cada ruta.

## Instalación real

En una instalación real no se usa el seed. El primer titular se crea así:

1. Definí `TITULAR_NOMBRE`, `TITULAR_EMAIL` y `TITULAR_PASSWORD` en `.env`. La contraseña debe tener entre 15 y 64 caracteres.
2. Corré `npm run create-titular`.
3. Entrá con ese usuario y cambiá la contraseña, que es temporal.
4. Borrá esas tres variables de `.env`.

Con `NODE_ENV=production`, la cookie de sesión solo viaja por HTTPS.

## Seguridad y errores

- **Sesión:** el JWT viaja en una cookie `httpOnly`, `Secure` en producción y `SameSite=Strict`. No se usa `localStorage` ni el header `Authorization`.
- **Contraseñas:** se guardan con bcrypt, y el login limita los intentos fallidos por IP.
- **Errores:** la API responde `{ "error": { "code", "message" } }`, y los errores del servidor quedan en `backend/logs/error.log`.

## Documentación del proyecto

- [`docs/adr/`](docs/adr/): decisiones de diseño y sus alternativas.
- [`GLOSSARY.md`](GLOSSARY.md): términos del dominio.
- [`docs/testing.md`](docs/testing.md): plan de pruebas e inventario de rutas.

## Licencia

Distribuido bajo la licencia MIT. Ver [`LICENSE`](LICENSE).
