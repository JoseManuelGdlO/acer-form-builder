import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { fn, col, cast, Op, where as sequelizeWhere } from 'sequelize';
import {
  Client,
  ClientChecklist,
  ChecklistTemplate,
  ClientAmountDueLog,
  ClientPaymentDeletedLog,
  ClientPayment,
  ClientAcquiredPackage,
  User,
  Branch,
  TripParticipant,
  Trip,
  Product,
  VisaStatusTemplate,
  Conversations,
  InternalAppointment,
} from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission, canViewAllClients, canAccessClientRecord } from '../authorization/policies';

const parseNullableParentClientId = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return String(value);
};

const parseNullablePostalCode = (
  value: unknown
): { value?: number | null; error?: string } => {
  if (value === undefined) return { value: undefined };
  if (value === null || value === '') return { value: null };
  const raw = String(value).trim();
  if (!/^\d{5}$/.test(raw)) {
    return { error: 'Postal code must contain exactly 5 digits' };
  }
  if (raw === '00000') {
    return { error: 'Postal code 00000 is not valid' };
  }
  const numeric = Number(raw);
  if (!Number.isInteger(numeric)) {
    return { error: 'Postal code must be an integer' };
  }
  return { value: numeric };
};

const getDefaultVisaStatusTemplateId = async (companyId: string): Promise<string | null> => {
  const templates = await VisaStatusTemplate.findAll({
    where: { companyId, isActive: true },
    order: [['order', 'ASC']],
  });
  if (templates.length === 0) return null;
  const inProgress = templates.find((t) => t.label.toLowerCase().includes('proceso'));
  return (inProgress || templates[0]).id;
};

const getWhatsappReplyStatusByPhone = async (
  phones: string[],
  companyId: string
): Promise<Record<string, { hasWhatsappReply: boolean; lastUserMessageAt: Date | null; lastBotMessageAt: Date | null }>> => {
  const uniquePhones = Array.from(new Set(phones.map((phone) => String(phone || '').trim()).filter(Boolean)));
  if (uniquePhones.length === 0) return {};

  const conversations = await Conversations.findAll({
    where: {
      phone: { [Op.in]: uniquePhones },
      from: { [Op.in]: ['usuario', 'bot'] },
      companyId,
    },
    attributes: ['phone', 'from', 'createdAt'],
    order: [['created_at', 'DESC']],
  });

  const statusByPhone: Record<
    string,
    { hasWhatsappReply: boolean; lastUserMessageAt: Date | null; lastBotMessageAt: Date | null }
  > = {};

  for (const phone of uniquePhones) {
    statusByPhone[phone] = {
      hasWhatsappReply: false,
      lastUserMessageAt: null,
      lastBotMessageAt: null,
    };
  }

  for (const conversation of conversations) {
    const phone = String((conversation as any).phone || '').trim();
    if (!phone || !statusByPhone[phone]) continue;

    const createdAt = conversation.createdAt ? new Date(conversation.createdAt) : null;
    if (!createdAt) continue;

    if (conversation.from === 'usuario' && !statusByPhone[phone].lastUserMessageAt) {
      statusByPhone[phone].lastUserMessageAt = createdAt;
    }
    if (conversation.from === 'bot' && !statusByPhone[phone].lastBotMessageAt) {
      statusByPhone[phone].lastBotMessageAt = createdAt;
    }
  }

  for (const phone of uniquePhones) {
    const status = statusByPhone[phone];
    status.hasWhatsappReply = Boolean(
      status.lastUserMessageAt &&
        (!status.lastBotMessageAt || status.lastUserMessageAt.getTime() > status.lastBotMessageAt.getTime())
    );
  }

  return statusByPhone;
};

