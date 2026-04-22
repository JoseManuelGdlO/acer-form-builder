import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BusTemplate } from '../models';
import type { BusLayout } from '../models/BusTemplate';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission } from '../authorization/policies';

const LAYOUT_TYPES = ['seat', 'bathroom', 'stairs', 'door', 'driver', 'aisle', 'blocked'] as const;

function normalizeNumberForKey(n: number): number {
  // Avoid false negatives due to floating point rounding.
  return Math.round(n * 100) / 100;
}

function countSeatsFromLayout(layout: BusLayout): number {
  let n = 0;
  for (const floor of layout.floors || []) {
    for (const el of floor.elements || []) {
      if (el.type === 'seat') n++;
    }
  }
  return n;
}

function validateLayout(layout: unknown): { valid: boolean; error?: string } {
  if (!layout || typeof layout !== 'object') return { valid: false, error: 'Layout must be an object' };
  const l = layout as Record<string, unknown>;
  if (!Array.isArray(l.floors)) return { valid: false, error: 'Layout must have floors array' };
  const seenIds = new Set<string>();
  let seatCount = 0;
  for (let i = 0; i < l.floors.length; i++) {
    const floor = l.floors[i];
    if (!floor || typeof floor !== 'object') return { valid: false, error: `Floor ${i} must be an object` };
    const elements = (floor as Record<string, unknown>).elements;
    if (!Array.isArray(elements)) return { valid: false, error: `Floor ${i} must have elements array` };
    const occupiedSlots = new Set<string>();
    for (let j = 0; j < elements.length; j++) {
      const el = elements[j] as Record<string, unknown>;
      if (!el || typeof el !== 'object') return { valid: false, error: `Element ${j} on floor ${i} must be an object` };
      if (typeof el.id !== 'string' || !el.id.trim()) return { valid: false, error: `Element ${j} on floor ${i} must have id` };
      const idTrimmed = el.id.trim();
      if (seenIds.has(idTrimmed)) return { valid: false, error: `Duplicate element.id "${idTrimmed}"` };
      seenIds.add(idTrimmed);
      if (!LAYOUT_TYPES.includes(el.type as any)) return { valid: false, error: `Element ${j} on floor ${i} has invalid type` };
      if (typeof el.label !== 'undefined' && typeof el.label !== 'string') return { valid: false, error: `Element ${j} on floor ${i} label must be a string` };
      if (typeof el.x !== 'number') return { valid: false, error: `Element ${j} on floor ${i} must have number x` };
      if (typeof el.y !== 'number') return { valid: false, error: `Element ${j} on floor ${i} must have number y` };

      if (typeof el.width !== 'undefined' && typeof el.width !== 'number') return { valid: false, error: `Element ${j} on floor ${i} width must be a number` };
      if (typeof el.height !== 'undefined' && typeof el.height !== 'number') return { valid: false, error: `Element ${j} on floor ${i} height must be a number` };
      if (typeof el.width === 'number' && el.width <= 0) return { valid: false, error: `Element ${j} on floor ${i} width must be > 0` };
      if (typeof el.height === 'number' && el.height <= 0) return { valid: false, error: `Element ${j} on floor ${i} height must be > 0` };
      if (typeof el.rotation !== 'undefined' && typeof el.rotation !== 'number') return { valid: false, error: `Element ${j} on floor ${i} rotation must be a number` };
      if (typeof el.metadata !== 'undefined' && (!el.metadata || typeof el.metadata !== 'object' || Array.isArray(el.metadata))) {
        return { valid: false, error: `Element ${j} on floor ${i} metadata must be an object` };
      }

      if (el.type === 'seat') seatCount++;

      // Basic collision rule: no two elements can occupy the same exact (x,y,width,height) slot on the same floor.
      // This aligns with the editor snap-to-grid behavior.
      const w = typeof el.width === 'number' ? el.width : 44;
      const h = typeof el.height === 'number' ? el.height : 44;
      const slotKey = `${i}|${normalizeNumberForKey(el.x)}|${normalizeNumberForKey(el.y)}|${normalizeNumberForKey(w)}|${normalizeNumberForKey(h)}`;
      if (occupiedSlots.has(slotKey)) return { valid: false, error: `Elements overlap at floor ${i} position (${el.x}, ${el.y})` };
      occupiedSlots.add(slotKey);
    }
  }
  if (seatCount < 1) return { valid: false, error: 'Layout must contain at least one seat' };
  return { valid: true };
}

