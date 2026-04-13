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

### WhatsApp (envío desde el portal, multi-tenant)

El envío outbound (`POST /api/messages/clients/:clientId` con `sender: user`) **no** usa variables de entorno globales (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, etc.). Usa una fila en la tabla **`whatsapp_integrations`** por compañía (`company_id` único, misma empresa que el usuario del JWT).

Las credenciales las cargan **solo desarrolladores** directamente en la base de datos (no hay API de configuración en la app).

#### Columnas de `whatsapp_integrations`

| Columna | Descripción |
|---------|-------------|
| `id` | UUID (PK) |
| `company_id` | UUID de `companies.id` (único por empresa) |
| `phone_number_id` | ID de la línea en Meta Cloud API (único) |
| `access_token` | Token Bearer de Graph para esa línea |
| `graph_api_version` | Ej. `v22.0` (default en migración) |
| `template_language` | Código de idioma de plantilla, ej. `es_MX` |
| `initial_template_name` | Nombre de la plantilla para reabrir la ventana de 24 h (default `mensaje_inicial`) |
| `display_phone_number` | Opcional, solo referencia |
| `is_active` | `true` para usar esta fila |

Si no existe fila activa para la compañía del usuario, el API responde `422` con código `WHATSAPP_INTEGRATION_NOT_CONFIGURED`.

#### Ejemplo `INSERT` (MySQL)

Sustituye los valores entre comillas por los reales (el `company_id` lo obtienes de la tabla `companies`).

```sql
INSERT INTO whatsapp_integrations (
  id,
  company_id,
  phone_number_id,
  access_token,
  graph_api_version,
  template_language,
  initial_template_name,
  display_phone_number,
  is_active,
  created_at,
  updated_at
) VALUES (
  UUID(),
  '00000000-0000-0000-0000-000000000001',
  '123456789012345',
  'EAAG...',
  'v22.0',
  'es_MX',
  'mensaje_inicial',
  NULL,
  true,
  NOW(),
  NOW()
);
```

Tras ejecutar la migración que crea la tabla (`npm run migrate` o el comando que uséis en el backend), cada compañía que deba enviar WhatsApp necesita al menos un `INSERT` como el anterior.

Las variables `WHATSAPP_*` en Docker Compose pueden quedar por compatibilidad con otros procesos, pero **el código de envío del portal ya no las lee** para ese flujo.

### Integración de chat (`/api/addChat`) con n8n u otros clientes
- Las rutas `POST /api/addChat`, `PATCH /api/addChat/:id` y `PATCH /api/addChat/:phone/baja` requieren **`Authorization: Bearer <JWT>`** igual que el resto de la API autenticada.
- El `company_id` de las conversaciones sale del usuario del token (`req.user.companyId` tras `authenticate`). Conviene usar un **JWT permanente** por empresa (p. ej. endpoint de token permanente del backend) y que n8n elija el Bearer según la compañía detectada (p. ej. por `phone_number_id` del webhook).

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
