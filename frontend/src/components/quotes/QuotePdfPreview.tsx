import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Quote, QuoteTemplate } from '@/types/quote';
import { formatQuoteDate, formatQuoteMoney, textToLines } from '@/lib/quoteFormat';
import { getCompanyBrandLogo } from '@/lib/theme';

type QuotePdfPreviewProps = {
  quote?: Quote | null;
  template: QuoteTemplate;
};

export function QuotePdfPreview({ quote, template }: QuotePdfPreviewProps) {
  const { tenant } = useTenant();
  const { company } = useAuth();
  const logoUrl = getCompanyBrandLogo(tenant?.theme, company?.logoUrl ?? tenant?.company?.logoUrl);
  const includes = quote?.includes?.length ? quote.includes : textToLines(template.includes);
  const excludes = quote?.excludes?.length ? quote.excludes : textToLines(template.excludes);
  const terms = quote?.terms || template.terms;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card text-[11px] leading-relaxed text-foreground shadow-sm">
      <div
        className="flex items-center gap-3 px-5 py-4 text-primary-foreground"
        style={{ backgroundColor: template.headerColor }}
      >
        {template.showLogo && logoUrl ? <img src={logoUrl} alt="" className="h-8 w-auto" /> : null}
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">{template.company}</p>
          <p className="truncate text-[10px] opacity-80">{template.contact}</p>
        </div>
        <p className="ml-auto shrink-0 text-[10px] opacity-90">Folio {quote?.folio ?? 'COT-000000'}</p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <p className="font-display text-sm font-semibold" style={{ color: template.accentColor }}>
          {template.title}
        </p>
        <p>
          Cliente: <b>{quote?.clientName ?? 'Nombre del cliente'}</b> · Agente:{' '}
          {quote?.advisorName ?? 'Agente asignado'}
        </p>
        <p>
          Servicio: <b>{quote?.title ?? 'Propuesta de viaje'}</b>
          {quote?.hotel ? ` · ${quote.hotel}` : ''}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['Costo total', quote ? formatQuoteMoney(quote.totalAmount, quote.currency) : '0.00 MXN'],
              ['Anticipo', quote ? formatQuoteMoney(quote.advanceAmount, quote.currency) : '0.00 MXN'],
              ['Vigencia', quote ? formatQuoteDate(quote.validUntil) : 'dd/mm/aaaa'],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="rounded border border-border p-2">
              <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[9px] font-semibold uppercase" style={{ color: template.accentColor }}>
              Incluye
            </p>
            {(includes.length ? includes : ['—']).map((item) => (
              <p key={item}>· {item}</p>
            ))}
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase text-muted-foreground">No incluye</p>
            {(excludes.length ? excludes : ['—']).map((item) => (
              <p key={item}>· {item}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Condiciones</p>
          <p className="whitespace-pre-line">{terms || '—'}</p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{template.footer}</div>
    </div>
  );
}
