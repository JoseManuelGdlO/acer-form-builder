import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import * as controller from '../controllers/quote-proposal-templates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

const uploadsBase = path.isAbsolute(config.uploadsDir)
  ? config.uploadsDir
  : path.join(process.cwd(), config.uploadsDir);
const uploadsRoot = path.join(uploadsBase, 'quote-proposals');
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

router.get('/', requireAnyPermission('quotes.view'), controller.listProposalTemplates);
router.get('/:id/pdf', requireAnyPermission('quotes.view'), controller.downloadProposalTemplatePdf);
router.get('/:id', requireAnyPermission('quotes.view'), controller.getProposalTemplate);
router.post('/', requireAnyPermission('quotes.create'), controller.createProposalTemplate);
router.put('/:id', requireAnyPermission('quotes.update'), controller.updateProposalTemplate);
router.post('/:id/clone', requireAnyPermission('quotes.update'), controller.cloneProposalTemplate);
router.delete('/:id', requireAnyPermission('quotes.delete'), controller.deleteProposalTemplate);
router.post(
  '/:id/blocks/:blockId/image',
  requireAnyPermission('quotes.update'),
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Image too large (max 5MB)' });
        return;
      }
      res.status(415).json({ error: err.message || 'Invalid image upload' });
    });
  },
  controller.uploadBlockImage
);

export default router;
