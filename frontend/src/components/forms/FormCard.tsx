import { FileText, MoreVertical, Trash2, Edit, Copy, ExternalLink } from 'lucide-react';
import { Form } from '@/types/form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FormCardProps {
  form: Form;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Solo ver / duplicar (revisor); abre vista pública al hacer clic */
  readOnly?: boolean;
  onViewPublic?: () => void;
}

export const FormCard = ({ form, onEdit, onDelete, onDuplicate, readOnly = false, onViewPublic }: FormCardProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const handleCardClick = () => {
    if (readOnly) {
      onViewPublic?.();
    } else {
      onEdit();
    }
  };

  return (
    <div
      className={cn(
        'group bg-card rounded-xl border border-border p-5 transition-all duration-300',
        'hover:shadow-card-hover hover:border-primary/30 cursor-pointer',
        'animate-fade-in'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {readOnly ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPublic?.();
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver formulario público
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {!readOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">
        {form.name}
      </h3>
      
      {form.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {form.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {Array.isArray(form.sections)
            ? form.sections.reduce((acc, s) => acc + (s.questions?.length ?? 0), 0)
            : 0}{' '}
          preguntas
        </span>
        <span>
          Editado{' '}
          {form.updatedAt instanceof Date
            ? formatDate(form.updatedAt)
            : formatDate(new Date(form.updatedAt))}
        </span>
      </div>
    </div>
  );
};
