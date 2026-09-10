import { BedDouble, Building2, MoreHorizontal, Pencil, Phone, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Hotel } from '@/types/hotel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HotelCardProps {
  hotel: Hotel;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function locationLine(hotel: Hotel): string {
  const parts = [hotel.city, hotel.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return hotel.address || 'Sin ubicación';
}

function roomsLine(hotel: Hotel): string {
  return `Senc. ${hotel.totalSingleRooms} · Dob. ${hotel.totalDoubleRooms} · Trip. ${hotel.totalTripleRooms}`;
}

function contactLine(hotel: Hotel): string | null {
  const parts = [hotel.phone?.trim(), hotel.email?.trim()].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export const HotelCard = ({ hotel, readOnly = false, onEdit, onDelete }: HotelCardProps) => {
  const contact = contactLine(hotel);

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-view="true"]')) return;
    if (readOnly) return;
    onEdit();
  };

  return (
    <Card
      className={`overflow-hidden border-border p-0 shadow-sm transition-colors hover:border-primary/30 ${
        readOnly ? '' : 'group cursor-pointer'
      }`}
    >
      <CardContent className="p-5" onClick={handleCardClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary/25 text-secondary-foreground">
            <Building2 className="size-5" />
          </div>
          {readOnly ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-no-view="true"
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Acciones del hotel"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-no-view="true" align="end" className="w-44">
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
          )}
        </div>

        <h2 className="mt-4 font-display font-semibold">{hotel.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {locationLine(hotel)} · {roomsLine(hotel)}
        </p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <BedDouble className="size-3.5" />
            {hotel.totalSingleRooms + hotel.totalDoubleRooms + hotel.totalTripleRooms} habitaciones
          </span>
          {contact ? (
            <p className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{contact}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin contacto</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
