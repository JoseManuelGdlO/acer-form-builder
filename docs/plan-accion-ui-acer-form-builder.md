# Plan de acción: aplicar la UI TravelUp en `acer-form-builder`

Documento de ejecución en cascada. El trabajo se hace **en el frontend de `acer-form-builder`**. Este repo (`jmgo-trvelup`) es solo la **fuente visual** (prototipo con datos mock).

Referencias:

- Inventario funcional: `/Users/intelekia/Documents/Repos/acer-form-builder/docs/front-back-funcionalidades.md`
- Prototipo UI: `/Users/intelekia/Documents/Repos/jmgo-trvelup/src/features/travelup-app.tsx`
- Tokens visuales: `/Users/intelekia/Documents/Repos/jmgo-trvelup/src/styles.css`
- Front destino: `/Users/intelekia/Documents/Repos/acer-form-builder/frontend`

---

## 0. Contrato del proyecto

### Objetivo

Replicar la UI de TravelUp en `acer-form-builder` **sin cambiar la funcionalidad existente**. Solo cambia presentación, composición y chrome. El backend, `api.ts`, stores Zustand, permisos, JWT, tenant y contratos HTTP se conservan.

### Qué se copia y qué no

| Copiar del prototipo | No copiar / no migrar |
|---|---|
| Layout del header (barra oscura + nav agrupada) | Stack TanStack Start / React 19 / Tailwind 4 |
| Tipografías Urbanist + Epilogue | Datos mock, `QuotesContext` local |
| Paleta TravelUp como **default** del tema | Rutas nuevas excepto cotizaciones al final |
| Cards, badges, toolbars, page chrome, densidad | Endpoints, stores, `can()` / `canAny()` |
| Composición bento del dashboard | Impersonation real (view-as sigue siendo solo front) |
| Perfil de cliente en tabs + chat lateral | Merge de Formularios dentro de Clientes como única entrada |
| Detalle de viaje en tabs | Lógica de asientos, finanzas, PDF mapping, etc. |

**IA funcional de acer prevalece.** El prototipo mete Formularios y Cotizaciones como tabs dentro de Clientes. En acer, Formularios sigue siendo `?view=forms` con `nav.forms.view`. Cotizaciones se añade al final como vista propia, y opcionalmente como tab extra en el perfil.

### Regla de oro por módulo

1. Restylear el componente existente; no reescribir el store ni el cliente HTTP.
2. Cada acción UI que hoy llama API debe seguir llamando el **mismo** método de `api.ts`.
3. Si el prototipo muestra un control que acer no tiene, o se omite, o se deja deshabilitado con tooltip. No inventar endpoints. Debes guardar este dato en un documento y por cada uno agregarlo al documento, esto es para mantener una lista de la lógica faltante.
4. Si acer tiene un control que el prototipo no muestra, **se conserva** y se redibuja.
5. Al terminar un módulo, el anterior debe seguir funcionando (cascada no destructiva).

### Stack destino (no cambiar)

- Vite + React 18 + `react-router-dom`
- Tailwind 3 + tokens HSL en `frontend/src/index.css`
- Zustand (`use*Store`) + `frontend/src/lib/api.ts`
- Auth JWT en `localStorage` (`auth_token`)
- Shell SPA en `/` con `?view=` y `?clientId=`
- Rutas públicas: `/login`, `/form/:formId`, `*`

### Tokens TravelUp a traducir a HSL (acer no usa oklch)

Valores default a persistir en `index.css` y en `DEFAULT_THEME` de branding:

| Token prototipo | Hex | HSL aproximado para acer |
|---|---|---|
| `--brand-primary` | `#1379BE` | `203 82% 41%` |
| `--brand-secondary` | `#FDBB12` | `43 98% 53%` |
| `--brand-accent` | `#D51E26` | `357 75% 48%` |
| `--brand-canvas` | `#F4F8FC` | `210 67% 97%` |
| sidebar | azul oscuro | `220 50% 18%` aprox. |
| radius | `0.5rem` | `0.5rem` (hoy `0.75rem`) |

`--success` y `--warning` ya existen en acer; alinear tonos al prototipo sin romper badges de citas (`appointmentColors.ts`).

### Orden de cascada (no saltar)

```
M1 Fundación visual
 → M2 Shell autenticado
   → M3 Auth y pantallas públicas
     → M4 Dashboard
       → M5 Clientes lista
         → M6 Perfil de cliente
           → M7 Formularios
             → M8 Catálogo (productos / hoteles / grupos)
               → M9 Calendario
                 → M10 Viajes
                   → M11 Administración financiera
                     → M12 Usuarios y roles
                       → M13 Chatbot y settings
                         → M14 Cotizaciones (nuevo, solo front)
                           → M15 QA transversal
```

Cada módulo lista: dependencias, archivos, IDs funcionales a preservar, tareas, criterio de done y riesgos.

---

## M1. Fundación visual

