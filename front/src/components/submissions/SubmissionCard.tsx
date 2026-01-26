import { FormSubmission, SubmissionStatus } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Trash2, User, Mail, FileText, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SubmissionCardProps {
  submission: FormSubmission;
  onUpdateStatus: (status: SubmissionStatus) => void;
  onDelete: () => void;
  onView: () => void;
  onExportPDF: () => void;
}

export const SubmissionCard = ({
  submission,
  onUpdateStatus,
  onDelete,
  onView,
  onExportPDF,
}: SubmissionCardProps) => {
  return (
    <Card className="group hover:shadow-card-hover transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground truncate">
                    {submission.respondentName}
                  </h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{submission.respondentEmail}</span>
                  </div>
                </div>
              </div>
              <SubmissionStatusBadge status={submission.status} />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{submission.formName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(submission.submittedAt, "d 'de' MMM, yyyy", { locale: es })}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 mr-2" />
                Ver respuestas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Exportar a PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateStatus('pending')}>
                Marcar como Pendiente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('in_progress')}>
                Marcar como En progreso
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('completed')}>
                Marcar como Completado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('cancelled')}>
                Marcar como Cancelado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
