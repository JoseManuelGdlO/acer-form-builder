# Inventario de funcionalidades Front ↔ Back

Documento de referencia para agentes. Lista **todas** las pantallas, subvistas, modales y endpoints del backend, con la lógica a la que están conectados.

Convenciones:

- Prefijo API: `/api` (`VITE_API_URL`, por defecto `http://localhost:3001/api`).
- Shell interno: SPA en `/` con `?view=` (`frontend/src/pages/Index.tsx`).
- Cliente HTTP: `frontend/src/lib/api.ts`.
- Auth: JWT en `localStorage` (`auth_token`), header `Authorization: Bearer`.
- Columna `uso_ui`: `SI` = hay UI que lo llama; `NO` = endpoint existe en back (y a veces en `api.ts`) pero **ninguna pantalla lo usa**.
- Columna `tipo`: `ruta` | `shell` | `subvista` | `modal` | `global` | `confirm`.

---

## Cómo leer las tablas

Cada tabla de pantalla usa estas columnas:

| Columna | Significado |
|---|---|
| `id` | ID estable para citar (ej. `CLIENTS-07`) |
| `tipo` | Tipo de superficie UI |
| `superficie` | Nombre de pantalla/modal |
| `archivo` | Componente principal |
| `accion_ui` | Qué hace el usuario |
| `api_client` | Método en `api.ts` / store |
| `http` | Método HTTP |
| `endpoint` | Ruta relativa a `/api` |
| `controller` | Función del controlador |
| `permiso` | Permiso(s) de `permissions.catalog.ts` (o `auth` / `publico`) |
| `logica_back` | Qué hace el backend |

---

## 0. Mapa de rutas React

| ruta | componente | auth | nota |
|---|---|---|---|
| (boot) | `TenantProvider` | no | Antes de pintar rutas llama `GET /public/tenant` |
| (boot error) | `DomainNotConfigured` | no | Si tenant 404 |
| `/login` | `Login` | no | Login por email/password |
| `/form/:formId` | `PublicFormView` | no (token de sesión en query) | Formulario público del cliente |
| `/` | `Index` (shell) | `ProtectedRoute` | Requiere JWT + `GET /auth/me` |
| `*` | `NotFound` | no | 404 local, sin API |

Query del shell (`/`):

- `?view=<ShellView>` — vista inicial.
- `?view=clients&clientId=<uuid>` — abre perfil de cliente (notificaciones).

`ShellView`: `dashboard` | `forms` | `clients` | `products` | `hotels` | `calendar` | `finance` | `paymentLogs` | `commissions` | `groups` | `trips` | `quotes` | `users` | `roles` | `chatbot` | `settings`.

---

## 1. Capa global (todas las pantallas autenticadas)

### 1.1 Tenant / marca

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| GLOBAL-01 | global | Boot tenant | `contexts/TenantContext.tsx` | Al cargar la app resuelve empresa por hostname (`localhost` → slug `aser`) | `getTenant` | GET | `/public/tenant?domain=` | `public.getTenantByDomain` | publico | Busca `Company` por slug, luego por campo `domain` (hostname o lista). Devuelve `company` + `theme`. 404 → pantalla Dominio no configurado |
| GLOBAL-02 | global | Auth restore | `contexts/AuthContext.tsx` | Si hay token, hidrata usuario | `getMe` | GET | `/auth/me` | `auth.me` | auth | Valida JWT, carga user + role + permissions + company |
| GLOBAL-03 | global | Header logout | `layout/AppHeader.tsx` | Cerrar sesión | (solo localStorage; **no llama** logout del back) | — | — | — | — | Front borra token y redirige a `/login`. `POST /auth/logout` existe y no se usa |
| GLOBAL-04 | global | 401 | `lib/api.ts` | Cualquier request 401 | `handleAuthError` | — | — | — | — | Borra token y redirige a `/login` |
| GLOBAL-05 | modal | View as | `admin/ViewAsSelector.tsx` | Superusuario simula otro usuario en el shell | `getUsers` | GET | `/users` | `users.getAllUsers` | `session.view_as` + `users.view` | Lista usuarios de la compañía. El “view as” es **solo front**: filtra clientes/stats en `Index`; no hay endpoint de impersonation |
| GLOBAL-06 | global | Header notificaciones | `notifications/NotificationBell.tsx` | Badge + lista | `getNotifications` | GET | `/notifications` | `notifications.getMyNotifications` | auth (`notifications.view` en catálogo) | Lista notificaciones del usuario autenticado |
| GLOBAL-07 | global | Abrir campana | mismo | Al abrir: pedir permiso push + marcar leídas | `getVapidPublicKey` + `registerPushSubscription` + `markNotificationRead` | GET / POST / PATCH | `/notifications/vapid-public-key` `/notifications/push-subscriptions` `/:id/read` | `getVapidPublicKey` `registerPushSubscription` `markNotificationRead` | publico (VAPID) / auth | Clave pública VAPID; guarda `PushSubscription`; marca `readAt` |
| GLOBAL-08 | global | Descartar una | mismo | Click X | `dismissNotification` | DELETE | `/notifications/:id` | `dismissNotification` | auth | Soft-dismiss de un recipient |
| GLOBAL-09 | global | Descartar todas | mismo | Botón limpiar | `dismissAllNotifications` | DELETE | `/notifications` | `dismissAllNotifications` | auth | Dismiss masivo del usuario |
| GLOBAL-10 | global | Click notificación | mismo | Navega a `actionUrl` (legacy `/clients/:id` → `/?view=clients&clientId=`) | `markNotificationRead` | PATCH | `/notifications/:id/read` | `markNotificationRead` | auth | Marca leída |
| GLOBAL-11 | global | SW push | `hooks/useNotifications.ts` + `Index.tsx` | Mensaje SW `NOTIFICATIONS_UPDATED` | refresca notificaciones / clientes / submissions / stats | — | — | — | — | Si tipo `whatsapp_reply`, recarga CRM |
| GLOBAL-12 | global | Mobile nav sheet | `AppHeader` | Menú hamburguesa | — | — | — | — | — | Solo UI; mismos botones de nav |

Prefetch al montar `Index` (si hay token):

| id | cuando | api_client | http | endpoint | permiso | logica_back |
|---|---|---|---|---|---|---|
| PRE-01 | mount | `fetchForms` | GET | `/forms` | auth + `forms.view` (en controller) | Formularios del tenant |
| PRE-02 | mount | `fetchSubmissions` | GET | `/submissions` | `submissions.view_*` | Envíos del tenant (alcance por permiso) |
| PRE-03 | mount | `fetchClients` | GET | `/clients` | `clients.view_all` o `view_assigned` | Lista paginada |
| PRE-04 | mount | `fetchProducts` | GET | `/products` | `products.view` | Catálogo comercial |
| PRE-05 | siempre (stats nav) | `getClientStats` | GET | `/clients/stats` | mismos de clients | Conteos total/active/inactive/pending; query `assignedUserId` si view-as o filtro asesor |

---

## 2. Ruta `/login` — Iniciar sesión

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| LOGIN-01 | ruta | Login | `pages/Login.tsx` | Submit email/password | `login` | POST | `/auth/login` | `auth.login` | publico | Compara password hash; rechaza inactivos; JWT + user (role, permissions, company). Front además valida que `user.company.id` coincida con tenant del dominio |
| LOGIN-02 | ruta | Login | mismo | Logo/nombre empresa | (tenant ya cargado) | — | — | — | — | No llama API extra |

---

## 3. Ruta `/form/:formId` — Formulario público

Query: `?token=<sessionId>` (UUID de `FormSession`). Sin token muestra error.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| PUB-01 | ruta | Formulario público | `pages/PublicFormView.tsx` | Cargar definición del form | `getForm` | GET | `/forms/:id` | `forms.getFormById` | **publico** (ruta sin `authenticate`) | Devuelve form + secciones + preguntas. Usado también por admin |
| PUB-02 | ruta | mismo | mismo | Restaurar progreso | `getFormSessionProgress` | GET | `/forms/:id/sessions/:sessionId` | `form-sessions.getFormSessionProgress` | publico (token = session id) | Lee progreso JSON de la sesión |
| PUB-03 | ruta | mismo | mismo | Autosave progreso | `updateFormSessionProgress` | PATCH | `/forms/:id/sessions/:sessionId` | `updateFormSessionProgress` | publico | Persiste `progress` (clientInfo, answers, step, section) |
| PUB-04 | ruta | mismo | mismo | Si ya hay submission | `getSubmissionBySession` | GET | `/forms/:id/sessions/:sessionId/submission` | `submissions.getSubmissionBySession` | publico | Submission ligada a la sesión |
| PUB-05 | ruta | mismo | mismo | Crear submission al empezar | `createSubmissionFromSession` | POST | `/forms/:id/sessions/:sessionId/submission` | `createSubmissionFromSession` | publico | Crea submission; asocia cliente de la sesión |
| PUB-06 | ruta | mismo | mismo | Guardar respuestas por sección | `updateSubmissionFromSession` | PATCH | mismo + `/submission` | `updateSubmissionFromSession` | publico | Merge de answers; opcional `status` |
| PUB-07 | ruta | mismo | mismo | Completar | `completeFormSession` | POST | `/forms/:id/sessions/:sessionId/complete` | `completeFormSession` | publico | Marca sesión completada; cierra flujo |
| PUB-08 | ruta | mismo | mismo | Al iniciar (si hay teléfono) pausa bot WhatsApp | `pauseConversationByPhone` | PATCH | `/addChat/:phone/baja` | `conversations.bajaLogicaConv` | ruta declara `authenticate` | Baja lógica de conversación bot (`baja_logica=true`) para que el bot no interrumpa el llenado. **Nota:** el cliente no exige token; la ruta sí tiene `authenticate` |
| PUB-09 | ruta | mismo | mismo | Tipos de pregunta | — | — | — | — | — | Front renderiza: `short_text`, `long_text`, `multiple_choice`, `checkbox`, `date`, `file_upload`, `dropdown`, `rating` + visibilidad condicional (`visibility.rules`) |

La sesión la crea el asesor desde el perfil de cliente (`CLIENT-PROF-12`), no esta pantalla.

---

## 4. Ruta `*` — 404

Sin backend. Solo log de pathname.

---

## 5. Dominio no configurado

Sin backend extra. Se muestra si `GET /public/tenant` falla.

---

## 6. Shell `dashboard` — Inicio