**Dependencias:** ninguna.  
**Objetivo:** que toda la app herede tipografía, color, radio y primitives de TravelUp **sin tocar lógica**.  
**Puede ejecutarse solo.** Tras M1 la UI se ve “TravelUp” con el layout viejo; eso es correcto.

### Fuente UI

- `jmgo-trvelup/src/styles.css`
- `jmgo-trvelup/src/routes/__root.tsx` (fuentes Google)
- Componentes locales del prototipo: `Card`, `Badge`, `SectionTitle`, `Toolbar`, `TabBar`

### Archivos destino

- `frontend/src/index.css`
- `frontend/src/lib/theme.ts`
- `frontend/src/components/settings/CompanyBrandingSettings.tsx` (`DEFAULT_THEME`)
- `frontend/index.html` (fuentes)
- `frontend/tailwind.config.ts` (font-display / font-sans si hace falta)
- Nuevos: `frontend/src/components/layout/PageChrome.tsx`, `SectionTitle.tsx`, `Toolbar.tsx`, `StatusBadge.tsx`, `TabBar.tsx`

### Funcionalidad a preservar

- `GLOBAL-01` applyTheme desde tenant
- `SET-01` / `SET-02` theme JSON HSL, logo, favicon, fondo, opacidad de cards
- Claves `THEME_COLOR_KEYS`, `APP_BACKGROUND_IMAGE_KEY`, `DASHBOARD_CENTER_LOGO_IMAGE_KEY`, `DASHBOARD_CARD_OPACITY_KEY`

### Tareas

1. Actualizar `:root` de `index.css` a la paleta TravelUp en formato HSL (no copiar el CSS de Tailwind 4).
2. Cargar Urbanist (títulos) y Epilogue (cuerpo) en `index.html`.
3. Bajar `--radius` a `0.5rem` y alinear `--sidebar-*` al header oscuro del prototipo.
4. Actualizar `DEFAULT_THEME` para que “Restaurar” en branding deje TravelUp, no el navy/rojo viejo.
5. Extraer primitives reutilizables (no copiar el archivo monolítico `travelup-app.tsx`).
6. Evitar hex/verde/ámbar hardcodeados en componentes tocados; preferir `text-success`, `bg-warning/15`.

### Done

- Login, 404 y dashboard ya se ven con la nueva paleta y fuentes.
- Guardar branding en Settings sigue aplicando CSS variables.
- Restaurar defaults produce TravelUp, no la marca anterior.

### Riesgos

- `theme.ts` espera HSL `"H S% L%"`. Si se pegan hex u oklch, el color picker de Settings se rompe.
- Opacidad de cards (`--dashboard-card-opacity`) debe seguir funcionando.

---

## M2. Shell autenticado (header, nav, page chrome)

**Dependencias:** M1.  
**Objetivo:** el chrome del prototipo (header oscuro, nav agrupada, título de página, CTA, campana, usuario) sobre el `Index` real.

### Fuente UI

- `TravelUpApp` + `TopNavGroup` + header + `viewMeta` en `travelup-app.tsx`

### Archivos destino

- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/pages/Index.tsx` (`NavigationButtons`, `handleNavigate`, `AppHeader` repetido por vista)
- `frontend/src/components/notifications/NotificationBell.tsx`
- `frontend/src/components/admin/ViewAsSelector.tsx`
- `frontend/src/auth/viewPermissions.ts` (solo si se añade `quotes` en M14; **no ahora**)

### Funcionalidad a preservar

| ID | Qué no romper |
|---|---|
| GLOBAL-03 | Logout solo limpia localStorage y redirige a `/login` |
| GLOBAL-04 | 401 → login |
| GLOBAL-05 | View as: `GET /users`, filtro solo front |
| GLOBAL-06…12 | Campana, VAPID, push, dismiss, deep link `/?view=clients&clientId=` |
| PRE-01…05 | Prefetch al montar Index |
| FORMED-08 | Confirm al salir del editor con cambios |
| `?view=` | Todas las `ShellView` actuales |
| Permisos | `VIEW_ENTRY_PERMISSIONS` + `can()` / `canAny()` |

### Tareas

1. Rediseñar `AppHeader`:
   - Fila 1 (`bg-sidebar`): logo tenant, búsqueda, CTA contextual, campana, usuario + logout.
   - Fila 2 (solo `lg+`): tres grupos `Principal` / `Catálogo` / `Administración` con `DropdownMenu` estilo `TopNavGroup`.
   - Móvil: panel/sheet con los mismos grupos, no el clonar-botones actual.
2. Mapear nav real (no la del prototipo):

   **Principal:** dashboard, clients, trips, calendar.  
   **Catálogo:** products, hotels, groups, forms.  
   **Administración:** finance, paymentLogs, commissions, users, roles, chatbot, settings.

   Formularios vive en Catálogo (en acer es módulo propio; en el prototipo está en Principal). No fusionar con Clientes.
3. CTA del header:
   - `clients` → abre `ClientFormModal` (CLIENTS-08)
   - `trips` + `trips.create` → abre `TripFormModal` (TRIP-06)
   - resto → ocultar o ir a la acción de alta de esa vista
4. Búsqueda global: al escribir, rellenar el `q` de la vista activa (clientes, viajes, productos). No inventar búsqueda cross-entity.
5. Extraer `PageChrome` (título + subtítulo de `viewMeta`) para no repetir `AppHeader` 15 veces en `Index.tsx` **sin cambiar** el wiring de stores.
6. Conservar badge de conteo de clientes en nav (`CLIENTS-02`).
7. Conservar `FloatingViewAs` y el offset `pt-10`.

### Done

- Todas las vistas siguen abriéndose con el mismo `?view=`.
- Un rol sin `nav.finance.view` no ve Finanzas.
- Deep link de notificación abre el perfil.
- Logout y view-as intactos.
- Editor de forms sigue pidiendo confirmación al navegar.

### Riesgos

- `Index.tsx` (~1700 líneas) concentra prefetch, filtros y render por vista. Extraer chrome, no reescribir el orquestador.
- El menú móvil actual clona children con hacks de `className`; reemplazarlo por nav declarativa evita regresiones.

---

## M3. Auth y pantallas públicas

**Dependencias:** M1 (tokens) y M2 (si se reutiliza header; login no lo usa).  
**Objetivo:** login, dominio no configurado, 404 y formulario público con look TravelUp.

### Archivos destino

- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/DomainNotConfigured.tsx`
- `frontend/src/pages/NotFound.tsx`
- `frontend/src/pages/PublicFormView.tsx`
- `frontend/src/App.tsx` (splash de carga tenant)

