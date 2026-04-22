import type { User } from '@/types/user';

export function hasPermission(permissions: readonly string[] | undefined, key: string): boolean {
  return !!permissions?.includes(key);
}

export function hasAnyPermission(permissions: readonly string[] | undefined, keys: string[]): boolean {
  if (!permissions?.length || !keys.length) return false;
  return keys.some((k) => permissions.includes(k));
}

export function hasAllPermissions(permissions: readonly string[] | undefined, keys: string[]): boolean {
  if (!permissions?.length || !keys.length) return false;
  return keys.every((k) => permissions.includes(k));
}

/** User can see the full client directory (filters, all rows), not only assigned clients. */
export function userSeesAllClients(user: User | null | undefined): boolean {
  return hasPermission(user?.permissions, 'clients.view_all');
}
