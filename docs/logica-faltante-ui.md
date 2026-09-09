# Lógica UI del prototipo aún no soportada en acer

Registro pedido por el plan de cascada: controles de TravelUp que acer no tiene en backend o que se aplazan a un módulo posterior. No simular persistencia.

| Módulo | Control del prototipo | Decisión | Motivo |
|---|---|---|---|
| M2 | Cotizaciones en nav Principal | Omitido | Se añade en M14, solo front |
| M2 | Búsqueda global cross-entity (clientes + viajes + cotizaciones) | Degradado | El header solo rellena el `q` de la vista activa (clientes API, viajes/productos en memoria). No hay endpoint de búsqueda global |
| M2 | CTA «Nueva cotización» | Omitido | No hay API de cotizaciones (M14) |
| M2 | Alta de grupos, formularios o usuarios desde el CTA del header | Oculto | El alta sigue en cada vista; no se inventó un bus de eventos extra |
| M4 | Tareas pendientes (checkboxes del prototipo) | Omitido / degradado a Actividad | No hay API de tareas; no se persisten checkboxes locales |
| M4 | KPI «Grupos en operación» | Degradado a ocupación de viajes | El dashboard usa `GET /trips/stats`, no hay stats de grupos |
| M4 | Citas mock de la agenda | Omitido | Solo se listan eventos de `GET /calendar/events` si hay `appointments.view` |
| M5 | Tabs Formularios / Cotizaciones dentro de Clientes | Omitido | En acer Formularios es `?view=forms`; Cotizaciones se añade en M14 |
| M5 | Folio en la card y búsqueda por folio | Omitido | El listado no tiene folio; `q` busca nombre, email, teléfono y CP |
| M5 | Barra pagado/total del prototipo (ratio fijo) | Degradado | Solo se pinta si el listado trae `totalAmountDue`; si no hay viaje se muestra producto o próxima cita |
| M6 | Tab Cotizaciones en el perfil de cliente | Desactivado | No hay API de cotizaciones; el tab queda visible pero inerte hasta M14 |
| M7 | «Compartir» (copiar enlace público abierto) | Omitido / degradado a «Ver público» | En acer el llenado requiere sesión creada desde el perfil del cliente; no se copia `/form/:id` como si fuera suficiente |
| M7 | Conteo de respuestas en la card del catálogo | Omitido | `GET /forms` no trae submissions; se muestran secciones y preguntas reales |
| M7 | Tipo de pregunta «Firma» del mockup | Omitido | El backend no tiene `signature`; se conservan los tipos reales (`file_upload`, condicionales, etc.) |
| M8 | Badge «Disponible» en cards de hotel | Omitido | El catálogo no trae disponibilidad; se muestran lugar, habitaciones y contacto reales |
| M8 | «Responsable» en la card de grupo | Omitido | El listado trae `assignedUserId` sin nombre de usuario; no se inventa un lead |
| M9 | «+ Evento» en la agenda del día | Oculto | Las citas se crean en el perfil del cliente; no hay alta huérfana en el calendario |
| M9 | Carga de agenda por día (`GET /calendar/events/by-date`) | Omitido | CalendarPage sigue filtrando en cliente los eventos de `GET /calendar/events?from=&to=` |
| M10 | Estado de viaje del mock (Confirmado, etc.) | Degradado | `GET /trips` no trae status; el badge se deriva de las fechas (Próximo / En curso / Concluido) |
| M10 | Folio comercial en la card (T-01) | Omitido | El listado usa el uuid interno; no hay folio de operación |
| M10 | Ingresos en la card del listado | Omitido | `GET /trips` no incluye `totalIncome`; solo se pinta si el payload lo trae |
| M10 | Coordinadora en KPIs del detalle | Omitido | El viaje tiene `assignedUserId` sin nombre de usuario en el payload |
| M10 | Mapa fijo de 32 asientos del mock | Omitido | El layout sigue el JSON de la plantilla (`BusLayoutRenderer`); no se unificó con CalendarPage |
