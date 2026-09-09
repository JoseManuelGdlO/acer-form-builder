import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Quote, QuoteTemplate, QuoteWritePayload } from '@/types/quote';
import { QuoteForm } from './QuoteForm';

type QuoteFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  lockedClientId?: string;
  advisorName: string;
  template: QuoteTemplate | null;
  quote?: Quote | null;
  submitting?: boolean;
  onSubmit: (data: QuoteWritePayload) => Promise<void>;
};

export function QuoteFormModal({
  open,
  onOpenChange,
  clients,
  lockedClientId,
  advisorName,
  template,
  quote,
  submitting,
  onSubmit,
}: QuoteFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {quote ? 'Editar cotización' : 'Nueva cotización'}
          </DialogTitle>
          <DialogDescription>
            {quote
              ? 'Actualiza los datos de la propuesta. El PDF usará exactamente lo que captures aquí.'
              : 'Crea una cotización y queda ligada al cliente automáticamente.'}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <QuoteForm
            clients={clients}
            lockedClientId={lockedClientId}
            advisorName={advisorName}
            template={template}
            quote={quote}
            submitting={submitting}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
