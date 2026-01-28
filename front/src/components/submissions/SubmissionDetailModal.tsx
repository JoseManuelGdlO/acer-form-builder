import { useState, useEffect } from 'react';
import { FormSubmission, QUESTION_TYPE_CONFIG, Question } from '@/types/form';
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
import { User, Mail, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface SubmissionDetailModalProps {
  submission: FormSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubmissionDetailModal = ({
  submission,
  open,
  onOpenChange,
}: SubmissionDetailModalProps) => {
  const { token } = useAuth();
  const [fullSubmission, setFullSubmission] = useState<FormSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFullSubmission = async () => {
      if (!submission || !open || !token) return;
      
      // If submission already has form data, use it
      if (submission.form) {
        setFullSubmission(submission);
        return;
      }

      // Otherwise, fetch the full submission with form data
      setIsLoading(true);
      try {
        const response = await api.getSubmission(submission.id, token);
        const mappedSubmission: FormSubmission = {
          id: response.id,
          formId: response.form_id || response.formId,
          formName: response.form_name || response.formName,
          respondentName: response.respondent_name || response.respondentName,
          respondentEmail: response.respondent_email || response.respondentEmail,
          status: response.status,
          answers: response.answers || {},
          submittedAt: response.submitted_at ? new Date(response.submitted_at) : new Date(response.submittedAt || Date.now()),
          updatedAt: response.updated_at ? new Date(response.updated_at) : new Date(response.updatedAt || Date.now()),
          clientId: response.client_id || response.clientId,
          form: response.form ? {
            id: response.form.id,
            name: response.form.name,
            description: response.form.description || '',
            sections: response.form.sections || [],
            createdAt: response.form.created_at ? new Date(response.form.created_at) : new Date(response.form.createdAt || Date.now()),
            updatedAt: response.form.updated_at ? new Date(response.form.updated_at) : new Date(response.form.updatedAt || Date.now()),
          } : undefined,
        };
        setFullSubmission(mappedSubmission);
      } catch (error) {
        console.error('Failed to load full submission:', error);
        // Fallback to original submission if fetch fails
        setFullSubmission(submission);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && submission) {
      loadFullSubmission();
    } else {
      setFullSubmission(null);
    }
  }, [submission, open, token]);

  if (!submission) return null;

  // Get all questions from the form sections
  const getAllQuestions = (): Question[] => {
    const formToUse = fullSubmission?.form || submission?.form;
    if (formToUse && formToUse.sections) {
      console.log('Form sections:', formToUse.sections);
      const questions = formToUse.sections.flatMap(section => section.questions || []);
      console.log('Extracted questions:', questions);
      return questions;
    }
    console.warn('No form or sections found:', { 
      hasFullSubmission: !!fullSubmission,
      hasForm: !!fullSubmission?.form || !!submission?.form,
      formSections: fullSubmission?.form?.sections || submission?.form?.sections 
    });
    return [];
  };

  const questions = getAllQuestions();
  const answers = fullSubmission?.answers || submission?.answers || {};
  const displaySubmission = fullSubmission || submission;

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
                    {displaySubmission.respondentName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{displaySubmission.respondentEmail}</span>
                  </div>
                </div>
              </div>
            </div>
            <SubmissionStatusBadge status={displaySubmission.status} />
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{displaySubmission.formName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {format(displaySubmission.submittedAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </span>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando detalles...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>{questions.length} respuestas</span>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No se encontraron preguntas para este formulario.</p>
                  </div>
                ) : (
              <div className="space-y-5">
                {questions.map((question, index) => {
                  const answer = answers[question.id];
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
                      {answer === undefined || answer === null || answer === '' ? (
                        <span className="text-muted-foreground italic">Sin respuesta</span>
                      ) : Array.isArray(answer) ? (
                        <div className="flex flex-wrap gap-2">
                          {answer.map((item, i) => (
                            <Badge key={i} variant="secondary">
                              {String(item)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-foreground whitespace-pre-wrap">
                          {String(answer)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
                </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
