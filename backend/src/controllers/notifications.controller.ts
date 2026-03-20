import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import webpush from 'web-push';
import { Op } from 'sequelize';
import { Notification, NotificationRecipient, PushSubscription, User, UserRole } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const VAPID_ADMIN_EMAIL = process.env.VAPID_ADMIN_EMAIL || 'admin@example.com';

const normalizeNotificationActionUrl = (
  type: string,
  actionUrl: string | null | undefined,
  data: Record<string, unknown> | null | undefined
): string | null => {
  const conversationId =
    data && typeof data.conversationId !== 'undefined' && data.conversationId !== null
      ? String(data.conversationId)
      : null;

  if (type === 'conversation_help' && conversationId) {
    return `/?view=clients&clientId=${encodeURIComponent(conversationId)}`;
  }

  if (typeof actionUrl === 'string') {
    const legacyMatch = actionUrl.match(/^\/clients\/([^/?#]+)/);
    if (legacyMatch?.[1]) {
      return `/?view=clients&clientId=${encodeURIComponent(legacyMatch[1])}`;
    }
    return actionUrl;
  }

  return null;
};

const configureWebPush = (): boolean => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(VAPID_ADMIN_EMAIL, publicKey, privateKey);
  return true;
};

export const getVapidPublicKey = async (_req: Request, res: Response): Promise<void> => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    res.status(500).json({ error: 'VAPID_PUBLIC_KEY not configured' });
    return;
  }
  res.json({ publicKey });
};

