import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { UserRoleBadge } from './UserRoleBadge';
import { Pencil, Power, Trash2 } from 'lucide-react';

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserCard({ user, onEdit, onDelete, onToggleStatus }: UserCardProps) {
  const variant = user.role.systemKey === 'super_admin' ? 'admin' : 'default';
  const roleLabel = user.role.name || 'Sin rol';
  const branchLabel = user.branch?.name ? `sucursal ${user.branch.name}` : 'Sin sucursal';
  const isActive = user.status === 'active';

  return (
    <Card className="overflow-hidden border-border p-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary/30 font-display font-bold text-secondary-foreground">
            {initialsFromName(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display font-semibold">{user.name}</h2>
              <UserRoleBadge label={roleLabel} variant={variant} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {roleLabel} · {branchLabel}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <StatusBadge tone={isActive ? 'success' : 'neutral'}>
            {isActive ? 'Activo' : 'Inactivo'}
          </StatusBadge>
          <div className="ml-auto flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Editar usuario"
              onClick={() => onEdit(user)}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={isActive ? 'Desactivar usuario' : 'Activar usuario'}
              onClick={() => onToggleStatus(user.id)}
            >
              <Power />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Eliminar usuario"
              onClick={() => onDelete(user.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