export const getAllClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (
      !hasPermission(req.user!.permissions, 'clients.view_all') &&
      !hasPermission(req.user!.permissions, 'clients.view_assigned')
    ) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const {
      assignedUserId,
      branchId,
      productId,
      visaStatusTemplateId,
      checklistTemplateId,
      q,
      page,
      limit,
    } = req.query;
    const where: any = { companyId, parentClientId: null };
    const parsedPage = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit || '20'), 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    // Assigned-only scope when user cannot view all clients
    if (req.user && !canViewAllClients(req)) {
      where.assignedUserId = req.user.id;
    } else if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (productId) {
      where.productId = productId;
    }
    if (visaStatusTemplateId) {
      where.visaStatusTemplateId = visaStatusTemplateId;
    }
    if (q) {
      const searchTerm = String(q).trim();
      if (searchTerm) {
        const loweredSearchTerm = searchTerm.toLowerCase();
        const searchFilters: any[] = [
          sequelizeWhere(fn('LOWER', col('Client.name')), { [Op.like]: `%${loweredSearchTerm}%` }),
          sequelizeWhere(fn('LOWER', col('Client.email')), { [Op.like]: `%${loweredSearchTerm}%` }),
          sequelizeWhere(fn('LOWER', col('Client.phone')), { [Op.like]: `%${loweredSearchTerm}%` }),
        ];
        if (/^\d+$/.test(searchTerm)) {
          searchFilters.push(
            sequelizeWhere(cast(col('Client.postal_code'), 'TEXT'), {
              [Op.like]: `%${searchTerm}%`,
            })
          );
        }
        where[Op.or] = searchFilters;
      }
    }

    if (checklistTemplateId) {
      const selectedTemplate = await ChecklistTemplate.findOne({
        where: { id: String(checklistTemplateId), companyId, isActive: true },
        attributes: ['id', 'order'],
      });
      if (!selectedTemplate) {
        res.json({
          data: [],
          meta: { page: parsedPage, limit: parsedLimit, total: 0, totalPages: 0 },
          templates: [],
          visaStatusTemplates: [],
        });
        return;
      }

      const higherTemplates = await ChecklistTemplate.findAll({
        where: {
          companyId,
          isActive: true,
          order: { [Op.gt]: selectedTemplate.order ?? 0 },
        },
        attributes: ['id'],
        raw: true,
      });
      const higherTemplateIds = higherTemplates.map((template: any) => template.id);

      const targetRows = await ClientChecklist.findAll({
        where: {
          companyId,
          templateId: selectedTemplate.id,
          isCompleted: true,
        },
        attributes: ['clientId'],
        raw: true,
      });
      const targetClientIds = Array.from(new Set(targetRows.map((row: any) => row.clientId).filter(Boolean)));

      if (targetClientIds.length === 0) {
        res.json({
          data: [],
          meta: { page: parsedPage, limit: parsedLimit, total: 0, totalPages: 0 },
          templates: [],
          visaStatusTemplates: [],
        });
        return;
      }

      let clientIdsWithHigherStep = new Set<string>();
      if (higherTemplateIds.length > 0) {
        const higherRows = await ClientChecklist.findAll({
          where: {
            companyId,
            clientId: { [Op.in]: targetClientIds },
            templateId: { [Op.in]: higherTemplateIds },
            isCompleted: true,
          },
          attributes: ['clientId'],
          raw: true,
        });
        clientIdsWithHigherStep = new Set(higherRows.map((row: any) => row.clientId).filter(Boolean));
      }

      const filteredByChecklist = targetClientIds.filter((id) => !clientIdsWithHigherStep.has(id));
      if (filteredByChecklist.length === 0) {
        res.json({
          data: [],
          meta: { page: parsedPage, limit: parsedLimit, total: 0, totalPages: 0 },
          templates: [],
          visaStatusTemplates: [],
        });
        return;
      }
      where.id = { [Op.in]: filteredByChecklist };
    }

    let filterBranchId: string | undefined;
    if (canViewAllClients(req) && branchId) {
      const rawBranch = String(branchId).trim();
      if (rawBranch) {
        const branchRow = await Branch.findOne({
          where: { id: rawBranch, companyId, isActive: true },
          attributes: ['id'],
        });
        if (branchRow) {
          filterBranchId = rawBranch;
        }
      }
    }

    const assignedUserInclude: {
      model: typeof User;
      as: 'assignedUser';
      attributes: string[];
      required: boolean;
      where?: Record<string, unknown>;
    } = {
      model: User,
      as: 'assignedUser',
      attributes: ['id', 'name', 'email'],
      required: Boolean(filterBranchId),
      ...(filterBranchId
        ? { where: { branchId: filterBranchId, companyId } }
        : {}),
    };

    const clientListIncludes = [
      assignedUserInclude,
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'title'],
        required: false,
      },
      {
        model: VisaStatusTemplate,
        as: 'visaStatusTemplate',
        attributes: ['id', 'label', 'order', 'isActive', 'color'],
        required: false,
      },
      {
        model: ClientChecklist,
        as: 'checklistItems',
        include: [
          {
            model: ChecklistTemplate,
            as: 'template',
            where: { isActive: true },
            required: false,
          },
        ],
        required: false,
      },
    ];

    const total = await Client.count({
      where,
      distinct: true,
      col: 'id',
      include: clientListIncludes,
    });

    const clients = await Client.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parsedLimit,
      offset,
      include: clientListIncludes,
    });

    // Get all active checklist templates for this company
    const activeTemplates = await ChecklistTemplate.findAll({
      where: { companyId, isActive: true },
      order: [['order', 'ASC']],
    });
    const activeVisaStatusTemplates = await VisaStatusTemplate.findAll({
      where: { companyId, isActive: true },
      order: [['order', 'ASC']],
    });

    const clientIds = clients.map(c => c.id);
    const today = new Date().toISOString().slice(0, 10);
    const children = await Client.findAll({
      where: {
        companyId,
        parentClientId: { [Op.in]: clientIds },
      },
      attributes: ['id', 'name', 'email', 'phone', 'parentClientId', 'assignedUserId', 'createdAt', 'updatedAt'],
      order: [['created_at', 'ASC']],
      raw: true,
    });
    const childrenByParentId: Record<string, any[]> = {};
    for (const child of children) {
      const parentId = (child as any).parent_client_id || (child as any).parentClientId;
      if (!parentId) continue;
      if (!childrenByParentId[parentId]) childrenByParentId[parentId] = [];
      childrenByParentId[parentId].push({
        id: (child as any).id,
        name: (child as any).name,
        email: (child as any).email,
        phone: (child as any).phone,
        parentClientId: parentId,
        assignedUserId: (child as any).assigned_user_id ?? (child as any).assignedUserId ?? null,
        createdAt: (child as any).created_at || (child as any).createdAt,
        updatedAt: (child as any).updated_at || (child as any).updatedAt,
      });
    }

    // Trips each client is assigned to (for "En viaje(s)" badge)
    const tripParticipations = await TripParticipant.findAll({
      where: { clientId: clientIds },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTripsByClientId: Record<string, { id: string; title: string }[]> = {};
    for (const tp of tripParticipations) {
      const cid = tp.clientId;
      const trip = (tp as any).trip;
      if (!trip || !cid) continue;
      if (!assignedTripsByClientId[cid]) assignedTripsByClientId[cid] = [];
      assignedTripsByClientId[cid].push({ id: trip.id, title: trip.title });
    }

    // Sum of payments per client (total pagado)
    const paymentSums = await ClientPayment.findAll({
      where: { companyId, clientId: clientIds },
      attributes: ['clientId', [fn('SUM', col('amount')), 'totalPaid']],
      group: ['clientId'],
      raw: true,
    });
    const totalPaidByClientId: Record<string, number> = {};
    paymentSums.forEach((row: any) => {
      const id = row.clientId || row.client_id;
      if (id) totalPaidByClientId[id] = parseFloat(row.totalPaid || '0') || 0;
    });
    const upcomingInternalAppointments = await InternalAppointment.findAll({
      where: {
        companyId,
        clientId: clientIds,
        status: 'scheduled',
        appointmentDate: { [Op.gte]: today },
      },
      attributes: ['clientId', 'appointmentDate', 'purposeNote'],
      order: [['appointment_date', 'ASC']],
      raw: true,
    });
    const nextOfficeAppointmentByClientId: Record<string, { appointmentDate: string; purposeNote: string | null }> = {};
    for (const row of upcomingInternalAppointments as any[]) {
      const clientId = row.clientId || row.client_id;
      if (!clientId || nextOfficeAppointmentByClientId[clientId]) continue;
      nextOfficeAppointmentByClientId[clientId] = {
        appointmentDate: row.appointmentDate || row.appointment_date,
        purposeNote: row.purposeNote || row.purpose_note || null,
      };
    }
    const whatsappStatusByPhone = await getWhatsappReplyStatusByPhone(
      clients.map((client) => client.phone || ''),
      companyId
    );

    // Add checklist stats and payment totals to each client
    const clientsWithStats = clients.map(client => {
      const checklistItems = (client as any).checklistItems || [];
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      const totalPaid = totalPaidByClientId[client.id] ?? 0;
      const normalizedPhone = String(client.phone || '').trim();
      const whatsappStatus = normalizedPhone ? whatsappStatusByPhone[normalizedPhone] : undefined;
      return {
        ...clientData,
        children: childrenByParentId[client.id] || [],
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
        totalPaid,
        assignedTrips: assignedTripsByClientId[client.id] || [],
        nextOfficeAppointment: nextOfficeAppointmentByClientId[client.id] || null,
        hasWhatsappReply: whatsappStatus?.hasWhatsappReply ?? false,
        lastWhatsappUserMessageAt: whatsappStatus?.lastUserMessageAt ?? null,
        lastWhatsappBotMessageAt: whatsappStatus?.lastBotMessageAt ?? null,
      };
    });

    // Include templates info in response
    const response = {
      data: clientsWithStats,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: total > 0 ? Math.ceil(total / parsedLimit) : 0,
      },
      templates: activeTemplates.map(t => ({
        id: t.id,
        label: t.label,
        order: t.order,
        isActive: t.isActive,
      })),
      visaStatusTemplates: activeVisaStatusTemplates.map(t => ({
        id: t.id,
        label: t.label,
        order: t.order,
        isActive: t.isActive,
        color: t.color,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const client = await Client.findOne({
      where: { id, companyId },
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false },
        { model: Product, as: 'product', attributes: ['id', 'title'], required: false },
        { model: VisaStatusTemplate, as: 'visaStatusTemplate', attributes: ['id', 'label', 'order', 'isActive', 'color'], required: false },
        { model: Client, as: 'parent', attributes: ['id', 'name', 'email', 'phone'], required: false },
        { model: Client, as: 'children', attributes: ['id', 'name', 'email', 'phone', 'parentClientId', 'assignedUserId', 'createdAt', 'updatedAt'], required: false },
      ],
    });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    if (!canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const participations = await TripParticipant.findAll({
      where: { clientId: id },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTrips = participations
      .map(p => (p as any).trip)
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, title: t.title }));

    const clientJson = client.toJSON();
    const children = await Client.findAll({
      where: { companyId, parentClientId: id },
      attributes: ['id', 'name', 'email', 'phone', 'parentClientId', 'assignedUserId', 'createdAt', 'updatedAt'],
      order: [['created_at', 'ASC']],
      raw: true,
    });
    (clientJson as any).children = children.map((child: any) => ({
      id: child.id,
      name: child.name,
      email: child.email,
      phone: child.phone,
      parentClientId: child.parent_client_id ?? child.parentClientId ?? null,
      assignedUserId: child.assigned_user_id ?? child.assignedUserId ?? null,
      createdAt: child.created_at || child.createdAt,
      updatedAt: child.updated_at || child.updatedAt,
    }));
    (clientJson as any).assignedTrips = assignedTrips;
    const clientWhatsappStatusByPhone = await getWhatsappReplyStatusByPhone([client.phone || ''], companyId);
    const clientWhatsappStatus = client.phone ? clientWhatsappStatusByPhone[String(client.phone).trim()] : undefined;
    (clientJson as any).hasWhatsappReply = clientWhatsappStatus?.hasWhatsappReply ?? false;
    (clientJson as any).lastWhatsappUserMessageAt = clientWhatsappStatus?.lastUserMessageAt ?? null;
    (clientJson as any).lastWhatsappBotMessageAt = clientWhatsappStatus?.lastBotMessageAt ?? null;
    res.json(clientJson);
  } catch (error) {
    console.error('Get client by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientAmountDueHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!hasPermission(req.user?.permissions, 'client_audit_logs.view')) {
      res.status(403).json({ error: 'Solo administradores pueden ver el historial de cambios del total a pagar' });
      return;
    }
    const { id: clientId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    const logs = await ClientAmountDueLog.findAll({
      where: { clientId, companyId },
      include: [{ model: User, as: 'changedByUser', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch (error) {
    console.error('Get client amount due history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientPaymentDeletedHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!hasPermission(req.user?.permissions, 'client_audit_logs.view')) {
      res.status(403).json({ error: 'Solo administradores pueden ver el historial de pagos eliminados' });
      return;
    }
    const { id: clientId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    const logs = await ClientPaymentDeletedLog.findAll({
      where: { clientId, companyId },
      include: [{ model: User, as: 'deletedByUser', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch (error) {
    console.error('Get client payment deleted history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClient = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('postalCode')
    .optional({ values: 'null' })
    .matches(/^\d{5}$/)
    .withMessage('Postal code must contain exactly 5 digits')
    .custom((value) => String(value) !== '00000')
    .withMessage('Postal code 00000 is not valid'),
  body('birthDate').optional({ values: 'null' }).isISO8601().withMessage('Birth date must be a valid date'),
  body('relationshipToHolder').optional({ values: 'null' }).isString().isLength({ max: 120 }).withMessage('Relationship to holder must be a valid string'),
  body('visaCasAppointmentDate').optional({ values: 'null' }).isISO8601().withMessage('CAS appointment date must be a valid date'),
  body('visaCasAppointmentLocation').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('CAS appointment location must be a valid string'),
  body('visaConsularAppointmentDate').optional({ values: 'null' }).isISO8601().withMessage('Consular appointment date must be a valid date'),
  body('visaConsularAppointmentLocation').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('Consular appointment location must be a valid string'),
  body('visaStatusTemplateId').optional({ values: 'falsy' }).isUUID().withMessage('Visa status template id must be a valid UUID'),
  body('productId').optional({ values: 'null' }).isUUID().withMessage('Product id must be a valid UUID'),
  body('parentClientId').optional({ values: 'null' }).isUUID().withMessage('Parent client id must be a valid UUID'),
  body('assignedUserId').optional({ values: 'null' }).isUUID().withMessage('Assigned user id must be a valid UUID'),
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
      if (!hasPermission(req.user!.permissions, 'clients.create')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { assignedUserId: requestedAssignedUserId, ...restBody } = req.body;
      req.body = restBody;

      const normalizedPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
      if (normalizedPhone !== undefined) {
        req.body.phone = normalizedPhone;
      }
      if (typeof req.body.email === 'string' && req.body.email.trim() === '') {
        req.body.email = null;
      }
      const parentClientId = parseNullableParentClientId(req.body.parentClientId);
      const parsedPostalCode = parseNullablePostalCode(req.body.postalCode);
      if (parsedPostalCode.error) {
        res.status(400).json({ error: parsedPostalCode.error });
        return;
      }
      if (parentClientId) {
        req.body.postalCode = null;
      } else if (parsedPostalCode.value !== undefined) {
        req.body.postalCode = parsedPostalCode.value;
      }

      if (normalizedPhone && !parentClientId) {
        const existingClient = await Client.findOne({ where: { companyId, phone: normalizedPhone, parentClientId: null } });
        if (existingClient) {
          res.status(200).json({
            message: 'Cliente ya existe',
            client: existingClient,
          });
          return;
        }
      }

      if (req.body.productId) {
        const product = await Product.findOne({ where: { id: req.body.productId, companyId } });
        if (!product) {
          res.status(400).json({ error: 'Product not found' });
          return;
        }
      }

      // If not provided, assign default visa status template (same logic as submissions).
      let visaStatusTemplateId: string | undefined = req.body.visaStatusTemplateId;
      if (!visaStatusTemplateId) {
        const defaultVisaStatusTemplateId = await getDefaultVisaStatusTemplateId(companyId);
        if (!defaultVisaStatusTemplateId) {
          res.status(400).json({ error: 'No visa status templates configured' });
          return;
        }
        visaStatusTemplateId = defaultVisaStatusTemplateId;
        req.body.visaStatusTemplateId = visaStatusTemplateId;
      }

      const visaStatusTemplate = await VisaStatusTemplate.findOne({
        where: { id: visaStatusTemplateId, companyId },
      });
      if (!visaStatusTemplate) {
        res.status(400).json({ error: 'Visa status template not found' });
        return;
      }
      let parentRow: InstanceType<typeof Client> | null = null;
      if (parentClientId) {
        parentRow = await Client.findOne({ where: { id: parentClientId, companyId } });
        if (!parentRow) {
          res.status(400).json({ error: 'Parent client not found' });
          return;
        }
      }

      let assignedUserId: string | null | undefined = req.user?.id;
      if (parentClientId && hasPermission(req.user?.permissions, 'clients.reassign_advisor')) {
        const raw = requestedAssignedUserId as string | null | undefined;
        if (raw === null) {
          assignedUserId = null;
        } else if (raw !== undefined && raw !== '') {
          const advisor = await User.findOne({ where: { id: String(raw), companyId } });
          if (!advisor) {
            res.status(400).json({ error: 'Asesor no encontrado' });
            return;
          }
          assignedUserId = String(raw);
        } else {
          assignedUserId = parentRow?.assignedUserId ?? req.user!.id;
        }
      }

      const client = await Client.create({
        ...req.body,
        companyId,
        parentClientId: parentClientId ?? null,
        ...(assignedUserId !== undefined ? { assignedUserId } : {}),
      });
      await client.reload({
        include: [
          { model: Product, as: 'product', attributes: ['id', 'title'], required: false },
          { model: VisaStatusTemplate, as: 'visaStatusTemplate', attributes: ['id', 'label', 'order', 'isActive', 'color'], required: false },
          { model: Client, as: 'parent', attributes: ['id', 'name', 'email', 'phone'], required: false },
          { model: Client, as: 'children', attributes: ['id', 'name', 'email', 'phone', 'parentClientId', 'assignedUserId', 'createdAt', 'updatedAt'], required: false },
        ],
      });
      
      // Get checklist stats for the new client
      const checklistItems = await ClientChecklist.findAll({
        where: { clientId: client.id },
        include: [
          {
            model: ChecklistTemplate,
            as: 'template',
            where: { isActive: true },
            required: false,
          },
        ],
      });
      
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      res.status(201).json({
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
      });
    } catch (error) {
      console.error('Create client error:', error);
      const err = error as { name?: string; fields?: Record<string, unknown> };
      if (err?.name === 'SequelizeUniqueConstraintError' && err?.fields?.phone) {
        const companyId = req.user?.companyId;
        const normalizedPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
        if (companyId && normalizedPhone) {
          const existingClient = await Client.findOne({ where: { companyId, phone: normalizedPhone } });
          if (existingClient) {
            res.status(200).json({
              message: 'Cliente ya existe',
              client: existingClient,
            });
            return;
          }
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateClient = [
  body('name').optional().notEmpty(),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('postalCode')
    .optional({ values: 'null' })
    .matches(/^\d{5}$/)
    .withMessage('Postal code must contain exactly 5 digits')
    .custom((value) => String(value) !== '00000')
    .withMessage('Postal code 00000 is not valid'),
  body('birthDate').optional({ values: 'null' }).isISO8601().withMessage('Birth date must be a valid date'),
  body('relationshipToHolder').optional({ values: 'null' }).isString().isLength({ max: 120 }).withMessage('Relationship to holder must be a valid string'),
  body('visaCasAppointmentDate').optional({ values: 'null' }).isISO8601().withMessage('CAS appointment date must be a valid date'),
  body('visaCasAppointmentLocation').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('CAS appointment location must be a valid string'),
  body('visaConsularAppointmentDate').optional({ values: 'null' }).isISO8601().withMessage('Consular appointment date must be a valid date'),
  body('visaConsularAppointmentLocation').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('Consular appointment location must be a valid string'),
  body('visaStatusTemplateId').optional({ values: 'falsy' }).isUUID().withMessage('Visa status template id must be a valid UUID'),
  body('productId').optional({ values: 'null' }).isUUID().withMessage('Product id must be a valid UUID'),
  body('parentClientId').optional({ values: 'null' }).isUUID().withMessage('Parent client id must be a valid UUID'),
  body('totalAmountDue').optional({ values: 'null' }).custom((val) => val === null || val === undefined || (typeof val === 'number' && !Number.isNaN(val) && val >= 0)).withMessage('Total amount due must be a non-negative number or null'),
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
      const client = await Client.findOne({ where: { id, companyId } });

      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      if (!hasPermission(req.user!.permissions, 'clients.update')) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (!canAccessClientRecord(req, client)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (req.body.totalAmountDue !== undefined && !hasPermission(req.user?.permissions, 'client_financials.update')) {
        res.status(403).json({ error: 'No tienes permisos para modificar el total a pagar' });
        return;
      }

      if (client.parentClientId && req.body.totalAmountDue !== undefined) {
        res.status(400).json({ error: 'El total a pagar solo se gestiona en el cliente titular.' });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.email !== undefined) {
        updates.email = typeof req.body.email === 'string' && req.body.email.trim() === '' ? null : req.body.email;
      }
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      const parsedPostalCode = parseNullablePostalCode(req.body.postalCode);
      if (parsedPostalCode.error) {
        res.status(400).json({ error: parsedPostalCode.error });
        return;
      }
      if (req.body.postalCode !== undefined) updates.postalCode = parsedPostalCode.value;
      if (req.body.address !== undefined) updates.address = req.body.address;
      if (req.body.birthDate !== undefined) updates.birthDate = req.body.birthDate;
      if (req.body.relationshipToHolder !== undefined) updates.relationshipToHolder = req.body.relationshipToHolder;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.visaCasAppointmentDate !== undefined) updates.visaCasAppointmentDate = req.body.visaCasAppointmentDate;
      if (req.body.visaCasAppointmentLocation !== undefined) updates.visaCasAppointmentLocation = req.body.visaCasAppointmentLocation;
      if (req.body.visaConsularAppointmentDate !== undefined) updates.visaConsularAppointmentDate = req.body.visaConsularAppointmentDate;
      if (req.body.visaConsularAppointmentLocation !== undefined) updates.visaConsularAppointmentLocation = req.body.visaConsularAppointmentLocation;
      if (req.body.visaStatusTemplateId !== undefined && req.body.visaStatusTemplateId !== '') {
        updates.visaStatusTemplateId = req.body.visaStatusTemplateId;
      }
      if (req.body.productId !== undefined) updates.productId = req.body.productId;
      if (req.body.parentClientId !== undefined) {
        const parentClientId = parseNullableParentClientId(req.body.parentClientId);
        updates.parentClientId = parentClientId;
      }
      if (req.body.assignedUserId !== undefined && hasPermission(req.user?.permissions, 'clients.reassign_advisor')) {
        updates.assignedUserId = req.body.assignedUserId || null;
      }
      if (req.body.totalAmountDue !== undefined && hasPermission(req.user?.permissions, 'client_financials.update')) {
        updates.totalAmountDue = req.body.totalAmountDue;
      }

      if (req.body.productId) {
        const product = await Product.findOne({ where: { id: req.body.productId, companyId } });
        if (!product) {
          res.status(400).json({ error: 'Product not found' });
          return;
        }
      }
      if (req.body.visaStatusTemplateId) {
        const visaStatusTemplate = await VisaStatusTemplate.findOne({
          where: { id: req.body.visaStatusTemplateId, companyId },
        });
        if (!visaStatusTemplate) {
          res.status(400).json({ error: 'Visa status template not found' });
          return;
        }
      }
      if (req.body.parentClientId !== undefined) {
        const parentClientId = parseNullableParentClientId(req.body.parentClientId);
        if (parentClientId === id) {
          res.status(400).json({ error: 'A client cannot be its own parent' });
          return;
        }
        if (parentClientId) {
          const parentClient = await Client.findOne({ where: { id: parentClientId, companyId } });
          if (!parentClient) {
            res.status(400).json({ error: 'Parent client not found' });
            return;
          }
        }
      }
      const targetParentClientId = req.body.parentClientId !== undefined
        ? parseNullableParentClientId(req.body.parentClientId)
        : ((client as any).parentClientId ?? null);
      if (targetParentClientId) {
        updates.postalCode = null;
      }
      const targetPhone = req.body.phone !== undefined
        ? (typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone)
        : client.phone;
      if (targetPhone && !targetParentClientId) {
        const conflict = await Client.findOne({
          where: {
            companyId,
            phone: targetPhone,
            parentClientId: null,
            id: { [Op.ne]: id },
          },
        });
        if (conflict) {
          res.status(400).json({ error: 'Phone already in use by another primary client' });
          return;
        }
      }

      const previousTotalAmountDue = client.totalAmountDue != null ? Number(client.totalAmountDue) : null;
      await client.update(updates);
      await client.reload({
        include: [
          { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false },
          { model: Product, as: 'product', attributes: ['id', 'title'], required: false },
          { model: VisaStatusTemplate, as: 'visaStatusTemplate', attributes: ['id', 'label', 'order', 'isActive', 'color'], required: false },
          { model: Client, as: 'parent', attributes: ['id', 'name', 'email', 'phone'], required: false },
          { model: Client, as: 'children', attributes: ['id', 'name', 'email', 'phone', 'parentClientId', 'assignedUserId', 'createdAt', 'updatedAt'], required: false },
        ],
      });
      if (req.body.totalAmountDue !== undefined && hasPermission(req.user?.permissions, 'client_financials.update')) {
        const newVal = req.body.totalAmountDue === null || req.body.totalAmountDue === undefined
          ? null
          : Number(req.body.totalAmountDue);
        if (newVal !== previousTotalAmountDue) {
          await ClientAmountDueLog.create({
            companyId,
            clientId: client.id,
            previousValue: previousTotalAmountDue,
            newValue: newVal,
            changedBy: req.user?.id,
          });
        }
      }

      // Get checklist stats for the updated client
      const checklistItems = await ClientChecklist.findAll({
        where: { clientId: client.id },
        include: [
          {
            model: ChecklistTemplate,
            as: 'template',
            where: { isActive: true },
            required: false,
          },
        ],
      });
      
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      res.json({
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

const ACQUIRED_PACKAGES_PRIMARY_ONLY =
  'Los paquetes adquiridos solo se registran en el perfil del cliente titular.';

function serializeAcquiredPackage(row: any) {
  const j = row?.toJSON ? row.toJSON() : row;
  const product = row?.product ?? j?.product;
  const beneficiary = row?.beneficiary ?? j?.beneficiary;
  return {
    id: j.id,
    productId: j.productId ?? j.product_id,
    product: product ? { id: product.id, title: product.title } : null,
    beneficiaryClientId: j.beneficiaryClientId ?? j.beneficiary_client_id ?? null,
    beneficiary: beneficiary ? { id: beneficiary.id, name: beneficiary.name } : null,
    createdAt: j.createdAt ?? j.created_at,
    updatedAt: j.updatedAt ?? j.updated_at,
  };
}

export const getClientAcquiredPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (client.parentClientId) {
      res.status(400).json({ error: ACQUIRED_PACKAGES_PRIMARY_ONLY });
      return;
    }

    const rows = await ClientAcquiredPackage.findAll({
      where: { companyId, parentClientId: id },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'title'], required: true },
        { model: Client, as: 'beneficiary', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'ASC']],
    });

    res.json(rows.map((r) => serializeAcquiredPackage(r as any)));
  } catch (error) {
    console.error('Get client acquired packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClientAcquiredPackage = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('beneficiaryClientId').optional({ values: 'null' }).isUUID(),
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
      const client = await Client.findOne({ where: { id, companyId } });
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (!canAccessClientRecord(req, client)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (client.parentClientId) {
        res.status(400).json({ error: ACQUIRED_PACKAGES_PRIMARY_ONLY });
        return;
      }

      const { productId, beneficiaryClientId } = req.body;
      const product = await Product.findOne({ where: { id: productId, companyId } });
      if (!product) {
        res.status(400).json({ error: 'Product not found' });
        return;
      }

      let beneficiaryId: string | null = null;
      if (beneficiaryClientId) {
        const beneficiary = await Client.findOne({
          where: { id: beneficiaryClientId, companyId, parentClientId: id },
        });
        if (!beneficiary) {
          res.status(400).json({ error: 'El familiar no pertenece a este cliente titular' });
          return;
        }
        beneficiaryId = beneficiary.id;
      }

      const row = await ClientAcquiredPackage.create({
        companyId,
        parentClientId: id,
        productId,
        beneficiaryClientId: beneficiaryId,
      });

      const withIncludes = await ClientAcquiredPackage.findByPk(row.id, {
        include: [
          { model: Product, as: 'product', attributes: ['id', 'title'], required: true },
          { model: Client, as: 'beneficiary', attributes: ['id', 'name'], required: false },
        ],
      });

      res.status(201).json(serializeAcquiredPackage(withIncludes as any));
    } catch (error) {
      console.error('Create client acquired package error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteClientAcquiredPackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, packageId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (client.parentClientId) {
      res.status(400).json({ error: ACQUIRED_PACKAGES_PRIMARY_ONLY });
      return;
    }

    const row = await ClientAcquiredPackage.findOne({
      where: { id: packageId, companyId, parentClientId: id },
    });
    if (!row) {
      res.status(404).json({ error: 'Paquete no encontrado' });
      return;
    }

    const paymentCount = await ClientPayment.count({ where: { acquiredPackageId: packageId, companyId } });
    if (paymentCount > 0) {
      res.status(400).json({
        error:
          'No se puede eliminar este paquete porque hay pagos asociados. Quita la asociación en los pagos o elimina esos pagos primero.',
      });
      return;
    }

    await row.destroy();
    res.json({ message: 'Paquete eliminado' });
  } catch (error) {
    console.error('Delete client acquired package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id, companyId } });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    if (!hasPermission(req.user!.permissions, 'clients.delete')) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (!canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await client.destroy();
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Mismo alcance que GET /clients (listado): solo titulares, no familiares (parentClientId = null)
    const where: any = { companyId, parentClientId: null };

    const assignedUserIdParam =
      typeof req.query.assignedUserId === 'string' ? req.query.assignedUserId.trim() : '';

    if (assignedUserIdParam && canViewAllClients(req)) {
      where.assignedUserId = assignedUserIdParam;
    } else if (req.user && !canViewAllClients(req)) {
      where.assignedUserId = req.user.id;
    }

    const total = await Client.count({ where });
    const activeVisaStatusTemplates = await VisaStatusTemplate.findAll({
      where: { companyId, isActive: true },
      order: [['order', 'ASC']],
      attributes: ['id', 'label', 'color'],
    });
    const clients = await Client.findAll({
      where,
      attributes: ['visaStatusTemplateId'],
      include: [{ model: VisaStatusTemplate, as: 'visaStatusTemplate', attributes: ['id', 'label', 'color'], required: false }],
    });
    const visaStatusCounts: Record<string, { id: string; label: string; color: string | null; count: number }> = {};
    clients.forEach((client) => {
      const tpl = (client as any).visaStatusTemplate;
      if (!tpl?.id) return;
      if (!visaStatusCounts[tpl.id]) {
        visaStatusCounts[tpl.id] = { id: tpl.id, label: tpl.label, color: tpl.color ?? null, count: 0 };
      }
      visaStatusCounts[tpl.id].count += 1;
    });

    res.json({
      total,
      visaStatusCounts: Object.values(visaStatusCounts),
      /** Misma lista que el filtro "Estado de Visa" en clientes (solo activas) */
      visaStatusTemplates: activeVisaStatusTemplates.map((t) => ({
        id: t.id,
        label: t.label,
        color: t.color ?? null,
      })),
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