### Funcionalidad a preservar

| ID | Qué no romper |
|---|---|
| LOGIN-01 | `POST /auth/login` + match `user.company.id` vs tenant |
| LOGIN-02 | Logo/nombre del tenant |
| GLOBAL-01 | 404 de tenant → `DomainNotConfigured` |
| PUB-01…09 | Carga form, autosave, submission, complete, pausa bot, tipos de pregunta, visibilidad condicional |

### Tareas

1. Login: card centrada, logo tenant, campos iguales, fondo canvas TravelUp (sin inventar “olvidé contraseña”).
2. Domain not configured y 404: misma tipografía y botones.
3. `PublicFormView`: restyle de cards, progress y botones. **No tocar** el flujo de sesión (`?token=`), autosave ni tipos de pregunta.
4. Splash de `App.tsx` con el mismo chrome visual.

### Done

- Login real sigue autenticando y rechazando company mismatch.
- Llenar un form público con token sigue guardando progreso y completando.
- Pausar bot por teléfono (PUB-08) no se elimina.

### Riesgos

- `PublicFormView` es grande y tiene DatePicker propio. Cambiar clases, no el state machine.

---

## M4. Dashboard

**Dependencias:** M1, M2.  
**Objetivo:** composición bento del prototipo con KPIs **reales**.

### Fuente UI

- `Dashboard` en `travelup-app.tsx` (hero logo, próximos viajes, KPIs, agenda, tareas, actividad)

### Archivos destino

- `frontend/src/components/dashboard/Dashboard.tsx`
- Wiring en `frontend/src/pages/Index.tsx` (props actuales)

### Funcionalidad a preservar

| ID | Dato real |
|---|---|
| DASH-01 | `GET /clients/stats` |
| DASH-02 | `GET /submissions/stats` |
| DASH-03 | `GET /trips/stats` |
| DASH-04 | Feed derivado de `clients` / `submissions` / `forms` |
| DASH-05 | Logo `DASHBOARD_CENTER_LOGO_IMAGE_KEY` |

### Tareas

1. Recomponer el grid: hero con logo tenant, próximos viajes (si hay `trips.view` y datos), 4 KPIs, bloque agenda, actividad.
2. Mapear KPIs a stats reales, no a los mock (`42 viajes`, `68% cierre`):
   - Viajes activos / ocupación → `tripStats`
   - Clientes → `clientStats.total` / `pending`
   - Envíos → `submissionStats`
3. “Próximos viajes”: si Index aún no pasa `trips`, usar el store ya prefetch o las stats. Click → `handleNavigate('trips')` o abrir detalle si hay id.
4. Agenda del día: eventos de `GET /calendar/events` **solo si** el usuario tiene `appointments.view` y no dispara un fetch extra no autorizado. Si no hay permiso, ocultar el bloque (el prototipo no debe inventar citas).
5. “Tareas pendientes”: acer no tiene API de tareas. **No persistir checkboxes locales como si fueran del back.** Opciones: omitir el bloque, o mostrar checklist incompleto de clientes si ya está en memoria. Preferir omitir o degradar a “actividad”.
6. Conservar `assignedUserId` / view-as en los stats.

### Done