Permiso entrada: `nav.dashboard.view`.

Datos: reusa listas prefetch + stats.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| DASH-01 | shell | Dashboard | `dashboard/Dashboard.tsx` | KPIs clientes | `getClientStats` | GET | `/clients/stats` | `clients.getClientStats` | clients.view_* | Conteos por status; respeta `assignedUserId` si view-as |
| DASH-02 | shell | mismo | mismo | KPIs submissions | `getSubmissionStats` (store, puede pegar API) | GET | `/submissions/stats` | `submissions.getSubmissionStats` | submissions.view_* | Totales pending / in_progress / completed |
| DASH-03 | shell | mismo | `Index.tsx` | KPIs viajes | `getTripStats` | GET | `/trips/stats` | `trips.getTripStats` | `trips.view` | Viajes próximos, asientos, ocupación, salidas 30 días |
| DASH-04 | shell | mismo | mismo | Feed actividad | — | — | — | — | — | **Solo front**: deriva de arrays `clients`, `submissions`, `forms` ya cargados |
| DASH-05 | shell | mismo | mismo | Logo centro | tenant.theme | — | — | — | — | Clave de theme `DASHBOARD_CENTER_LOGO_IMAGE_KEY`; viene del tenant |

---

## 7. Shell `clients` — Clientes

Permiso entrada: `nav.clients.view`.

Subvistas: lista → perfil (`ClientProfileView`).

### 7.1 Lista

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| CLIENTS-01 | shell | Lista clientes | `clients/ClientList.tsx` + `useClientStore` | Listar paginado + filtros | `getClients` | GET | `/clients?q&status&checklistTemplateId&checklistMode&productId&branchId&assignedUserId&page&limit` | `clients.getAllClients` | `clients.view_all` o `view_assigned` | Tenant-scoped. Si no `view_all`, filtra `assignedUserId=req.user`. Checklist: `completed` / `not_completed`. Paginación |
| CLIENTS-02 | shell | mismo | `Index.tsx` | Pastillas de status / badge nav | `getClientStats` | GET | `/clients/stats` | `getClientStats` | igual | Conteos del alcance (view-as o filtro asesor) |
| CLIENTS-03 | shell | mismo | `ClientList` | Filtro sucursal (admin) | `getBranches` | GET | `/branches` | `branches.getAllBranches` | `branches.view` | Sucursales activas para el select |
| CLIENTS-04 | shell | mismo | mismo | Filtro checklist | `getChecklistTemplates` | GET | `/checklist/templates` | `checklist.getAllTemplates` | `checklist_templates.view` | Plantillas activas para filtrar clientes |
| CLIENTS-05 | shell | mismo | `Index` | Dropdown asesores | `getUsers` | GET | `/users` | `users.getAllUsers` | `users.view` o `clients.reassign_advisor` | Usuarios de la compañía |
| CLIENTS-06 | shell | mismo | mismo | Productos en cards/filtros | `getProducts` | GET | `/products` | `products.getAllProducts` | `products.view` | Catálogo |
| CLIENTS-07 | modal | Filtros | `ClientList` Dialog | Modal “Filtros de clientes” | mismos GET | — | — | — | — | UI local; al aplicar dispara `onFiltersChange` → `CLIENTS-01` |
| CLIENTS-08 | modal | Crear/editar cliente | `clients/ClientFormModal.tsx` | Crear | `createClient` | POST | `/clients` | `clients.createClient` | `clients.create` | Crea cliente: name, email, phone, address, postalCode, birthDate, notes, status, productId, parentClientId, assignedUserId, relationshipToHolder. Inicializa checklist. Scope tenant |
| CLIENTS-09 | modal | mismo | mismo | Editar | `updateClient` | PUT | `/clients/:id` | `clients.updateClient` | `clients.update` (+ `reassign_advisor` para cambiar asesor) | Update campos; puede reasignar asesor; familiares |
| CLIENTS-10 | confirm | Lista | `ClientList` / card | Eliminar | `deleteClient` | DELETE | `/clients/:id` | `clients.deleteClient` | `clients.delete` | Baja cliente (y relaciones según controller) |
| CLIENTS-11 | shell | Deep link | `ClientList` | `?clientId=` | `getClient` | GET | `/clients/:id` | `clients.getClientById` | clients.view_* | Carga un cliente y abre perfil |
| CLIENTS-12 | shell | Polling 60s | `Index` | Auto-refresh lista | `getClients` + `getSubmissions` + `getClientStats` | GET | ver arriba | — | — | Refresco CRM |
| CLIENTS-13 | shell | View as | `Index` | Filtra lista en memoria **y** pide stats con `assignedUserId` | — | — | — | — | `session.view_as` | No impersona en JWT |

Campos del modal cliente: nombre, email, teléfono (normalizado), CP, dirección, fecha nacimiento, notas, status (`pending`/`active`/`inactive`), producto, titular (`parentClientId`), parentesco, asesor (`assignedUserId` si admin).

### 7.2 Subvista perfil de cliente

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| CLIENT-PROF-01 | subvista | Perfil | `clients/ClientProfileView.tsx` | Cargar ficha | `getClient` | GET | `/clients/:id` | `getClientById` | clients.view_* | Cliente + assignedUser + product + parent + children |
| CLIENT-PROF-02 | subvista | mismo | mismo | Notas | `getClientNotes` | GET | `/notes/clients/:clientId` | `notes.getClientNotes` | `client_notes.view` | Notas del cliente |
| CLIENT-PROF-03 | subvista | mismo | `ClientNotes` | Crear nota | `createNote` | POST | `/notes/clients/:clientId` | `createNote` | `client_notes.create` | Crea nota con `content` |
| CLIENT-PROF-04 | subvista | mismo | `ClientNotes` | Borrar nota | `deleteNote` | DELETE | `/notes/:id` | `deleteNote` | `client_notes.delete` | Elimina nota. **PUT `/notes/:id` (`updateNote`) no tiene UI** |
| CLIENT-PROF-05 | subvista | mismo | mismo | Mensajes internos | `getClientMessages` | GET | `/messages/clients/:clientId` | `messages.getClientMessages` | `client_messages.view` | Chat interno agente/cliente |
| CLIENT-PROF-06 | subvista | mismo | `ClientChat` | Enviar mensaje | `createMessage` | POST | `/messages/clients/:clientId` | `createMessage` | `client_messages.create` | `{ content, sender: 'user'\|'client' }` |
| CLIENT-PROF-07 | subvista | mismo | mismo | Historial WhatsApp/bot | `getClientConversations` | GET | `/addChat/clients/:clientId` | `getClientConversations` | `conversations.view` | Mensajes del bot; se fusionan en el chat (dedupe echo) |
| CLIENT-PROF-08 | subvista | mismo | mismo | Pausar/reanudar bot | `pauseConversationByPhone` | PATCH | `/addChat/:phone/baja` | `bajaLogicaConv` | `conversations.update` | `{ baja_logica: bool }` |
| CLIENT-PROF-09 | subvista | mismo | mismo | Envíos de forms | `getSubmissions({ clientId })` + `getForm` | GET | `/submissions?clientId=` `/forms/:id` | `getAllSubmissions` `getFormById` | submissions + forms | Lista submissions y mapea answers a títulos de pregunta |
| CLIENT-PROF-10 | subvista | Checklist | `ClientChecklist` | Ver ítems | `getClientChecklist` + templates | GET | `/checklist/clients/:clientId` `/checklist/templates` | `getClientChecklist` `getAllTemplates` | `client_checklist.view` | Items por plantilla + estado completado |
| CLIENT-PROF-11 | subvista | mismo | mismo | Toggle ítem | `updateChecklistItem` | PUT | `/checklist/clients/:clientId/items/:itemId` | `updateChecklistItem` | `client_checklist.update` | `{ isCompleted }` |
| CLIENT-PROF-12 | subvista | Forms asignados | mismo | Asignar formulario | `createFormSession` | POST | `/forms/:id/sessions` | `createFormSession` | auth + forms | Crea sesión ligada al cliente; genera URL pública `/form/:formId?token=sessionId` |
| CLIENT-PROF-13 | subvista | mismo | mismo | Listar sesiones | `getClientFormSessions` | GET | `/forms/sessions/client/:clientId` | `getClientFormSessions` | auth | Sesiones in_progress/completed |
| CLIENT-PROF-14 | subvista | Pagos (solo titular) | `ClientPaymentHistory` | Listar pagos | `getClientPayments` | GET | `/payments/clients/:clientId` | `getClientPayments` | `client_payments.view` | Pagos del titular |
| CLIENT-PROF-15 | subvista | mismo | mismo | Registrar pago | `createPayment` | POST | `/payments/clients/:clientId` | `createPayment` | `client_payments.create` | amount, date, type (tarjeta/transferencia/efectivo), reference, note, acquiredPackageId. Puede disparar comisiones |
| CLIENT-PROF-16 | subvista | mismo | mismo | Borrar pago | `deletePayment` | DELETE | `/payments/:id` | `deletePayment` | `client_payments.delete` | Borra pago y escribe `ClientPaymentDeletedLog` |
| CLIENT-PROF-17 | subvista | mismo | mismo | Total a pagar | `updateClient` `{ totalAmountDue }` | PUT | `/clients/:id` | `updateClient` | `client_financials.update` | Actualiza total; escribe historial amount-due |
| CLIENT-PROF-18 | subvista | mismo | mismo | Historial total a pagar | `getClientAmountDueHistory` | GET | `/clients/:id/amount-due-history` | `getClientAmountDueHistory` | `client_audit_logs.view` | Audit log |
| CLIENT-PROF-19 | subvista | mismo | mismo | Historial pagos borrados | `getClientPaymentDeletedHistory` | GET | `/clients/:id/payment-deleted-history` | `getClientPaymentDeletedHistory` | `client_audit_logs.view` | Audit log |
| CLIENT-PROF-20 | subvista | mismo | mismo | Paquetes adquiridos | `getClientAcquiredPackages` | GET | `/clients/:id/acquired-packages` | `getClientAcquiredPackages` | client_financials/payments | Paquetes comprados (pueden asignarse a familiar) |
| CLIENT-PROF-21 | subvista | mismo | mismo | Alta paquete | `createClientAcquiredPackage` | POST | `/clients/:id/acquired-packages` | `createClientAcquiredPackage` | create | productId + opcional familiar |
| CLIENT-PROF-22 | subvista | mismo | mismo | Quitar paquete | `deleteClientAcquiredPackage` | DELETE | `/clients/:id/acquired-packages/:packageId` | `deleteClientAcquiredPackage` | update/delete | Quita paquete |
| CLIENT-PROF-23 | subvista | mismo | mismo | Catálogo paquetes | `getProductsByCategories(['PAQUETE'])` + `getProducts` | GET | `/products/by-category` `/products` | `getProductsByCategories` `getAllProducts` | `products.view` | Productos categoría PAQUETE |
| CLIENT-PROF-24 | modal | Recibo de pago | `payments/PaymentReceiptActions.tsx` | Ver recibo | `getPaymentReceipt` | GET | `/payments/:id/receipt` | `getPaymentReceipt` | `client_payments.view` | Imagen data-URL |
| CLIENT-PROF-25 | modal | mismo | mismo | Subir recibo | `uploadPaymentReceipt` | PUT | `/payments/:id/receipt` | `updatePaymentReceipt` | `client_payments.update` | `{ receiptImage }` |
| CLIENT-PROF-26 | subvista | Citas internas | mismo | Listar | `getClientInternalAppointments` | GET | `/clients/:id/internal-appointments` | `getClientInternalAppointments` | `appointments.view` | `{ upcoming, history }` |
| CLIENT-PROF-27 | subvista | mismo | mismo | Crear cita | `createClientInternalAppointment` | POST | `/clients/:id/internal-appointments` | `createClientInternalAppointment` | `appointments.create` | date, time, officeRole (reviewer/admin), purposeNote |
| CLIENT-PROF-28 | subvista | mismo | mismo | Cambiar status cita | `updateInternalAppointment` | PUT | `/internal-appointments/:appointmentId` | `updateInternalAppointment` | `appointments.update` | status completed/cancelled/etc. |
| CLIENT-PROF-29 | subvista | mismo | mismo | Eliminar cita | `deleteInternalAppointment` | DELETE | `/internal-appointments/:appointmentId` | `deleteInternalAppointment` | `appointments.delete` | Borra cita |
| CLIENT-PROF-30 | confirm | Familia | AlertDialog | Quitar familiar | `updateClient` del hijo (`parentClientId` null) vía `onRemoveFamilyMember` | PUT | `/clients/:id` | `updateClient` | `clients.update` | Desvincula grupo familiar |
| CLIENT-PROF-31 | modal | Alta familiar | `ClientFormModal` (desde perfil) | Crear hijo | `createClient` con `parentClientId` | POST | `/clients` | `createClient` | `clients.create` | Mismo que CLIENTS-08 |
| CLIENT-PROF-32 | subvista | mismo | mismo | Reasignar asesor a hijo | `updateClient` | PUT | `/clients/:id` | `updateClient` | `clients.reassign_advisor` | Cambia `assignedUserId` del dependiente |

