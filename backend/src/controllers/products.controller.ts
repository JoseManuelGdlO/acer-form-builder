import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import path from 'path';
import { Product, ProductCategory } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

function normalizeCategoryKey(input: string): string | null {
  const v = String(input || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

  if (!v) return null;
  return v;
}

function normalizeCategoriesInput(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  let items: unknown[] = [];
  if (typeof value === 'string') {
    // Soporta "SERVICIO,PAQUETE"
    items = value.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(value)) {
    items = value;
  } else {
    return null;
  }

  const normalized: string[] = [];
  for (const it of items) {
    if (typeof it !== 'string') return null;
    const nk = normalizeCategoryKey(it);
    if (!nk) return null;
    normalized.push(nk);
  }

  return Array.from(new Set(normalized));
}

function serializeProduct(product: any): any {
  const j = product?.toJSON ? product.toJSON() : product;
  if (!j) return j;
  if (!Array.isArray(j.categories)) j.categories = [];
  j.categories = j.categories.map((c: any) => c.category).filter(Boolean);
  return j;
}

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
      include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
    });

    res.json(Array.isArray(products) ? products.map(serializeProduct) : []);
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

    const product = await Product.findOne({
      where: { id, companyId },
      include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(serializeProduct(product));
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
  body('categories')
    .optional()
    .custom((value) => {
      const normalized = normalizeCategoriesInput(value);
      if (normalized === null) throw new Error('Invalid categories');
      return true;
    }),
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
      const normalizedCategories = normalizeCategoriesInput(req.body.categories);

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

      if (Array.isArray(normalizedCategories) && normalizedCategories.length > 0) {
        await ProductCategory.bulkCreate(
          normalizedCategories.map(category => ({
            productId: product.id,
            category,
          }))
        );
      }

      const productWithCategories = await Product.findOne({
        where: { id: product.id, companyId },
        include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
      });

      res.status(201).json(productWithCategories ? serializeProduct(productWithCategories) : product);
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
  body('categories')
    .optional()
    .custom((value) => {
      const normalized = normalizeCategoriesInput(value);
      if (normalized === null) throw new Error('Invalid categories');
      return true;
    }),
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

      const categoriesProvided = req.body.categories !== undefined;
      const normalizedCategories = normalizeCategoriesInput(req.body.categories);

      await product.update(updates);

      if (categoriesProvided) {
        // Reemplaza completamente las categorías de este producto
        await ProductCategory.destroy({ where: { productId: product.id } });
        if (Array.isArray(normalizedCategories) && normalizedCategories.length > 0) {
          await ProductCategory.bulkCreate(
            normalizedCategories.map(category => ({
              productId: product.id,
              category,
            }))
          );
        }
      }

      const updatedWithCategories = await Product.findOne({
        where: { id: product.id, companyId },
        include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
      });

      res.json(updatedWithCategories ? serializeProduct(updatedWithCategories) : product);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const getProductsByCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const raw = req.query.categories as string | string[] | undefined;

    const categoriesArray = (() => {
      if (raw === undefined) return null;
      if (Array.isArray(raw)) return normalizeCategoriesInput(raw.join(','));
      return normalizeCategoriesInput(raw);
    })();

    if (!categoriesArray || categoriesArray.length === 0) {
      res.status(400).json({ error: 'categories query required' });
      return;
    }

    // Paso 1: obtener ids de productos que tengan al menos una de las categorías
    const matched = await Product.findAll({
      where: { companyId },
      attributes: ['id'],
      include: [
        {
          model: ProductCategory,
          as: 'categories',
          required: true,
          attributes: [],
          where: { category: { [Op.in]: categoriesArray } },
        },
      ],
    });

    const ids = Array.from(new Set(matched.map(m => m.id)));
    if (ids.length === 0) {
      res.json([]);
      return;
    }

    // Paso 2: cargar los productos con todas sus categorías para mostrarlas como badges
    const products = await Product.findAll({
      where: { companyId, id: { [Op.in]: ids } },
      include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
      order: [['created_at', 'DESC']],
    });

    res.json(products.map(serializeProduct));
  } catch (error) {
    console.error('Get products by categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductByTitle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const product = await Product.findOne({ 
      where: { title, companyId },
      include: [{ model: ProductCategory, as: 'categories', attributes: ['category'] }],
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(serializeProduct(product));
  } catch (error) {
    console.error('No hubo coincidencia con el titulo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

