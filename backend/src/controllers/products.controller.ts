import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import path from 'path';
import { Product } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const products = await Product.findAll({
      where: { companyId },
      order: [['created_at', 'DESC']],
    });

    res.json(Array.isArray(products) ? products : []);
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const product = await Product.findOne({ where: { id, companyId } });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('requirements').notEmpty().withMessage('Requirements are required'),
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

      const { title, description, requirements } = req.body;

      let imagePath: string | undefined;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (file) {
        const relativePath = path
          .normalize(path.join('products', path.basename(file.filename)))
          .replace(/\\/g, '/');
        imagePath = relativePath;
      }

      const product = await Product.create({
        companyId,
        title,
        description,
        requirements,
        imagePath: imagePath ?? null,
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateProduct = [
  body('title').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('requirements').optional().notEmpty(),
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

      const product = await Product.findOne({ where: { id, companyId } });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.requirements !== undefined) updates.requirements = req.body.requirements;

      const file = (req as any).file as Express.Multer.File | undefined;
      if (file) {
        const relativePath = path
          .normalize(path.join('products', path.basename(file.filename)))
          .replace(/\\/g, '/');
        updates.imagePath = relativePath;
      }

      await product.update(updates);
      res.json(product);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const product = await Product.findOne({ where: { id, companyId } });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