**Componentes no montados:** `ClientDetailModal`, `SubmissionList`, `SubmissionCard` existen en el repo pero **no se usan** en el shell actual (el perfil sustituye el modal de detalle; submissions se ven dentro del perfil).

---

## 8. Shell `forms` — Formularios

Permiso entrada: `nav.forms.view`. Editor requiere `forms.update`.

### 8.1 Lista

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| FORMS-01 | shell | Lista | `forms/FormList.tsx` | Listar | `getForms` | GET | `/forms` | `forms.getAllForms` | auth | Forms del tenant + secciones |
| FORMS-02 | modal | Nuevo formulario | Dialog en `FormList` | Crear nombre/descripción | `createForm` | POST | `/forms` | `createForm` | `forms.create` | Crea form vacío |
| FORMS-03 | shell | card | `FormCard` | Duplicar | `duplicateForm` | POST | `/forms/:id/duplicate` | `duplicateForm` | auth (create implícito) | Copia form + secciones + preguntas |
| FORMS-04 | confirm | Eliminar | AlertDialog | Confirmar delete | `deleteForm` | DELETE | `/forms/:id` | `deleteForm` | `forms.delete` | Borra form |
| FORMS-05 | shell | card | `FormCard` | Ver público | — | — | `/form/:formId` | — | — | Abre ruta pública (hace falta sesión para llenar) |
| FORMS-06 | shell | card | mismo | Entrar al editor | `getForm` / `selectForm` | GET | `/forms/:id` | `getFormById` | `forms.update` para editar | Carga form completo |

### 8.2 Subvista editor

Persistencia de estructura: un `PUT /forms/:id` con el JSON completo (secciones/preguntas/orden). Los handlers `addSection` etc. del store actualizan el form y llaman `updateForm`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| FORMED-01 | subvista | Editor | `forms/FormEditor.tsx` | Guardar nombre, desc, secciones, preguntas, orden, visibilidad, pdfMapping | `updateForm` | PUT | `/forms/:id` | `updateForm` | `forms.update` | Reemplaza estructura del form |
| FORMED-02 | subvista | mismo | mismo | Tipos de pregunta | — | — | — | — | — | short_text, long_text, multiple_choice, checkbox, date, file_upload, dropdown, rating |
| FORMED-03 | subvista | mismo | mismo | DnD secciones/preguntas | mismo PUT | — | — | — | — | Orden persistido en el JSON |
| FORMED-04 | subvista | mismo | mismo | Cargar plantilla PDF | `getFormPdfTemplate` | GET | `/forms/:id/pdf-template` | `pdf.getPdfTemplateByForm` | auth | Metadata de plantilla (páginas, fileName) |
| FORMED-05 | subvista | mismo | mismo | Subir PDF | `uploadFormPdfTemplate` | POST | `/forms/:id/pdf-template` | `uploadPdfTemplate` | `forms.update` | Multipart PDF, máx 25MB |
| FORMED-06 | subvista | mismo | mismo | Preview PDF | `downloadFormPdfPreview` | POST | `/forms/:id/pdf-preview` | `renderFormPdfPreview` | `forms.update` | Blob PDF de prueba |
| FORMED-07 | modal | Mapear campo PDF | `forms/PdfMappingModal.tsx` | Colocar campos sobre páginas | `downloadFormPdfTemplateFile` | GET | `/forms/:id/pdf-template/file` | `getPdfTemplateFileByForm` | auth | Blob del PDF; el mapping se guarda en la pregunta (`pdfMapping`) vía `updateForm` |
| FORMED-08 | confirm | salir | `Index` | Cambios sin guardar | — | — | — | — | — | `window.confirm` local |

---

## 9. Shell `products` — Productos

Permiso entrada: `nav.products.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| PROD-01 | shell | Lista | `products/ProductsList.tsx` | Listar | `getProducts` | GET | `/products` | `getAllProducts` | `products.view` | Catálogo tenant + imagen |
| PROD-02 | shell | Filtros categoría | `Index` | Cargar tags | `getCategories` | GET | `/categories` | `getCategories` | `categories.view` | Tags de producto |
| PROD-03 | shell | Aplicar filtros | `Index` | Filtrar | `getProductsByCategories` | GET | `/products/by-category?categories=` | `getProductsByCategories` | `products.view` | AND/OR de keys; front normaliza VIAJE_SOLO→SOLO, VIAJE_ASER→CON_ASER |
| PROD-04 | modal | Crear/editar | `ProductFormModal` | Crear | `createProduct` | POST multipart | `/products` | `createProduct` | `products.create` | title, includes, price, description, requirements, categories[], image |
| PROD-05 | modal | mismo | mismo | Editar | `updateProduct` | PUT multipart | `/products/:id` | `updateProduct` | `products.update` | Igual; imagen opcional |
| PROD-06 | confirm | Lista | `window.confirm` | Eliminar | `deleteProduct` | DELETE | `/products/:id` | `deleteProduct` | `products.delete` | Borra producto |
| PROD-07 | modal | Categorías | `CategoryManagerModal` | CRUD tags | `createCategory` `updateCategory` `deleteCategory` | POST PUT DELETE | `/categories` `/categories/:id` | categories.* | `categories.create/update/delete` | name, color, key. Delete refresca filtro de productos |

---

## 10. Shell `hotels` — Hoteles (catálogo)

Permiso entrada: `nav.hotels.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| HOTEL-01 | shell | Lista | `hotels/HotelList.tsx` | Listar | `getHotels` | GET | `/hotels` | `getAllHotels` | `hotels.view` | Catálogo: habitaciones single/double/triple |
| HOTEL-02 | modal | Crear/editar | `HotelFormModal` | Crear | `createHotel` | POST | `/hotels` | `createHotel` | `hotels.create` | name, address, city, country, phone, email, notes, totalSingle/Double/TripleRooms |
| HOTEL-03 | modal | mismo | mismo | Editar | `updateHotel` | PUT | `/hotels/:id` | `updateHotel` | `hotels.update` | Igual |
| HOTEL-04 | confirm | Lista | `window.confirm` | Eliminar | `deleteHotel` | DELETE | `/hotels/:id` | `deleteHotel` | `hotels.delete` | Borra hotel (si no está en uso según controller) |

`GET /hotels/:id` existe; el front no lo llama (usa la lista).

---

## 11. Shell `calendar` — Calendario

