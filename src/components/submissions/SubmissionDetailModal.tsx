import { FormSubmission, QUESTION_TYPE_CONFIG, QuestionType } from '@/types/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Calendar, FileText, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SubmissionDetailModalProps {
  submission: FormSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Simulated questions for demo - in real app this would come from the form
const mockQuestions: { id: string; title: string; type: QuestionType }[] = [
  { id: 'q1', title: '¿Cuál es tu nombre completo?', type: 'short_text' },
  { id: 'q2', title: '¿Cuál es el motivo de tu viaje?', type: 'long_text' },
  { id: 'q3', title: '¿Has viajado a Estados Unidos antes?', type: 'multiple_choice' },
  { id: 'q4', title: '¿Qué tipo de visa necesitas?', type: 'dropdown' },
  { id: 'q5', title: '¿Cuándo planeas viajar?', type: 'date' },
];

export const SubmissionDetailModal = ({
  submission,
  open,
  onOpenChange,
}: SubmissionDetailModalProps) => {
  if (!submission) return null;

  // Simulated answers for demo
  const mockAnswers: Record<string, string | string[]> = {
    q1: submission.respondentName,
    q2: 'Viajo por motivos de turismo, planeo visitar Nueva York, Los Ángeles y Miami durante 2 semanas.',
    q3: 'Sí, una vez',
    q4: 'Visa de turista (B1/B2)',
    q5: '15 de marzo, 2024',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <DialogTitle className="text-xl font-bold">
                Detalle de Respuesta
              </DialogTitle>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {submission.respondentName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{submission.respondentEmail}</span>
                  </div>
                </div>
              </div>
            </div>
            <SubmissionStatusBadge status={submission.status} />
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{submission.formName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {format(submission.submittedAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </span>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{mockQuestions.length} respuestas</span>
            </div>

            <div className="space-y-5">
              {mockQuestions.map((question, index) => {
                const answer = mockAnswers[question.id];
                const typeConfig = QUESTION_TYPE_CONFIG[question.type];

                return (
                  <div
                    key={question.id}
                    className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {question.title}
                          </p>
                          <Badge variant="outline" className="mt-1.5 text-xs">
                            {typeConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="ml-9 p-3 rounded-lg bg-background border border-border/30">
                      {Array.isArray(answer) ? (
                        <div className="flex flex-wrap gap-2">
                          {answer.map((item, i) => (
                            <Badge key={i} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-foreground whitespace-pre-wrap">
                          {answer || <span className="text-muted-foreground italic">Sin respuesta</span>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
