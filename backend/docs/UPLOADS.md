# Configuración de subida de imágenes (productos)

Las imágenes de productos se suben al servidor y se sirven desde la misma API.

## Cómo funciona

- **Ruta de la API**: `POST /api/products` y `PUT /api/products/:id` aceptan un campo `image` (archivo).
- **Formato**: solo imágenes (jpg, png, gif, webp). Máximo **5 MB** por archivo.
- **Almacenamiento**: los archivos se guardan en la carpeta `uploads/products/` del backend.
- **URL pública**: las imágenes se sirven en `GET /uploads/products/<nombre-archivo>` (mismo host que la API).

El frontend construye la URL así: si la API está en `https://tu-api.com/api`, las imágenes se piden a `https://tu-api.com/uploads/products/...`.

## Variables de entorno

| Variable       | Descripción                                                                 | Por defecto |
|----------------|-----------------------------------------------------------------------------|-------------|
| `UPLOADS_DIR`  | Carpeta donde se guardan las subidas. Puede ser relativa al directorio de trabajo o una ruta absoluta. | `uploads`   |

Por defecto no hace falta configurar nada: se usa la carpeta `uploads` dentro del directorio desde el que se ejecuta el backend.

Ejemplo para usar otra ruta absoluta (por ejemplo un volumen en producción):

```env
UPLOADS_DIR=/data/uploads
```

## Producción (Docker Compose en servidor Linux)

En este proyecto el **docker-compose** ya monta una carpeta del **servidor** en el contenedor, para que las imágenes se guarden en el disco del servidor y no dentro de la imagen:

```yaml
backend:
  volumes:
    - ./uploads:/app/uploads
```

- **En el servidor**: se crea la carpeta `uploads/` (al lado de `docker-compose.yml`). Ahí estarán `uploads/products/`, etc.
- **En el contenedor**: la app escribe en `/app/uploads`; ese path es exactamente la carpeta del servidor.
- Si borras la imagen/contenedor y vuelves a desplegar, **las imágenes siguen en el servidor** porque están en `./uploads`, no dentro del contenedor.

Si despliegas en **Easypanel** u otro panel: añade un volumen al servicio del backend con ruta del host (bind mount) a `/app/uploads`, por ejemplo `/ruta/en/servidor/form-builder-uploads:/app/uploads`.

## Resumen

- En **desarrollo**: no configures nada; se crea `backend/uploads/products/` y las imágenes se sirven en `http://localhost:3000/uploads/products/...`.
- En **producción**: configura un volumen persistente en la ruta de `UPLOADS_DIR` para que las imágenes sobrevivan a los redespliegues.