Permiso entrada: `nav.calendar.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| CAL-01 | shell | Calendario | `calendar/CalendarPage.tsx` | Eventos del mes visible | `getCalendarEvents` | GET | `/calendar/events?from=&to=` | `calendar.getCalendarEvents` | `appointments.view` | Une citas internas + fechas de viajes en rango. Incluye sucursal |
| CAL-02 | shell | mismo | mismo | Filtrar sucursales | — | — | — | — | — | Solo UI |
| CAL-03 | shell | mismo | mismo | Click día | — | — | — | — | — | Filtra `events` ya cargados. **`GET /calendar/events/by-date` no se usa** |

Las citas se crean/editan en el **perfil de cliente**, no aquí.

---

## 12. Shell `groups` — Grupos de clientes

Permiso entrada: `nav.groups.view`.

Al entrar también carga pickers: `getClients` modo picker (`fetchClientsForPickers`).

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| GRP-01 | shell | Lista | `groups/GroupList.tsx` | Listar | `getGroups` | GET | `/groups` | `getAllGroups` | `groups.view` | Grupos + miembros |
| GRP-02 | modal | Crear/editar | `GroupFormModal` | Crear | `createGroup` | POST | `/groups` | `createGroup` | `groups.create` | `{ title, clientIds[] }` |
| GRP-03 | modal | mismo | mismo | Editar título/miembros | `updateGroup` | PUT | `/groups/:id` | `updateGroup` | `groups.update` | Reemplaza set de clientes |
| GRP-04 | subvista | Detalle | `GroupDetailView` | Ver miembros | (datos de lista) | — | — | — | — | No llama `GET /groups/:id` |
| GRP-05 | modal | Agregar clientes | `AddClientsToGroupModal` | Añadir IDs | `updateGroup` | PUT | `/groups/:id` | `updateGroup` | `groups.update` | clientIds |
| GRP-06 | confirm | Detalle | AlertDialog | Eliminar grupo | `deleteGroup` | DELETE | `/groups/:id` | `deleteGroup` | `groups.delete` | Borra grupo |

`GET /groups/:id` está en API client y no se usa.

---

## 13. Shell `trips` — Viajes

Permiso entrada: `nav.trips.view`.  
`reviewerMode` = no tiene `trips.office_admin` (sin crear viaje, invitaciones, camiones, finanzas de oficina).

Al entrar (`Index`):

- `GET /trips` siempre si `trips.view`
- si `trips.office_admin`: invitaciones, grupos, bus-templates, `GET /companies/for-trip-share`
- si `trips.participants_manage`: staff
- si `hotels.view`: hoteles

### 13.1 Lista / calendario de viajes / invitaciones

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| TRIP-01 | shell | Lista | `trips/TripList.tsx` | Listar | `getTrips` | GET | `/trips` | `getAllTrips` | `trips.view` | Viajes donde la company está en `TripCompany` |
| TRIP-02 | shell | mismo | mismo | Toggle lista/calendario | — | — | — | — | — | Calendario **local** con `departureDate`/`returnDate` (no usa `/calendar`) |
| TRIP-03 | shell | Invitaciones | mismo | Listar | `getTripInvitations` | GET | `/trips/invitations` | `getTripInvitations` | `trips.office_admin` | Invitaciones pendientes a esta company |
| TRIP-04 | shell | mismo | mismo | Aceptar | `acceptTripInvitation` | POST | `/trips/invitations/:id/accept` | `acceptTripInvitation` | office_admin | Crea `TripCompany` + log |
| TRIP-05 | shell | mismo | mismo | Rechazar | `rejectTripInvitation` | POST | `/trips/invitations/:id/reject` | `rejectTripInvitation` | office_admin | Marca rechazada |
| TRIP-06 | modal | Nuevo/editar viaje | `TripFormModal` | Crear | `createTrip` | POST | `/trips` | `createTrip` | `trips.create` | title, destination, notes, totalSeats, busTemplateId, dates, reminderConfig, invitedCompanyIds |
| TRIP-07 | modal | mismo | mismo | Editar | `updateTrip` | PUT | `/trips/:id` | `updateTrip` | `trips.update` | Actualiza campos + invitaciones a otras companies |
| TRIP-08 | modal | mismo | mismo | Empresas a invitar | `getCompaniesForTripShare` | GET | `/companies/for-trip-share` | `getCompaniesForTripShare` | `companies.view` / office | Otras companies del sistema para compartir viaje |
| TRIP-09 | confirm | Detalle | AlertDialog | Eliminar viaje | `deleteTrip` | DELETE | `/trips/:id` | `deleteTrip` | `trips.delete` | Borra viaje (office) |

`reminderConfig`: daysBefore, frequencyDays, message (recordatorios WhatsApp en jobs de back, no UI extra).

### 13.2 Subvista detalle de viaje

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| TRIPD-01 | subvista | Detalle | `TripDetailView` | Recargar | `getTrip` | GET | `/trips/:id` | `getTripById` | `trips.view` | Participantes, asientos, hotels, companies, template |
| TRIPD-02 | modal | Participantes | `AddParticipantsToTripModal` | Agregar clientes, staff, companions | `addTripParticipants` | POST | `/trips/:id/participants` | `addParticipants` | `trips.participants_manage` | clientIds[], staffMemberIds[], companions[{name,phone}], companionClientId. Cupo/asientos |
| TRIPD-03 | subvista | mismo | mismo | Quitar participante | `removeTripParticipant` | DELETE | `/trips/:id/participants/:participantId` | `removeParticipant` | office_admin (controller) | Quita + limpia asiento + log |
| TRIPD-04 | subvista | mismo | inline | Lugar de recogida | `updateTripParticipantPickup` | PATCH | `/trips/:id/participants/:participantId` | `updateParticipantPickup` | participants_manage | `{ pickupLocation }` |
| TRIPD-05 | modal | Asientos | `SeatPickerModal` | Asignar asiento | `setTripSeatAssignment` | POST | `/trips/:id/seat-assignments` | `setSeatAssignment` | participants_manage | seatNumber o seatId; cupo por grupo familiar |
| TRIPD-06 | modal | mismo | mismo | Liberar asiento | `clearTripSeatAssignment` | DELETE | `/trips/:id/seat-assignments/by-seat` o `/:participantId` | `clearSeatAssignment` | office_admin | Libera por asiento o participante |
| TRIPD-07 | subvista | mismo | mismo | Reset todos los asientos | `resetTripSeatAssignments` | DELETE | `/trips/:id/seat-assignments` | `resetSeatAssignments` | office_admin | Limpia todas las asignaciones |
| TRIPD-08 | subvista | mismo | mismo | Renombrar label de asiento en plantilla | `updateBusTemplate` | PUT | `/bus-templates/:id` | `updateBusTemplate` | `trip_bus_templates.update` | Reescribe layout JSON |
| TRIPD-09 | subvista | Change log | mismo | Historial | `getTripChangeLog` | GET | `/trips/:id/change-log` | `getTripChangeLog` | office_admin | Audit: created/updated/participants/seats/invites |
| TRIPD-10 | modal | Invitar companies | Dialog en detalle | Añadir companies | `updateTrip` `{ invitedCompanyIds }` | PUT | `/trips/:id` | `updateTrip` | trips.update | Envía invitaciones |
| TRIPD-11 | subvista | Finanzas viaje | mismo | Resumen ingresos/gastos | `getTripFinance` | GET | `/trips/:id/finance` | `trip-finance.getTripFinance` | `trip_finance.view` | Ingresos = pagos de clientes participantes; gastos propios del viaje |
| TRIPD-12 | subvista | mismo | mismo | Alta gasto | `createTripExpense` | POST | `/trips/:id/finance/expenses` | `createTripExpense` | trip_finance (+ manage) | amount, date, category, reference, note |
| TRIPD-13 | subvista | mismo | mismo | Borrar gasto | `deleteTripExpense` | DELETE | `/trips/:id/finance/expenses/:expenseId` | `deleteTripExpense` | — | Borra gasto |
| TRIPD-14 | subvista | mismo | mismo | Borrar ingreso (pago) | `deleteTripIncome` | DELETE | `/trips/:id/finance/incomes/:paymentId` | `deleteTripIncome` | — | Borra `ClientPayment` del participante y loguea |
| TRIPD-15 | subvista | PDF lista | `TripDetailView` | Exportar PDF local | jsPDF | — | — | — | — | **Sin API**; genera PDF en el navegador |
| TRIPD-16 | subvista | Hoteles del viaje | `TripHotelsSection` | Catálogo | `getHotels` | GET | `/hotels` | `getAllHotels` | `hotels.view` | Para el selector |
| TRIPD-17 | modal | Agregar hotel al viaje | Dialog attach | Reservar | `attachHotelToTrip` | POST | `/trips/:id/hotels` | `attachHotelToTrip` | participants_manage | hotelId, checkIn/Out, reservedSingles/Doubles/Triples, notes. Crea `TripHotelRoom` |
| TRIPD-18 | modal | Editar reserva | Dialog edit | Fechas/cupos | `updateTripHotel` | PATCH | `/trips/:id/hotels/:tripHotelId` | `updateTripHotel` | participants_manage | Sync habitaciones reservadas |
| TRIPD-19 | modal | mismo | mismo | Quitar hotel | `detachTripHotel` | DELETE | `/trips/:id/hotels/:tripHotelId` | `detachHotelFromTrip` | participants_manage | Quita reserva |
| TRIPD-20 | modal | Habitación | Dialog rooms | Asignar participante a cama | `assignTripHotelRoom` | POST | `/trips/:id/hotels/:tripHotelId/rooms/:roomId/assign` | `setTripHotelRoomAssignment` | participants_manage | `{ participantId }` |
| TRIPD-21 | modal | mismo | mismo | Liberar cama | `clearTripHotelRoomAssignment` | DELETE | `.../rooms/:roomId/assign/:participantId` | `clearTripHotelRoomAssignment` | participants_manage | Libera asignación |

**POST `/trips/:id/finance/incomes`** existe (`createTripIncome`) y **no hay UI**: los ingresos se derivan de pagos de clientes.

### 13.3 Subvista plantillas de autobús

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| BUS-01 | subvista | Plantillas | `BusTemplateList` | Listar | `getBusTemplates` | GET | `/bus-templates` | `getAllBusTemplates` | `trip_bus_templates.view` | Layout JSON (pisos, asientos) |
| BUS-02 | modal | Editor layout | `BusTemplateFormModal` + `BusLayoutEditor` | Crear | `createBusTemplate` | POST | `/bus-templates` | `createBusTemplate` | create | `{ name, layout }` |
| BUS-03 | modal | mismo | mismo | Editar | `updateBusTemplate` | PUT | `/bus-templates/:id` | `updateBusTemplate` | update | name/layout |
| BUS-04 | confirm | Lista | AlertDialog | Eliminar | `deleteBusTemplate` | DELETE | `/bus-templates/:id` | `deleteBusTemplate` | delete | Borra plantilla |
| BUS-05 | — | — | `useBusTemplateStore.fetchTemplate` | GET uno | `getBusTemplate` | GET | `/bus-templates/:id` | `getBusTemplateById` | view | Existe; poco usado (lista trae layout) |

### 13.4 Subvista catálogo staff

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| STAFF-01 | subvista | Staff | `StaffCatalogView` | Listar | `getStaffMembers` | GET | `/staff-members` | `listStaffMembers` | `trips.view` | Catálogo de personal de viaje |
| STAFF-02 | subvista | form inline | mismo | Crear | `createStaffMember` | POST | `/staff-members` | `createStaffMember` | `trips.participants_manage` | name, phone, role, notes |
| STAFF-03 | subvista | mismo | mismo | Editar | `updateStaffMember` | PUT | `/staff-members/:id` | `updateStaffMember` | participants_manage | igual |
| STAFF-04 | subvista | mismo | mismo | Eliminar | `deleteStaffMember` | DELETE | `/staff-members/:id` | `deleteStaffMember` | `trips.office_admin` | Borra staff |

---

## 14. Shell `finance` — Finanzas

Permiso: `finance.view` o `nav.finance.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| FIN-01 | shell | Dashboard finanzas | `finance/FinanceDashboard.tsx` | Overview | `getFinanceOverview` | GET | `/finance/overview?from&to&granularity&paymentType&productId&assignedUserId&branchId` | `getFinanceOverview` | `finance.view` | Ingresos (pagos), gastos, neto, series, breakdowns, payouts de comisiones incluidos en overview |
| FIN-02 | shell | mismos filtros | mismo | Catálogo productos | `getProducts` | GET | `/products` | `getAllProducts` | products.view | Select filtro |
| FIN-03 | shell | mismo | mismo | Asesores | `getUsers` | GET | `/users` | `getAllUsers` | `users.view` | Front filtra `role.systemKey==='reviewer'` |
| FIN-04 | shell | mismo | mismo | Sucursales | `getBranches` | GET | `/branches` | `getAllBranches` | `branches.view` | Filtro |
| FIN-05 | shell | mismo | form inline | Crear gasto de empresa | `createFinanceExpense` | POST | `/finance/expenses` | `createFinanceExpense` | finance (write) | amount, expenseDate, concept, note |
| FIN-06 | shell | mismo | mismo | Borrar gasto | `deleteFinanceExpense` | DELETE | `/finance/expenses/:id` | `deleteFinanceExpense` | — | Borra gasto |
| FIN-07 | shell | mismo | mismo | Exportar PDF | `exportFinanceOverviewPdf` | — | — | — | — | **Cliente**: genera PDF con datos ya cargados |

