import type { MouseEvent } from 'react';
import { Trip } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { tripListIncome, tripOccupancy, tripSchedulePhase } from '@/lib/tripSchedulePhase';
import { ArrowUpRight, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripCardProps {
  trip: Trip;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Solo ver detalle (revisor) */
  readOnly?: boolean;
}

export const TripCard = ({ trip, onView, onEdit, onDelete, readOnly = false }: TripCardProps) => {
  const { count, total, percent } = tripOccupancy(trip);
  const phase = tripSchedulePhase(trip.departureDate, trip.returnDate);
  const income = tripListIncome(trip);
  const fmtShort = (d: string | null | undefined) =>
    d ? format(parseISO(d), 'd MMM yyyy', { locale: es }) : '';
  const rangeLabel = `${fmtShort(trip.departureDate)} – ${fmtShort(trip.returnDate)}`;

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
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
            <h2 className="mt-1 font-display text-lg font-semibold">{trip.title}</h2>
            {trip.destination ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{trip.destination}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-no-view="true"
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Acciones del viaje"
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
                {!readOnly ? (
                  <>
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
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-5 flex items-end gap-5 text-xs">
          <div>
            <p className="text-muted-foreground">Ocupación</p>
            <p className="mt-1 font-semibold">
              {count} / {total} pasajeros
            </p>
          </div>
          {income != null ? (
            <div>
              <p className="text-muted-foreground">Ingresos</p>
              <p className="mt-1 font-semibold">${income.toLocaleString()}</p>
            </div>
          ) : null}
          <ArrowUpRight className="ml-auto size-5 text-muted-foreground" />
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
        </div>
      </CardContent>
    </Card>
  );
};
