import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { applyTheme } from '@/lib/theme';
import { applyFavicon } from '@/lib/favicon';

export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface TenantData {
  company: TenantCompany;
  theme: Record<string, string> | null;
}

type TenantError = 'not_found' | null;

interface TenantContextType {
  tenant: TenantData | null;
  tenantError: TenantError;
  isLoading: boolean;
  loadTenant: (domain: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [tenantError, setTenantError] = useState<TenantError>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTenant = useCallback(async (domain: string) => {
    if (!domain) {
      setTenantError('not_found');
      setTenant(null);
      applyFavicon(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setTenantError(null);
    try {
      const data = await api.getTenant(domain);
      setTenant({
        company: data.company,
        theme: data.theme ?? null,
      });
      applyTheme(data.theme ?? null);
      const faviconUrl = data.company.faviconUrl ?? data.company.logoUrl ?? null;
      applyFavicon(faviconUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      const is404 = (err as { status?: number; response?: { status?: number } })?.response?.status === 404
        || (err as { status?: number })?.status === 404
        || message.includes('404');
      setTenantError('not_found');
      setTenant(null);
      applyFavicon(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    const domainToUse = hostname === 'localhost' || hostname === '127.0.0.1' ? 'aser' : hostname;
    loadTenant(domainToUse);
  }, [loadTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantError,
        isLoading,
        loadTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