Granularidades: hourly, daily, weekly, monthly, bimonthly, quarterly, semiannual, annual.

---

## 15. Shell `paymentLogs` — Logs de pagos

Permiso: `payment_logs.view` o `nav.payment_logs.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| PLOG-01 | shell | Tabla pagos | `payments/PaymentLogsPage.tsx` | Listar todos los pagos de la company | `getCompanyPayments` | GET | `/payments` | `getCompanyPayments` | `payment_logs.view` | Pagos + cliente + paquete + hasReceipt |
| PLOG-02 | modal | Recibo | `PaymentReceiptActions` | Ver/subir | `getPaymentReceipt` / `uploadPaymentReceipt` | GET PUT | `/payments/:id/receipt` | ver CLIENT-PROF-24/25 | `client_payments.update` o `payment_logs.view` | Igual que perfil |

---

## 16. Shell `commissions` — Comisiones

Permiso: `commissions.view` o `nav.commissions.view`.  
Editar tasas: `commissions.update`. Pagar lote: `commissions.create`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| COM-01 | shell | Dashboard | `commissions/CommissionsDashboard.tsx` | Overview | `getCommissionsOverview` | GET | `/commissions/overview` | `getCommissionsOverview` | `commissions.view` | Earned por asesor, totales, últimos pagos |
| COM-02 | shell | mismo | mismo | Lista tasas (viene en overview) | (overview incluye users) | — | — | — | — | Front también puede `GET /commissions/users` (`getCommissionUsers`) pero **no se llama** |
| COM-03 | shell | mismo | mismo | Catálogo usuarios | `getUsers` | GET | `/users` | `getAllUsers` | users.view | Para agregar asesor a comisión |
| COM-04 | shell | form | mismo | Agregar asesor | `addCommissionUser` | POST | `/commissions/users` | `addCommissionUser` | `commissions.update` | `{ userId, rateType: percentage\|fixed, ratePct, fixedAmount }` |
| COM-05 | shell | inline | mismo | Editar tasa | `updateCommissionUserRate` | PUT | `/commissions/users/:userId` | `updateCommissionUserRate` | update | Cambia rate |
| COM-06 | shell | mismo | mismo | Quitar asesor | `removeCommissionUser` | DELETE | `/commissions/users/:userId` | `removeCommissionUser` | `commissions.delete` | Quita de esquema |
| COM-07 | shell | mismo | mismo | Pagar lote | `payCommissionsBatch` | POST | `/commissions/payouts` | `payCommissionsBatch` | `commissions.create` | `{ periodType, referenceDate }` cierra periodo y registra payouts |

No usados en UI aunque existen:

- `GET /commissions/payout-preview`
- `GET /commissions/payouts`
- `GET /commissions/users` (método `getCommissionUsers` en `api.ts`)

---

## 16.1 Shell `quotes` — Cotizaciones (M14 fullstack)

Permiso de entrada: `quotes.view` o `nav.quotes.view`.  
Crear: `quotes.create`. Editar / ligar / seguimiento / plantilla: `quotes.update`. Borrar: `quotes.delete`.

El tab Cotizaciones del perfil de cliente usa el mismo API con `?clientId=`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| QUOTE-01 | shell | Lista | `quotes/QuotesView.tsx` | Listar / filtrar / buscar | `getQuotes` | GET | `/quotes?q=&status=&clientId=` | `listQuotes` | `quotes.view` | Cotizaciones del tenant; alcance assigned si no hay `clients.view_all` |
| QUOTE-02 | shell | mismo | mismo | Alta | `createQuote` | POST | `/quotes` | `createQuote` | `quotes.create` | Folio `COT-XXXXXX`, copia incluye/no incluye de plantilla, eventos de alta y ligue |
| QUOTE-03 | shell | Detalle | `quotes/QuoteDetail.tsx` | Ver / editar | `getQuote` `updateQuote` | GET / PUT | `/quotes/:id` | `getQuoteById` `updateQuote` | view / update | Actualiza importes, fechas, textos y cliente |
| QUOTE-04 | shell | Detalle | mismo | Registrar / borrador | `updateQuoteStatus` | PATCH | `/quotes/:id/status` | `updateQuoteStatus` | update | `draft` \| `registered` \| `expired` + evento de seguimiento |
| QUOTE-05 | shell | Detalle | mismo | Descargar PDF | `getQuotePdf` | GET | `/quotes/:id/pdf` | `downloadQuotePdf` | view | PDF con plantilla del tenant y logo si `showLogo` |
| QUOTE-06 | shell | Plantilla | `quotes/QuoteTemplateEditor.tsx` | Guardar plantilla | `getQuoteTemplate` `updateQuoteTemplate` | GET / PUT | `/quotes/template` | `getQuoteTemplate` `updateQuoteTemplate` | view / update | Una plantilla por company; se crea con defaults al primer GET |
| QUOTE-07 | shell | Plantilla | mismo | PDF de ejemplo | `getQuoteTemplatePdf` | GET | `/quotes/template/pdf` | `downloadQuoteTemplatePdf` | view | PDF placeholder con la plantilla |
| QUOTE-08 | subvista | Perfil cliente | `quotes/ClientQuotes.tsx` | Tab Cotizaciones | `getQuotes` | GET | `/quotes?clientId=` | `listQuotes` | view | Filtro por cliente del expediente |
| QUOTE-09 | subvista | mismo | mismo | Ligar existente | `linkQuote` | POST | `/quotes/:id/link` | `linkQuote` | update | Cambia `clientId` y registra evento |
| QUOTE-10 | subvista | Detalle | `QuoteDetail` | Nota de seguimiento | `addQuoteEvent` | POST | `/quotes/:id/events` | `addQuoteEvent` | update | Timeline de la cotización |

---

## 17. Shell `users` — Usuarios

Permiso: `users.view` o `nav.users.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| USER-01 | shell | Lista | `users/UserList.tsx` | Listar | `getUsers` | GET | `/users` | `getAllUsers` | `users.view` | Users tenant + role + branch |
| USER-02 | shell | mismo | mismo | Roles para select | `listRoles` | GET | `/roles` | `listRoles` | `roles.view` (o users page lo llama) | Roles para el form |
| USER-03 | modal | Crear/editar | `UserFormModal` | Crear | `createUser` | POST | `/users` | `createUser` | `users.create` | name, email, password, roleId, branchId |
| USER-04 | modal | mismo | mismo | Editar | `updateUser` | PUT | `/users/:id` | `updateUser` | `users.update` | name, email, roleId, status, password opcional, branchId |
| USER-05 | shell | card | `UserCard` | Toggle status | `updateUser` `{ status }` | PUT | `/users/:id` | `updateUser` | `users.update` | active/inactive |
| USER-06 | confirm | Lista | AlertDialog | Eliminar | `deleteUser` | DELETE | `/users/:id` | `deleteUser` | `users.delete` | Borra usuario |

`GET /users/:id` no se usa.

---

## 18. Shell `roles` — Roles y permisos

