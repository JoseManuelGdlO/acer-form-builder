import { FileText, MoreHorizontal, Trash2, Edit, Copy, ExternalLink } from 'lucide-react';
import { Form } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/layout/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MouseEvent } from 'react';

interface FormCardProps {
  form: Form;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Solo ver / duplicar (revisor); abre vista pública al hacer clic */
  readOnly?: boolean;
  onViewPublic?: () => void;
  responseCount?: number | null;
  completedCount?: number;
}

function countQuestions(form: Form): number {
  if (!Array.isArray(form.sections)) return 0;
  return form.sections.reduce((acc, section) => acc + (section.questions?.length ?? 0), 0);
}

function countSections(form: Form): number {
  return Array.isArray(form.sections) ? form.sections.length : 0;
}

function formatDate(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export const FormCard = ({
  form,
  onEdit,
  onDelete,
  onDuplicate,
  readOnly = false,
  onViewPublic,
  responseCount,
  completedCount,
}: FormCardProps) => {
  const sectionCount = countSections(form);
  const questionCount = countQuestions(form);
  const hasPdfTemplate = Boolean(form.pdfTemplateId);

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-view="true"]')) return;
    if (readOnly) {
      onViewPublic?.();
      return;
    }
    onEdit();
  };

  return (
    <Card className="group cursor-pointer overflow-hidden border-border p-0 shadow-sm transition-colors hover:border-primary/30">
      <CardContent className="p-5" onClick={handleCardClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <FileText className="size-5" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-no-view="true"
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Acciones del formulario"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-no-view="true" align="end" className="w-52">
              {readOnly ? (
                <DropdownMenuItem
                  data-no-view="true"
                  onClick={() => onViewPublic?.()}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Ver formulario público
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem data-no-view="true" onClick={onEdit}>
                  <Edit className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem data-no-view="true" onClick={onDuplicate}>
                <Copy className="mr-2 size-4" />
                Duplicar
              </DropdownMenuItem>
              {!readOnly ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-no-view="true"
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h2 className="font-display font-semibold">{form.name}</h2>
          {hasPdfTemplate ? <StatusBadge tone="accent">Plantilla PDF</StatusBadge> : null}
        </div>

        {form.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{form.description}</p>
        ) : null}

        <p className="mt-1 text-xs text-muted-foreground">
          {sectionCount} {sectionCount === 1 ? 'sección' : 'secciones'} · {questionCount}{' '}
          {questionCount === 1 ? 'pregunta' : 'preguntas'}
          {responseCount == null
            ? null
            : ` · ${responseCount} ${responseCount === 1 ? 'respuesta' : 'respuestas'}${
                completedCount != null && completedCount > 0
                  ? ` (${completedCount} ${completedCount === 1 ? 'completada' : 'completadas'})`
                  : ''
              }`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Editado {formatDate(form.updatedAt)}
        </p>

        <div data-no-view="true" className="mt-5 flex flex-wrap gap-2">
          {readOnly ? null : (
            <Button type="button" size="sm" onClick={onEdit}>
              Editar
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" size="sm" variant="outline" onClick={() => onViewPublic?.()}>
                Ver público
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Vista previa de la plantilla. Para que un cliente la llene, asigna el formulario desde su perfil.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};
