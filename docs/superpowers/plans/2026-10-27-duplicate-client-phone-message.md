# Duplicate Client Phone Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear alta/edición de cliente titular con teléfono duplicado y mostrar «Número de cliente registrado, utiliza otro número».

**Architecture:** El backend deja de devolver 200 con el cliente existente; responde 409 con `error` en español. El frontend propaga el Error de `api.request` y `ClientFormModal` lo muestra bajo el teléfono + toast, sin cerrar el modal.

**Tech Stack:** Express/Sequelize (backend), React + sonner toast (frontend).

## Global Constraints

- Mensaje exacto: `Número de cliente registrado, utiliza otro número`
- Solo titulares (`parentClientId` null); familiares sin cambio
- Create: HTTP 409; Update: 409 (consistente)

---

### Task 1: Backend create + update

**Files:**
- Modify: `backend/src/controllers/clients.controller.ts`

- [x] Replace create duplicate branch (≈672–680) with 409 + Spanish `error`
- [x] Replace unique-constraint catch (≈781–791) the same way
- [x] Replace update conflict message (≈923–925) with 409 + same Spanish text
- [ ] Manual check: create with existing phone → 409 JSON

### Task 2: Frontend modal error mapping

**Files:**
- Modify: `frontend/src/components/clients/ClientFormModal.tsx`
- Modify: `frontend/src/components/clients/ClientList.tsx` (rethrow en `handleCreateOrUpdate`)

- [x] On save catch: if message matches duplicate phone (or contains «registrado»), set `phoneError` to that message
- [x] Keep toast; do not close modal (already only closes after successful `onSave`)
- [x] Rethrow from `handleCreateOrUpdate` so modal catch runs
- [ ] Manual check: modal stays open, field shows message

### Task 3: Verify store does not treat conflict as success

**Files:**
- Verify only: `frontend/src/hooks/useClientStore.ts`, `frontend/src/lib/api.ts`

- [x] Confirm `request` throws on non-OK (409) — no code change needed
