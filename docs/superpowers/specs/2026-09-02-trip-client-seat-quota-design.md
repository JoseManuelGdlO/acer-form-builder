# Trip client seat quota (client + companions)

**Date:** 2026-09-02  
**Status:** Approved for implementation planning  
**Scope:** Viajes → Agregar participantes + Seleccionar asientos

## Goal

When a client is added to a trip with companions, that client gets a seat quota of **1 + number of companions**. In seat selection, the client shows a counter (`used/allowed`). Seats assigned under that quota always display the **client’s name**, not the companion names. Assignment is blocked when the quota is full.

## Current behavior (baseline)

- Participants: `client` | `companion` | `staff`.
- Companions are standalone (`clientId` null); not linked to a titular client.
- One seat per participant (`trip_seat_assignments` unique on participant / client / seat).
- Seat picker lists all participants without a seat; seat label uses that participant’s name.
- Trip capacity: `totalSeats` caps how many participants can be added.

## Decisions

| Topic | Decision |
|-------|----------|
| Quota formula | `seatsAllowed = 1 + companions linked to that client` |
| Where quota is set | When adding participants (client + companions together) |
| Seat display name | Always the titular **client** name for seats in that group |
| Approach | Option 1: store quota on client participant; link companions; assign next free slot in group |
| Staff | 1 seat, no group counter |
| Children of titular client | Remain separate client participants with `seatsAllowed = 1` each (unless later given their own companions) |
| Adding companions later (v1) | Not in scope; quota is set when client and companions are added together |
| Reviewer mode | Must respect the same quota; still no reset/clear |

## Data model

### `trip_participants`

| Column | Type | Notes |
|--------|------|--------|
| `seats_allowed` | INTEGER NOT NULL DEFAULT 1 | Meaningful for `participant_type = 'client'`; companions/staff keep 1 |
| `linked_client_id` | UUID NULL FK → `clients.id` | For `companion`: which client this companion belongs to on this trip |

Constraints / rules:

- Companions created with a titular client must set `linked_client_id` to that client’s `clients.id`.
- Titular client participant: `seats_allowed = 1 + count(companions with linked_client_id = that client)`.
- Existing rows: migrate defaults (`seats_allowed = 1`, `linked_client_id = null`).

### Seat assignments

Keep **one seat per participant** (no change to uniqueness).

When the UI assigns “to client Juan” with quota 3:

1. Prefer Juan’s own participant row if unassigned.
2. Else assign the next linked companion participant without a seat.
3. **Display** on the map/list always uses Juan’s name for any seat in that group.

So companions still consume one participant/seat slot each; they are the mechanism behind the extra seats, while branding stays on the client.

## Backend behavior

### `POST /trips/:id/participants`

- If companions are present and more than one client is selected without an explicit target: reject or require `companionClientId` (prefer: require exactly one titular client when companions are included, matching the approved UI rule).
- Create client participants (and auto-children as today).
- For the titular client chosen for companions: set `seats_allowed = 1 + validCompanions.length`.
- Create each companion with `linked_client_id = titularClientId`, `participant_type = 'companion'`.
- Continue enforcing trip `totalSeats` on total new participant count.

### `POST /trips/:id/seat-assignments`

- Resolve target participant. If the caller assigns via the client’s group UI, the server should accept `participantId` of the next free group member **or** accept titular `clientId` and resolve the next free participant in the group.
- Before assign: `assignedCountInGroup < seatsAllowed` for the titular client’s group; else `400` with a clear error.
- Group = titular client participant + companions with `linked_client_id = that client`.
- Children clients are **not** part of the parent’s group quota.

### Clear / reset

Unchanged permissions and behavior; group counters update from remaining assignments.

## Frontend behavior

### Agregar participantes

- When 1 client is selected and companions are filled: show `Asientos para este cliente: N (1 + M acompañantes)`.
- When multiple clients are selected **and** companions are present: block submit until a single titular is selected (or an explicit “acompañantes de” selector).
- Staff selection unchanged.

### Seleccionar asientos

- List titular **clients** (and staff) as assignable rows, not each companion as a separate pickable name for seating.
- Client row shows `name` + `used/allowed` (e.g. `Juan Pérez  1/3`).
- Clicking a free seat then a client with remaining quota assigns the next free group participant; seat chip/label shows client name.
- At `used === allowed`, disable that client row.
- Companions do not appear as separate names in the assign list (they exist for capacity/identity/contact, not for seat labeling).
- Staff: one seat, optional `0/1` or no counter.

## Out of scope (v1)

- Raising `seats_allowed` by adding companions after the client is already on the trip.
- Client self-service seat picking.
- Changing hotel room assignment logic.
- WhatsApp / reminders.

## Success criteria

1. Client + 2 companions → client shows `0/3` in seat picker; can assign three seats; all three show client name.
2. Fourth assign attempt for that client fails in UI and API.
3. Trip `totalSeats` still limits total participants.
4. Staff and unlinked-only flows keep working.
5. Existing trips without linked companions behave as `1/1` per client.

## Implementation notes

- Touch points: `TripParticipant` model/migration, `addParticipants` / `setSeatAssignment`, OpenAPI if maintained, `AddParticipantsToTripModal`, `SeatPickerModal`, trip types/`mapTrip`, optionally participant list in `TripDetailView` (counter optional there).
- Prefer resolving “next free group participant” in one place (backend) so UI and API stay consistent.
