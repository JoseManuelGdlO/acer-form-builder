import { Shield, User } from 'lucide-react';

interface UserRoleBadgeProps {
  label: string;
  variant?: 'admin' | 'default';
}

export function UserRoleBadge({ label, variant = 'default' }: UserRoleBadgeProps) {
  const isAdminStyle = variant === 'admin';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
        isAdminStyle
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {isAdminStyle ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {label}
    </span>
  );
}
