import { FAQ } from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { Pencil, Trash2, GripVertical, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';

interface FAQCardProps {
  faq: FAQ;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  isDragging?: boolean;
}

export const FAQCard = ({ faq, onEdit, onDelete, onToggleStatus, isDragging }: FAQCardProps) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 border-t py-4 ${isDragging ? 'opacity-80' : ''}`}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <MessageSquare className="size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{faq.question}</p>
        <p className="text-xs text-muted-foreground">
          {faq.category ? `Categoría: ${faq.category}` : 'Sin categoría'}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{faq.answer}</p>
        {faq.updatedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Actualizada: {faq.updatedAt.toLocaleDateString('es-ES')}
          </p>
        ) : null}
      </div>
      <StatusBadge tone={faq.isActive ? 'success' : 'neutral'}>
        {faq.isActive ? 'Activa' : 'Inactiva'}
      </StatusBadge>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleStatus}
          aria-label={faq.isActive ? 'Desactivar pregunta' : 'Activar pregunta'}
        >
          {faq.isActive ? (
            <ToggleRight className="text-success" />
          ) : (
            <ToggleLeft className="text-muted-foreground" />
          )}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Editar pregunta">
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          aria-label="Eliminar pregunta"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
};