- Los números coinciden con los endpoints, no con el mock.
- Sin `trips.view` no se piden ni muestran viajes.
- Logo de branding sigue al centro/hero.
- Click en “Ver todos” navega a la vista real.

### Riesgos

- El prototipo promete agenda y tareas que el back no modela igual. Priorizar datos reales sobre fidelidad pixel-perfect de bloques vacíos.

---

## M5. Clientes — lista

**Dependencias:** M2 (CTA/búsqueda), M1.  
**Objetivo:** grid de cards TravelUp + toolbar, conservando filtros, paginación y CRUD.

### Fuente UI

- `ClientsList`, `Toolbar`, cards con avatar, status, viaje, asesora, barra de pagado

### Archivos destino

- `frontend/src/components/clients/ClientList.tsx`
- `frontend/src/components/clients/ClientCard.tsx`
- `frontend/src/components/clients/ClientFormModal.tsx`
- `frontend/src/components/clients/ClientStatusBadge.tsx`

### Funcionalidad a preservar

CLIENTS-01…13: listado paginado, stats, sucursal, checklist, asesores, productos, modal filtros, crear/editar/borrar, deep link `clientId`, polling 60s, view-as.

Campos del modal: nombre, email, teléfono normalizado, CP, dirección, nacimiento, notas, status, producto, titular, parentesco, asesor.

### Tareas

1. Card: avatar iniciales, badge status (`pending`/`active`/`inactive`), email, producto/viaje si existe, asesor, barra pagado/total si hay `totalAmountDue` y pagos (si el dato no está en la lista, ocultar la barra; no fake).
2. Toolbar: search → `onFiltersChange.q`, botón Filtros (CLIENTS-07), Agregar (CLIENTS-08).
3. Conservar pastillas de status y todos los filtros del modal.
4. Menú `...` de la card: ver / editar / eliminar / reasignar. No perder `data-no-view`.
5. Paginación visible y funcional.
6. `?clientId=` sigue abriendo el perfil (M6).

### Done

- Crear, editar, borrar, filtrar y paginar contra el API real.
- Un asesor `view_assigned` no ve clientes de otros (salvo `company_wide`).
- Deep link y polling siguen.

### Riesgos

- La card del prototipo asume “viaje + pagado”. En acer el viaje no siempre está en el listado. Mostrar producto / próxima cita si existen (`nextOfficeAppointment` ya se pinta hoy).

---

## M6. Perfil de cliente

**Dependencias:** M5.  
**Objetivo:** ficha TravelUp (header + tabs + chat lateral) sin perder ninguna subvista.

### Fuente UI

- `DetailView` kind=client: tabs Resumen / Checklist / Notas / Pagos / Formularios (+ Cotizaciones en M14)
- Chat fijo a la derecha

### Archivos destino

- `frontend/src/components/clients/ClientProfileView.tsx`
- `ClientNotes.tsx`, `ClientChat.tsx`, `ClientChecklist.tsx`, `ClientPaymentHistory.tsx`, `ClientFormData.tsx`
- `frontend/src/components/payments/PaymentReceiptActions.tsx`

### Funcionalidad a preservar (no negociable)

CLIENT-PROF-01…32: ficha, notas CRUD (sin UI de update), chat interno + WhatsApp merge, pausa bot, submissions, checklist toggle, asignar form + URL pública, pagos/recibos/total due/audit, paquetes PAQUETE, citas internas, familia (alta, quitar, reasignar asesor hijo).

Reglas de negocio:

- Pagos y paquetes **solo titular** (`parentClientId` vacío).
- Chat fusiona `/messages` + `/addChat` con dedupe de eco.
- Permisos granulares por bloque (`client_notes.*`, `client_payments.*`, etc.).

### Tareas

1. Sustituir el `Accordion` por `TabBar` visual. **Todos** los bloques actuales deben existir como tab o subsección:
   - Resumen: datos + familia + (si aplica) paquetes
   - Checklist
   - Notas
   - Citas internas (el prototipo no las tiene; **se conservan**, p. ej. tab “Citas” o dentro de Resumen)
   - Pagos (solo titular)
   - Formularios
2. Layout `xl:grid-cols-[1fr_360px]` con `ClientChat` a la derecha, incluido pausar/reanudar bot.
3. Header: avatar, nombre, contacto, status, Editar → `ClientFormModal`.
4. No desmontar `PaymentReceiptActions`, historiales de audit, ni alta de familiar.
5. Dejar un hueco/tab “Cotizaciones” desactivado o ausente hasta M14.

### Done

- Cada ID CLIENT-PROF-* tiene UI alcanzable.
- Titular vs hijo se comporta igual que hoy.
- Asignar form genera URL `/form/:formId?token=`.
- Recibos, total a pagar y citas siguen persistiendo.

### Riesgos

