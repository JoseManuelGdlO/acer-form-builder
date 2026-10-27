import { Response } from 'express';
import { Op } from 'sequelize';
import { body, validationResult } from 'express-validator';
import { Company, QuoteProposalBlock, QuoteProposalTemplate, QuoteTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  DEFAULT_QUOTE_ACCENT_COLOR,
  DEFAULT_QUOTE_DOC_TITLE,
  DEFAULT_QUOTE_EXCLUDES,
  DEFAULT_QUOTE_FOOTER,
  DEFAULT_QUOTE_HEADER_COLOR,
  DEFAULT_QUOTE_INCLUDES,
  DEFAULT_QUOTE_TERMS,
  QUOTE_SERVICE_TYPES,
} from '../quotes/quote.constants';
import {
  blocksToSnapshot,
  normalizeProposalBlocks,
  type ProposalBlockType,
} from '../quotes/proposal-snapshot';
import { linesFromText, renderQuotePdf } from '../services/quote-pdf.service';

type TemplateWithBlocks = QuoteProposalTemplate & { blocks?: QuoteProposalBlock[] };

function companyIdOf(req: AuthRequest): string | null {
  return req.user?.companyId || null;
}

function serializeTemplate(row: TemplateWithBlocks) {
  const blocks = [...(row.blocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    description: row.description || '',
    serviceType: row.serviceType,
    isSystem: row.isSystem,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    blocks: blocks.map((b) => ({
      id: b.id,
      blockType: b.blockType,
      title: b.title,
      body: b.body || '',
      imageUrl: b.imageUrl,
      sortOrder: b.sortOrder,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadTemplate(id: string): Promise<TemplateWithBlocks | null> {
  return QuoteProposalTemplate.findByPk(id, {
    include: [{ model: QuoteProposalBlock, as: 'blocks' }],
  }) as Promise<TemplateWithBlocks | null>;
}

function canRead(template: QuoteProposalTemplate, companyId: string): boolean {
  return template.isSystem || template.companyId === companyId;
}

function canWrite(template: QuoteProposalTemplate, companyId: string): boolean {
  return !template.isSystem && template.companyId === companyId;
}

async function replaceBlocks(templateId: string, blocksInput: unknown): Promise<void> {
  const normalized = normalizeProposalBlocks(blocksInput);
  await QuoteProposalBlock.destroy({ where: { proposalTemplateId: templateId } });
  if (!normalized.length) return;
  await QuoteProposalBlock.bulkCreate(
    normalized.map((b) => ({
      proposalTemplateId: templateId,
      blockType: b.blockType,
      title: b.title,
      body: b.body || null,
      imageUrl: b.imageUrl,
      sortOrder: b.sortOrder,
    }))
  );
}

export const listProposalTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const includeInactive = String(req.query.includeInactive || '') === '1';
    const where: Record<string, unknown> = {
      [Op.or]: [{ isSystem: true, companyId: null }, { companyId }],
    };
    if (!includeInactive) {
      where.isActive = true;
    }

    const rows = await QuoteProposalTemplate.findAll({
      where,
      include: [{ model: QuoteProposalBlock, as: 'blocks' }],
      order: [
        ['isSystem', 'DESC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    res.json(rows.map((row) => serializeTemplate(row as TemplateWithBlocks)));
  } catch (error) {
    console.error('List proposal templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProposalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const template = await loadTemplate(req.params.id);
    if (!template || !canRead(template, companyId)) {
      res.status(404).json({ error: 'Proposal template not found' });
      return;
    }
    res.json(serializeTemplate(template));
  } catch (error) {
    console.error('Get proposal template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProposalTemplate = [
  body('name').trim().notEmpty(),
  body('serviceType').optional({ nullable: true }).isIn([...QUOTE_SERVICE_TYPES, null]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = companyIdOf(req);
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await QuoteProposalTemplate.create({
        companyId,
        name: String(req.body.name).trim(),
        description: typeof req.body.description === 'string' ? req.body.description.trim() : null,
        serviceType: req.body.serviceType || null,
        isSystem: false,
        isActive: true,
        sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
      });

      if (req.body.blocks != null) {
        await replaceBlocks(template.id, req.body.blocks);
      }

      const created = await loadTemplate(template.id);
      res.status(201).json(serializeTemplate(created!));
    } catch (error) {
      console.error('Create proposal template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateProposalTemplate = [
  body('name').optional().trim().notEmpty(),
  body('serviceType').optional({ nullable: true }).isIn([...QUOTE_SERVICE_TYPES, null]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = companyIdOf(req);
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const template = await loadTemplate(req.params.id);
      if (!template) {
        res.status(404).json({ error: 'Proposal template not found' });
        return;
      }
      if (!canWrite(template, companyId)) {
        res.status(403).json({ error: 'Cannot edit system or foreign proposal templates' });
        return;
      }

      if (req.body.name !== undefined) template.name = String(req.body.name).trim();
      if (req.body.description !== undefined) {
        template.description =
          typeof req.body.description === 'string' ? req.body.description.trim() : null;
      }
      if (req.body.serviceType !== undefined) template.serviceType = req.body.serviceType || null;
      if (req.body.isActive !== undefined) template.isActive = Boolean(req.body.isActive);
      if (req.body.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))) {
        template.sortOrder = Number(req.body.sortOrder);
      }
      await template.save();

      if (req.body.blocks !== undefined) {
        await replaceBlocks(template.id, req.body.blocks);
      }

      const updated = await loadTemplate(template.id);
      res.json(serializeTemplate(updated!));
    } catch (error) {
      console.error('Update proposal template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const cloneProposalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const source = await loadTemplate(req.params.id);
    if (!source || !canRead(source, companyId)) {
      res.status(404).json({ error: 'Proposal template not found' });
      return;
    }

    const clone = await QuoteProposalTemplate.create({
      companyId,
      name: `${source.name} (copia)`,
      description: source.description,
      serviceType: source.serviceType,
      isSystem: false,
      isActive: true,
      sortOrder: source.sortOrder,
    });

    const blocks = [...(source.blocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (blocks.length) {
      await QuoteProposalBlock.bulkCreate(
        blocks.map((b) => ({
          proposalTemplateId: clone.id,
          blockType: b.blockType as ProposalBlockType,
          title: b.title,
          body: b.body,
          imageUrl: b.imageUrl,
          sortOrder: b.sortOrder,
        }))
      );
    }

    const created = await loadTemplate(clone.id);
    res.status(201).json(serializeTemplate(created!));
  } catch (error) {
    console.error('Clone proposal template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProposalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const template = await loadTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Proposal template not found' });
      return;
    }
    if (!canWrite(template, companyId)) {
      res.status(403).json({ error: 'Cannot deactivate system or foreign proposal templates' });
      return;
    }
    template.isActive = false;
    await template.save();
    res.json({ message: 'Proposal template deactivated', id: template.id });
  } catch (error) {
    console.error('Delete proposal template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadBlockImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const template = await loadTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Proposal template not found' });
      return;
    }
    if (!canWrite(template, companyId)) {
      res.status(403).json({ error: 'Cannot edit system or foreign proposal templates' });
      return;
    }
    const block = (template.blocks || []).find((b) => b.id === req.params.blockId);
    if (!block) {
      res.status(404).json({ error: 'Block not found' });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'image file is required' });
      return;
    }
    if (!file.mimetype.startsWith('image/')) {
      res.status(415).json({ error: 'Only image files are allowed' });
      return;
    }

    const imageUrl = `/uploads/quote-proposals/${file.filename}`;
    block.imageUrl = imageUrl;
    await block.save();

    const updated = await loadTemplate(template.id);
    res.json(serializeTemplate(updated!));
  } catch (error) {
    console.error('Upload proposal block image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function getOrCreateAgencyTemplate(companyId: string): Promise<QuoteTemplate> {
  const existing = await QuoteTemplate.findOne({ where: { companyId } });
  if (existing) return existing;
  const company = await Company.findByPk(companyId, { attributes: ['id', 'name'] });
  return QuoteTemplate.create({
    companyId,
    companyName: company?.name || 'Agencia de viajes',
    contact: '',
    title: DEFAULT_QUOTE_DOC_TITLE,
    footer: DEFAULT_QUOTE_FOOTER,
    headerColor: DEFAULT_QUOTE_HEADER_COLOR,
    accentColor: DEFAULT_QUOTE_ACCENT_COLOR,
    showLogo: true,
    includes: DEFAULT_QUOTE_INCLUDES,
    excludes: DEFAULT_QUOTE_EXCLUDES,
    terms: DEFAULT_QUOTE_TERMS,
  });
}

export const downloadProposalTemplatePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = companyIdOf(req);
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const proposal = await loadTemplate(req.params.id);
    if (!proposal || !canRead(proposal, companyId)) {
      res.status(404).json({ error: 'Proposal template not found' });
      return;
    }

    const agency = await getOrCreateAgencyTemplate(companyId);
    const company = await Company.findByPk(companyId, {
      attributes: ['id', 'name', 'logoUrl', 'theme'],
    });
    const safeName = proposal.name
      .replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/gi, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    const filename = `propuesta-${safeName || 'plantilla'}.pdf`;

    const bytes = await renderQuotePdf({
      template: agency,
      company,
      payload: {
        folio: 'PROPUESTA',
        clientName: 'Cliente ejemplo',
        advisorName: req.user?.name || 'Agente asignado',
        title: proposal.name,
        hotel: proposal.description || '',
        totalLabel: 'Por capturar',
        advanceLabel: 'Por capturar',
        validUntilLabel: 'Por definir',
        includes: linesFromText(agency.includes),
        excludes: linesFromText(agency.excludes),
        terms: agency.terms,
        proposalBlocks: blocksToSnapshot(proposal.blocks || []),
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Download proposal template PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
