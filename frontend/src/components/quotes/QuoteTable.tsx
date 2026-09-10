import { Card } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import type { Quote } from '@/types/quote';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { formatQuoteDate, formatQuoteMoney, quoteTone, QUOTE_STATUS_LABEL } from '@/lib/quoteFormat';

type QuoteTableProps = {
  list: Quote[];
  onDetail: (id: string) => void;
};

export function QuoteTable({ list, onDetail }: QuoteTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="hidden grid-cols-[130px_1fr_150px_120px_110px_110px_28px] gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
        <span>Folio</span>
        <span>Propuesta</span>
        <span>Cliente</span>
        <span className="text-right">Total</span>
        <span>Vigencia</span>
        <span>Estado</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {list.map((quote) => (
          <button
            key={quote.id}
            type="button"
            onClick={() => onDetail(quote.id)}
            className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left text-sm hover:bg-muted/60 lg:grid-cols-[130px_1fr_150px_120px_110px_110px_28px] lg:items-center lg:gap-3"
          >
            <span className="font-mono text-xs text-muted-foreground">{quote.folio}</span>
            <span className="min-w-0 truncate font-medium">{quote.title}</span>
            <span className="truncate text-xs text-muted-foreground lg:text-sm">{quote.clientName}</span>
            <span className="text-xs font-semibold lg:text-right lg:text-sm">
              {formatQuoteMoney(quote.totalAmount, quote.currency)}
            </span>
            <span className="text-xs text-muted-foreground">Vence {formatQuoteDate(quote.validUntil)}</span>
            <span>
              <StatusBadge tone={quoteTone(quote.status)}>{QUOTE_STATUS_LABEL[quote.status]}</StatusBadge>
            </span>
            <ArrowUpRight className="hidden size-4 text-muted-foreground lg:block" />
          </button>
        ))}
      </div>
    </Card>
  );
}