Permiso: `roles.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| ROLE-01 | shell | Admin roles | `admin/RolesAdminPage.tsx` | Catálogo de keys | `getPermissionCatalog` | GET | `/roles/catalog` | `getPermissionCatalog` | `roles.view` | Devuelve `PERMISSION_GROUPS` estático |
| ROLE-02 | shell | mismo | mismo | Listar roles | `listRoles` | GET | `/roles` | `listRoles` | `roles.view` | Roles + permissions[] |
| ROLE-03 | modal | Nuevo rol | Dialog | Crear | `createRole` | POST | `/roles` | `createRole` | `roles.create` | name, description, permission keys |
| ROLE-04 | shell | editor | mismo | Guardar rol | `updateRole` | PUT | `/roles/:id` | `updateRole` | `roles.update` | name, description, keys. Roles `isSystem` limitados |
| ROLE-05 | shell | mismo | mismo | Eliminar rol | `deleteRole` | DELETE | `/roles/:id` | `deleteRole` | `roles.delete` | No borra system roles |

---

## 19. Shell `chatbot` — Chatbot

Permiso: `bot_behavior.view` o `nav.chatbot.view`.

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| BOT-01 | shell | FAQs | `chatbot/ChatbotSettings.tsx` | Listar | `getFAQs` | GET | `/faqs` | `getAllFAQs` | `faqs.view` | FAQs tenant |
| BOT-02 | modal | FAQ | `FAQFormModal` | Crear | `createFAQ` | POST | `/faqs` | `createFAQ` | `faqs.create` | question, answer, category, order |
| BOT-03 | modal | mismo | mismo | Editar | `updateFAQ` | PUT | `/faqs/:id` | `updateFAQ` | `faqs.update` | igual |
| BOT-04 | confirm | card | `window.confirm` | Eliminar | `deleteFAQ` | DELETE | `/faqs/:id` | `deleteFAQ` | `faqs.delete` | Borra |
| BOT-05 | shell | card | `FAQCard` | Toggle activo | `updateFAQ` `{ isActive }` | PUT | `/faqs/:id` | `updateFAQ` | update | Activa/inactiva |
| BOT-06 | shell | Comportamiento | `BotBehaviorSettings` | Cargar | `getBotBehavior` | GET | `/bot` | `getBotBehavior` | `bot_behavior.view` | Config 1:1 por company |
| BOT-07 | shell | mismo | mismo | Guardar (debounce flush) | `updateBotBehavior` | PUT | `/bot` | `updateBotBehavior` | `bot_behavior.update` | isActive, name, personality, tone, greeting, fallback, branchesText, socialLinks, contactPhone, horario, etc. |

`GET /faqs/:id` no se usa.

---

## 20. Shell `settings` — Configuración

Permiso: `nav.settings.view` o branding/branches/checklist/faqs.view.

Tres bloques en `settings/SettingsPage.tsx`.

### 20.1 Branding compañía

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| SET-01 | subvista | Branding | `CompanyBrandingSettings` | Cargar | `getMyCompany` | GET | `/companies/me` | `getMyCompany` | `company_branding.view` | domain, logoUrl, faviconUrl, theme JSON, advisorClientAccessMode |
| SET-02 | subvista | mismo | mismo | Guardar | `updateMyCompany` | PATCH | `/companies/me` | `updateMyCompany` | `company_branding.update` | theme (colores HSL, radius, imágenes fondo/logo dashboard, opacidad cards), logo, favicon, domain, `advisorClientAccessMode` (`assigned_only` \| `company_wide`) |

El modo `company_wide` hace que un asesor con `clients.view_assigned` vea **todos** los clientes (`userSeesAllClients`).

### 20.2 Sucursales

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| SET-03 | subvista | Sucursales | `BranchesCatalog` | Listar | `getBranches` | GET | `/branches` | `getAllBranches` | `branches.view` | |
| SET-04 | modal | Alta | Dialog | Crear | `createBranch` | POST | `/branches` | `createBranch` | `branches.create` | `{ name, isActive }` |
| SET-05 | modal | Editar | Dialog | Editar | `updateBranch` | PUT | `/branches/:id` | `updateBranch` | `branches.update` | name/isActive |
| SET-06 | confirm | Desactivar | AlertDialog | “Eliminar” | `deleteBranch` | DELETE | `/branches/:id` | `deleteBranch` | `branches.delete` | Típicamente desactiva |

### 20.3 Checklist templates

| id | tipo | superficie | archivo | accion_ui | api_client | http | endpoint | controller | permiso | logica_back |
|---|---|---|---|---|---|---|---|---|---|---|
| SET-07 | subvista | Checklist | `ChecklistCatalog` | Listar | `getChecklistTemplates` | GET | `/checklist/templates` | `getAllTemplates` | `checklist_templates.view` | Pasos globales |
| SET-08 | modal | Alta | Dialog | Crear | `createChecklistTemplate` | POST | `/checklist/templates` | `createTemplate` | create | `{ label, order, isActive }` |
| SET-09 | modal | Editar | Dialog | Editar | `updateChecklistTemplate` | PUT | `/checklist/templates/:id` | `updateTemplate` | update | |
| SET-10 | confirm | mismo | AlertDialog | Eliminar paso | `deleteChecklistTemplate` | DELETE | `/checklist/templates/:id` | `deleteTemplate` | delete | |

---

## 21. Inventario completo de endpoints del backend

Prefijo real: `/api` + path. Auth salvo donde se indica.

Leyenda `uso_ui`: SI / NO / PARCIAL (método en `api.ts` pero ninguna pantalla lo llama).

### 21.1 Auth `/auth`

| http | endpoint | controller | permiso | uso_ui | conectado a |
|---|---|---|---|---|---|
| POST | `/auth/login` | `login` | publico | SI | LOGIN-01 |
| POST | `/auth/register` | `register` | publico | NO | Crea usuario+company opcional. Sin pantalla |
| GET | `/auth/me` | `me` | auth | SI | GLOBAL-02 |
| POST | `/auth/logout` | `logout` | auth | NO | Front solo borra localStorage |
| POST | `/auth/permanent-token` | `getPermanentToken` | auth | NO | JWT de larga duración (bots/integraciones) |

### 21.2 Public `/public`

| http | endpoint | controller | uso_ui | conectado a |
|---|---|---|---|---|
| GET | `/public/tenant` | `getTenantByDomain` | SI | GLOBAL-01 |

### 21.3 Companies `/companies`

| http | endpoint | controller | permiso | uso_ui | conectado a |
|---|---|---|---|---|---|
| GET | `/companies/for-trip-share` | `getCompaniesForTripShare` | auth | SI | TRIP-08 |
| GET | `/companies/me` | `getMyCompany` | auth | SI | SET-01 |
| PATCH | `/companies/me` | `updateMyCompany` | branding.update | SI | SET-02 |

### 21.4 Users `/users`

| http | endpoint | controller | permiso | uso_ui | conectado a |
|---|---|---|---|---|---|
| GET | `/users` | `getAllUsers` | `users.view` | SI | USER-01, ViewAs, Finanzas, Comisiones, Clientes |
| GET | `/users/:id` | `getUserById` | `users.view` | NO | |
| POST | `/users` | `createUser` | `users.create` | SI | USER-03 |
| PUT | `/users/:id` | `updateUser` | `users.update` | SI | USER-04/05 |
| DELETE | `/users/:id` | `deleteUser` | `users.delete` | SI | USER-06 |

### 21.5 Roles `/roles`

| http | endpoint | controller | permiso | uso_ui | conectado a |
|---|---|---|---|---|---|
| GET | `/roles/catalog` | `getPermissionCatalog` | roles.view | SI | ROLE-01 |
| GET | `/roles` | `listRoles` | roles.view | SI | ROLE-02, USER-02 |
| POST | `/roles` | `createRole` | roles.create | SI | ROLE-03 |
| PUT | `/roles/:id` | `updateRole` | roles.update | SI | ROLE-04 |
| DELETE | `/roles/:id` | `deleteRole` | roles.delete | SI | ROLE-05 |

### 21.6 Clients `/clients`

| http | endpoint | controller | permiso típico | uso_ui | conectado a |
|---|---|---|---|---|---|
| GET | `/clients` | `getAllClients` | view_all/assigned | SI | CLIENTS-01, pickers viajes/grupos |
| GET | `/clients/stats` | `getClientStats` | view | SI | DASH-01, nav, CLIENTS-02 |
| GET | `/clients/:id/amount-due-history` | `getClientAmountDueHistory` | `client_audit_logs.view` | SI | CLIENT-PROF-18 |
| GET | `/clients/:id/payment-deleted-history` | `getClientPaymentDeletedHistory` | audit | SI | CLIENT-PROF-19 |
| GET | `/clients/:id/internal-appointments` | `getClientInternalAppointments` | appointments.view | SI | CLIENT-PROF-26 |
| POST | `/clients/:id/internal-appointments` | `createClientInternalAppointment` | appointments.create | SI | CLIENT-PROF-27 |
| GET | `/clients/:id/acquired-packages` | `getClientAcquiredPackages` | financials | SI | CLIENT-PROF-20 |
| POST | `/clients/:id/acquired-packages` | `createClientAcquiredPackage` | | SI | CLIENT-PROF-21 |
| DELETE | `/clients/:id/acquired-packages/:packageId` | `deleteClientAcquiredPackage` | | SI | CLIENT-PROF-22 |
| GET | `/clients/:id` | `getClientById` | view | SI | CLIENT-PROF-01, deep link |
| POST | `/clients` | `createClient` | create | SI | CLIENTS-08 |
| PUT | `/clients/:id` | `updateClient` | update | SI | CLIENTS-09, total a pagar, familia |
| DELETE | `/clients/:id` | `deleteClient` | delete | SI | CLIENTS-10 |

### 21.7 Internal appointments `/internal-appointments`

| http | endpoint | controller | uso_ui | conectado a |
|---|---|---|---|---|
| PUT | `/internal-appointments/:appointmentId` | `updateInternalAppointment` | SI | CLIENT-PROF-28 |
| DELETE | `/internal-appointments/:appointmentId` | `deleteInternalAppointment` | SI | CLIENT-PROF-29 |
| GET | `/internal-appointments/:appointmentId/history` | `getInternalAppointmentHistory` | PARCIAL (`api.ts` sí, UI no) | Historial de cambios de una cita |

### 21.8 Calendar `/calendar`

| http | endpoint | controller | uso_ui | conectado a |
|---|---|---|---|---|
| GET | `/calendar/events` | `getCalendarEvents` | SI | CAL-01 |
| GET | `/calendar/events/by-date` | `getCalendarEventsByDate` | PARCIAL | Definido en `api.ts`, CalendarPage no lo llama |

### 21.9 Groups `/groups`

| http | endpoint | controller | uso_ui | conectado a |
|---|---|---|---|---|
| GET | `/groups` | `getAllGroups` | SI | GRP-01, también al abrir Viajes (office) |
| GET | `/groups/:id` | `getGroupById` | PARCIAL | |
| POST | `/groups` | `createGroup` | SI | GRP-02 |
| PUT | `/groups/:id` | `updateGroup` | SI | GRP-03/05 |
| DELETE | `/groups/:id` | `deleteGroup` | SI | GRP-06 |

### 21.10 Trips `/trips`

| http | endpoint | controller | permiso | uso_ui | conectado a |
|---|---|---|---|---|---|
| GET | `/trips` | `getAllTrips` | trips.view | SI | TRIP-01 |
| GET | `/trips/stats` | `getTripStats` | trips.view | SI | DASH-03 |
| GET | `/trips/invitations` | `getTripInvitations` | office_admin | SI | TRIP-03 |
| POST | `/trips/invitations/:id/accept` | `acceptTripInvitation` | | SI | TRIP-04 |
| POST | `/trips/invitations/:id/reject` | `rejectTripInvitation` | | SI | TRIP-05 |
| GET | `/trips/:id/change-log` | `getTripChangeLog` | office_admin | SI | TRIPD-09 |
| GET | `/trips/:id` | `getTripById` | view | SI | TRIPD-01 |
| POST | `/trips` | `createTrip` | create | SI | TRIP-06 |
| PUT | `/trips/:id` | `updateTrip` | update | SI | TRIP-07, TRIPD-10 |
| DELETE | `/trips/:id` | `deleteTrip` | delete | SI | TRIP-09 |
| POST | `/trips/:id/participants` | `addParticipants` | participants_manage | SI | TRIPD-02 |
| PATCH | `/trips/:id/participants/:participantId` | `updateParticipantPickup` | | SI | TRIPD-04 |
| DELETE | `/trips/:id/participants/:participantId` | `removeParticipant` | office_admin | SI | TRIPD-03 |
| POST | `/trips/:id/seat-assignments` | `setSeatAssignment` | participants_manage | SI | TRIPD-05 |
| DELETE | `/trips/:id/seat-assignments` | `resetSeatAssignments` | office_admin | SI | TRIPD-07 |
| DELETE | `/trips/:id/seat-assignments/by-seat` | `clearSeatAssignment` | office_admin | SI | TRIPD-06 |
| DELETE | `/trips/:id/seat-assignments/:participantId` | `clearSeatAssignment` | office_admin | SI | TRIPD-06 |
| POST | `/trips/:id/hotels` | `attachHotelToTrip` | participants_manage | SI | TRIPD-17 |
| PATCH | `/trips/:id/hotels/:tripHotelId` | `updateTripHotel` | | SI | TRIPD-18 |
| DELETE | `/trips/:id/hotels/:tripHotelId` | `detachHotelFromTrip` | | SI | TRIPD-19 |
| POST | `/trips/:id/hotels/:tripHotelId/rooms/:roomId/assign` | `setTripHotelRoomAssignment` | | SI | TRIPD-20 |
| DELETE | `.../rooms/:roomId/assign/:participantId` | `clearTripHotelRoomAssignment` | | SI | TRIPD-21 |

### 21.11 Trip finance (mismo prefijo `/trips`)

| http | endpoint | controller | uso_ui | conectado a |
|---|---|---|---|---|
| GET | `/trips/:id/finance` | `getTripFinance` | SI | TRIPD-11 |
| POST | `/trips/:id/finance/incomes` | `createTripIncome` | NO | Ingreso manual; UI usa pagos de cliente |
| DELETE | `/trips/:id/finance/incomes/:paymentId` | `deleteTripIncome` | SI | TRIPD-14 |
| POST | `/trips/:id/finance/expenses` | `createTripExpense` | SI | TRIPD-12 |
| DELETE | `/trips/:id/finance/expenses/:expenseId` | `deleteTripExpense` | SI | TRIPD-13 |

### 21.12 Bus templates `/bus-templates`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/bus-templates` | SI | BUS-01 |
| GET | `/bus-templates/:id` | PARCIAL | BUS-05 |
| POST | `/bus-templates` | SI | BUS-02 |
| PUT | `/bus-templates/:id` | SI | BUS-03, TRIPD-08 |
| DELETE | `/bus-templates/:id` | SI | BUS-04 |

