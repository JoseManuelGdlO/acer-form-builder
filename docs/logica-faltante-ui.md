# Lógica UI del prototipo aún no soportada en acer

Registro pedido por el plan de cascada: controles de TravelUp que acer no tiene en backend o que se aplazan a un módulo posterior. No simular persistencia.

| Módulo | Control del prototipo | Decisión | Motivo |
|---|---|---|---|
| M2 | Cotizaciones en nav Principal | Omitido | Se añade en M14, solo front |
| M2 | Búsqueda global cross-entity (clientes + viajes + cotizaciones) | Degradado | El header solo rellena el `q` de la vista activa (clientes API, viajes/productos en memoria). No hay endpoint de búsqueda global |
| M2 | CTA «Nueva cotización» | Omitido | No hay API de cotizaciones (M14) |
| M2 | Alta de grupos, formularios o usuarios desde el CTA del header | Oculto | El alta sigue en cada vista; no se inventó un bus de eventos extra |