- `ClientProfileView.tsx` (~1400 líneas) carga todo en un `Promise.all`. Restylear el JSX; no reordenar el fetch salvo extraer subcomponentes con las mismas props.
- Mover citas a un tab no debe dejar de llamar `getClientInternalAppointments`.

---

## M7. Formularios (lista + editor)

**Dependencias:** M2, M3 (público ya restyleado).  
**Objetivo:** cards y editor con look TravelUp; persistencia JSON intacta.

### Fuente UI

- `FormsView` (cards + toolbar)
- `DetailView` kind=form (secciones + paleta de tipos)

### Archivos destino

- `FormList.tsx`, `FormCard.tsx`, `FormEditor.tsx`
- `QuestionCard.tsx`, `QuestionTypePalette.tsx`, `SectionCard.tsx`
- `PdfMappingModal.tsx`

### Funcionalidad a preservar

FORMS-01…06, FORMED-01…08.

Tipos reales (no los 5 del mock): `short_text`, `long_text`, `multiple_choice`, `checkbox`, `date`, `file_upload`, `dropdown`, `rating` + visibilidad condicional + `pdfMapping`.

### Tareas

1. Lista: toolbar + grid de cards (título, conteo secciones/preguntas, editar, duplicar, eliminar, ver público).
2. “Compartir” del prototipo: en acer el público **requiere sesión**. No copiar un enlace `/form/:id` como si fuera suficiente. Mantener el flujo actual (sesión desde perfil).
3. Editor: misma composición (secciones a la izquierda, paleta a la derecha) sobre el DnD y el `PUT /forms/:id` único.
4. Conservar upload/preview/mapping PDF (FORMED-04…07) y confirm de salida (FORMED-08).

### Done

- Crear, duplicar, borrar, editar y reordenar siguen persistiendo.
- Mapping PDF abre el blob y guarda `pdfMapping` en el form.
- Sin `forms.update` no entra al editor.

### Riesgos

- `@dnd-kit` + `pdfjs` son frágiles. Cambiar clases/wrappers, no el modelo de datos.

---

## M8. Catálogo: productos, hoteles, grupos

**Dependencias:** M2. Pueden ejecutarse en paralelo entre sí **después** de M2.  
**Objetivo:** mismas tres vistas de catálogo del prototipo, con CRUD real.

### 8A Productos

- Destino: `ProductsList.tsx`, `ProductFormModal.tsx`, `CategoryManagerModal.tsx`
- Preservar: PROD-01…07 (multipart imagen, filtros `VIAJE_SOLO`→`SOLO`, CRUD categorías)
- UI: toolbar + grid; menú `...` editar/borrar; botón categorías

### 8B Hoteles

- Destino: `HotelList.tsx`, `HotelFormModal.tsx`
- Preservar: HOTEL-01…04 (single/double/triple)
- UI: cards con lugar, habitaciones, contacto
- `GET /hotels/:id` sigue sin usarse

### 8C Grupos

- Destino: `GroupList.tsx`, `GroupCard.tsx`, `GroupFormModal.tsx`, `GroupDetailView.tsx`, `AddClientsToGroupModal.tsx`
- Preservar: GRP-01…06
- UI: card con integrantes + “Administrar” → detalle real (no `GET /groups/:id`)
- Pickers: `fetchClientsForPickers` al entrar a la vista

### Done

- Altas/ediciones/bajas contra API.
- Filtro de productos por categoría no se rompe.
- Un grupo actualiza `clientIds` con `PUT /groups/:id`.

---

## M9. Calendario

**Dependencias:** M2.  
**Objetivo:** mes + panel del día, con eventos reales.

### Fuente UI

- `CalendarView` del prototipo (grid 7×5 + agenda lateral)

### Archivos destino

- `frontend/src/components/calendar/CalendarPage.tsx`
- `frontend/src/lib/calendarEventSort.ts`

### Funcionalidad a preservar

- CAL-01 `GET /calendar/events?from=&to=`
- CAL-02 filtro sucursales (solo UI)
- CAL-03 click día filtra en cliente
- **No** adoptar `GET /calendar/events/by-date` (PARCIAL, sin UI hoy)
- Las citas se crean en el perfil, no aquí

### Tareas

1. Aplicar look TravelUp al calendario existente (`react-big-calendar` o grid propio). No reescribir el fetch de rango.
2. Panel lateral: eventos del día seleccionado (citas + viajes).
3. “+ Evento” del prototipo: **no crear citas huérfanas**. Ocultar o redirigir a clientes.
4. Conservar colores de sucursal / `appointmentColors`.

### Done

- Cambiar de mes pide `from`/`to` correctos.
- Filtro de sucursal solo oculta eventos ya cargados.
- No aparece un alta de evento que falle en API.

---

## M10. Viajes

**Dependencias:** M2, M8B (hoteles), M5 (pickers de clientes).  
**Objetivo:** lista/calendario + detalle en tabs + staff + camiones, con toda la operación actual.

Submódulos internos (cascada dentro de M10):

