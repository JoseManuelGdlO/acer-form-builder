# Comparativa de funcionalidades y lógica: `frontrefactor` vs `main`

Documento de revisión. Objetivo: detectar si el refactor de UI **perdió** funcionalidad o lógica de `main`, y listar la **lógica nueva** de la rama.

No es un inventario visual (clases CSS / primitivas). Es un inventario de comportamiento.

---

## Alcance

| | SHA | Nota |
|---|---|---|
| Base (`origin/main`) | `e9a2fb639ffc822db1441e18a6f531292f31b4cd` | `WIP: Documento funcionalidades` |
| HEAD (`frontrefactor`) | `17c5526f89f48e7da3464e3c7b9a184ba9f5bca8` | 9 commits locales sobre `main` |
| Merge-base | `e9a2fb6` | `main` y esta rama coinciden ahí |

Diff: **114 archivos**, **+10 448 / −4 527** líneas (`git diff --ignore-space-change`).

Commits de la rama (más antiguo → más reciente):

1. `1520402` — Shell TravelUp (AppShell, primitivas, tokens HSL, fuentes).
2. `f009bb1` — UI clientes + dashboard.
3. `7714e17` — UI calendario + formularios.
4. `021aba6` — UI admin + chatbot.
5. `5673838` — Módulo backend de cotizaciones.
6. `c5ca168` — Tokens / Dashboard visual.
7. `ce9d53d` — Copy: “checklist” → “seguimiento”.
8. `bbf0ab9` — Preview e historial de payouts de comisiones.
9. `17c5526` — Ingresos en listado de viajes + citas desde calendario.

Método: diff contra merge-base, comparación `git show main:archivo` vs HEAD en módulos grandes, y cruce con `docs/front-back-funcionalidades.md`.

---

## Veredicto

El refactor **no se come** el CRUD, los permisos de entrada ni las APIs de los módulos que ya existían en `main` (clientes, viajes, forms públicos, grupos, hoteles, productos, usuarios, roles, finanzas overview, pagos, chatbot, settings, branding).

Sí hay **regresiones de superficie** (datos que ya no se ven o flujos que ahora piden más clics) y un **módulo nuevo de cotizaciones incompleto en UI**. La búsqueda global y el CTA del header son lógica nueva a medias.

**Listo para merge:** con correcciones. El restyle es seguro en persistencia; no lo es como “paridad funcional de `main` + Quotes completo”.

---

## Code review (hallazgos por severidad)

### Critical

Ninguno que rompa de inmediato un flujo persistente de `main` (pagos, asientos, forms públicos, auth, invitaciones).

### Important

