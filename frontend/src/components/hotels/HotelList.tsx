import { useMemo } from 'react';
import type { Hotel } from '@/types/hotel';
import { Button } from '@/components/ui/button';
import { Building2, BedDouble } from 'lucide-react';

interface HotelListProps {
  hotels: Hotel[];
  onCreate: () => void;
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotel: Hotel) => void;
  readOnly?: boolean;
}

export const HotelList = ({ hotels, onCreate, onEdit, onDelete, readOnly = false }: HotelListProps) => {
  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    [hotels]
  );

  const locationLine = (h: Hotel) => {
    const parts = [h.city, h.country].filter(Boolean);
    return parts.length ? parts.join(', ') : h.address || '—';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              Hoteles
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Catálogo de hoteles y capacidad por tipo de habitación. Luego podrás asignarlos en cada viaje.
            </p>
          </div>
          {!readOnly && <Button onClick={onCreate}>Nuevo hotel</Button>}
        </div>

        {sorted.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground bg-card">
            <p className="mb-3">Aún no hay hoteles registrados.</p>
            {!readOnly && <Button onClick={onCreate}>Registrar el primer hotel</Button>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((h) => (
              <div key={h.id} className="border rounded-lg overflow-hidden bg-card flex flex-col shadow-sm">
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h2 className="font-semibold text-lg line-clamp-2">{h.name}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">{locationLine(h)}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      Senc. {h.totalSingleRooms} · Dob. {h.totalDoubleRooms} · Trip. {h.totalTripleRooms}
                    </span>
                  </div>
                  {!readOnly && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(h)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(h)}>
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