```
M10.1 Lista, invitaciones, alta/edición
 → M10.2 Detalle: participantes, pickup, PDF local
   → M10.3 Asientos
     → M10.4 Hoteles del viaje
       → M10.5 Finanzas + change log
         → M10.6 Bus templates
           → M10.7 Staff
```

### Archivos destino

- `TripList.tsx`, `TripCard.tsx`, `TripFormModal.tsx`
- `TripDetailView.tsx`, `AddParticipantsToTripModal.tsx`
- `SeatPickerModal.tsx`, `bus-layout/*`
- `TripHotelsSection.tsx`
- `BusTemplateList.tsx`, `BusTemplateFormModal.tsx`
- `StaffCatalogView.tsx`

### Funcionalidad a preservar

TRIP-01…09, TRIPD-01…21, BUS-01…05, STAFF-01…04.

Incluye: `reviewerMode` (sin create/invites/camiones/finanzas de oficina), invitaciones accept/reject, companies para share, `reminderConfig`, cupo familiar de asientos, jsPDF local (TRIPD-15), incomes derivados de pagos (no UI de `createTripIncome`).

### Tareas por submódulo

**10.1** Toggle Lista/Calendario + botones Staff / Mis camiones + Nuevo viaje. Cards con ocupación e ingresos si el payload los trae. Bloque de invitaciones visible solo con `trips.office_admin`.

**10.2** Header de viaje + tabs Participantes / Asientos / Hoteles / Finanzas / Historial. Tabla de participantes con pickup inline. Modal agregar clientes/staff/companions.

**10.3** Restyle del picker; **no** reemplazar por el grid 32 asientos del mock. El layout viene del JSON de plantilla (`BusLayoutRenderer`). Conservar assign/clear/reset y rename de label.

**10.4** `TripHotelsSection`: attach/edit/detach + asignar cama. El “+ hotel” del prototipo abre el dialog real.

**10.5** KPIs de `getTripFinance`; alta/baja gastos; borrar ingreso (pago). Historial = `getTripChangeLog`.

**10.6–10.7** Mismas subvistas, look alineado. Permisos `trip_bus_templates.*` y `trips.participants_manage` / `office_admin`.

### Done

- Reviewer no ve acciones de oficina.
- Aceptar invitación crea el viaje en la company.
- Asientos y habitaciones persisten.
- PDF de lista sigue siendo local.
- Staff CRUD y plantillas CRUD siguen.

### Riesgos

- `TripList`/`TripDetailView` son de los archivos más acoplados. Restyle por secciones; no aplanar props.
- El calendario de viajes es **local** (fechas del viaje), no `/calendar`. No unificarlos.

---

## M11. Administración financiera

**Dependencias:** M2. 11A/11B/11C en paralelo tras M2.  
**Objetivo:** dashboards y tablas con look TravelUp; mismas queries.

### 11A Finanzas — `FinanceDashboard.tsx` + `lib/financePdfExport.ts`

- Preservar FIN-01…07: overview con filtros `from/to/granularity/paymentType/productId/assignedUserId/branchId`
- Granularidades reales (hourly…annual)
- Asesores: front filtra `role.systemKey==='reviewer'`
- Alta/baja gasto empresa; PDF **cliente** (sin endpoint)

Mapear el bento del prototipo (4 KPIs + barras + egresos) a `getFinanceOverview`. No hardcodear `$842,400`.

### 11B Logs de pagos — `PaymentLogsPage.tsx`

- Preservar PLOG-01/02 y recibos compartidos con el perfil
- Tabla del prototipo: Fecha / Referencia / Cliente / Concepto / Monto / Estado → columnas reales (`hasReceipt`, tipo, paquete)
- “Conciliado/Revisión” del mock no existe: usar presencia de recibo u otro campo real

### 11C Comisiones — `CommissionsDashboard.tsx`

- Preservar COM-01…07
- No llamar `GET /commissions/users` (el overview ya trae tasas)
- No añadir preview/payouts history (endpoints sin UI)
- Inline rate + pagar lote `periodType` + `referenceDate`

### Done

- Filtros de finanzas cambian la serie.
- Recibo se ve/sube igual que en el perfil.
- Pagar lote cierra periodo. Quitar asesor llama DELETE.

---

## M12. Usuarios y roles

**Dependencias:** M2.  
**Objetivo:** cards de usuario y editor de permisos con look TravelUp.

### 12A Usuarios

- Destino: `UserList.tsx`, `UserCard.tsx`, `UserFormModal.tsx`, `UserRoleBadge.tsx`
- Preservar USER-01…06 (status toggle, password opcional, `branchId`)
- `GET /users/:id` sigue sin usarse

### 12B Roles

- Destino: `admin/RolesAdminPage.tsx`
- Preservar ROLE-01…05
- El prototipo muestra 7 checkboxes inventados. **No reemplazar** el catálogo `GET /roles/catalog` (`PERMISSION_GROUPS`). Solo restylear grupos/keys reales.
- Roles `isSystem` siguen limitados.

