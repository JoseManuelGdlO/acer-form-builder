import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import { Form, FormSubmission, PdfTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { renderMappedPdf } from '../services/pdf-renderer.service';

const uploadsBase = path.isAbsolute(config.uploadsDir)
  ? config.uploadsDir
  : path.join(process.cwd(), config.uploadsDir);
const templatesDir = path.join(uploadsBase, 'pdf-templates');
fs.mkdirSync(templatesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, templatesDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const uploadPdfTemplate = [
  upload.single('template'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      const formId = req.params.id;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const form = await Form.findOne({ where: { id: formId, companyId, isDeleted: false } });
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'PDF template file is required' });
        return;
      }

      const bytes = await fs.promises.readFile(req.file.path);
      const pdf = await PDFDocument.load(bytes);
      const pageCount = pdf.getPageCount();

      await PdfTemplate.update({ isDeleted: true }, { where: { formId, companyId } });
      const created = await PdfTemplate.create({
        companyId,
        formId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        pageCount,
      });
      await form.update({ pdfTemplateId: created.id });

      res.status(201).json({
        id: created.id,
        formId,
        fileName: created.fileName,
        fileUrl: `/uploads/pdf-templates/${path.basename(created.filePath)}`,
        pageCount: created.pageCount,
      });
    } catch (error) {
      console.error('Upload PDF template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const getPdfTemplateByForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const formId = req.params.id;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const template = await PdfTemplate.findOne({
      where: { companyId, formId, isDeleted: false },
      order: [['created_at', 'DESC']],
    });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({
      id: template.id,
      formId: template.formId,
      fileName: template.fileName,
      fileUrl: `/uploads/pdf-templates/${path.basename(template.filePath)}`,
      pageCount: template.pageCount,
    });
  } catch (error) {
    console.error('Get PDF template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const renderFormPdfPreview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const formId = req.params.id;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const form = await Form.findOne({ where: { id: formId, companyId, isDeleted: false } });
    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    const where: Record<string, unknown> = { companyId, formId, isDeleted: false };
    if (form.pdfTemplateId) where.id = form.pdfTemplateId;
    const template = await PdfTemplate.findOne({ where });
    if (!template) {
      res.status(400).json({ error: 'No PDF template configured for this form' });
      return;
    }

    const pdfBytes = await renderMappedPdf({ form, template, useDummyData: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="preview-${formId}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Render form PDF preview error:', error);
    const details = error instanceof Error ? error.message : 'Unknown render error';
    res.status(500).json({ error: 'Internal server error', details });
  }
};

export const renderSubmissionPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const submission = await FormSubmission.findOne({
      where: { id, companyId },
      include: [{ model: Form, as: 'form' }],
    });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    const form = (submission as any).form as Form | null;
    if (!form) {
      res.status(400).json({ error: 'Submission has no linked form' });
      return;
    }
    const where: Record<string, unknown> = { companyId, formId: form.id, isDeleted: false };
    if (form.pdfTemplateId) where.id = form.pdfTemplateId;
    const template = await PdfTemplate.findOne({ where });
    if (!template) {
      res.status(400).json({ error: 'No PDF template configured for this form' });
      return;
    }
    const pdfBytes = await renderMappedPdf({
      form,
      template,
      answers: submission.answers as Record<string, unknown>,
      useDummyData: false,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Render submission PDF error:', error);
    const details = error instanceof Error ? error.message : 'Unknown render error';
    res.status(500).json({ error: 'Internal server error', details });
  }
};

export const uploadPdfTemplateMiddleware = upload;
