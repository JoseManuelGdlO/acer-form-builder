import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/user';
import { Shield, Eye } from 'lucide-react';

interface UserRoleBadgeProps {
  role: UserRole;
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  if (role === 'super_admin') {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
        <Shield className="h-3 w-3" />
        Super Administrador
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Eye className="h-3 w-3" />
      Revisor
    </Badge>
  );
}
