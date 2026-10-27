# Plantillas de cotización (catálogo de propuestas)

**Date:** 2026-10-27  
**Status:** Approved for implementation planning  
**Scope:** Catálogo → Plantillas de cotización + vínculo al crear cotizaciones en Principal

## Goal

Agregar en **Catálogo** el submódulo **Plantillas de cotización** para:

1. Editar la **plantilla oficial de agencia** (branding PDF ya existente).
2. Gestionar **plantillas de propuesta** con bloques libres (texto + foto): pack del sistema + plantillas de la empresa.
3. Al **crear una cotización**, el asesor elige una propuesta; el PDF combina branding de agencia + bloques (snapshot) de esa propuesta.

La lista operativa de cotizaciones permanece en **Principal → Cotizaciones**.

## Current behavior (baseline)

- Nav **Principal** incluye `quotes` (Cotizaciones): lista, detalle, crear/editar, PDF.
- Una sola `QuoteTemplate` por empresa (empresa, contacto, título, footer, colores, logo, includes/excludes/terms).
- El editor de plantilla vive como pestaña **Plantilla PDF** dentro de `QuotesView`.
- PDF generado con branding de `QuoteTemplate` + datos de la cotización; sin bloques ni fotos de propuesta.
- Uploads de imagen ya existen para productos (`/uploads/products/...`); logos de empresa para PDF de cotización.

## Decisions

| Topic | Decision |
|-------|----------|
| Ubicación nav | Nuevo ítem en **Catálogo**: **Plantillas de cotización** |
| Relación con Cotizaciones | Cotizaciones operativas se quedan en Principal (opción C) |
| Nombre del ítem | **Plantillas de cotización** (opción A) |
| Modelo de plantillas | 1 plantilla oficial de agencia + N plantillas de propuesta (opción B) |
| Contenido de propuesta | Bloques libres: título + texto + foto opcional por sección (opción C) |
| Origen de plantillas | Pack del sistema + plantillas de la empresa; clonar sistema → empresa (opción C) |
| Uso al cotizar | Selector de propuesta obligatorio en crear/editar; PDF = agencia + bloques (opción A) |
| Enfoque técnico | Opción 1: catálogo + snapshot de bloques en la cotización |
| Persistencia de bloques | Tablas normalizadas (`QuoteProposalBlock`) + snapshot en cotización |
| Cotizaciones legacy | Sin `proposalTemplateId` / sin snapshot → PDF como hoy |
| Editar plantilla vs cotización emitida | Cambios en plantilla **no** alteran cotizaciones ya creadas (snapshot) |
| Permisos v1 | Reutilizar familia `quotes.*` + `nav.quote_templates.view` para entrar al catálogo |

## Architecture

```
Catálogo → Plantillas de cotización
  ├── Tab Agencia     → QuoteTemplate (1:1 company)  [mover editor actual]
  └── Tab Propuestas  → QuoteProposalTemplate + Blocks
                          ├── isSystem (companyId null)
                          └── company clones

Principal → Cotizaciones
  └── create/update Quote
        ├── proposalTemplateId (required for new quotes)
        └── proposal_blocks_snapshot (JSON on Quote)
        └── PDF: agency template + snapshot blocks
```

## Data model

### `quote_templates` (existing)

Sin cambio de concepto: branding y textos base de agencia, 1 por `companyId`.

