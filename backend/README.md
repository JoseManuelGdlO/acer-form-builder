# Saru Visas Backend

Backend API para el sistema de gestión de visas Saru Visas.

## Stack Tecnológico

- **Express.js** - Framework web
- **MySQL** - Base de datos
- **Sequelize** - ORM
- **TypeScript** - Lenguaje de programación
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas

## Configuración Inicial

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. Crear la base de datos MySQL:
```sql
CREATE DATABASE saru_visas;
```

4. Ejecutar migraciones:
```bash
npm run migrate
```

5. Ejecutar seeders (datos iniciales):
```bash
npm run seed
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor en modo desarrollo con hot reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Iniciar servidor en producción
- `npm run migrate` - Ejecutar migraciones pendientes
- `npm run migrate:undo` - Revertir última migración
- `npm run seed` - Ejecutar todos los seeders
- `npm run seed:undo` - Revertir todos los seeders

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuración (database, env)
│   ├── models/          # Modelos Sequelize
│   ├── migrations/      # Migraciones de base de datos
│   ├── seeders/         # Datos iniciales
│   ├── controllers/     # Controladores de rutas
│   ├── routes/          # Definición de rutas
│   ├── middleware/     # Middleware (auth, roles, errors)
│   ├── services/        # Lógica de negocio (opcional)
│   ├── utils/           # Utilidades (JWT, password, helpers)
│   ├── types/           # Tipos TypeScript
│   ├── app.ts           # Configuración Express
│   └── server.ts        # Inicio del servidor
├── .env.example         # Ejemplo de variables de entorno
├── .sequelizerc         # Configuración Sequelize CLI
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Usuarios
- `GET /api/users` - Listar usuarios (solo admins)
- `POST /api/users` - Crear usuario (solo admins)
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `GET /api/clients/:id` - Obtener cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Formularios
- `GET /api/forms` - Listar formularios
- `POST /api/forms` - Crear formulario
- `GET /api/forms/:id` - Obtener formulario (público)
- `PUT /api/forms/:id` - Actualizar formulario
- `DELETE /api/forms/:id` - Eliminar formulario

### Submissions
- `GET /api/submissions` - Listar submissions
- `POST /api/submissions` - Crear submission (público)
- `GET /api/submissions/:id` - Obtener submission
- `PUT /api/submissions/:id` - Actualizar submission
- `DELETE /api/submissions/:id` - Eliminar submission

Y más endpoints para checklist, notes, messages, FAQs y bot behavior.

## Autenticación

La API usa JWT (JSON Web Tokens) para autenticación. Incluye el token en el header:

```
Authorization: Bearer <token>
```

## Roles

- **super_admin**: Acceso completo al sistema
- **reviewer**: Acceso limitado a clientes asignados
