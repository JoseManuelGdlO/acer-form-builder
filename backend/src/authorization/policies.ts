import type { AuthRequest } from '../middleware/auth.middleware';
import type { PermissionKey } from './permissions.catalog';

export function hasPermission(permissions: string[] | undefined, key: PermissionKey | string): boolean {
  return !!permissions?.includes(key);
}

export function hasAnyPermission(permissions: string[] | undefined, keys: readonly string[]): boolean {
  if (!permissions?.length) return false;
  return keys.some((k) => permissions.includes(k));
}

export function hasAllPermissions(permissions: string[] | undefined, keys: readonly string[]): boolean {
  if (!permissions?.length) return false;
  return keys.every((k) => permissions.includes(k));
}

export function canViewAllClients(req: AuthRequest): boolean {
  if (hasPermission(req.user?.permissions, 'clients.view_all')) return true;
  return (req.user as any)?.company?.advisorClientAccessMode === 'company_wide'
    && hasPermission(req.user?.permissions, 'clients.view_assigned');
}

/** Assigned-only scope (excludes view_all unless they also have view_assigned — view_all implies all) */
export function canAccessClientRecord(
  req: AuthRequest,
  client: { assignedUserId?: string | null }
): boolean {
  if (!req.user) return false;
  if (hasPermission(req.user.permissions, 'clients.view_all')) return true;
  if (hasPermission(req.user.permissions, 'clients.view_assigned')) {
    return client.assignedUserId === req.user.id;
  }
  return false;
}

export function canViewAllSubmissions(req: AuthRequest): boolean {
  return hasPermission(req.user?.permissions, 'submissions.view_all');
}

export function canAccessSubmissionForClientSync(
  req: AuthRequest,
  client: { assignedUserId?: string | null } | null
): boolean {
  if (!req.user || !client) return false;
  if (hasPermission(req.user.permissions, 'submissions.view_all')) return true;
  if (hasPermission(req.user.permissions, 'submissions.view_assigned')) {
    return client.assignedUserId === req.user.id;
  }
  return false;
}
