# Plantillas de cotización (propuestas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Catálogo → Plantillas de cotización (agency template + proposal templates with text/photo blocks) and require selecting a proposal when creating quotes so the PDF uses agency branding + a frozen block snapshot.

**Architecture:** Keep existing `QuoteTemplate` (1:1 agency branding). Add `quote_proposal_templates` + `quote_proposal_blocks` (system rows with `company_id` null; company clones). On quote create/update with `proposalTemplateId`, copy blocks into `quotes.proposal_blocks_snapshot` JSON. New catalog shell view hosts agency editor + proposal CRUD; operational quotes stay under Principal.

**Tech Stack:** Express + Sequelize (MySQL), multer uploads, pdf-lib, React 18 + Vite + Tailwind (HSL tokens), existing `PageChrome` / `TabBar` / `Card` / `StatusBadge`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-27-quote-proposal-templates-design.md`
- Colors: CSS HSL variables only in components (`bg-brand-primary`, etc.) — no raw HEX/RGB/OkLCH in UI (PDF template colors may stay hex as today).
- Typography: Urbanist titles, Epilogue body.
- Primitives: reuse `PageChrome`, `SectionTitle`, `Toolbar`, `StatusBadge`, `TabBar`, `Card`.
- Backend has **no Jest**; verify with `npx tsc --noEmit` in `backend/` and `frontend/`, plus `npm run migrate` in `backend/`.
- Permissions: add `nav.quote_templates.view`; reuse `quotes.view|create|update|delete` for API.
- Do not commit unless the user asks (except when a task step says commit and the user already requested implementation commits — prefer one commit per task only if user asked to commit; otherwise leave working tree dirty and note at end).

## File map

| File | Responsibility |
|------|----------------|
| `backend/src/migrations/20261027120000-create-quote-proposal-templates.js` | Tables + quote columns |
| `backend/src/migrations/20261027121000-add-quote-templates-nav-permission.js` | `nav.quote_templates.view` + role grants |
| `backend/src/migrations/20261027122000-seed-system-quote-proposal-templates.js` | System pack + blocks |
| `backend/src/models/QuoteProposalTemplate.ts` | Model |
| `backend/src/models/QuoteProposalBlock.ts` | Model |
| `backend/src/models/Quote.ts` | Add `proposalTemplateId`, `proposalBlocksSnapshot` |
| `backend/src/models/index.ts` | Associations + exports |
| `backend/src/quotes/proposal-snapshot.ts` | Pure helpers: normalize blocks, build snapshot |
| `backend/src/controllers/quote-proposal-templates.controller.ts` | CRUD + clone + image |
| `backend/src/routes/quote-proposal-templates.routes.ts` | Routes + multer |
| `backend/src/routes/index.ts` | Mount `/quote-proposal-templates` |
| `backend/src/controllers/quotes.controller.ts` | Require/snapshot proposal; serialize fields |
| `backend/src/services/quote-pdf.service.ts` | Render snapshot blocks |
| `backend/src/authorization/permissions.catalog.ts` | New nav key |
| `frontend/src/auth/viewPermissions.ts` | `quoteTemplates` view |
| `frontend/src/components/layout/shellNav.ts` | Catálogo item |
| `frontend/src/types/quote.ts` | Proposal types + quote fields |
| `frontend/src/lib/api.ts` | API client methods |
| `frontend/src/hooks/useQuoteProposalTemplatesStore.ts` | List/CRUD store |
| `frontend/src/components/quote-templates/QuoteTemplatesCatalogView.tsx` | Catalog page tabs |
| `frontend/src/components/quote-templates/ProposalTemplatesList.tsx` | List cards |
| `frontend/src/components/quote-templates/ProposalTemplateEditor.tsx` | Block editor |
| `frontend/src/components/quotes/*` | Form selector, detail, remove template tab |
| `frontend/src/pages/Index.tsx` | Wire new view |

---

### Task 1: Migration + Sequelize models

**Files:**
- Create: `backend/src/migrations/20261027120000-create-quote-proposal-templates.js`
- Create: `backend/src/models/QuoteProposalTemplate.ts`
- Create: `backend/src/models/QuoteProposalBlock.ts`
- Create: `backend/src/quotes/proposal-snapshot.ts`
- Modify: `backend/src/models/Quote.ts`
- Modify: `backend/src/models/index.ts`

**Interfaces:**
- Produces: models `QuoteProposalTemplate`, `QuoteProposalBlock`; Quote fields `proposalTemplateId: string | null`, `proposalBlocksSnapshot: ProposalBlockSnapshot[]`; helpers `normalizeProposalBlocks(input)`, `blocksToSnapshot(blocks)`

- [ ] **Step 1: Add pure snapshot helpers**

Create `backend/src/quotes/proposal-snapshot.ts`:

```typescript
export type ProposalBlockType = 'section' | 'itinerary' | 'hotel' | 'activities' | 'custom';

export type ProposalBlockSnapshot = {
  blockType: ProposalBlockType;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
};

const BLOCK_TYPES: ProposalBlockType[] = ['section', 'itinerary', 'hotel', 'activities', 'custom'];

export function normalizeProposalBlocks(input: unknown): ProposalBlockSnapshot[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, index) => {
      const row = raw as Record<string, unknown>;
      const blockType = BLOCK_TYPES.includes(row.blockType as ProposalBlockType)
        ? (row.blockType as ProposalBlockType)
        : 'custom';
      const title = String(row.title ?? '').trim() || `Bloque ${index + 1}`;
      const body = String(row.body ?? '');
      const imageUrl =
        row.imageUrl == null || String(row.imageUrl).trim() === ''
          ? null
          : String(row.imageUrl).trim();
      const sortOrder = Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index;
      return { blockType, title, body, imageUrl, sortOrder };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b, i) => ({ ...b, sortOrder: i }));
}

export function blocksToSnapshot(
  blocks: Array<{
    blockType?: string;
    title?: string;
    body?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
  }>
): ProposalBlockSnapshot[] {
  return normalizeProposalBlocks(blocks);
}
```

- [ ] **Step 2: Write migration**

Create `backend/src/migrations/20261027120000-create-quote-proposal-templates.js` that:
1. Creates `quote_proposal_templates` with columns from the spec (`company_id` NULL allowed, `is_system`, `is_active`, `service_type` ENUM matching quotes, indexes on `company_id`, `is_system`).
2. Creates `quote_proposal_blocks` with FK cascade to templates.
3. Adds to `quotes`: `proposal_template_id` UUID NULL FK → `quote_proposal_templates.id` ON DELETE SET NULL; `proposal_blocks_snapshot` JSON NOT NULL (default `[]` via Sequelize JSON).

- [ ] **Step 3: Models + associations**

- `QuoteProposalTemplate` / `QuoteProposalBlock` mirror existing Quote model style (`underscored: true`, UUID PK).
- Extend `Quote` attributes + `init` fields for `proposalTemplateId`, `proposalBlocksSnapshot` (JSON, default `[]`).
- In `index.ts`: Company.hasMany templates; Template.hasMany blocks; Quote.belongsTo Template as `proposalTemplate`; export both models.

- [ ] **Step 4: Verify compile + migrate**

Run:

```bash
cd backend && npx tsc --noEmit
cd backend && npm run migrate
```

Expected: tsc clean; migration applied without error.

- [ ] **Step 5: Commit** (only if user requested commits)

```bash
git add backend/src/migrations/20261027120000-create-quote-proposal-templates.js \
  backend/src/models/QuoteProposalTemplate.ts \
  backend/src/models/QuoteProposalBlock.ts \
  backend/src/models/Quote.ts \
  backend/src/models/index.ts \
  backend/src/quotes/proposal-snapshot.ts
git commit -m "feat(quotes): add proposal template tables and snapshot helpers"
```

---

### Task 2: Permissions + system seed

**Files:**
- Create: `backend/src/migrations/20261027121000-add-quote-templates-nav-permission.js`
- Create: `backend/src/migrations/20261027122000-seed-system-quote-proposal-templates.js`
- Modify: `backend/src/authorization/permissions.catalog.ts`

**Interfaces:**
- Produces: permission key `nav.quote_templates.view` granted to same roles as `nav.quotes.view` (super_admin, reviewer, consulta).
- Produces: 4 system templates — Hotel (`lodging`), Paquete (`package`), Circuito (`circuit`), Vuelo (`flight`) — each with 2–3 blocks, `company_id` null, `is_system` true.

- [ ] **Step 1: Add key to catalog**

In `PERMISSION_KEYS` and the `quotes` group in `PERMISSION_GROUPS`, add `'nav.quote_templates.view'` next to `'nav.quotes.view'`.

- [ ] **Step 2: Permission migration**

Copy pattern from `20260909141000-add-quotes-permissions.js` with `NEW_KEYS = ['nav.quote_templates.view']` and grant to super_admin, reviewer, consulta.

- [ ] **Step 3: Seed system templates**

In seed migration, `bulkInsert` 4 templates + blocks (no images). Use fixed UUIDs so re-runs/`down` are predictable. Skip insert if a system template with that name already exists.

Example block sets:
- Hotel: Hospedaje, Incluye orientación, Notas
- Paquete: Resumen, Itinerario, Hotel
- Circuito: Recorrido, Actividades, Hospedaje
- Vuelo: Vuelos, Traslados, Notas

- [ ] **Step 4: Migrate**

```bash
cd backend && npm run migrate
```

Expected: both migrations OK.

- [ ] **Step 5: Commit** (if requested)

```bash
git commit -m "feat(quotes): nav permission and system proposal template seed"
```

---

### Task 3: Proposal templates API

**Files:**
- Create: `backend/src/controllers/quote-proposal-templates.controller.ts`
- Create: `backend/src/routes/quote-proposal-templates.routes.ts`
- Modify: `backend/src/routes/index.ts`

**Interfaces:**
- Produces HTTP:
  - `GET /quote-proposal-templates` → list system + company (`is_active` filter default true for pickers; `?includeInactive=1` for catalog)
  - `GET /quote-proposal-templates/:id` → detail + blocks
  - `POST /quote-proposal-templates` body `{ name, description?, serviceType?, blocks? }` → company template
  - `PUT /quote-proposal-templates/:id` → update company only; replace blocks array
  - `POST /quote-proposal-templates/:id/clone` → clone any readable template into company
  - `DELETE /quote-proposal-templates/:id` → set `is_active=false` (company only; system → 403)
  - `POST /quote-proposal-templates/:id/blocks/:blockId/image` multipart `image` → set `image_url` `/uploads/quote-proposals/<file>`
- Auth: `authenticate`; view=`quotes.view`, mutate=`quotes.update` (create uses `quotes.create` or `quotes.update` — use create for POST, update for PUT/clone/image, delete for DELETE).

- [ ] **Step 1: Controller**

Implement serialize:

```typescript
function serializeTemplate(row: QuoteProposalTemplate & { blocks?: QuoteProposalBlock[] }) {
  const blocks = [...(row.blocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    description: row.description || '',
    serviceType: row.serviceType,
    isSystem: row.isSystem,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    blocks: blocks.map((b) => ({
      id: b.id,
      blockType: b.blockType,
      title: b.title,
      body: b.body || '',
      imageUrl: b.imageUrl,
      sortOrder: b.sortOrder,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Access rule for GET by id: `isSystem` OR `companyId === req.user.companyId`.

PUT/DELETE: reject if `isSystem` or wrong company (403).

Clone: load source (system or own), create company row `isSystem=false`, copy blocks (same image URLs OK).

PUT blocks: delete existing blocks for template, recreate from `normalizeProposalBlocks(req.body.blocks)` preserving `imageUrl` when provided.

- [ ] **Step 2: Routes + multer**

Mirror `products.routes.ts` with `uploads/quote-proposals`, 5MB, `image/*` only. Mount multer only on image route.

- [ ] **Step 3: Register**

```typescript
import quoteProposalTemplatesRoutes from './quote-proposal-templates.routes';
router.use('/quote-proposal-templates', quoteProposalTemplatesRoutes);
```

- [ ] **Step 4: Verify**

```bash
cd backend && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit** (if requested)

```bash
git commit -m "feat(quotes): proposal templates CRUD API"
```

---

### Task 4: Quote create/update snapshot + serialize + PDF

**Files:**
- Modify: `backend/src/controllers/quotes.controller.ts`
- Modify: `backend/src/services/quote-pdf.service.ts`

**Interfaces:**
- Consumes: `blocksToSnapshot`, proposal template models
- Produces: `serializeQuote` includes `proposalTemplateId`, `proposalBlocks` (from snapshot)
- Create: require `proposalTemplateId` (UUID); load template accessible to company; set snapshot
- Update: if `proposalTemplateId` provided and changed, refresh snapshot; if omitted, leave snapshot
- PDF: after includes/excludes section, render each snapshot block (title, body, image)

- [ ] **Step 1: Helper to resolve proposal for company**

```typescript
async function loadUsableProposal(companyId: string, proposalTemplateId: string) {
  const template = await QuoteProposalTemplate.findByPk(proposalTemplateId, {
    include: [{ model: QuoteProposalBlock, as: 'blocks' }],
  });
  if (!template || !template.isActive) return null;
  if (!template.isSystem && template.companyId !== companyId) return null;
  return template;
}
```

On `createQuote`: if missing/invalid → `400` `{ error: 'proposalTemplateId is required' }` or `'Proposal template not found or inactive'`.

- [ ] **Step 2: Extend serializeQuote**

Add:

```typescript
proposalTemplateId: json.proposalTemplateId ?? null,
proposalBlocks: normalizeProposalBlocks(json.proposalBlocksSnapshot),
```

- [ ] **Step 3: PDF blocks**

Extend `QuotePdfPayload` with `proposalBlocks: ProposalBlockSnapshot[]`. In `renderQuotePdf`, after terms/includes, for each block: draw title (accent), wrap body, if `imageUrl` use existing `loadLogoBytes`-style loader to embed PNG/JPG scaled to content width. Skip empty snapshot (legacy).

- [ ] **Step 4: Wire download handlers** to pass `quote.proposalBlocksSnapshot`.

- [ ] **Step 5: Verify**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 6: Commit** (if requested)

```bash
git commit -m "feat(quotes): snapshot proposal blocks on quote and render in PDF"
```

---

### Task 5: Frontend types, API, nav shell

**Files:**
- Modify: `frontend/src/types/quote.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/auth/viewPermissions.ts`
- Modify: `frontend/src/components/layout/shellNav.ts`
- Create: `frontend/src/hooks/useQuoteProposalTemplatesStore.ts`

**Interfaces:**
- Produces types `QuoteProposalTemplate`, `QuoteProposalBlock`, extend `Quote` + `QuoteWritePayload` with `proposalTemplateId`, `proposalBlocks`
- API methods matching Task 3 paths
- Shell view id: `quoteTemplates`

- [ ] **Step 1: Types**

```typescript
export type ProposalBlockType = 'section' | 'itinerary' | 'hotel' | 'activities' | 'custom';

export type QuoteProposalBlock = {
  id?: string;
  blockType: ProposalBlockType;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type QuoteProposalTemplate = {
  id: string;
  companyId: string | null;
  name: string;
  description: string;
  serviceType: QuoteServiceType | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  blocks: QuoteProposalBlock[];
};
```

Extend `Quote` with `proposalTemplateId: string | null` and `proposalBlocks: QuoteProposalBlock[]`. Extend `QuoteWritePayload` with `proposalTemplateId: string`.

- [ ] **Step 2: api.ts methods**

`listQuoteProposalTemplates`, `getQuoteProposalTemplate`, `createQuoteProposalTemplate`, `updateQuoteProposalTemplate`, `cloneQuoteProposalTemplate`, `deleteQuoteProposalTemplate`, `uploadQuoteProposalBlockImage(templateId, blockId, file)`.

- [ ] **Step 3: Nav**

Add to `ShellView` and `VIEW_ENTRY_PERMISSIONS`:

```typescript
quoteTemplates: ['nav.quote_templates.view', 'quotes.view', 'nav.quotes.view'],
```

In `shellNav.ts` Catálogo group after `forms` or before products — place after `forms`:

```typescript
{ id: 'quoteTemplates', label: 'Plantillas de cotización', icon: ClipboardList },
```

Meta: `{ title: 'Plantillas de cotización', subtitle: 'Agencia, propuestas y bloques con fotos' }`.

Import a distinct icon if ClipboardList already used — use `FileStack` or `LayoutTemplate` from lucide-react.

- [ ] **Step 4: Store**

`useQuoteProposalTemplatesStore`: `templates`, `fetchTemplates(token, { includeInactive? })`, `save`, `clone`, `deactivate`, `fetchOne`.

- [ ] **Step 5: Verify**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit** (if requested)

```bash
git commit -m "feat(quotes): frontend types, API, and catalog nav for proposal templates"
```

---

### Task 6: Catalog UI + move agency editor

**Files:**
- Create: `frontend/src/components/quote-templates/QuoteTemplatesCatalogView.tsx`
- Create: `frontend/src/components/quote-templates/ProposalTemplatesList.tsx`
- Create: `frontend/src/components/quote-templates/ProposalTemplateEditor.tsx`
- Modify: `frontend/src/components/quotes/QuotesView.tsx` (remove template tab)
- Modify: `frontend/src/pages/Index.tsx`

**Interfaces:**
- Consumes store + `QuoteTemplateEditor` + `useQuotesStore.fetchTemplate/saveTemplate`
- Catalog tabs: `agencia` | `propuestas`

- [ ] **Step 1: Catalog view**

`PageChrome` + `TabBar` with two tabs. Agencia: existing `QuoteTemplateEditor`. Propuestas: list + editor modal/panel.

- [ ] **Step 2: List + editor**

List: `Card` per template, `StatusBadge` tone for Sistema / Empresa / Inactiva. Buttons: Nueva, Duplicar (clone), Editar, Desactivar (company only).

Editor: fields name, description, serviceType select; blocks list with up/down, add/remove; each block type select, title, textarea, image file input calling upload after block has id (save template first if new, then upload).

- [ ] **Step 3: Remove Plantilla PDF tab from QuotesView**

Keep list-only flow; delete `tab === 'template'` UI and related button.

- [ ] **Step 4: Wire Index**

```tsx
if (activeView === 'quoteTemplates') {
  return (
    <PermissionGuard anyOf={['nav.quote_templates.view', 'quotes.view', 'nav.quotes.view']} ...>
      {renderShell('quoteTemplates', <QuoteTemplatesCatalogView />)}
    </PermissionGuard>
  );
}
```

- [ ] **Step 5: Verify frontend tsc + smoke in browser** (nav visible, tabs switch).

- [ ] **Step 6: Commit** (if requested)

```bash
git commit -m "feat(quotes): catalog UI for agency and proposal templates"
```

---

### Task 7: Quote form selector + detail/PDF preview blocks

**Files:**
- Modify: `frontend/src/components/quotes/QuoteForm.tsx`
- Modify: `frontend/src/components/quotes/QuoteFormModal.tsx` (pass proposals if needed)
- Modify: `frontend/src/components/quotes/QuoteDetail.tsx`
- Modify: `frontend/src/components/quotes/QuotePdfPreview.tsx`
- Modify: `frontend/src/components/quotes/QuotesView.tsx` / `ClientQuotes.tsx` (fetch proposals)
- Modify: `frontend/src/hooks/useQuotesStore.ts` if serialize mapping needed

**Interfaces:**
- Form requires `proposalTemplateId` before submit
- Preview/detail render `quote.proposalBlocks` under agency header
- Update copy: design comes from Catálogo → Plantillas de cotización

- [ ] **Step 1: Map store fields**

In `useQuotesStore` quote mapper, include `proposalTemplateId` and `proposalBlocks`.

- [ ] **Step 2: QuoteForm**

Load proposals via props `proposalTemplates: QuoteProposalTemplate[]`. Select required. On submit include `proposalTemplateId`. Optionally set default `type` from template `serviceType`.

- [ ] **Step 3: Preview + detail**

Render blocks (title, body, img) after main quote fields. Legacy empty array → no section.

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

Manual: create quote with Hotel system template → detail shows blocks; PDF download includes them; edit template text → old quote unchanged.

- [ ] **Step 5: Commit** (if requested)

```bash
git commit -m "feat(quotes): require proposal template on quote form and show blocks in preview"
```

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| Nav Catálogo Plantillas de cotización | 5, 6 |
| Tab Agencia (move editor) | 6 |
| Tab Propuestas CRUD + clone system | 3, 6 |
| Blocks text+photo | 1, 3, 6 |
| System pack + company | 2, 3 |
| Quote selects proposal; PDF agency+blocks | 4, 7 |
| Snapshot immutability | 1, 4 |
| Legacy PDF OK | 4, 7 |
| Permissions nav.quote_templates.view | 2, 5 |
| Out of scope builder / multi-lang | not planned |

No TBD placeholders. Types aligned on `ProposalBlockSnapshot` / frontend `QuoteProposalBlock`.
