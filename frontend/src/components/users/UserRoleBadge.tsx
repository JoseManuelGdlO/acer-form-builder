import { Shield, User } from 'lucide-react';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { cn } from '@/lib/utils';

interface UserRoleBadgeProps {
  label: string;
  variant?: 'admin' | 'default';
  className?: string;
}

export function UserRoleBadge({ label, variant = 'default', className }: UserRoleBadgeProps) {
  const isAdminStyle = variant === 'admin';
  return (
    <StatusBadge
      tone={isAdminStyle ? 'accent' : 'neutral'}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {isAdminStyle ? <Shield className="size-3" /> : <User className="size-3" />}
      {label}
    </StatusBadge>
  );
}
