# Lógica UI del prototipo aún no soportada en acer

Registro pedido por el plan de cascada: controles de TravelUp que acer no tiene en backend o que se aplazan a un módulo posterior. No simular persistencia.

| Módulo | Control del prototipo | Decisión | Motivo |
|---|---|---|---|
| M2 | Búsqueda global cross-entity (clientes + viajes + cotizaciones) | Degradado | El header solo rellena el `q` de la vista activa (clientes API, viajes/productos en memoria, cotizaciones `GET /quotes?q=`). No hay endpoint de búsqueda global |
| M2 | Alta de grupos, formularios o usuarios desde el CTA del header | Oculto | El alta sigue en cada vista; no se inventó un bus de eventos extra |
| M4 | Tareas pendientes (checkboxes del prototipo) | Omitido / degradado a Actividad | No hay API de tareas; no se persisten checkboxes locales |
| M4 | KPI «Grupos en operación» | Degradado a ocupación de viajes | El dashboard usa `GET /trips/stats`, no hay stats de grupos |
| M4 | Citas mock de la agenda | Omitido | Solo se listan eventos de `GET /calendar/events` si hay `appointments.view` |
| M5 | Tabs Formularios / Cotizaciones dentro de Clientes | Degradado | Formularios sigue en `?view=forms`. Cotizaciones es vista propia (`?view=quotes`) y tab en el perfil de cliente (M14) |
| M5 | Folio en la card y búsqueda por folio | Omitido | El listado no tiene folio; `q` busca nombre, email, teléfono y CP |
| M5 | Barra pagado/total del prototipo (ratio fijo) | Degradado | Solo se pinta si el listado trae `totalAmountDue`; si no hay viaje se muestra producto o próxima cita |
| M6 | Tab Cotizaciones en el perfil de cliente | Resuelto en M14 | Lee `GET /quotes?clientId=` y permite crear, editar, ligar y descargar PDF |
| M7 | «Compartir» (copiar enlace público abierto) | Omitido / degradado a «Ver público» | En acer el llenado requiere sesión creada desde el perfil del cliente; no se copia `/form/:id` como si fuera suficiente |
| M7 | Conteo de respuestas en la card del catálogo | Resuelto | Cuenta submissions prefetch (`formId`); sin `submissions.view_*` o si el fetch falla no se pinta un 0 falso |
| M7 | Tipo de pregunta «Firma» del mockup | Omitido | El backend no tiene `signature`; se conservan los tipos reales (`file_upload`, condicionales, etc.) |
| M8 | Badge «Disponible» en cards de hotel | Omitido | El catálogo no trae disponibilidad; se muestran lugar, habitaciones y contacto reales |
| M8 | «Responsable» en la card de grupo | Resuelto | Muestra el nombre de `assignedUserId` vía `GET /users`; sin permiso o sin match: se omite o «Sin asignar». No es un lead |
| M9 | «+ Evento» en la agenda del día | Oculto | Las citas se crean en el perfil del cliente; no hay alta huérfana en el calendario |
| M9 | Carga de agenda por día (`GET /calendar/events/by-date`) | Omitido | CalendarPage sigue filtrando en cliente los eventos de `GET /calendar/events?from=&to=` |
| M10 | Estado de viaje del mock (Confirmado, etc.) | Degradado | `GET /trips` no trae status; el badge se deriva de las fechas (Próximo / En curso / Concluido) |
| M10 | Folio comercial en la card (T-01) | Omitido | El listado usa el uuid interno; no hay folio de operación |
| M10 | Ingresos en la card del listado | Omitido | `GET /trips` no incluye `totalIncome`; solo se pinta si el payload lo trae |
| M10 | Coordinadora en KPIs del detalle | Resuelto | KPI «Coordinación» con el nombre de `trip.assignedUserId` (o «Sin asignar»). No se inventa género ni editor de reasignación |
| M10 | Mapa fijo de 32 asientos del mock | Omitido | El layout sigue el JSON de la plantilla (`BusLayoutRenderer`); no se unificó con CalendarPage |
| M11 | KPI «Por cobrar» / 9 cuentas | Omitido | `getFinanceOverview` no trae cuentas por cobrar; el 4.º KPI del bento es ticket promedio |
| M11 | Estados Conciliado / Revisión en logs de pagos | Degradado | No existen en el backend; la columna usa `hasReceipt` (Con recibo / Sin recibo) junto a tipo y paquete reales |
| M11 | Preview e historial de payouts de comisiones | Resuelto | Preview con `GET /commissions/payout-preview`; historial desde `paidPayouts` del overview. Periodo ya liquidado no deja pagar |
| M12 | 7 checkboxes de permisos inventados (clientes, viajes, pagos, formularios, chatbot, usuarios, marca) | Omitido | El editor renderiza exclusivamente los grupos/keys de `GET /roles/catalog`; no se sustituyó el catálogo |
| M12 | Conteo de miembros por rol en la lista ([2, 4, 8, 1] del mock) | Resuelto | Cuenta usuarios por `roleId` (`GET /users`); sin `users.view` muestra «—», no `permissions.length` |
| M13 | Horario del bot (mencionado en inventario BOT-07) | Omitido | El modelo `GET/PUT /bot` no tiene campo horario; se conservan name, personality, tone, greeting, fallback, branchesText, socialLinks, contactPhone, responseDelay e isActive |
| M13 | Badge «Remota» en sucursales del prototipo | Degradado | El catálogo solo trae `isActive`; la fila usa Activa / Inactiva |