| # | Hallazgo | Dónde | Por qué importa |
|---|---|---|---|
| I-1 | Tarjeta de cliente ya no muestra CP, formularios completados, notas, paquete siempre visible, ni cita + viaje a la vez. Reasignar asesor pasó del `Select` inline al menú. | `ClientCard.tsx` `clientContext()` | Escaneo operativo del listado. El perfil **sí** conserva esos datos. |
| I-2 | Calendario de viajes perdió vista Agenda, botón Hoy y clic directo al evento. Chips de celda no abren el viaje (`CELL_TRIP_LIMIT = 2`). | `TripCalendar.tsx` vs `TripList.tsx` en main (`react-big-calendar`) | Quien listaba el rango en Agenda ya no puede. Abrir viaje = 2 clics. |
| I-3 | Dashboard oculta `completionRate` y `% activos` si el usuario tiene `trips.view`. | `Dashboard.tsx` `kpis = canViewTrips ? …` | Asesores/admins con viajes dejan de ver tasa de formularios. |
| I-4 | Liquidar comisiones exige preview. Si `GET /payout-preview` falla, `payoutPreview = null` **sin toast** y el botón queda disabled. | `CommissionsDashboard.tsx` ~162–199, 302–317 | En main se liquidaba con solo `confirm` + `periodType`. Ahora un fallo de red bloquea el pago en silencio. Además **ahora se envía `referenceDate`** (en main el día del mes se ignoraba). |
| I-5 | Cotizaciones: `DELETE /quotes/:id` + `removeQuote` existen; la UI no borra. | `QuoteDetail.tsx`, `useQuotesStore.ts:145`, doc `uso_ui: PARCIAL` | Un rol con `quotes.delete` no puede usarlo. |
| I-6 | “Nota de seguimiento” llama `addEvent` sin `label`. El back graba siempre “Nota de seguimiento agregada”. | `QuotesView.tsx:139-142`, `quotes.controller.ts:557` | Timeline inútil. |
| I-7 | El detalle exige `selected && template`. Si la plantilla no carga, el click / deep-link parece muerto. | `QuotesView.tsx:125` | Bloqueo de lectura de una cotización. |
| I-8 | Búsqueda global de viajes filtra el array en memoria. `GET /trips` solo corre en `dashboard` o `trips`. | `useHeaderGlobalSearch.ts:101-114`, `Index.tsx` 490–511 / 632–637 | En clientes/calendario/quotes, “Viajes” sale vacío. |
| I-9 | Búsqueda de clientes ignora “Ver como”: `getClients({ q })` va con el JWT real. | `useHeaderGlobalSearch.ts:72-77` vs `Index.tsx` lista filtrada | Superadmin en view-as ve (y abre) clientes de otros asesores. |
| I-10 | CTA del header es siempre “Nuevo viaje”. `QuotesView.createOpenSignal` y `ClientList.createOpenSignal` existen y `Index` no los pasa. | `Index.tsx:885-899` | CTA contextual invertido. |
| I-11 | Cartera de finanzas pagina todo el padrón (`fetchClientsForPickers` de 100 en 100) para sumar `totalAmountDue - totalPaid` en front. | `FinanceDashboard.tsx:160-176`, `accountsReceivable.ts` | Tenants grandes: muchos GET; KPI incompleto si falla a mitad. |
| I-12 | Quotes sin tests. Roles custom no reciben permisos en la migración (solo `super_admin` / `reviewer` / `consulta`). | `20260909141000-add-quotes-permissions.js` | En producción “desaparece” Cotizaciones hasta editar roles. |
| I-13 | `GET /quotes` no pagina. `ClientQuotes` hace un segundo `getQuotes()` de todo el alcance para ligar. | `quotes.controller.ts`, `ClientQuotes.tsx` | Crece mal; un 500 tumba el tab del expediente. |

### Minor

| # | Hallazgo | Nota |
|---|---|---|
| M-1 | Grilla de `CalendarPage` pide solo el mes civil (`startOfMonth`–`endOfMonth`). | Las celdas del mes anterior/siguiente quedan vacías. **Igual que main** en el fetch; ahora se notan más porque hay grilla de 6 semanas. |
| M-2 | Finanzas: Ganancia / Margen / Crecimiento fusionados en “Utilidad”. | El dato sigue; se perdió la lectura en paralelo. `BarChart` de productos → barras CSS. |
| M-3 | Branding: fallback de radius `12` → `8`. | Solo temas con radius inválido/vacío. |
| M-4 | `nav.admin.view` ya no abre un menú Administración vacío. | Ítems internos siguen gated por su permiso. |
| M-5 | Productos: buscador del header y `Toolbar` interno no están sincronizados. | Main no tenía search de texto; es fricción nueva. |
| M-6 | KPI “Por vencer o vencidas” solo cuenta `expired`. | El back no tiene estado “por vencer”. |
| M-7 | `origin: 'uploaded'` en el modelo, sin UI de carga. | Alcance recortado o pendiente. |
| M-8 | Copy checklist → “seguimiento”. | No es pérdida de lógica; sí de vocabulario para soporte. |

---

## 1. Funcionalidades conservadas (sin pérdida aparente de lógica)

Revisado contra `main` archivo por archivo. “Conservado” = mismos handlers, APIs, confirms y permisos de entrada. El skin cambió.

