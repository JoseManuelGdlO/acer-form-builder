import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Category, ProductCategory } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

function normalizeKey(input: string): string {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const categories = await Category.findAll({
      where: { companyId },
      order: [['name', 'ASC']],
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = [
  body('name').notEmpty().withMessage('Name is required'),
  body('color').optional().isString(),
  body('key').optional().isString(),
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

      const name: string = req.body.name;
      const color: string | undefined = req.body.color;
      const rawKey: string | undefined = req.body.key;

      const key = normalizeKey(rawKey || name);

      const existing = await Category.findOne({ where: { companyId, key } });
      if (existing) {
        res.status(400).json({ error: 'Category key already exists for this company' });
        return;
      }

      const category = await Category.create({
        companyId,
        key,
        name: name.trim(),
        color: color ?? null,
      });

      res.status(201).json(category);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateCategory = [
  body('name').optional().notEmpty(),
  body('color').optional().isString(),
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

      const { id } = req.params;
      const category = await Category.findOne({ where: { id, companyId } });
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();
        const key = normalizeKey(name);

        const existing = await Category.findOne({ where: { companyId, key } });
        // Si la "clave" cae en otra categoría, rompemos la unicidad por compañía.
        if (existing && existing.id !== category.id) {
          res.status(400).json({ error: 'Category key already exists for this company' });
          return;
        }

        updates.name = name;
        updates.key = key;
      }
      if (req.body.color !== undefined) updates.color = req.body.color || null;

      await category.update(updates);
      res.json(category);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const category = await Category.findOne({ where: { id, companyId } });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Evitar borrar categorías que se usan en productos
    const inUseCount = await ProductCategory.count({
      where: { category: category.key },
    });

    if (inUseCount > 0) {
      res.status(400).json({ error: 'No puedes borrar una categoría que está asignada a productos' });
      return;
    }

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