### 21.13 Staff `/staff-members`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/staff-members` | SI | STAFF-01, picker participantes |
| POST | `/staff-members` | SI | STAFF-02 |
| PUT | `/staff-members/:id` | SI | STAFF-03 |
| DELETE | `/staff-members/:id` | SI | STAFF-04 |

### 21.14 Forms `/forms`

| http | endpoint | auth | uso_ui | conectado a |
|---|---|---|---|---|
| GET | `/forms` | auth | SI | FORMS-01, perfil cliente |
| POST | `/forms/:id/duplicate` | auth | SI | FORMS-03 |
| GET | `/forms/sessions/client/:clientId` | auth | SI | CLIENT-PROF-13 |
| GET | `/forms/:id/sessions/:sessionId` | publico | SI | PUB-02 |
| PATCH | `/forms/:id/sessions/:sessionId` | publico | SI | PUB-03 |
| POST | `/forms/:id/sessions/:sessionId/complete` | publico | SI | PUB-07 |
| GET | `/forms/:id/sessions/:sessionId/submission` | publico | SI | PUB-04 |
| POST | `/forms/:id/sessions/:sessionId/submission` | publico | SI | PUB-05 |
| PATCH | `/forms/:id/sessions/:sessionId/submission` | publico | SI | PUB-06 |
| GET | `/forms/:id/pdf-template` | auth | SI | FORMED-04 |
| GET | `/forms/:id/pdf-template/file` | auth | SI | FORMED-07 |
| POST | `/forms/:id/pdf-template` | forms.update | SI | FORMED-05 |
| POST | `/forms/:id/pdf-preview` | forms.update | SI | FORMED-06 |
| GET | `/forms/:id` | **publico** | SI | PUB-01, editor, perfil |
| POST | `/forms` | forms.create | SI | FORMS-02 |
| POST | `/forms/:id/sessions` | auth | SI | CLIENT-PROF-12 |
| PUT | `/forms/:id` | forms.update | SI | FORMED-01 |
| DELETE | `/forms/:id` | forms.delete | SI | FORMS-04 |

### 21.15 Submissions `/submissions`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| POST | `/submissions` | PARCIAL (`createSubmission` en api.ts) | El público usa create-from-session |
| GET | `/submissions` | SI | PRE-02, perfil |
| GET | `/submissions/stats` | SI | store / dashboard |
| POST | `/submissions/:id/pdf` | PARCIAL (`downloadSubmissionPdf`) | Render PDF lleno; **ninguna pantalla lo llama** |
| GET | `/submissions/:id` | SI | `SubmissionDetailModal` (componente existe; **no montado** en Index) |
| PUT | `/submissions/:id` | PARCIAL | `useSubmissionStore.updateSubmission`; no hay UI de lista de submissions |
| DELETE | `/submissions/:id` | PARCIAL | store delete; UI no montada |

### 21.16 Checklist `/checklist`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/checklist/templates` | SI | SET-07, filtros clientes, perfil |
| POST | `/checklist/templates` | SI | SET-08 |
| PUT | `/checklist/templates/:id` | SI | SET-09 |
| DELETE | `/checklist/templates/:id` | SI | SET-10 |
| GET | `/checklist/clients/:clientId` | SI | CLIENT-PROF-10 |
| PUT | `/checklist/clients/:clientId/items/:itemId` | SI | CLIENT-PROF-11 |

### 21.17 Notes `/notes`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/notes/clients/:clientId` | SI | CLIENT-PROF-02 |
| POST | `/notes/clients/:clientId` | SI | CLIENT-PROF-03 |
| PUT | `/notes/:id` | PARCIAL | `updateNote` en api.ts; UI solo crea/borra |
| DELETE | `/notes/:id` | SI | CLIENT-PROF-04 |

### 21.18 Payments `/payments`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/payments` | SI | PLOG-01 |
| GET | `/payments/clients/:clientId` | SI | CLIENT-PROF-14 |
| POST | `/payments/clients/:clientId` | SI | CLIENT-PROF-15 |
| GET | `/payments/:id/receipt` | SI | recibos |
| PUT | `/payments/:id/receipt` | SI | recibos |
| DELETE | `/payments/:id` | SI | CLIENT-PROF-16 |

### 21.19 Messages `/messages`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/messages/clients/:clientId` | SI | CLIENT-PROF-05 |
| POST | `/messages/clients/:clientId` | SI | CLIENT-PROF-06 |
| POST | `/messages/send-and-add-to-chat` | NO | Envío WhatsApp + inserta en chat (integración externa) |
| DELETE | `/messages/:id` | PARCIAL | `deleteMessage` en api.ts; UI no borra mensajes |

### 21.20 Conversations `/addChat`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| POST | `/addChat` | NO | `addConv` — alta de mensaje conversación bot |
| PATCH | `/addChat/:id` | NO | `updateConv` |
| PATCH | `/addChat/:phone/baja` | SI | PUB-08, CLIENT-PROF-08 |
| GET | `/addChat/clients/:clientId` | SI | CLIENT-PROF-07 |

### 21.21 FAQs `/faqs` y Bot `/bot`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/faqs` | SI | BOT-01 |
| GET | `/faqs/:id` | PARCIAL | |
| POST | `/faqs` | SI | BOT-02 |
| PUT | `/faqs/:id` | SI | BOT-03/05 |
| DELETE | `/faqs/:id` | SI | BOT-04 |
| GET | `/bot` | SI | BOT-06 |
| PUT | `/bot` | SI | BOT-07 |

### 21.22 Products `/products` y Categories `/categories`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/products` | SI | PROD-01, filtros, finanzas, pagos |
| GET | `/products/by-category` | SI | PROD-03, paquetes |
| GET | `/products/title/:title` | NO | Lookup por título (bot/integración) |
| GET | `/products/:id` | PARCIAL | `getProduct` en api.ts |
| POST | `/products` | SI | PROD-04 |
| PUT | `/products/:id` | SI | PROD-05 |
| DELETE | `/products/:id` | SI | PROD-06 |
| GET | `/categories` | SI | PROD-02 |
| POST | `/categories` | SI | PROD-07 |
| PUT | `/categories/:id` | SI | PROD-07 |
| DELETE | `/categories/:id` | SI | PROD-07 |

### 21.23 Hotels `/hotels`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/hotels` | SI | HOTEL-01, viajes |
| GET | `/hotels/:id` | PARCIAL | |
| POST | `/hotels` | SI | HOTEL-02 |
| PUT | `/hotels/:id` | SI | HOTEL-03 |
| DELETE | `/hotels/:id` | SI | HOTEL-04 |

### 21.24 Finance `/finance`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/finance/overview` | SI | FIN-01 |
| POST | `/finance/expenses` | SI | FIN-05 |
| DELETE | `/finance/expenses/:id` | SI | FIN-06 |

### 21.25 Commissions `/commissions`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/commissions/users` | PARCIAL | COM-02 |
| POST | `/commissions/users` | SI | COM-04 |
| PUT | `/commissions/users/:userId` | SI | COM-05 |
| DELETE | `/commissions/users/:userId` | SI | COM-06 |
| GET | `/commissions/payout-preview` | PARCIAL | Preview antes de pagar |
| POST | `/commissions/payouts` | SI | COM-07 |
| GET | `/commissions/payouts` | NO | No está ni en `api.ts` |
| GET | `/commissions/overview` | SI | COM-01 |

