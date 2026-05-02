import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Hotel } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllHotels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hotels = await Hotel.findAll({
      where: { companyId },
      order: [['created_at', 'DESC']],
    });

    res.json(Array.isArray(hotels) ? hotels.map((h) => h.toJSON()) : []);
  } catch (error) {
    console.error('Get all hotels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHotelById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hotel = await Hotel.findOne({
      where: { id, companyId },
    });

    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    res.json(hotel.toJSON());
  } catch (error) {
    console.error('Get hotel by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createHotel = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().trim(),
  body('notes').optional().trim(),
  body('totalSingleRooms').optional().isInt({ min: 0 }),
  body('totalDoubleRooms').optional().isInt({ min: 0 }),
  body('totalTripleRooms').optional().isInt({ min: 0 }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        name,
        address,
        city,
        country,
        phone,
        email,
        notes,
        totalSingleRooms = 0,
        totalDoubleRooms = 0,
        totalTripleRooms = 0,
      } = req.body;

      const hotel = await Hotel.create({
        companyId,
        name,
        address: address ?? null,
        city: city ?? null,
        country: country ?? null,
        phone: phone ?? null,
        email: email ?? null,
        notes: notes ?? null,
        totalSingleRooms: Number(totalSingleRooms) || 0,
        totalDoubleRooms: Number(totalDoubleRooms) || 0,
        totalTripleRooms: Number(totalTripleRooms) || 0,
      });

      res.status(201).json(hotel.toJSON());
    } catch (error) {
      console.error('Create hotel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateHotel = [
  body('name').optional().trim().notEmpty(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().trim(),
  body('notes').optional().trim(),
  body('totalSingleRooms').optional().isInt({ min: 0 }),
  body('totalDoubleRooms').optional().isInt({ min: 0 }),
  body('totalTripleRooms').optional().isInt({ min: 0 }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hotel = await Hotel.findOne({ where: { id, companyId } });
      if (!hotel) {
        res.status(404).json({ error: 'Hotel not found' });
        return;
      }

      const patch: Record<string, unknown> = {};
      const fields = [
        'name',
        'address',
        'city',
        'country',
        'phone',
        'email',
        'notes',
        'totalSingleRooms',
        'totalDoubleRooms',
        'totalTripleRooms',
      ] as const;
      for (const f of fields) {
        if (Object.prototype.hasOwnProperty.call(req.body, f)) {
          if (f.startsWith('total')) {
            patch[f] = Number(req.body[f]) || 0;
          } else {
            const v = req.body[f];
            patch[f] = v === '' || v === undefined ? null : v;
          }
        }
      }

      await hotel.update(patch as any);
      res.json(hotel.toJSON());
    } catch (error) {
      console.error('Update hotel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteHotel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hotel = await Hotel.findOne({ where: { id, companyId } });
    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    await hotel.destroy();
    res.json({ message: 'Hotel deleted' });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