| Módulo | Qué se mantuvo |
|---|---|
| Rutas (`App.tsx`) | `/login`, `/form/:formId`, `/`, 404. Sin rutas nuevas de React. Cotizaciones entra por `?view=quotes`. |
| Auth / tenant / 401 | Login, `GET /auth/me`, boot tenant, redirect 401. Logout sigue solo local (no usa `POST /auth/logout`). |
| View-as | Sigue siendo **solo front**. Lista de clientes y stats respetan `assignedUserId`. **La búsqueda nueva no.** |
| Clientes — lista | Filtros (status, checklist/seguimiento, producto, sucursal, asesor), paginación, modal alta/edición, polling 60s, toasts, `api.getClient`. |
| Clientes — perfil | Familia, chat WhatsApp, checklist, citas de oficina, pagos (ocultos en hijos), notas, CP, formularios, reasignación. Tabs nuevas; la lógica no se fue al tab. |
| Viajes — CRUD | Crear/editar/borrar, staff, plantillas de bus, asientos, invite, reset asientos, gastos, download de detalle, `reviewerMode` (sin finanzas/historial). |
| Grupos | Buscar, alta, editar, miembros, borrar con `AlertDialog`. |
| Forms admin | Crear, duplicar, borrar, abrir público, PDF mapping, drag, confirm unsaved. `canDelete` de sección ≡ más de una sección. |
| Form público | Mismos session/submission/complete + pausa WhatsApp. |
| Hoteles / productos / usuarios | CRUD + confirms. Categorías de producto se movieron de `Index` a `ProductsList` (siguen existiendo). |
| Finanzas 360 | Overview, filtros de periodo, egresos + confirm, export PDF, pie, tendencia, comisiones del overview, tops. |
| Logs de pago | `getCompanyPayments`, recibo/comprobante. |
| Roles | list/create/update/delete + checkboxes + confirm. |
| Chatbot | FAQ CRUD + confirm delete. `BotBehaviorSettings`: tone, greeting, fallback, personality, name, isActive, delay, phone, sucursales, social. |
| Settings | Checklist/seguimiento catalog, sucursales, branding (mismas claves de color, save/reset, logo central). |
| Notificaciones | Campana, VAPID, dismiss, click → `clientId`. |
| `trips.controller` (resto) | Solo **añade** agregación de ingresos. No quita listado ni reglas de asientos. |
| `viewPermissions.ts` | Mismas entradas + `quotes`. |

---

## 2. Funcionalidades / lógica perdida o regresada

Pérdida = existía en `main` y en HEAD no está, está recortada o cambió el contrato de uso.

### 2.1 Alta — tarjeta de cliente (listado)

**Main** mostraba a la vez: email, teléfono, **CP**, **N formularios completados**, familiares, **Select de asesor** (admin), **paquete siempre** (`Sin paquete` si no hay), total a pagar / pagado, **todos** los viajes asignados, **próxima cita**, **notas**.

**HEAD** (`clientContext`): elige **un** contexto — viajes **o** producto **o** cita. No pinta CP, `formsCompleted` ni `notes`. El asesor es texto; reasignar está en el menú si `isAdmin && onUpdate && users.length > 0`. La barra de pago **sí** sigue.

Impacto: el listado deja de ser un tablero operativo. El expediente no perdió esos campos.

### 2.2 Alta — calendario de viajes

**Main:** `react-big-calendar` con `views={['month', 'agenda']}`, mensajes Hoy/Agenda, `onSelectEvent` → `handleViewTrip(trip.id)`, evento = rango `departureDate` → fin de `returnDate`.

**HEAD:** `TripCalendar` mes + sidebar. Anterior/Siguiente. Chips son `<span>` (no abren). Hay que elegir día y luego “Viajes del día”. Máx. 2 chips (`CELL_TRIP_LIMIT`). Sin Agenda, sin Hoy.

El solape departure–return **sí** se mantiene (`tripOverlapsDay`).

### 2.3 Media — KPIs del dashboard

**Main:** 5 cards fijas siempre: Total clientes (+ `% activos`), Respuestas, **Tasa de Completado**, Viajes próximos, Ocupación. Más bloque “Tasa de clientes activos”.

**HEAD:** si `canViewTrips` (el caso normal de un asesor/admin): Viajes próximos, Clientes (hint = **pendientes**, no activos), Envíos, Ocupación, opcional Grupos en operación. **`completionRate` no se pinta.** Solo el rol *sin* `trips.view` ve “Completado” y “X activos”.

`completionRate` se sigue calculando; solo no se muestra.

### 2.4 Media — liquidación de comisiones