### Done

- Crear usuario con rol/sucursal funciona.
- Guardar rol persiste keys reales.
- No se puede borrar un system role.

---

## M13. Chatbot y settings

**Dependencias:** M2. Pueden ir en paralelo.  
**Objetivo:** mismas dos áreas, visual TravelUp.

### 13A Chatbot

- Destino: `ChatbotSettings.tsx`, `FAQFormModal.tsx`, `FAQCard.tsx`, `BotBehaviorSettings.tsx`
- Preservar BOT-01…07 (tabs FAQ / Comportamiento, toggle activo, debounce flush de `/bot`)
- Campos reales de behavior (personality, tone, greeting, fallback, branchesText, socialLinks, etc.), no solo “Luna”

### 13B Settings

- Destino: `SettingsPage.tsx`, `CompanyBrandingSettings.tsx`, `BranchesCatalog.tsx`, `ChecklistCatalog.tsx`
- Preservar SET-01…10
- Branding: color pickers compactos como el prototipo **y** los tokens extra que acer ya guarda (foreground, card, sidebar, opacidad, fondo, logo dashboard, `advisorClientAccessMode`)
- No eliminar el modo `assigned_only` / `company_wide`

### Done

- FAQ CRUD + toggle.
- Guardar bot hace flush y sobrevive reload.
- Sucursales y checklist templates CRUD.
- Branding aplica a header/dashboard (regresión de M1/M2).

---

## M14. Cotizaciones (nuevo, solo front) — **último módulo de producto**

**Dependencias:** M2, M5, M6. No empezar antes de que el perfil y el shell estén estables.  
**Objetivo:** montar el módulo del prototipo **sin backend**. Datos en memoria (sesión) o `localStorage` namespaced por company. Cero endpoints nuevos.

### Fuente UI (completa en el prototipo)

- `QuotesView`, `QuoteTable`, `QuoteForm` / `QuoteFormModal`
- `QuoteDetail`, `QuotePdfPreview`, `QuoteTemplateEditor`
- `ClientQuotes`, `ClientQuotesBoard`
- Tipos `Quote`, `QuoteTemplate`

### Alcance front-only

- Vista shell `quotes` (añadir a `ShellView` + nav Principal)
- Permiso: reutilizar `nav.clients.view` **o** mostrar a quien ve clientes. No inventar `nav.quotes.view` en el catálogo de back. Documentar el atajo.
- Lista, filtros de status, alta, detalle, plantilla PDF, preview, ligar a cliente (ids/nombres locales)
- Tab “Cotizaciones” en `ClientProfileView` leyendo el store local filtrado por `clientId`/`clientName`
- Descarga PDF: generar en cliente (jsPDF ya está) o “simulada”; no `POST` nuevo

### Fuera de alcance (explícito)

- Tablas, migraciones, controllers, `api.ts` methods
- Notificaciones, comisiones o finanzas derivadas de cotizaciones
- Persistencia entre dispositivos / usuarios
- Subida real de PDF de cotización a storage

### Tareas

1. Extraer el bloque de cotizaciones de `travelup-app.tsx` a `frontend/src/components/quotes/*` + `hooks/useQuotesStore.ts` (Zustand local, no API).
2. Sustituir `clients` mock por `getClients` / picker ya cargado para el select de cliente.
3. Añadir `quotes` a `parseInitialClientNavigation` y a la nav de M2.
4. Tab en perfil (M6) ahora sí se enciende.
5. Plantilla PDF editable en la vista; preview usa logo tenant si `showLogo`.
6. Comentario en código: `TODO(back): persistir cotizaciones cuando exista API`.

### Done

- El módulo se navega y no rompe clientes/viajes.
- Recargar puede perder datos (aceptable) o persistir en `localStorage` (preferible).
- Ningún request nuevo aparece en Network salvo los ya existentes (p. ej. clientes para el picker).

### Riesgos

- No colisionar el nombre `payments` (prototipo) con `paymentLogs` (acer).
- No añadir la key al catálogo de permisos del back en esta fase.

---

## M15. QA transversal

**Dependencias:** M1–M14.  
**Objetivo:** verificar que el restyle no rompió el inventario.

### Matriz mínima (por rol)

Ejecutar con al menos: admin, asesor (`view_assigned`), reviewer de viajes, usuario sin finanzas.

