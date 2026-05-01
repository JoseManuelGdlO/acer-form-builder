import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserRoleBadge } from './UserRoleBadge';
import { Mail, Pencil, Trash2, Power } from 'lucide-react';

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export function UserCard({ user, onEdit, onDelete, onToggleStatus }: UserCardProps) {
  const variant = user.role.systemKey === 'super_admin' ? 'admin' : 'default';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{user.name}</h3>
              <UserRoleBadge label={user.role.name || 'Sin rol'} variant={variant} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  user.status === 'active' ? 'bg-green-500/15 text-green-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                {user.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            {user.branch && (
              <p className="text-sm text-muted-foreground">Sucursal: {user.branch.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(user)} className="gap-1">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleStatus(user.id)} className="gap-1">
              <Power className="h-4 w-4" />
              {user.status === 'active' ? 'Desactivar' : 'Activar'}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)} className="gap-1">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
