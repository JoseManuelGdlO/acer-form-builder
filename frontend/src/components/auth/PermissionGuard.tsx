import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  children: ReactNode;
  /** User must have at least one of these permissions. */
  anyOf: string[];
  fallback?: ReactNode;
}

export const PermissionGuard = ({ children, anyOf, fallback = null }: PermissionGuardProps) => {
  const { canAny } = useAuth();

  if (!canAny(anyOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
