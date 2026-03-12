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
  body('includes').notEmpty().withMessage('Includes is required'),
  body('price').notEmpty().withMessage('Price is required').bail().isInt({ gt: 0 }).withMessage('Price must be a positive integer'),
  body('description').optional(),
  body('requirements').optional(),
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

      const { title, includes, price, description, requirements } = req.body;

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
        includes,
        price: parseInt(price, 10),
        description: description ?? null,
        requirements: requirements ?? null,
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
  body('includes').optional().notEmpty(),
  body('price').optional().isInt({ gt: 0 }).withMessage('Price must be a positive integer'),
  body('description').optional(),
  body('requirements').optional(),
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
      if (req.body.includes !== undefined) updates.includes = req.body.includes;
      if (req.body.price !== undefined) updates.price = parseInt(req.body.price, 10);
      if (req.body.description !== undefined) updates.description = req.body.description ?? null;
      if (req.body.requirements !== undefined) updates.requirements = req.body.requirements ?? null;

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

