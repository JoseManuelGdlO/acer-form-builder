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
