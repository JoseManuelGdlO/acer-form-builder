import { randomBytes } from 'crypto';
import { Response } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { body, validationResult } from 'express-validator';
import { Client, Company, Quote, QuoteEvent, QuoteTemplate } from '../models';
import type { QuoteOrigin, QuoteServiceType, QuoteStatus } from '../models/Quote';
import { AuthRequest } from '../middleware/auth.middleware';
import { canAccessClientRecord, canViewAllClients } from '../authorization/policies';
import { linesFromText, renderQuotePdf } from '../services/quote-pdf.service';
import {
  DEFAULT_QUOTE_ACCENT_COLOR,
  DEFAULT_QUOTE_DOC_TITLE,
  DEFAULT_QUOTE_EXCLUDES,
  DEFAULT_QUOTE_FOOTER,
  DEFAULT_QUOTE_HEADER_COLOR,
  DEFAULT_QUOTE_INCLUDES,
  DEFAULT_QUOTE_TERMS,
  QUOTE_SERVICE_TYPES,
  QUOTE_STATUSES,
} from '../quotes/quote.constants';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

type QuoteWithClient = Quote & { client?: Client; events?: QuoteEvent[] };

function todayDateOnly(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value);
  const key = raw.length >= 10 ? raw.slice(0, 10) : raw;
  return DATE_ONLY.test(key) ? key : null;
}

function formatTrackDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null || Number.isNaN(Number(amount))) return 'Por capturar';
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
  return `${formatted} ${currency || 'MXN'}`;
}

function formatDisplayDate(value: string | null): string {
  if (!value) return 'Por definir';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return linesFromText(value);
  }
  return [];
}

function resolveStatus(quote: { status: QuoteStatus; validUntil: string | null }): QuoteStatus {
  if (quote.status === 'draft') return 'draft';
  if (quote.validUntil && quote.validUntil < todayDateOnly()) return 'expired';
  return quote.status === 'expired' ? 'expired' : 'registered';
}

