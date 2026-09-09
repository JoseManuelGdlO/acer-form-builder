import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ShellView } from '@/auth/viewPermissions';
import type { Product } from '@/types/product';
import type { Trip } from '@/types/form';

export type HeaderSearchSectionId = 'clients' | 'trips' | 'quotes' | 'products';

export type HeaderSearchHit = {
  id: string;
  title: string;
  subtitle?: string;
};

export type HeaderSearchSection = {
  id: HeaderSearchSectionId;
  label: string;
  view: ShellView;
  hits: HeaderSearchHit[];
};

type UseHeaderGlobalSearchArgs = {
  query: string;
  token: string | null;
  can: (key: string) => boolean;
  canAny: (keys: string[]) => boolean;
  trips: Trip[];
  products: Product[];
};

const SECTION_ORDER: HeaderSearchSectionId[] = ['clients', 'trips', 'quotes', 'products'];

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function matchHaystack(value: string | null | undefined, q: string): boolean {
  return (value ?? '').toLowerCase().includes(q);
}

export function useHeaderGlobalSearch({
  query,
  token,
  can,
  canAny,
  trips,
  products,
}: UseHeaderGlobalSearchArgs) {
  const q = query.trim();
  const visible = q.length >= 2;
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<HeaderSearchSection[]>([]);

  useEffect(() => {
    if (!visible || !token) {
      setSections([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const qLower = q.toLowerCase();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const bag: Partial<Record<HeaderSearchSectionId, HeaderSearchSection>> = {};

      const tasks: Promise<void>[] = [];

      if (canAny(['clients.view_all', 'clients.view_assigned'])) {
        tasks.push(
          (async () => {
            try {
              const response = await api.getClients({ q, page: 1, limit: 5 }, token, {
                signal: ac.signal,
              });
              const rows = Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                  ? response.data
                  : [];
              bag.clients = {
                id: 'clients',
                label: 'Clientes',
                view: 'clients',
                hits: rows.slice(0, 5).map((row: { id: string; name?: string; email?: string }) => ({
                  id: row.id,
                  title: row.name?.trim() || 'Cliente',
                  subtitle: row.email?.trim() || undefined,
                })),
              };
            } catch (error) {
              if (isAbortError(error)) return;
            }
          })(),
        );
      }

      if (can('trips.view')) {
        const hits = trips
          .filter(
            (trip) =>
              matchHaystack(trip.title, qLower) || matchHaystack(trip.destination, qLower),
          )
          .slice(0, 5)
          .map((trip) => ({
            id: trip.id,
            title: trip.title,
            subtitle: trip.destination?.trim() || undefined,
          }));
        bag.trips = { id: 'trips', label: 'Viajes', view: 'trips', hits };
      }

      if (can('quotes.view')) {
        tasks.push(
          (async () => {
            try {
              const response = await api.getQuotes({ q }, token, { signal: ac.signal });
              const rows = Array.isArray(response) ? response : [];
              bag.quotes = {
                id: 'quotes',
                label: 'Cotizaciones',
                view: 'quotes',
                hits: rows.slice(0, 5).map((row: { id: string; folio?: string; title?: string; clientName?: string }) => ({
                  id: String(row.id),
                  title: String(row.folio || row.title || 'Cotización'),
                  subtitle: [row.title, row.clientName].filter(Boolean).join(' · ') || undefined,
                })),
              };
            } catch (error) {
              if (isAbortError(error)) return;
            }
          })(),
        );
      }

      if (can('products.view')) {
        const hits = products
          .filter(
            (product) =>
              matchHaystack(product.title, qLower) || matchHaystack(product.description, qLower),
          )
          .slice(0, 5)
          .map((product) => ({
            id: product.id,
            title: product.title,
            subtitle: product.description?.trim() || undefined,
          }));
        bag.products = { id: 'products', label: 'Productos', view: 'products', hits };
      }

      await Promise.all(tasks);
      if (ac.signal.aborted) return;
      setSections(SECTION_ORDER.map((id) => bag[id]).filter(Boolean) as HeaderSearchSection[]);
      setLoading(false);
    }, 300);

    return () => {
      window.clearTimeout(handle);
      ac.abort();
    };
  }, [visible, q, token, can, canAny, trips, products]);

  const empty = visible && !loading && sections.every((section) => section.hits.length === 0);

  return { visible, loading, sections, empty };
}