| | Main | HEAD |
|---|---|---|
| Preview | No se usaba (el endpoint ya existía) | Obligatorio |
| Payload de pago | `{ periodType }` | `{ periodType, referenceDate }` |
| Bloqueos | Solo `canPay` + confirm | `alreadyPaid`, `totalAmount === 0`, preview null |
| Error de preview | N/A | `catch` silencioso |

Cambio de negocio: el día de referencia **ahora sí** entra en el periodo liquidado. Validar un periodo real en staging antes de producción.

### 2.5 Media — calendario de citas (interacción)

**Main:** DayPicker `mode="single"`, punto `hasEvents`, sidebar con *todos* los eventos del día, se podía dejar el día sin seleccionar (“Selecciona un día”).

**HEAD:** grilla custom, `CELL_EVENT_LIMIT = 2`, chips no clicables, `selectedDate` siempre definido. El filtro de sucursal **sí** se conserva. A cambio hay **crear cita** y **abrir cliente** (eso es nuevo, no pérdida).

### 2.6 Baja — finanzas (lectura de KPIs)

Ganancia neta, margen y crecimiento vs periodo anterior siguen en el payload; se compactaron en una card “Utilidad”. El gráfico de ingresos por producto ya no es `BarChart`.

### 2.7 Baja — branding y nav

- Fallback de radius: 12 → 8.
- Un usuario *solo* con `nav.admin.view` (sin finance/users/roles/…) ya no ve un dropdown Administración vacío. Los permisos por pantalla no cambiaron.

### 2.8 Copy (no es pérdida de lógica)

“Checklist” → “Seguimiento” en Roles, `ClientChecklist`, `ClientList`, `ClientProfileView`, `ChecklistCatalog`, `index.html`.

---

## 3. Nueva lógica creada

### 3.1 Cotizaciones (módulo fullstack nuevo)

No existía en `main`.

**Backend**

- Tablas: `quotes`, `quote_events`, `quote_templates` (`20260909140000-create-quote-tables.js`).
- Permisos: `nav.quotes.view`, `quotes.view|create|update|delete` (`20260909141000-add-quotes-permissions.js`).
- Controller: `listQuotes`, `getQuoteById`, `createQuote`, `updateQuote`, `updateQuoteStatus`, `linkQuote`, `addQuoteEvent`, `deleteQuote`, plantilla GET/PUT, PDF cotización + PDF ejemplo.
- Folio único por tenant `COT-` + 6 hex (`generateFolio`).
- Alta siempre `draft` + `origin: 'system'`. Copia incluye / no incluye / términos de la plantilla.
- Eventos de alta y de ligue al expediente.
- Alcance: si no `clients.view_all` / company-wide, filtra por `client.assignedUserId`.
- `resolveStatus`: un `registered` con `validUntil` pasada se **serializa** como `expired` sin UPDATE en BD.
- PDF: `quote-pdf.service.ts` (pdf-lib, A4 una página, logo opcional).

**Frontend**

- Shell `?view=quotes` (`QuotesView`, `QuoteForm` / modal, `QuoteDetail`, `QuoteTable`, `QuoteTemplateEditor`, `QuotePdfPreview`).
- Tab en perfil: `ClientQuotes` (lista del cliente, alta con `clientId` fijo, ligar existente).
- Store `useQuotesStore` + tipos `types/quote.ts` + `quoteFormat.ts`.
- Cliente HTTP: 12 métodos de quotes en `api.ts`.

**Estados de UI:** `draft | registered | expired`. La UI solo alterna draft ↔ registered; el vencido lo calcula el back al serializar.

### 3.2 Calendario de oficina

- `CreateCalendarEventDialog`: titular (sin `parentClientId`), hora opcional, rol `reviewer|admin`, motivo → `POST /clients/:id/internal-appointments`. Respeta view-as en el picker. Permiso `appointments.create`.
- Click en evento `type === 'office'` con `clientId` → abre perfil (`focusClientId` + `view=clients`).

En main las citas solo se creaban desde el expediente.

### 3.3 Viajes

