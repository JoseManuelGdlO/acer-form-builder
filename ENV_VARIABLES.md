# Variables de Entorno Requeridas

Este archivo documenta todas las variables de entorno necesarias para ejecutar la aplicación con Docker Compose.

## Variables Requeridas

### Base de Datos (MySQL Externa)
- `DB_HOST`: Host de la base de datos MySQL externa
- `DB_PORT`: Puerto de la base de datos (por defecto: 3306)
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos

### Backend
- `JWT_SECRET`: Secreto para firmar tokens JWT (cambiar en producción)
- `PORT`: Puerto del backend (por defecto: 3000)
- `NODE_ENV`: Entorno de ejecución (production, development)
- `CORS_ORIGIN`: Origen permitido para CORS (por defecto: http://localhost:80)

### Frontend
- `VITE_API_URL`: URL del API backend (por defecto: http://localhost:3000/api)

### Docker Compose
- `BACKEND_PORT`: Puerto expuesto del backend (por defecto: 3000)
- `FRONTEND_PORT`: Puerto expuesto del frontend (por defecto: 80)

## Ejemplo de archivo .env

```env
# Application Environment
NODE_ENV=production

# Backend Configuration
PORT=3000
BACKEND_PORT=3000

# Frontend Configuration
FRONTEND_PORT=80

# Database Configuration (External MySQL)
DB_HOST=your-mysql-host
DB_PORT=3306
DB_NAME=saru_visas
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:80

# Frontend API URL
VITE_API_URL=http://localhost:3000/api
```

## Uso en Easypanel

En Easypanel, configura estas variables de entorno en el panel de configuración de cada servicio. Asegúrate de:

1. Configurar todas las variables requeridas antes de iniciar los servicios
2. Usar valores seguros para `JWT_SECRET` y `DB_PASSWORD`
3. Ajustar `CORS_ORIGIN` y `VITE_API_URL` según tu dominio de producción
4. Verificar que el backend pueda acceder a la red donde está la base de datos MySQL externa