export const registerPushSubscription = [
  body('subscription.endpoint').notEmpty().withMessage('subscription.endpoint is required').isString(),
  body('subscription.keys.auth').notEmpty().withMessage('subscription.keys.auth is required').isString(),
  body('subscription.keys.p256dh')
    .notEmpty()
    .withMessage('subscription.keys.p256dh is required')
    .isString(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const now = new Date();
      const { endpoint, keys } = req.body.subscription as {
        endpoint: string;
        keys: { auth: string; p256dh: string };
      };

      const existing = await PushSubscription.findOne({
        where: { companyId: req.user.companyId, userId: req.user.id, endpoint },
      });

      if (existing) {
        await existing.update({
          keysAuth: keys.auth,
          keysP256dh: keys.p256dh,
          lastSeenAt: now,
        });
        res.json({ id: existing.id, updated: true });
        return;
      }

      const record = await PushSubscription.create({
        companyId: req.user.companyId,
        userId: req.user.id,
        endpoint,
        keysAuth: keys.auth,
        keysP256dh: keys.p256dh,
        lastSeenAt: now,
      });

      res.status(201).json({ id: record.id, updated: false });
    } catch (error) {
      console.error('registerPushSubscription error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const recipients = await NotificationRecipient.findAll({
      where: {
        companyId: req.user.companyId,
        recipientUserId: req.user.id,
      },
      include: [
        {
          model: Notification,
          as: 'notification',
          attributes: ['id', 'type', 'title', 'message', 'data', 'actionUrl', 'createdAt', 'updatedAt'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const notifications = recipients.map((r) => {
      const n = (r as any).notification as Notification | undefined;
      return {
        notificationId: r.notificationId,
        type: n?.type,
        title: n?.title,
        message: n?.message,
        data: n?.data ?? null,
        actionUrl: n?.actionUrl ?? null,
        createdAt: n?.createdAt,
        readAt: r.readAt,
      };
    });

    res.json(notifications);
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params; // notificationId
    const recipient = await NotificationRecipient.findOne({
      where: {
        companyId: req.user.companyId,
        recipientUserId: req.user.id,
        notificationId: id,
      },
    });

    if (!recipient) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (!recipient.readAt) {
      await recipient.update({ readAt: new Date() });
    }

    res.json({ notificationId: id, readAt: recipient.readAt });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const dismissNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params; // notificationId
    const recipient = await NotificationRecipient.findOne({
      where: {
        companyId: req.user.companyId,
        recipientUserId: req.user.id,
        notificationId: id,
      },
    });

    if (!recipient) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await recipient.destroy();
    res.json({ notificationId: id, dismissed: true });
  } catch (error) {
    console.error('dismissNotification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const dismissAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const deleted = await NotificationRecipient.destroy({
      where: {
        companyId: req.user.companyId,
        recipientUserId: req.user.id,
      },
    });

    res.json({ dismissed: deleted });
  } catch (error) {
    console.error('dismissAllNotifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNotification = [
  body('type').notEmpty().withMessage('type is required').isString(),
  body('message').notEmpty().withMessage('message is required').isString(),
  body('title').optional({ nullable: true }).isString(),
  body('actionUrl').optional({ nullable: true }).isString(),
  body('data').optional().isObject(),
  body('audienceRoles')
    .optional()
    .isArray()
    .withMessage('audienceRoles must be an array'),
  body('audienceRoles.*')
    .optional()
    .isIn(['super_admin', 'reviewer'])
    .withMessage('Invalid audience role'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const companyId = req.user.companyId;

      const {
        type,
        message,
        title = null,
        actionUrl = null,
        data = null,
        audienceRoles,
      } = req.body as {
        type: string;
        message: string;
        title?: string | null;
        actionUrl?: string | null;
        data?: Record<string, unknown> | null;
        audienceRoles?: Array<'super_admin' | 'reviewer'>;
      };
      const normalizedActionUrl = normalizeNotificationActionUrl(type, actionUrl, data);

      // Resolve recipients from roles within the same company.
      const users = await User.findAll({
        where: { companyId },
        include: [
          {
            model: UserRole,
            as: 'roles',
            attributes: ['role'],
          },
        ],
      });

      const allowedRoles = Array.isArray(audienceRoles) && audienceRoles.length > 0 ? audienceRoles : null;

      const recipients = users.filter((u) => {
        const roles = (u as any).roles as Array<{ role: 'super_admin' | 'reviewer' }> | undefined;
        if (!allowedRoles) return true;
        return roles?.some((r) => allowedRoles.includes(r.role)) ?? false;
      });

      const notification = await Notification.create({
        companyId,
        type,
        title,
        message,
        data,
        actionUrl: normalizedActionUrl,
      });

      const recipientUserIds = recipients.map((u) => u.id);

      if (recipientUserIds.length > 0) {
        await NotificationRecipient.bulkCreate(
          recipientUserIds.map((userId) => ({
            companyId,
            notificationId: notification.id,
            recipientUserId: userId,
          }))
        );
      }

      const pushed = await (async () => {
        const canPush = configureWebPush();
        if (!canPush) return { pushedCount: 0 };
        if (recipientUserIds.length === 0) return { pushedCount: 0 };

        const subs = await PushSubscription.findAll({
          where: {
            companyId,
            userId: { [Op.in]: recipientUserIds },
          },
        });

        if (subs.length === 0) return { pushedCount: 0 };

        const payload = JSON.stringify({
          kind: 'notification',
          notificationId: notification.id,
          title: notification.title || 'Notificación',
          body: notification.message,
          actionUrl: normalizedActionUrl,
        });

        let pushedCount = 0;

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  auth: sub.keysAuth,
                  p256dh: sub.keysP256dh,
                },
              } as any,
              payload
            );
            pushedCount++;
          } catch (err: any) {
            const statusCode = err?.statusCode;
            // Subscription is gone/expired -> delete locally so we stop trying.
            if (statusCode === 410 || statusCode === 404) {
              await sub.destroy();
            }
          }
        }

        return { pushedCount };
      })();

      res.status(201).json({
        notificationId: notification.id,
        recipientsCount: recipientUserIds.length,
        pushedCount: (pushed as any).pushedCount ?? 0,
      });
    } catch (error) {
      console.error('createNotification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