- `GET /trips` añade `totalIncome` = `SUM(ClientPayment.amount)` por `tripId` **solo si** `trip_finance.view`. Front: `tripListIncome` + `TripCard`.
- `tripSchedulePhase`: Próximo / En curso / Concluido **solo visual** (el API no trae status).
- `tripOccupancy` a partir de `participantCount` o `participants.length`.
- `TripCalendar` (reemplazo de `react-big-calendar`; ver pérdidas).
- Deep-link `openTripId` / `focusTripId` y signal `createOpenSignal` para abrir el modal de alta desde el header.
- KPI “Coordinación” en detalle: `resolveUserName(trip.assignedUserId)`. Sin `users.view` la lista llega `[]` → “Sin asignar”.

### 3.4 Dashboard

- Agenda de hoy: `GET /calendar/events?from=hoy&to=hoy` si `appointments.view`.
- Hasta 3 próximos viajes (`returnDate >= hoy`), clicables hacia la lista (no hacia un `focusTripId` concreto).
- **Grupos en operación:** `countGroupsInOperation` — grupos con un viaje asignado Próximo o En curso. Requiere que `useGroupStore.mapGroup` mapee `assignedTrips` (en main **no se mapeaba**; el API ya lo mandaba).
- Logo: `DASHBOARD_CENTER_LOGO_IMAGE_KEY` **o** `company.logoUrl`.
- KPIs clicables hacia módulos.

### 3.5 Finanzas — cartera

`accountsReceivableFromClients`: saldo pendiente de **titulares** con `totalAmountDue` finito: `max(0, due - paid)`. No recorta por el periodo del overview. Sale en cards + línea del PDF (“Cartera no incluida en el periodo”).

Es heurística de front, no un endpoint.

### 3.6 Comisiones — preview e historial (UI)

El endpoint de preview **ya existía** en main. Lo nuevo es usarlo:

- Al cambiar periodo / día → `GET /commissions/payout-preview?referenceDate=`.
- Tabla de preview, bloqueo si ya pagado o monto 0.
- Confirm con total.
- Historial desde `overview.paidPayouts` (no llama `GET /commissions/payouts`, aunque el wrapper `getCommissionPayouts` es nuevo).

### 3.7 Búsqueda global del header

`useHeaderGlobalSearch` + `HeaderSearchResults`. Visible en dashboard, clients, trips, products, quotes. Debounce 300 ms, abortable.

| Sección | Fuente | Al elegir hit |
|---|---|---|
| Clientes | `GET /clients?q=&page=1&limit=5` | Abre perfil (`focusClientId`) |
| Cotizaciones | `GET /quotes?q=` | Abre detalle (`focusQuoteId`) |
| Viajes | Array en memoria | Abre detalle (`focusTripId`) |
| Productos | Array en memoria | Solo navega a la vista (no enfoca un producto) |

### 3.8 Shell / tema

- `AppShell`, `PageChrome`, `SectionTitle`, `Toolbar`, `StatusBadge`, `TabBar`.
- Nav agrupada Principal / Catálogo / Administración (`shellNav.ts`). Formularios pasa a Catálogo.
- Vista `quotes` en `ShellView`.
- `theme.ts`: `DEFAULT_THEME` HSL + `SUPERSEDED_THEME_DEFAULTS` — si el theme guardado es un default viejo, `applyTheme` **no lo aplica** (cae al CSS nuevo). Es un cambio de comportamiento intencional para tenants con defaults antiguos.
- `api.request` no loguea `AbortError` (necesario para la búsqueda).

### 3.9 Endpoints / permisos nuevos

Montados en `/api/quotes` (`quotes.routes.ts`):

| HTTP | Ruta | Permiso |
|---|---|---|
| GET | `/quotes` | `quotes.view` |
| GET | `/quotes/template` | `quotes.view` |
| PUT | `/quotes/template` | `quotes.update` |
| GET | `/quotes/template/pdf` | `quotes.view` |
| GET | `/quotes/:id` | `quotes.view` |
| GET | `/quotes/:id/pdf` | `quotes.view` |
| POST | `/quotes` | `quotes.create` |
| PUT | `/quotes/:id` | `quotes.update` |
| PATCH | `/quotes/:id/status` | `quotes.update` |
| POST | `/quotes/:id/link` | `quotes.update` |
| POST | `/quotes/:id/events` | `quotes.update` |
| DELETE | `/quotes/:id` | `quotes.delete` |

Cambio en endpoint existente: `GET /trips` puede devolver `totalIncome`.