| Flujo | IDs | Notas |
|---|---|---|
| Tenant + login + logout | GLOBAL-01, LOGIN-01, GLOBAL-03 | Company mismatch |
| View as + stats | GLOBAL-05, CLIENTS-13 | Lista y KPIs filtrados |
| Campana + deep link | GLOBAL-06…10 | Abre perfil |
| Dashboard | DASH-01…05 | Números reales |
| CRUD cliente + perfil completo | CLIENTS-*, CLIENT-PROF-* | Titular y familiar |
| Form público con token | PUB-01…09 | Autosave + complete |
| Editor + PDF mapping | FORMED-* | Confirm salida |
| Producto con imagen + categoría | PROD-* | |
| Hotel + grupo | HOTEL-*, GRP-* | |
| Calendario mes | CAL-01…03 | Sin alta fantasma |
| Viaje office vs reviewer | TRIP-*, TRIPD-*, BUS-*, STAFF-* | |
| Finanzas + recibo + comisión | FIN-*, PLOG-*, COM-* | |
| Users / roles / bot / settings | USER-*, ROLE-*, BOT-*, SET-* | |
| Cotizaciones | — | Solo front, último |

### Regresión visual

- Desktop ≥1280 y móvil 390
- Header sticky, dropdowns no recortados
- Branding: cambiar primary/logo y ver header + botones + dashboard
- Sin hex sueltos que ignoren el tema

### No reactivar a propósito

Componentes huérfanos (`SubmissionList`, `ClientDetailModal`) y endpoints `uso_ui=NO` del inventario. El restyle no es el momento de “completar” el front.

---

## Primitivas compartidas (crear en M1, usar en todos)

| Componente | Uso |
|---|---|
| `PageChrome` | Título + subtítulo por vista |
| `AppHeader` rediseñado | Shell |
| `SectionTitle` | Encabezado de card + acción |
| `Toolbar` | Search + filtros + CTA |
| `TabBar` | Perfil cliente, detalle viaje, chatbot, quotes |
| `StatusBadge` | Tonos success / warning / accent / neutral |
| `EmptyState` | Listas vacías |

No crear un segundo `Card` que pise `@/components/ui/card`; componer con clases.

---

## Mapa prototipo → acer (vistas)

| Prototipo `View` | Acer `ShellView` | Notas |
|---|---|---|
| `dashboard` | `dashboard` | |
| `clients` | `clients` | Sin tabs Formularios/Cotizaciones como IA principal |
| `trips` | `trips` | Incluye staff y camiones como subvistas, no toasts mock |
| `quotes` | *(nuevo en M14)* | |
| `calendar` | `calendar` | |
| `forms` | `forms` | En nav Catálogo |
| `products` | `products` | |
| `hotels` | `hotels` | |
| `groups` | `groups` | |
| `finance` | `finance` | |
| `payments` | `paymentLogs` | Nombre distinto |
| `commissions` | `commissions` | |
| `users` | `users` | |
| `roles` | `roles` | Catálogo real de keys |
| `chatbot` | `chatbot` | |
| `settings` | `settings` | Más campos que el prototipo |

---

## Cómo ejecutar en cascada (operación)

1. Una rama / PR por módulo (`ui/m1-fundacion`, `ui/m2-shell`, … `ui/m14-cotizaciones`).
2. No mezclar un módulo de producto con el siguiente en el mismo PR.
3. Checklist del módulo = sección **Done** + IDs de la tabla.
4. Si un PR necesita tocar `Index.tsx`, limitar el diff a nav/chrome/props; no reordenar stores.
5. Prohibido en todos los PRs: cambiar firmas de `api.ts`, permisos de back, o “aprovechar” para implementar endpoints huérfanos.
6. Cotizaciones (M14) no se adelanta aunque el prototipo ya esté listo.

### Estimación relativa (solo para priorizar)

| Módulo | Tamaño | Motivo |
|---|---|---|
| M1 | S | CSS + defaults |
| M2 | L | Index + header + permisos |
| M3 | M | Público es grande pero solo skin |
| M4 | M | Mapear stats vs mock |
| M5 | M | |
| M6 | L | Perfil más denso que el prototipo |
| M7 | L | Editor + PDF |
| M8 | M | Tres CRUDs |
| M9 | S–M | |
| M10 | XL | Más acoplado |
| M11 | M | |
| M12 | S–M | |
| M13 | M | Branding delicado |
| M14 | M | Código nuevo, sin back |
| M15 | M | Matriz de roles |

---

## Riesgos abiertos / decisiones ya tomadas

1. **No se migra el stack** de `jmgo-trvelup` a acer. Se portan patrones visuales.
2. **Formularios no se esconden dentro de Clientes.** El prototipo lo hace; acer tiene permiso y prefetch propios.
3. **Tareas del dashboard** no tienen API. No fingir persistencia.
4. **Alta de evento en calendario** no existe. No crearla en el restyle.
5. **Compartir form** no es un link desnudo. La sesión la crea el asesor.
6. **Cotizaciones** quedan al final y solo front. El back actual no tiene modelo.
7. **Theme** sigue en HSL string; el prototipo usa hex + oklch. Traducir, no pegar.
8. **View as** no se convierte en impersonation de JWT.

---

## Siguiente paso inmediato

Empezar **M1** en `acer-form-builder/frontend`: tokens, fuentes, `DEFAULT_THEME` y primitives. No abrir `Index.tsx` hasta M2.
