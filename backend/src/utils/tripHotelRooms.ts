import { Transaction } from 'sequelize';
import { TripHotelRoom, TripHotelRoomAssignment } from '../models';
import type { TripHotelRoomType } from '../models/TripHotelRoom';

export function roomCapacity(type: TripHotelRoomType): number {
  if (type === 'single') return 1;
  if (type === 'double') return 2;
  return 3;
}

export function buildRoomLabel(type: TripHotelRoomType, indexWithinType: number): string {
  const prefix = type === 'single' ? 'Sencilla' : type === 'double' ? 'Doble' : 'Triple';
  return `${prefix} #${indexWithinType}`;
}

export async function createRoomsForNewTripHotel(
  tripHotelId: string,
  singles: number,
  doubles: number,
  triples: number,
  opts?: { transaction?: Transaction }
): Promise<void> {
  const rows: { tripHotelId: string; roomType: TripHotelRoomType; label: string; sortOrder: number }[] = [];
  let sortOrder = 0;
  for (let i = 1; i <= singles; i++) {
    rows.push({
      tripHotelId,
      roomType: 'single',
      label: buildRoomLabel('single', i),
      sortOrder: sortOrder++,
    });
  }
  for (let i = 1; i <= doubles; i++) {
    rows.push({
      tripHotelId,
      roomType: 'double',
      label: buildRoomLabel('double', i),
      sortOrder: sortOrder++,
    });
  }
  for (let i = 1; i <= triples; i++) {
    rows.push({
      tripHotelId,
      roomType: 'triple',
      label: buildRoomLabel('triple', i),
      sortOrder: sortOrder++,
    });
  }
  if (rows.length === 0) return;
  await TripHotelRoom.bulkCreate(rows as any, { ...opts });
}

async function relabelRoomsForTripHotel(tripHotelId: string, transaction?: Transaction): Promise<void> {
  const types: TripHotelRoomType[] = ['single', 'double', 'triple'];
  for (const type of types) {
    const rooms = await TripHotelRoom.findAll({
      where: { tripHotelId, roomType: type },
      order: [['sortOrder', 'ASC']],
      transaction,
    });
    for (let i = 0; i < rooms.length; i++) {
      const label = buildRoomLabel(type, i + 1);
      if (rooms[i].label !== label) {
        await rooms[i].update({ label }, { transaction });
      }
    }
  }
}

export async function syncTripHotelReservedRooms(
  tripHotelId: string,
  targets: { single: number; double: number; triple: number },
  opts?: { transaction?: Transaction }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const transaction = opts?.transaction;
  const types: TripHotelRoomType[] = ['single', 'double', 'triple'];

  for (const type of types) {
    const target = targets[type];

    // Shrink: remove empty rooms first (highest sort_order among empty)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rooms = await TripHotelRoom.findAll({
        where: { tripHotelId, roomType: type },
        include: [{ model: TripHotelRoomAssignment, as: 'assignments', required: false }],
        order: [['sortOrder', 'DESC']],
        transaction,
      });
      if (rooms.length <= target) break;
      const empty = rooms.filter((r) => !(r as any).assignments?.length);
      if (empty.length === 0) {
        return { ok: false, error: 'Cannot reduce room count: unassign participants from rooms first' };
      }
      const toRemove = empty[0];
      await toRemove.destroy({ transaction });
    }

    // Grow
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const count = await TripHotelRoom.count({
        where: { tripHotelId, roomType: type },
        transaction,
      });
      if (count >= target) break;
      const maxRow = (await TripHotelRoom.max('sortOrder', {
        where: { tripHotelId },
        transaction,
      })) as number | null;
      const nextOrder = maxRow == null ? 0 : maxRow + 1;
      await TripHotelRoom.create(
        {
          tripHotelId,
          roomType: type,
          label: 'tmp',
          sortOrder: nextOrder,
        } as any,
        { transaction }
      );
    }
  }

  await relabelRoomsForTripHotel(tripHotelId, transaction);
  return { ok: true };
}
