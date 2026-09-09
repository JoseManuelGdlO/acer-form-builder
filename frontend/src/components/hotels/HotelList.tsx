import { useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import type { Hotel } from '@/types/hotel';
import { Button } from '@/components/ui/button';
import { Toolbar } from '@/components/layout/Toolbar';
import { HotelCard } from './HotelCard';

interface HotelListProps {
  hotels: Hotel[];
  onCreate: () => void;
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotel: Hotel) => void;
  readOnly?: boolean;
}

export const HotelList = ({ hotels, onCreate, onEdit, onDelete, readOnly = false }: HotelListProps) => {
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    [hotels]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((hotel) => {
      const haystack = [hotel.name, hotel.city, hotel.country, hotel.address, hotel.phone, hotel.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, search]);

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Toolbar search={search} onSearchChange={setSearch} placeholder="Buscar hotel…">
        {readOnly ? null : (
          <Button type="button" onClick={onCreate}>
            <Plus />
            Nuevo hotel
          </Button>
        )}
      </Toolbar>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <Building2 className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {search ? 'Sin resultados' : 'No hay hoteles'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {search
              ? 'No se encontraron hoteles con ese término'
              : readOnly
                ? 'No hay hoteles en el catálogo'
                : 'Registra el primero para asignarlo después a un viaje'}
          </p>
          {!search && !readOnly ? (
            <Button type="button" onClick={onCreate}>
              <Plus />
              Registrar hotel
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              readOnly={readOnly}
              onEdit={() => onEdit(hotel)}
              onDelete={() => onDelete(hotel)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
