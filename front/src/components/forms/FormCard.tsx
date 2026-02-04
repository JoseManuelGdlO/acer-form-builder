import { FileText, MoreVertical, Trash2, Edit, Copy, Link2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FormCardProps {
  form: Form;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const FormCard = ({ form, onEdit, onDelete, onDuplicate }: FormCardProps) => {
  const { hasRole } = useAuth();
  const canCopyLink = hasRole('super_admin');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formId = form.id;
    const formName = form.name;
    console.log('[FormCard] Copiar link: inicio', { formId, formName });

    try {
      console.log('[FormCard] Copiar link: llamando API createFormSession', { formId });
      const { sessionId } = await api.createFormSession(form.id);
      const publicUrl = `${window.location.origin}/form/${form.id}?token=${sessionId}`;
      console.log('[FormCard] Copiar link: sesión creada OK', { formId, sessionId, publicUrl });

      try {
        await navigator.clipboard.writeText(publicUrl);
        console.log('[FormCard] Copiar link: portapapeles OK', { formId });
        toast.success('Link único copiado al portapapeles. El progreso se guardará en la nube.');
      } catch (clipboardErr) {
        console.warn('[FormCard] Copiar link: portapapeles falló (mostrando URL en toast)', {
          formId,
          error: clipboardErr,
        });
        toast.success(
          <span>
            Enlace generado. Cópialo manualmente: <br />
            <code className="text-xs break-all bg-muted px-1 rounded">{publicUrl}</code>
          </span>,
          { duration: 15000 }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      console.error('[FormCard] Copiar link: error', {
        formId,
        formName,
        message,
        err,
      });
      if (message.includes('Insufficient permissions') || message.includes('403')) {
        toast.error('Solo un administrador puede generar enlaces de formulario. Pide a un admin que copie el link.');
      } else if (message.includes('Authentication required') || message.includes('401')) {
        toast.error('Tu sesión ha expirado. Inicia sesión de nuevo.');
      } else {
        toast.error('No se pudo generar el enlace. Intenta de nuevo.');
      }
    }
  };

  return (
    <div
      className={cn(
        'group bg-card rounded-xl border border-border p-5 transition-all duration-300',
        'hover:shadow-card-hover hover:border-primary/30 cursor-pointer',
        'animate-fade-in'
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-1">
          {canCopyLink && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copiar link público"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          )}
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {canCopyLink && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Copiar link público
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
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
        <span>{form.sections.reduce((acc, s) => acc + s.questions.length, 0)} preguntas</span>
        <span>Editado {formatDate(form.updatedAt)}</span>
      </div>
    </div>
  );
};
