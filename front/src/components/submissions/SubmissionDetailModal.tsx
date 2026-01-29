import { useState, useEffect } from 'react';
import { FormSubmission, QUESTION_TYPE_CONFIG } from '@/types/form';
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
import { User, Mail, Phone, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
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
          respondentPhone: response.respondent_phone || response.respondentPhone,
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

  const rawAnswers = fullSubmission?.answers || submission?.answers || {};
  const displaySubmission = fullSubmission || submission;

  // Build explicit question–answer pairs from saved answers (prioritise new format with embedded question text)
  type QuestionAnswerPair = {
    id: string;
    question: string;
    questionType?: string;
    questionDescription?: string;
    answer: string | string[];
    options?: Array<{ id: string; label: string }>;
  };

  const getQuestionAnswerPairs = (): QuestionAnswerPair[] => {
    const pairs: QuestionAnswerPair[] = [];
    const formToUse = fullSubmission?.form || submission?.form;

    Object.entries(rawAnswers).forEach(([questionId, answerData]) => {
      const isNewFormat =
        answerData &&
        typeof answerData === 'object' &&
        !Array.isArray(answerData) &&
        'question' in answerData;

      if (isNewFormat) {
        let answerValue = (answerData as any).answer;
        // Ensure answer is properly formatted (not an object)
        if (answerValue && typeof answerValue === 'object' && !Array.isArray(answerValue)) {
          // If answer is an object, try to stringify it or extract a meaningful value
          answerValue = JSON.stringify(answerValue);
        }
        
        pairs.push({
          id: questionId,
          question: (answerData as any).question,
          questionType: (answerData as any).questionType,
          questionDescription: (answerData as any).questionDescription,
          answer: answerValue,
          options: (answerData as any).options,
        });
        return;
      }

      // Old format: only answer value; get question text from form sections
      let answerValue = answerData;
      // Ensure answer is properly formatted (not an object)
      if (answerValue && typeof answerValue === 'object' && !Array.isArray(answerValue)) {
        // If answer is an object, try to stringify it or extract a meaningful value
        answerValue = JSON.stringify(answerValue);
      }
      
      const questionTitle =
        formToUse?.sections
          ?.flatMap((s: any) => s.questions || [])
          .find((q: any) => q.id === questionId)?.title || `Pregunta (${questionId.slice(0, 8)}…)`;
      pairs.push({
        id: questionId,
        question: questionTitle,
        answer: answerValue as string | string[],
      });
    });

    return pairs;
  };

  const questionAnswerPairs = getQuestionAnswerPairs();

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
                  <div className="flex flex-col gap-1 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{displaySubmission.respondentEmail}</span>
                    </div>
                    {displaySubmission.respondentPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{displaySubmission.respondentPhone}</span>
                      </div>
                    )}
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
                  <span>{questionAnswerPairs.length} respuestas</span>
                </div>

                {questionAnswerPairs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hay respuestas guardadas para este formulario.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questionAnswerPairs.map((pair, index) => {
                      const typeConfig =
                        pair.questionType && pair.questionType in QUESTION_TYPE_CONFIG
                          ? QUESTION_TYPE_CONFIG[pair.questionType as keyof typeof QUESTION_TYPE_CONFIG]
                          : null;
                      const answer = pair.answer;
                      const options = pair.options;

                      const formatAnswerValue = (val: string | any): string => {
                        // Handle non-string values
                        if (val === null || val === undefined) {
                          return '';
                        }
                        if (typeof val === 'object' && !Array.isArray(val)) {
                          // If it's an object, try to extract meaningful data or stringify
                          return JSON.stringify(val, null, 2);
                        }
                        if (Array.isArray(val)) {
                          return val.join(', ');
                        }
                        const stringVal = String(val);
                        if (options) {
                          const opt = options.find((o) => o.id === stringVal);
                          return opt ? opt.label : stringVal;
                        }
                        return stringVal;
                      };

                      return (
                        <div
                          key={pair.id}
                          className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-foreground">{pair.question}</p>
                                {pair.questionDescription && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {pair.questionDescription}
                                  </p>
                                )}
                                {typeConfig && (
                                  <Badge variant="outline" className="mt-1.5 text-xs">
                                    {typeConfig.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-9 p-3 rounded-lg bg-background border border-border/30">
                            {answer === undefined ||
                            answer === null ||
                            answer === '' ||
                            (Array.isArray(answer) && answer.length === 0) ? (
                              <span className="text-muted-foreground italic">Sin respuesta</span>
                            ) : Array.isArray(answer) ? (
                              <div className="flex flex-wrap gap-2">
                                {answer.map((item, i) => (
                                  <Badge key={i} variant="secondary">
                                    {formatAnswerValue(item)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-foreground whitespace-pre-wrap">
                                {formatAnswerValue(answer)}
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
