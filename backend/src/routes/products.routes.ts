import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import * as productsController from '../controllers/products.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const uploadsBase = path.isAbsolute(config.uploadsDir)
  ? config.uploadsDir
  : path.join(process.cwd(), config.uploadsDir);
const uploadsRoot = path.join(uploadsBase, 'products');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.get('/', productsController.getAllProducts);
router.get('/by-category', productsController.getProductsByCategories);
router.get('/:id', productsController.getProductById);
router.post('/', upload.single('image'), productsController.createProduct);
router.put('/:id', upload.single('image'), productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

export default router;