### `quote_proposal_templates` (new)

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | |
| `company_id` | UUID NULL FK → companies | `NULL` = plantilla del sistema |
| `name` | STRING NOT NULL | |
| `description` | TEXT NULL | |
| `service_type` | ENUM lodging/package/flight/circuit NULL | Alineado a cotizaciones |
| `is_system` | BOOLEAN NOT NULL DEFAULT false | Pack fijo del producto |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | Soft-hide; no borrar sistema |
| `sort_order` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` / `updated_at` | DATETIME | |

Rules:

- Filas sistema: `company_id IS NULL` AND `is_system = true`.
- Filas empresa: `company_id` set AND `is_system = false`.
- Clonar: copia nombre/descripcion/tipo/bloques a una nueva fila de la empresa.

### `quote_proposal_blocks` (new)

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | |
| `proposal_template_id` | UUID FK | Cascade on delete of company templates |
| `block_type` | ENUM section/itinerary/hotel/activities/custom | Default `custom` |
| `title` | STRING NOT NULL | |
| `body` | TEXT NULL | |
| `image_url` | STRING NULL | Path under `/uploads/quote-proposals/...` |
| `sort_order` | INTEGER NOT NULL DEFAULT 0 | |

### `quotes` (extend)

| Column | Type | Notes |
|--------|------|--------|
| `proposal_template_id` | UUID NULL FK | Referencia informativa; puede quedar aunque la plantilla se desactive |
| `proposal_blocks_snapshot` | JSON NOT NULL DEFAULT `[]` | Copia inmutable de bloques al crear/actualizar con plantilla |

Snapshot item shape:

```json
{
  "blockType": "hotel",
  "title": "Hospedaje",
  "body": "...",
  "imageUrl": "/uploads/quote-proposals/...",
  "sortOrder": 0
}
```

On create (and on update when `proposalTemplateId` changes): copy current template blocks into `proposal_blocks_snapshot`. Editing template later does not rewrite existing quotes.

## Backend

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/PUT | `/quotes/template` | Agencia (existing) |
| GET | `/quote-proposal-templates` | Sistema + empresa activa (filtros opcionales) |
| POST | `/quote-proposal-templates` | Crear plantilla empresa |
| GET | `/quote-proposal-templates/:id` | Detalle + bloques |
| PUT | `/quote-proposal-templates/:id` | Actualizar metadatos + bloques (empresa only) |
| POST | `/quote-proposal-templates/:id/clone` | Clonar sistema → empresa |
| DELETE | `/quote-proposal-templates/:id` | Soft-deactivate empresa (`is_active=false`); sistema no se borra |
| POST | `/quote-proposal-templates/:id/blocks/:blockId/image` | Upload imagen bloque |
| POST/PUT | `/quotes` | Acepta `proposalTemplateId`; clona bloques a snapshot |

Permissions: `quotes.view` / `quotes.create` / `quotes.update` / `quotes.delete` as today; nav entry `nav.quote_templates.view` (grant with quotes roles that already have `quotes.view` / `quotes.update`).

### PDF

Extend `quote-pdf.service`: after agency header and quote summary, render snapshot blocks in `sortOrder` (title, body, embedded image if `imageUrl` resolves under uploads). Legacy quotes with empty snapshot skip this section.

### Errors

- Inactive / missing proposal on create → **400** with clear message.
- Invalid / oversized image → **413** / **415**.
- Edit/delete system template without clone → **403**.
- No permission → **403**.

### Seed

Seed 3–4 system proposal templates (e.g. Hotel, Paquete, Circuito, Vuelo) each with 2–3 starter blocks (sin fotos obligatorias).

## Frontend

### Nav / shell

- Add `quoteTemplates` to `ShellView`, `SHELL_NAV_GROUPS` under **Catálogo**, `SHELL_VIEW_META`, `VIEW_ENTRY_PERMISSIONS`.
- Wire view in shell/`Index` to new page component.

### Catálogo UI

- `PageChrome` + `TabBar`: **Agencia** | **Propuestas**.
- **Agencia:** reuse `QuoteTemplateEditor`; remove Plantilla PDF tab from `QuotesView`.
- **Propuestas:** list/grid (`Card`, `StatusBadge`: Sistema / Empresa / Inactiva); actions Nueva, Duplicar, Editar, Desactivar.
- **Editor:** name, service type, description; ordered blocks (add/remove/reorder); per block: type, title, body, image upload/remove; PDF preview (agency + draft blocks).

### Cotizaciones UI

- `QuoteForm` / modal: required select **Plantilla de propuesta** (active system + company).
- Detail / preview: use snapshot blocks; show note that design comes from Catálogo → Plantillas de cotización.

Primitives: reuse `PageChrome`, `SectionTitle`, `Toolbar`, `StatusBadge`, `TabBar`, `Card`. Colors via HSL CSS variables only; Urbanist / Epilogue as project rules.

## Out of scope (v1)

- Full drag-and-drop page builder (columns, grids, free widgets).
- Separate permission module beyond `nav.quote_templates.view` + existing `quotes.*`.
- Forcing migration of all legacy quotes to a proposal template.
- Multi-language templates.
- Sharing proposal templates across companies.

## Success criteria

1. Catálogo muestra **Plantillas de cotización**.
2. Plantilla de agencia se edita ahí (ya no como pestaña principal de Cotizaciones).
3. Pack sistema + plantillas empresa con bloques texto+foto.
4. Crear cotización exige elegir propuesta; PDF muestra agencia + bloques.
5. Editar una plantilla no cambia cotizaciones ya emitidas.
6. Cotizaciones legacy siguen generando PDF sin romper.

## Testing (implementation plan will detail)

- API: CRUD propuesta empresa, clone sistema, reject edit sistema, snapshot on quote create, PDF with images.
- UI: nav visibility by permission, tabs, block editor, quote form selector, legacy detail.