function serializeQuote(quote: QuoteWithClient) {
  const json = quote.toJSON() as QuoteWithClient & {
    client?: { id: string; name: string };
    events?: Array<{ id: string; label: string; createdAt: Date }>;
  };
  const events = json.events ?? [];
  const status = resolveStatus({
    status: json.status,
    validUntil: toDateOnly(json.validUntil),
  });
  return {
    id: json.id,
    companyId: json.companyId,
    clientId: json.clientId,
    clientName: json.client?.name ?? '',
    folio: json.folio,
    title: json.title,
    type: json.serviceType,
    hotel: json.hotel ?? '',
    advisorName: json.advisorName,
    advisorUserId: json.advisorUserId,
    totalAmount: json.totalAmount != null ? Number(json.totalAmount) : null,
    advanceAmount: json.advanceAmount != null ? Number(json.advanceAmount) : null,
    currency: json.currency || 'MXN',
    startDate: toDateOnly(json.startDate),
    endDate: toDateOnly(json.endDate),
    validUntil: toDateOnly(json.validUntil),
    status,
    origin: json.origin,
    notes: json.notes ?? '',
    includes: Array.isArray(json.includes) ? json.includes : [],
    excludes: Array.isArray(json.excludes) ? json.excludes : [],
    terms: json.terms ?? '',
    track: events.map((event) => ({
      id: event.id,
      label: event.label,
      date: formatTrackDate(event.createdAt),
      createdAt: event.createdAt,
    })),
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function serializeTemplate(template: QuoteTemplate) {
  const json = template.toJSON() as QuoteTemplate;
  return {
    id: json.id,
    companyId: json.companyId,
    company: json.companyName,
    contact: json.contact,
    title: json.title,
    footer: json.footer,
    headerColor: json.headerColor,
    accentColor: json.accentColor,
    showLogo: json.showLogo,
    includes: json.includes,
    excludes: json.excludes,
    terms: json.terms,
    updatedAt: json.updatedAt,
  };
}

const quoteInclude = [
  { model: Client, as: 'client', attributes: ['id', 'name', 'assignedUserId'] },
  { model: QuoteEvent, as: 'events', attributes: ['id', 'label', 'createdAt'] },
];

async function generateFolio(companyId: string): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const folio = `COT-${randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await Quote.findOne({ where: { companyId, folio }, attributes: ['id'] });
    if (!exists) return folio;
  }
  return `COT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function addEvent(companyId: string, quoteId: string, label: string): Promise<void> {
  await QuoteEvent.create({ companyId, quoteId, label });
}

async function loadAccessibleClient(req: AuthRequest, clientId: string): Promise<Client | null> {
  const companyId = req.user?.companyId;
  if (!companyId || !clientId) return null;
  const client = await Client.findOne({ where: { id: clientId, companyId } });
  if (!client) return null;
  if (!canAccessClientRecord(req, client)) return null;
  return client;
}

async function findAccessibleQuote(req: AuthRequest, id: string): Promise<QuoteWithClient | null> {
  const companyId = req.user?.companyId;
  if (!companyId) return null;
  const quote = (await Quote.findOne({
    where: { id, companyId },
    include: quoteInclude,
    order: [[{ model: QuoteEvent, as: 'events' }, 'createdAt', 'ASC']],
  })) as QuoteWithClient | null;
  if (!quote) return null;
  const client = (quote as QuoteWithClient).client;
  if (client && !canAccessClientRecord(req, client)) return null;
  return quote;
}

function parseOptionalAmount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function parseOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return toDateOnly(value);
}

async function getOrCreateTemplate(companyId: string): Promise<QuoteTemplate> {
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

function assignedScopeWhere(req: AuthRequest): WhereOptions | undefined {
  if (canViewAllClients(req)) return undefined;
  return { assignedUserId: req.user!.id };
}

export const listQuotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const today = todayDateOnly();

    const and: WhereOptions[] = [{ companyId }];
    if (clientId) and.push({ clientId });

    if (status === 'draft') {
      and.push({ status: 'draft' });
    } else if (status === 'registered') {
      and.push({
        status: 'registered',
        [Op.or]: [{ validUntil: null }, { validUntil: { [Op.gte]: today } }],
      });
    } else if (status === 'expired') {
      and.push({
        [Op.or]: [
          { status: 'expired' },
          { status: 'registered', validUntil: { [Op.lt]: today } },
        ],
      });
    }

    const clientWhere = assignedScopeWhere(req);
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      and.push({
        [Op.or]: [
          { folio: like },
          { title: like },
          { hotel: like },
          { advisorName: like },
          { '$client.name$': like },
        ],
      });
    }
    const where: WhereOptions = { [Op.and]: and };

    const quotes = (await Quote.findAll({
      where,
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'assignedUserId'],
          required: true,
          ...(clientWhere ? { where: clientWhere } : {}),
        },
        { model: QuoteEvent, as: 'events', attributes: ['id', 'label', 'createdAt'] },
      ],
      order: [
        ['created_at', 'DESC'],
        [{ model: QuoteEvent, as: 'events' }, 'createdAt', 'ASC'],
      ],
      subQuery: false,
    })) as QuoteWithClient[];

    res.json(quotes.map((quote) => serializeQuote(quote)));
  } catch (error) {
    console.error('List quotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quote = await findAccessibleQuote(req, req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    res.json(serializeQuote(quote));
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuote = [
  body('clientId').notEmpty().withMessage('clientId is required'),
  body('title').optional().trim(),
  body('type').optional().isIn(QUOTE_SERVICE_TYPES),
  body('hotel').optional({ nullable: true }).trim(),
  body('advisorName').optional().trim(),
  body('advisorUserId').optional({ nullable: true }).isUUID(),
  body('notes').optional({ nullable: true }).trim(),
  body('terms').optional({ nullable: true }).trim(),
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

      const client = await loadAccessibleClient(req, String(req.body.clientId));
      if (!client) {
        res.status(400).json({ error: 'Client not found or not accessible' });
        return;
      }

      const template = await getOrCreateTemplate(companyId);
      const type = (QUOTE_SERVICE_TYPES.includes(req.body.type) ? req.body.type : 'lodging') as QuoteServiceType;
      const totalAmount = parseOptionalAmount(req.body.totalAmount);
      const advanceAmount = parseOptionalAmount(req.body.advanceAmount);
      if (req.body.totalAmount !== undefined && totalAmount === undefined) {
        res.status(400).json({ error: 'totalAmount must be a number' });
        return;
      }
      if (req.body.advanceAmount !== undefined && advanceAmount === undefined) {
        res.status(400).json({ error: 'advanceAmount must be a number' });
        return;
      }

      const startDate = parseOptionalDate(req.body.startDate);
      const endDate = parseOptionalDate(req.body.endDate);
      const validUntil = parseOptionalDate(req.body.validUntil);
      if (req.body.startDate && startDate === undefined) {
        res.status(400).json({ error: 'startDate must be YYYY-MM-DD' });
        return;
      }
      if (req.body.endDate && endDate === undefined) {
        res.status(400).json({ error: 'endDate must be YYYY-MM-DD' });
        return;
      }
      if (req.body.validUntil && validUntil === undefined) {
        res.status(400).json({ error: 'validUntil must be YYYY-MM-DD' });
        return;
      }

      const includes = req.body.includes != null ? asStringList(req.body.includes) : linesFromText(template.includes);
      const excludes = req.body.excludes != null ? asStringList(req.body.excludes) : linesFromText(template.excludes);
      const terms = typeof req.body.terms === 'string' && req.body.terms.trim() ? req.body.terms : template.terms;
      const folio = await generateFolio(companyId);
      const advisorName = (req.body.advisorName as string | undefined)?.trim() || req.user?.name || 'Asesor';

      const quote = await Quote.create({
        companyId,
        clientId: client.id,
        folio,
        title: (req.body.title as string | undefined)?.trim() || 'Nueva propuesta',
        serviceType: type,
        hotel: (req.body.hotel as string | undefined)?.trim() || null,
        advisorName,
        advisorUserId: req.body.advisorUserId || req.user?.id || null,
        totalAmount: totalAmount ?? null,
        advanceAmount: advanceAmount ?? null,
        currency: (req.body.currency as string | undefined)?.trim() || 'MXN',
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        validUntil: validUntil ?? null,
        status: 'draft',
        origin: 'system' as QuoteOrigin,
        notes: (req.body.notes as string | undefined)?.trim() || null,
        includes,
        excludes,
        terms,
        createdBy: req.user?.id || null,
      });

      await addEvent(companyId, quote.id, 'Cotización creada');
      await addEvent(companyId, quote.id, `Cotización ligada al expediente de ${client.name}`);

      const created = await findAccessibleQuote(req, quote.id);
      res.status(201).json(serializeQuote(created || (quote as QuoteWithClient)));
    } catch (error) {
      console.error('Create quote error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateQuote = [
  body('title').optional().trim().notEmpty(),
  body('type').optional().isIn(QUOTE_SERVICE_TYPES),
  body('status').optional().isIn(QUOTE_STATUSES),
  body('hotel').optional({ nullable: true }).trim(),
  body('advisorName').optional().trim(),
  body('notes').optional({ nullable: true }).trim(),
  body('terms').optional({ nullable: true }).trim(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const quote = await findAccessibleQuote(req, req.params.id);
      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      const patch: Record<string, unknown> = {};
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
      if (req.body.type !== undefined) patch.serviceType = req.body.type;
      if (req.body.hotel !== undefined) patch.hotel = String(req.body.hotel || '').trim() || null;
      if (req.body.advisorName !== undefined) patch.advisorName = String(req.body.advisorName).trim();
      if (req.body.advisorUserId !== undefined) patch.advisorUserId = req.body.advisorUserId || null;
      if (req.body.notes !== undefined) patch.notes = String(req.body.notes || '').trim() || null;
      if (req.body.terms !== undefined) patch.terms = String(req.body.terms || '');
      if (req.body.currency !== undefined) patch.currency = String(req.body.currency || 'MXN').trim() || 'MXN';
      if (req.body.includes !== undefined) patch.includes = asStringList(req.body.includes);
      if (req.body.excludes !== undefined) patch.excludes = asStringList(req.body.excludes);
      if (req.body.status !== undefined) patch.status = req.body.status;

      if (req.body.totalAmount !== undefined) {
        const totalAmount = parseOptionalAmount(req.body.totalAmount);
        if (req.body.totalAmount !== null && req.body.totalAmount !== '' && totalAmount === undefined) {
          res.status(400).json({ error: 'totalAmount must be a number' });
          return;
        }
        patch.totalAmount = totalAmount ?? null;
      }
      if (req.body.advanceAmount !== undefined) {
        const advanceAmount = parseOptionalAmount(req.body.advanceAmount);
        if (req.body.advanceAmount !== null && req.body.advanceAmount !== '' && advanceAmount === undefined) {
          res.status(400).json({ error: 'advanceAmount must be a number' });
          return;
        }
        patch.advanceAmount = advanceAmount ?? null;
      }
      for (const field of ['startDate', 'endDate', 'validUntil'] as const) {
        if (req.body[field] !== undefined) {
          const parsed = parseOptionalDate(req.body[field]);
          if (req.body[field] && parsed === undefined) {
            res.status(400).json({ error: `${field} must be YYYY-MM-DD` });
            return;
          }
          patch[field] = parsed ?? null;
        }
      }

      if (req.body.clientId && req.body.clientId !== quote.clientId) {
        const client = await loadAccessibleClient(req, String(req.body.clientId));
        if (!client) {
          res.status(400).json({ error: 'Client not found or not accessible' });
          return;
        }
        patch.clientId = client.id;
      }

      await quote.update(patch);
      const updated = await findAccessibleQuote(req, quote.id);
      res.json(serializeQuote(updated || quote));
    } catch (error) {
      console.error('Update quote error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateQuoteStatus = [
  body('status').isIn(['draft', 'registered', 'expired']).withMessage('Invalid status'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const quote = await findAccessibleQuote(req, req.params.id);
      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const status = req.body.status as QuoteStatus;
      const labels: Record<QuoteStatus, string> = {
        draft: 'Regresada a borrador para edición',
        registered: 'Cotización registrada en el expediente',
        expired: 'Marcada como vencida',
      };
      await quote.update({ status });
      await addEvent(quote.companyId, quote.id, labels[status]);
      const updated = await findAccessibleQuote(req, quote.id);
      res.json(serializeQuote(updated || quote));
    } catch (error) {
      console.error('Update quote status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const linkQuote = [
  body('clientId').notEmpty().withMessage('clientId is required'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const quote = await findAccessibleQuote(req, req.params.id);
      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const client = await loadAccessibleClient(req, String(req.body.clientId));
      if (!client) {
        res.status(400).json({ error: 'Client not found or not accessible' });
        return;
      }
      await quote.update({ clientId: client.id });
      await addEvent(quote.companyId, quote.id, `Cotización ligada al expediente de ${client.name}`);
      const updated = await findAccessibleQuote(req, quote.id);
      res.json(serializeQuote(updated || quote));
    } catch (error) {
      console.error('Link quote error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const addQuoteEvent = [
  body('label').optional().trim(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const quote = await findAccessibleQuote(req, req.params.id);
      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const label = (req.body.label as string | undefined)?.trim() || 'Nota de seguimiento agregada';
      await addEvent(quote.companyId, quote.id, label);
      const updated = await findAccessibleQuote(req, quote.id);
      res.status(201).json(serializeQuote(updated || quote));
    } catch (error) {
      console.error('Add quote event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteQuote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quote = await findAccessibleQuote(req, req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    await QuoteEvent.destroy({ where: { quoteId: quote.id } });
    await quote.destroy();
    res.json({ message: 'Quote deleted' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuoteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const template = await getOrCreateTemplate(companyId);
    res.json(serializeTemplate(template));
  } catch (error) {
    console.error('Get quote template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuoteTemplate = [
  body('company').optional().trim().notEmpty(),
  body('contact').optional().trim(),
  body('title').optional().trim().notEmpty(),
  body('footer').optional().trim(),
  body('headerColor').optional().matches(HEX_COLOR),
  body('accentColor').optional().matches(HEX_COLOR),
  body('showLogo').optional(),
  body('includes').optional(),
  body('excludes').optional(),
  body('terms').optional(),
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
      const template = await getOrCreateTemplate(companyId);
      const patch: Record<string, unknown> = {};
      if (req.body.company !== undefined) patch.companyName = String(req.body.company).trim();
      if (req.body.contact !== undefined) patch.contact = String(req.body.contact).trim();
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
      if (req.body.footer !== undefined) patch.footer = String(req.body.footer);
      if (req.body.headerColor !== undefined) patch.headerColor = String(req.body.headerColor);
      if (req.body.accentColor !== undefined) patch.accentColor = String(req.body.accentColor);
      if (req.body.showLogo !== undefined) {
        patch.showLogo = req.body.showLogo === true || req.body.showLogo === 'true';
      }
      if (req.body.includes !== undefined) {
        patch.includes = Array.isArray(req.body.includes)
          ? asStringList(req.body.includes).join('\n')
          : String(req.body.includes);
      }
      if (req.body.excludes !== undefined) {
        patch.excludes = Array.isArray(req.body.excludes)
          ? asStringList(req.body.excludes).join('\n')
          : String(req.body.excludes);
      }
      if (req.body.terms !== undefined) patch.terms = String(req.body.terms);
      await template.update(patch);
      res.json(serializeTemplate(template));
    } catch (error) {
      console.error('Update quote template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

async function sendQuotePdf(
  req: AuthRequest,
  res: Response,
  quote: QuoteWithClient | null,
  filename: string
): Promise<void> {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const template = await getOrCreateTemplate(companyId);
  const company = await Company.findByPk(companyId, { attributes: ['id', 'name', 'logoUrl'] });
  const includes =
    quote && Array.isArray(quote.includes) && quote.includes.length
      ? quote.includes
      : linesFromText(template.includes);
  const excludes =
    quote && Array.isArray(quote.excludes) && quote.excludes.length
      ? quote.excludes
      : linesFromText(template.excludes);
  const bytes = await renderQuotePdf({
    template,
    company,
    payload: {
      folio: quote?.folio ?? 'COT-000000',
      clientName: (quote as QuoteWithClient | null)?.client?.name || 'Nombre del cliente',
      advisorName: quote?.advisorName || 'Agente asignado',
      title: quote?.title || 'Propuesta de viaje',
      hotel: quote?.hotel || '',
      totalLabel: formatMoney(quote?.totalAmount != null ? Number(quote.totalAmount) : null, quote?.currency || 'MXN'),
      advanceLabel: formatMoney(
        quote?.advanceAmount != null ? Number(quote.advanceAmount) : null,
        quote?.currency || 'MXN'
      ),
      validUntilLabel: formatDisplayDate(toDateOnly(quote?.validUntil ?? null)),
      includes,
      excludes,
      terms: quote?.terms || template.terms,
    },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(bytes));
}

export const downloadQuotePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quote = await findAccessibleQuote(req, req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    await sendQuotePdf(req, res, quote, `${quote.folio}.pdf`);
  } catch (error) {
    console.error('Download quote PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadQuoteTemplatePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await sendQuotePdf(req, res, null, 'cotizacion-ejemplo.pdf');
  } catch (error) {
    console.error('Download quote template PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
