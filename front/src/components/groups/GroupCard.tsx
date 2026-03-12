import { Group } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, MoreHorizontal, Eye, Pencil, Trash2, MapPin } from 'lucide-react';

interface GroupCardProps {
  group: Group;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const GroupCard = ({ group, onView, onEdit, onDelete }: GroupCardProps) => {
  const clientCount = group.clients?.length ?? 0;

  return (
    <Card
      className="group hover:shadow-card-hover transition-all duration-300 border-border/50 hover:border-primary/30 cursor-pointer"
      onClick={onView}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{group.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {clientCount} cliente{clientCount === 1 ? '' : 's'}
                </p>
                {group.assignedTrips && group.assignedTrips.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    En viaje(s): {group.assignedTrips.map(t => t.title).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView} className="gap-2">
                <Eye className="w-4 h-4" />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
