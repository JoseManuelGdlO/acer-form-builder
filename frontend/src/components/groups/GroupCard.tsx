import { Group } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';

interface GroupCardProps {
  group: Group;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const GroupCard = ({ group, onView, onEdit, onDelete }: GroupCardProps) => {
  const clientCount = group.clients?.length ?? 0;
  const tripLabel =
    group.assignedTrips && group.assignedTrips.length > 0
      ? group.assignedTrips.map((t) => t.title).join(', ')
      : 'Sin viaje asignado';

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-view="true"]')) return;
    onView();
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border p-0 shadow-sm transition-colors hover:border-primary/30"
      onClick={handleCardClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold">{group.title}</h2>
              <p className="text-xs text-muted-foreground">
                {clientCount} {clientCount === 1 ? 'integrante' : 'integrantes'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-no-view="true"
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Acciones del grupo"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-no-view="true" align="end" className="w-48">
              <DropdownMenuItem data-no-view="true" onClick={onView}>
                <Eye className="mr-2 size-4" />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem data-no-view="true" onClick={onEdit}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-no-view="true"
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 rounded-md bg-muted p-3 text-xs">
          <p className="text-muted-foreground">Viaje asignado</p>
          <p className="mt-1 font-medium">{tripLabel}</p>
        </div>

        <Button
          data-no-view="true"
          type="button"
          className="mt-4 w-full"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          Administrar integrantes
        </Button>
      </CardContent>
    </Card>
  );
};