### 21.25b Quotes `/quotes`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/quotes` | SI | QUOTE-01, QUOTE-08 |
| GET | `/quotes/template` | SI | QUOTE-06 |
| PUT | `/quotes/template` | SI | QUOTE-06 |
| GET | `/quotes/template/pdf` | SI | QUOTE-07 |
| GET | `/quotes/:id` | SI | QUOTE-03 |
| GET | `/quotes/:id/pdf` | SI | QUOTE-05 |
| POST | `/quotes` | SI | QUOTE-02 |
| PUT | `/quotes/:id` | SI | QUOTE-03 |
| PATCH | `/quotes/:id/status` | SI | QUOTE-04 |
| POST | `/quotes/:id/link` | SI | QUOTE-09 |
| POST | `/quotes/:id/events` | SI | QUOTE-10 |
| DELETE | `/quotes/:id` | PARCIAL | Método en `api.ts`; la UI no expone borrar |

### 21.26 Branches `/branches`

Ver SET-03…06. Todos usados.

### 21.27 Notifications `/notifications`

| http | endpoint | uso_ui | conectado a |
|---|---|---|---|
| GET | `/notifications/vapid-public-key` | SI | GLOBAL-07 |
| GET | `/notifications` | SI | GLOBAL-06 |
| DELETE | `/notifications` | SI | GLOBAL-09 |
| PATCH | `/notifications/:id/read` | SI | GLOBAL-07/10 |
| DELETE | `/notifications/:id` | SI | GLOBAL-08 |
| POST | `/notifications/push-subscriptions` | SI | GLOBAL-07 |
| POST | `/notifications` | NO | `createNotification` — alta manual/API interna |

---

## 22. Endpoints / métodos sin UI (resumen para agentes)

Usar esta lista si hay que “completar” el front o no romper integraciones.

| endpoint o método | por qué existe | quién lo usaría |
|---|---|---|
| `POST /auth/register` | alta de cuenta | onboarding no implementado |
| `POST /auth/logout` | invalidar sesión servidor | Header hoy solo limpia localStorage |
| `POST /auth/permanent-token` | token largo | bots, scripts |
| `GET /users/:id` | ficha user | — |
| `GET /groups/:id` | ficha grupo | detalle usa lista |
| `GET /hotels/:id` `GET /products/:id` `GET /faqs/:id` `GET /bus-templates/:id` | GET by id | UI usa listados |
| `GET /products/title/:title` | lookup bot | chatbot externo |
| `POST /addChat` `PATCH /addChat/:id` | ingest conversaciones | WhatsApp worker |
| `POST /messages/send-and-add-to-chat` | outbound WhatsApp | worker |
| `DELETE /messages/:id` | borrar mensaje | — |
| `PUT /notes/:id` | editar nota | UI no edita |
| `POST /submissions` | create autenticado | público usa session |
| `PUT/DELETE /submissions/:id` | admin submissions | `SubmissionList` no montado |
| `POST /submissions/:id/pdf` | PDF lleno | mapping existe; descarga no cableada |
| `GET /calendar/events/by-date` | eventos de un día | Calendar filtra en cliente |
| `GET /internal-appointments/:id/history` | audit cita | — |
| `POST /trips/:id/finance/incomes` | ingreso manual viaje | ingresos salen de pagos |
| `GET /commissions/users` | tasas | overview ya las trae |
| `GET /commissions/payout-preview` | preview lote | UI paga directo |
| `GET /commissions/payouts` | historial payouts | overview de finanzas/comisiones |
| `POST /notifications` | crear notificación | workers (whatsapp_reply, etc.) |

---

## 23. Componentes UI huérfanos (existen, no están en el árbol de rutas)

| componente | pensado para | API que usaría |
|---|---|---|
| `submissions/SubmissionList.tsx` + `SubmissionCard` | lista global de envíos | GET/PUT/DELETE `/submissions` |
| `submissions/SubmissionDetailModal.tsx` | detalle de un envío | `GET /submissions/:id` |
| `clients/ClientDetailModal.tsx` | ficha corta | sustituido por `ClientProfileView` |

---

## 24. Catálogo de permisos (back)

Fuente: `backend/src/authorization/permissions.catalog.ts`. El front filtra nav con `VIEW_ENTRY_PERMISSIONS` y `can()` / `canAny()`.

| grupo | keys |
|---|---|
| Navegación | `nav.dashboard.view` `nav.clients.view` `nav.calendar.view` `nav.forms.view` `nav.products.view` `nav.hotels.view` `nav.trips.view` `nav.quotes.view` `nav.admin.view` `nav.finance.view` `nav.payment_logs.view` `nav.commissions.view` `nav.users.view` `nav.chatbot.view` `nav.settings.view` `nav.groups.view` |
| Clientes | `clients.view_all` `clients.view_assigned` `clients.create` `clients.update` `clients.delete` `clients.reassign_advisor` `client_financials.view` `client_financials.update` `client_payments.view` `client_payments.create` `client_payments.update` `client_payments.delete` `client_audit_logs.view` |
| Submissions | `submissions.view_all` `submissions.view_assigned` `submissions.update` `submissions.delete` |
| Comms cliente | `client_messages.*` `client_notes.*` `client_checklist.view` `client_checklist.update` |
| Citas | `appointments.view` `create` `update` `delete` |
| Forms | `forms.view` `create` `update` `delete` |
| Catálogo | `products.*` `hotels.*` `categories.*` |
| Viajes | `trips.view` `create` `update` `delete` `trips.participants_manage` `trips.office_admin` `trip_invitations.*` `trip_bus_templates.*` `trip_finance.view` `companies.view` |
| Finanzas | `finance.view` `payment_logs.view` |
| Comisiones | `commissions.view` `create` `update` `delete` |
| Cotizaciones | `quotes.view` `create` `update` `delete` `nav.quotes.view` |
| Users/roles | `users.*` `roles.*` `session.view_as` |
| Tenant | `branches.*` `company_branding.view/update` `checklist_templates.*` `faqs.*` `bot_behavior.view/update` |
| Otros | `groups.*` `notifications.*` `conversations.view` `conversations.update` |

---

## 25. Índice de archivos UI por superficie

| superficie | archivos |
|---|---|
| Tenant | `contexts/TenantContext.tsx` |
| Auth | `contexts/AuthContext.tsx` `pages/Login.tsx` `auth/ProtectedRoute.tsx` |
| Shell | `pages/Index.tsx` `layout/AppHeader.tsx` `auth/viewPermissions.ts` |
| Notificaciones | `notifications/NotificationBell.tsx` `hooks/useNotifications.ts` |
| View as | `admin/ViewAsSelector.tsx` |
| Dashboard | `dashboard/Dashboard.tsx` |
| Clientes | `clients/ClientList.tsx` `ClientCard.tsx` `ClientFormModal.tsx` `ClientProfileView.tsx` `ClientNotes.tsx` `ClientChat.tsx` `ClientChecklist.tsx` `ClientPaymentHistory.tsx` `ClientFormData.tsx` |
| Formularios | `forms/FormList.tsx` `FormCard.tsx` `FormEditor.tsx` `QuestionCard.tsx` `PdfMappingModal.tsx` |
| Form público | `pages/PublicFormView.tsx` |
| Productos | `products/ProductsList.tsx` `ProductFormModal.tsx` `CategoryManagerModal.tsx` |
| Hoteles | `hotels/HotelList.tsx` `HotelFormModal.tsx` |
| Calendario | `calendar/CalendarPage.tsx` |
| Grupos | `groups/GroupList.tsx` `GroupFormModal.tsx` `GroupDetailView.tsx` `AddClientsToGroupModal.tsx` |
| Viajes | `trips/TripList.tsx` `TripFormModal.tsx` `TripDetailView.tsx` `AddParticipantsToTripModal.tsx` `SeatPickerModal.tsx` `BusTemplateList.tsx` `BusTemplateFormModal.tsx` `StaffCatalogView.tsx` `TripHotelsSection.tsx` |
| Cotizaciones | `quotes/QuotesView.tsx` `QuoteTable.tsx` `QuoteFormModal.tsx` `QuoteDetail.tsx` `QuoteTemplateEditor.tsx` `ClientQuotes.tsx` |
| Finanzas | `finance/FinanceDashboard.tsx` `lib/financePdfExport.ts` |
| Logs pagos | `payments/PaymentLogsPage.tsx` `PaymentReceiptActions.tsx` |
| Comisiones | `commissions/CommissionsDashboard.tsx` |
| Usuarios | `users/UserList.tsx` `UserFormModal.tsx` |
| Roles | `admin/RolesAdminPage.tsx` |
| Chatbot | `chatbot/ChatbotSettings.tsx` `FAQFormModal.tsx` `BotBehaviorSettings.tsx` |
| Settings | `settings/SettingsPage.tsx` `CompanyBrandingSettings.tsx` `BranchesCatalog.tsx` `ChecklistCatalog.tsx` |
| Stores | `hooks/use*Store.ts` + `lib/api.ts` |

---

## 26. Lógica de negocio crítica (para no romper al tocar)

1. **Multitenancy**: casi todo filtra por `req.user.companyId`. El dominio público resuelve company **antes** del login.
2. **Alcance de clientes**: `clients.view_assigned` + `advisorClientAccessMode=assigned_only` → solo `assignedUserId`. `company_wide` o `view_all` → todos.
3. **View as**: no cambia el JWT; solo filtra UI y query `assignedUserId` en stats/clientes/pickers.
4. **Familia**: titular tiene pagos/paquetes; hijos no. `parentClientId` + `relationshipToHolder`.
5. **Viajes compartidos**: `TripCompany` + invitaciones. Un viaje puede tener varias companies y colores.
6. **Asientos**: cupo por grupo (titular + companions). Plantilla de bus es JSON.
7. **Finanzas de viaje**: incomes = `ClientPayment` de participantes, no un modelo de ingreso propio (salvo endpoint muerto `createTripIncome`).
8. **Formulario público**: autenticación = UUID de sesión en la URL, no JWT.
9. **Bot WhatsApp**: conversaciones viven en `/addChat`; el CRM fusiona con `/messages`. Pausar bot = `baja_logica`.
10. **Comisiones**: se calculan sobre pagos de clientes de asesores configurados; el lote `payouts` cierra un periodo.
11. **Push**: VAPID + service worker; tipos como `whatsapp_reply` refrescan CRM.
12. **PDF forms**: plantilla por form + `pdfMapping` en cada pregunta; preview admin; render de submission no está en UI.
)
