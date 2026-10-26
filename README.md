# Sistema de Gestión de Estudio Jurídico

Trabajo Práctico Final — Programación III (2026)  
Cátedra: Prof. Ing. Gastón A. Larriera — UTN  
Repositorio Base: `DarienPerezGit/sechu-szlit`

---

## 1. Clonación y Puesta en Marcha

```bash
# Clonar el repositorio oficial del proyecto
gh repo clone DarienPerezGit/sechu-szlit
cd sechu-szlit

# Instalar dependencias
npm install

# Cargar seed inicial con datos de prueba obligatorios
npm run seed

# Iniciar backend y frontend en desarrollo
npm run dev
```

### Variables de Entorno

**Backend (`.env`):**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/estudio_juridico
JWT_SECRET=secreto_jwt_seguro_utn
```

**Frontend (`.env`):**
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 2. Especificación Técnica para Desarrollo

### Stack Obligatorio (Rúbrica)
- **Base de Datos:** MongoDB (vía Mongoose)
- **Backend:** Node.js, Express.js, TypeScript
- **Frontend:** React.js, TypeScript, Librería de UI (**Material UI**, **Ant Design** o **Chakra UI**)
- **Seguridad:** JWT (Bearer token almacenado en cliente)
- **Testing:** Supertest (backend) y Vitest + RTL (frontend)
- **Documentación API:** Swagger / OpenAPI en `/api/docs`

---

## 3. Modelo de Entidades (Backend)

1. **Usuarios:** `email`, `passwordHash`, `nombre`, `rol` (`abogado` | `asistente`), `activo`.
2. **Clientes:** `tipo` (`fisica` | `juridica`), `nombreRazonSocial`, `cuitDni`, `email`, `telefono`, `domicilio`.
3. **Expedientes:** `caratula`, `numeroExpediente`, `fueroMateria`, `estado` (`en_tramite` | `en_espera` | `archivado`), `clienteId` (Ref), `abogadoResponsableId` (Ref).
4. **Movimientos:** `expedienteId` (Ref), `fecha`, `tipo` (`escrito` | `resolucion` | `notificacion`), `titulo`, `descripcion`, `usuarioId` (Ref).
5. **Audiencias y Vencimientos:** `expedienteId` (Ref), `abogadoId` (Ref), `fecha`, `hora`, `tipo`, `estado`, `esVencimientoFatal` (Boolean para alertas).
6. **Honorarios y Pagos:** `expedienteId` (Ref), `montoPactado`, `montoPagado`, `fecha`, `estado`.

---

## 4. Reglas de Negocio y Permisos (RBAC)

- **Abogado:** 
  - Solo visualiza sus expedientes asignados (`abogadoResponsableId == req.user.id`).
  - Solo visualiza su agenda personal de audiencias.
- **Asistente:** 
  - Puede dar de alta clientes.
  - Puede cargar movimientos, audiencias y escritos en **cualquier expediente**.
  - Visualiza el calendario general del estudio.

---

## 5. Páginas del Frontend (Mínimo 5 con Ruteo)

1. `/login`: Formulario de autenticación JWT y almacenamiento de sesión.
2. `/dashboard` (o `/agenda`): Calendario/agenda diaria con **aviso destacado de vencimientos próximos** (< 7 días).
3. `/expedientes`: Listado con **paginación en servidor y filtros** (por estado, fuero y búsqueda).
4. `/expedientes/:id`: Detalle del caso, datos del cliente y formulario para asentar movimientos.
5. `/clientes`: Listado y modal de alta/edición de clientes (personas físicas o jurídicas).

---

## 6. Usuarios de Prueba (Precargados en `npm run seed`)

| Rol | Email | Contraseña | Comportamiento en Demo |
| :--- | :--- | :--- | :--- |
| **Abogado** | `abogado@estudio.com` | `Abogado2026!` | Vista filtrada: solo sus causas y agenda propia. |
| **Asistente** | `asistente@estudio.com` | `Asistente2026!` | Vista global: carga movimientos y audiencias en todo el estudio. |

---

## 7. Calidad, Testing y Entrega

- **Supertest:** Tests de integración en `>= 50%` de las rutas backend (`npm run test:api`).
- **Vitest / RTL:** Tests en `>= 30%` de los componentes frontend (`npm run test:ui`).
- **Coverage:** `>= 40%` en statements (`npm run test:coverage`), carpeta `/coverage` comiteada en el repo.
- **Logs:** Registro de errores en archivo de texto (`logs/error.log`).
- **Commits:** Historial de commits incremental y descriptivo (prohibido commit único final).
- **Plazo:** Repositorio publicado y enviado al docente al menos 1 semana antes de la defensa oral.