---

## 4. Lógica nueva incompleta o sin cablear

1. **Borrar cotización** — back + store listos; sin botón.
2. **`origin: 'uploaded'`** — enum y label; no hay upload.
3. **Marcar vencida a mano** — el PATCH acepta `expired`; la UI no.
4. **Nota de seguimiento libre** — `label` opcional; el botón no lo pide.
5. **`createOpenSignal` de Quotes y Clientes** — API de componente lista; `Index` no la usa. El CTA global es solo viaje.
6. **`GET /commissions/payouts`** — wrapper nuevo, cero callers.
7. **Filtro `?status=` de quotes** — el back lo implementa; el front filtra en memoria.
8. **PDF de una página** — listas largas de incluye/condiciones se salen.
9. **Cartera y grupos en operación** — heurísticas de front; el propio código lo documenta como aproximación.
10. **Permisos quotes en roles custom / office_admin** — la migración no los toca.
11. **Búsqueda de productos** — no enfoca un producto.
12. **Detalle de quote bloqueado por plantilla** — ver I-7.
13. **HEX en plantilla PDF** — necesario para pdf-lib; choca con la regla HSL del resto del front.

Huecos que **ya estaban en main** (no son regresión): `POST /auth/logout`, `GET /calendar/events/by-date`, historial de una cita, `downloadSubmissionPdf`, etc. Siguen en `front-back-funcionalidades.md` como `uso_ui: NO/PARCIAL`.

---

## 5. Mapa rápido por módulo

| Módulo | ¿Perdió lógica de main? | ¿Ganó lógica? |
|---|---|---|
| Shell / header | Baja (`nav.admin.view`) | Búsqueda global, CTA viaje, nav agrupada |
| Dashboard | Media (KPIs de completado/activos si hay viajes) | Agenda hoy, próximos viajes, grupos en operación |
| Clientes lista | Alta (datos en card) | Signal de alta no cableado |
| Clientes perfil | No | Tab cotizaciones |
| Viajes lista/detalle | Alta en vista calendario | Ingresos, fase visual, deep-link |
| Calendario citas | Media (interacción/grilla) | Crear cita, abrir cliente |
| Finanzas | Baja (lectura de KPIs) | Cartera |
| Comisiones | Media (pago gated + `referenceDate`) | Preview + historial UI |
| Forms / público | No | Conteo de envíos en lista |
| Grupos / hoteles / productos / users / roles / chatbot / settings | No | Search local, cards extraídas, copy seguimiento |
| Cotizaciones | N/A (no existía) | Módulo completo back; UI incompleta |

---

## 6. Recomendaciones (si se busca paridad + Quotes listo)

1. Restaurar en `ClientCard` (o en un overlay) CP, formularios, notas y contextos simultáneos; o documentar el recorte como decisión de producto.
2. En `TripCalendar`: clic en chip → abrir viaje; botón Hoy; valorar una vista lista/agenda del rango.
3. Dashboard: mostrar `completionRate` / `% activos` también cuando hay `trips.view` (aunque sea como hint).
4. Comisiones: toast si el preview falla; no deshabilitar el pago sin feedback. Validar `referenceDate` en staging.
5. Quotes: botón borrar + confirm (`quotes.delete`); input de nota; detalle sin AND-ear la plantilla; paginar listado.
6. Búsqueda: prefetch de viajes al boot (como products); pasar `assignedUserId` de view-as a `getClients`.
7. CTA del chrome por `ShellView` (Nueva cotización / Agregar cliente / ocultar).
8. Cartera y grupos en operación deberían nacer en backend si van a ser KPI de negocio.
9. Tests de integración del módulo Quotes (scope assigned, folio, status/vigencia, PDF smoke).
10. Documentar o seedear permisos de Quotes en roles custom.

---

## 7. Referencias

- Diff: `git -c diff.autoRefreshIndex=false diff --no-color --ignore-space-change e9a2fb6 HEAD`
- Inventario de pantallas/endpoints: `docs/front-back-funcionalidades.md`
- Primitivas UI: `.cursorrules`
- Reviewers de esta pasada: comparación estática `main@e9a2fb6` vs `HEAD@17c5526`. No se ejecutó la app.