function requireBusTemplatePermission(req: AuthRequest, res: Response, key: string): boolean {
  if (!hasPermission(req.user?.permissions, key)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export const getAllBusTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireBusTemplatePermission(req, res, 'trip_bus_templates.view')) return;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const templates = await BusTemplate.findAll({
      where: { companyId },
      order: [['name', 'ASC']],
    });
    res.json(templates.map(t => t.toJSON()));
  } catch (error) {
    console.error('Get bus templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBusTemplateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireBusTemplatePermission(req, res, 'trip_bus_templates.view')) return;
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const template = await BusTemplate.findOne({
      where: { id, companyId },
    });
    if (!template) {
      res.status(404).json({ error: 'Bus template not found' });
      return;
    }
    res.json(template.toJSON());
  } catch (error) {
    console.error('Get bus template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBusTemplate = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('totalSeats').optional().isInt({ min: 1 }),
  body('rows').optional().isInt({ min: 1 }),
  body('bathroomPosition').optional().isIn(['front', 'middle', 'back']),
  body('floors').optional().isInt({ min: 1, max: 10 }),
  body('stairsPosition').optional().isIn(['front', 'middle', 'back']),
  body('seatLabels').optional().isArray(),
  body('seatLabels.*').optional().isString(),
  body('layout').optional().isObject(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireBusTemplatePermission(req, res, 'trip_bus_templates.create')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user!.companyId;
      const { name, totalSeats, rows, bathroomPosition, floors, stairsPosition, seatLabels, layout } = req.body;
      let totalSeatsVal: number;
      let rowsVal: number;
      let bathroomPositionVal: 'front' | 'middle' | 'back';
      let floorsVal: number;
      const layoutVal = layout && typeof layout === 'object' ? (layout as BusLayout) : null;
      if (layoutVal) {
        const v = validateLayout(layoutVal);
        if (!v.valid) {
          res.status(400).json({ error: v.error });
          return;
        }
        totalSeatsVal = countSeatsFromLayout(layoutVal);
        floorsVal = Array.isArray(layoutVal.floors) ? layoutVal.floors.length : 1;
        rowsVal = 1;
        bathroomPositionVal = 'middle';
      } else {
        if (totalSeats == null || rows == null || !bathroomPosition || floors == null) {
          res.status(400).json({ error: 'Without layout, totalSeats, rows, bathroomPosition and floors are required' });
          return;
        }
        totalSeatsVal = Number(totalSeats);
        rowsVal = Number(rows);
        bathroomPositionVal = bathroomPosition;
        floorsVal = Number(floors);
      }
      const template = await BusTemplate.create({
        companyId,
        name: name.trim(),
        totalSeats: totalSeatsVal,
        rows: rowsVal,
        bathroomPosition: bathroomPositionVal,
        floors: floorsVal,
        stairsPosition: floorsVal === 2 && stairsPosition ? stairsPosition : null,
        seatLabels: Array.isArray(seatLabels) ? seatLabels : null,
        layout: layoutVal,
      });
      res.status(201).json(template.toJSON());
    } catch (error) {
      console.error('Create bus template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateBusTemplate = [
  body('name').optional().notEmpty().trim(),
  body('totalSeats').optional().isInt({ min: 1 }),
  body('rows').optional().isInt({ min: 1 }),
  body('bathroomPosition').optional().isIn(['front', 'middle', 'back']),
  body('floors').optional().isInt({ min: 1, max: 10 }),
  body('stairsPosition').optional().isIn(['front', 'middle', 'back']),
  body('seatLabels').optional().isArray(),
  body('seatLabels.*').optional().isString(),
  body('layout').optional().isObject(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireBusTemplatePermission(req, res, 'trip_bus_templates.update')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const template = await BusTemplate.findOne({ where: { id, companyId } });
      if (!template) {
        res.status(404).json({ error: 'Bus template not found' });
        return;
      }
      const updates: Record<string, unknown> = {};
      const fields = ['name', 'totalSeats', 'rows', 'bathroomPosition', 'floors', 'stairsPosition', 'seatLabels', 'layout'] as const;
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          if (f === 'layout') {
            const layoutVal = req.body.layout;
            if (layoutVal != null) {
              const v = validateLayout(layoutVal);
              if (!v.valid) {
                res.status(400).json({ error: v.error });
                return;
              }
              (updates as any).layout = layoutVal;
              (updates as any).totalSeats = countSeatsFromLayout(layoutVal);
              (updates as any).floors = Array.isArray(layoutVal.floors) ? layoutVal.floors.length : (template as any).floors;
            } else {
              (updates as any).layout = null;
            }
          } else if (f === 'totalSeats' || f === 'rows' || f === 'floors') {
            (updates as any)[f] = Number(req.body[f]);
          } else if (f === 'stairsPosition') {
            (updates as any)[f] = req.body.floors === 2 ? req.body[f] : null;
          } else {
            (updates as any)[f] = req.body[f];
          }
        }
      }
      if (Object.keys(updates).length > 0) await template.update(updates);
      res.json((await template.reload()).toJSON());
    } catch (error) {
      console.error('Update bus template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteBusTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireBusTemplatePermission(req, res, 'trip_bus_templates.delete')) return;
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const template = await BusTemplate.findOne({ where: { id, companyId } });
    if (!template) {
      res.status(404).json({ error: 'Bus template not found' });
      return;
    }
    await template.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Delete bus template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
