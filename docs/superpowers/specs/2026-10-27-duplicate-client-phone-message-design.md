# Mensaje de teléfono de cliente duplicado

**Date:** 2026-10-27  
**Status:** Approved for implementation planning  
**Scope:** Alta (y edición) de cliente titular con teléfono ya registrado

## Goal

Al crear un cliente titular con un número de teléfono ya usado por otro titular de la misma compañía, **bloquear** el alta y mostrar:

> Número de cliente registrado, utiliza otro número

El modal de creación debe permanecer abierto para que el usuario cambie el teléfono.

## Current behavior (baseline)

- En `createClient` (`backend/src/controllers/clients.controller.ts`), si el teléfono ya existe en un titular (`parentClientId: null`) de la compañía, el API responde **200** con `{ message: 'Cliente ya existe', client: existingClient }`.
- El mismo patrón se usa en el catch de `SequelizeUniqueConstraintError` por `phone`.
- El frontend (`useClientStore` / `ClientList`) trata esa respuesta como éxito y muestra toast «Cliente creado».
- En **update**, si el teléfono ya lo usa otro titular, responde 400 con `Phone already in use by another primary client` (inglés).
- Los familiares (con `parentClientId`) pueden compartir teléfono; esa regla no cambia.

## Decisions

| Topic | Decision |
|-------|----------|
| Comportamiento | Bloquear (opción A): no devolver el cliente existente como éxito |
| Enfoque técnico | Backend + frontend (opción 1) |
| Mensaje | Exacto: `Número de cliente registrado, utiliza otro número` |
| HTTP status (create) | `409 Conflict` |
| UI | Error bajo el campo teléfono + toast; modal abierto |
| Familiares | Sin cambio: duplicado de teléfono permitido si hay `parentClientId` |
| Edición | Mismo mensaje en español al actualizar un titular con teléfono de otro titular |

## Backend

### Create

Cuando `normalizedPhone` está presente y `parentClientId` es nulo/ausente:

1. Buscar titular existente: `{ companyId, phone: normalizedPhone, parentClientId: null }`.
2. Si existe → `res.status(409).json({ error: 'Número de cliente registrado, utiliza otro número' })` y return.
3. En el catch de unique constraint por `phone`, misma respuesta 409 + mismo `error` (no devolver el cliente existente).

### Update

Reemplazar el mensaje en inglés por el mismo texto en español (mantener 400 o unificar a 409; preferencia: **409** para consistencia con create).

## Frontend

- Propagar el `error` del API (ya lo hace `api.request` / catch en `ClientFormModal`).
- En `ClientFormModal`, al fallar el guardado por este caso:
  - Asignar el mensaje a `phoneError` (o al error general si el mensaje no se puede mapear al campo).
  - Mostrar toast con el mismo texto.
  - No llamar `onOpenChange(false)`.
- En `ClientList` / flujos de create: no mostrar «Cliente creado» si la promesa rechaza (ya ocurre si el store lanza).
- Asegurar que `useClientStore.createClient` **rechace** cuando el API no crea un cliente nuevo (tras el cambio de backend a 409, el `request` ya debería lanzar en status no-OK).

## Out of scope

- Validación previa solo en cliente (lista local).
- Códigos de error tipados (`PHONE_ALREADY_REGISTERED`) y i18n multi-idioma.
- Cambiar la unicidad de teléfono para familiares.
- UX de «abrir el cliente existente» tras el conflicto.

## Success criteria

1. Crear titular con teléfono de otro titular → 409, mensaje en español, modal abierto, sin cliente nuevo.
2. Crear familiar con teléfono repetido → sigue permitido (comportamiento actual).
3. Editar titular a un teléfono de otro titular → mismo mensaje, sin guardar.
4. Crear titular con teléfono libre → 201 y toast de éxito como hoy.
