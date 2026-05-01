import { useState, useEffect } from 'react';
import { FormSubmission } from '@/types/form';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Phone, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneNumberDisplay } from '@/lib/phone';
import { parseFormSectionsFromApi } from '@/lib/formSections';

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
            sections: parseFormSectionsFromApi(response.form.sections ?? []),
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
  type FileAnswerObj = { fileName: string; mimeType?: string; data: string };
  type QuestionAnswerPair = {
    id: string;
    question: string;
    questionType?: string;
    questionDescription?: string;
    answer: string | string[] | FileAnswerObj;
    options?: Array<{ id: string; label: string }>;
    section: string;
  };

  const isFileAnswerObj = (val: unknown): val is FileAnswerObj =>
    typeof val === 'object' && val !== null && 'fileName' in val && 'data' in val;

  const getQuestionAnswerPairs = (): QuestionAnswerPair[] => {
    const pairs: QuestionAnswerPair[] = [];
    const formToUse = fullSubmission?.form || submission?.form;
    const sectionsList = parseFormSectionsFromApi(formToUse?.sections);

    Object.entries(rawAnswers).forEach(([questionId, answerData]) => {
      const isNewFormat =
        answerData &&
        typeof answerData === 'object' &&
        !Array.isArray(answerData) &&
        'question' in answerData;

      // Find section name for this question
      let sectionName = 'Sin sección';
      for (const section of sectionsList) {
        const question = section.questions?.find((q: any) => q.id === questionId);
        if (question) {
          sectionName = section.title || 'Sin sección';
          break;
        }
      }

      if (isNewFormat) {
        let answerValue: string | string[] | FileAnswerObj = (answerData as { answer: string | string[] | FileAnswerObj }).answer;
        // Keep file answers as object; stringify other plain objects
        if (answerValue && typeof answerValue === 'object' && !Array.isArray(answerValue)) {
          if (!isFileAnswerObj(answerValue)) {
            answerValue = JSON.stringify(answerValue) as string;
          }
        }
        
        pairs.push({
          id: questionId,
          question: (answerData as { question: string }).question,
          questionType: (answerData as { questionType?: string }).questionType,
          questionDescription: (answerData as { questionDescription?: string }).questionDescription,
          answer: answerValue,
          options: (answerData as { options?: Array<{ id: string; label: string }> }).options,
          section: sectionName,
        });
        return;
      }

      // Old format: only answer value; get question text from form sections
      let answerValue: string | string[] | FileAnswerObj = answerData as string | string[] | FileAnswerObj;
      if (answerValue && typeof answerValue === 'object' && !Array.isArray(answerValue)) {
        if (!isFileAnswerObj(answerValue)) {
          answerValue = JSON.stringify(answerValue) as string;
        }
      }
      
      const questionTitle =
        sectionsList
          .flatMap((s) => s.questions || [])
          .find((q) => q.id === questionId)?.title || `Pregunta (${questionId.slice(0, 8)}…)`;
      pairs.push({
        id: questionId,
        question: questionTitle,
        answer: answerValue,
        section: sectionName,
      });
    });

    return pairs;
  };

  const questionAnswerPairs = getQuestionAnswerPairs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-7 pb-4 bg-gradient-to-br from-primary/5 to-transparent">
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
                        <span>{formatPhoneNumberDisplay(displaySubmission.respondentPhone)}</span>
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
                  (() => {
                    // Group answers by section (same format as ClientFormData)
                    const sections = questionAnswerPairs.reduce((acc, pair) => {
                      if (!acc[pair.section]) {
                        acc[pair.section] = [];
                      }
                      acc[pair.section].push(pair);
                      return acc;
                    }, {} as Record<string, typeof questionAnswerPairs>);

                    const sectionEntries = Object.entries(sections);
                    const firstTab = sectionEntries.length > 0 ? 'section-0' : '';

                    const isFileAnswer = (val: unknown): val is { fileName: string; mimeType?: string; data: string } =>
                      typeof val === 'object' && val !== null && 'fileName' in val && 'data' in val;

                    const formatAnswerValue = (val: string | unknown, options?: Array<{ id: string; label: string }>): string => {
                      if (val === null || val === undefined) return '';
                      if (isFileAnswer(val)) return val.fileName;
                      if (typeof val === 'object' && !Array.isArray(val)) return JSON.stringify(val, null, 2);
                      if (Array.isArray(val)) return val.join(', ');
                      const stringVal = String(val);
                      if (options) {
                        const opt = options.find((o) => o.id === stringVal);
                        return opt ? opt.label : stringVal;
                      }
                      return stringVal;
                    };

                    return (
                      <Tabs defaultValue={firstTab} className="w-full">
                        <div className="overflow-x-auto pb-2 -mx-1 px-1">
                          <TabsList className="inline-flex h-auto min-h-10 w-max max-w-none flex-wrap justify-start gap-1 bg-muted/50 p-1">
                            {sectionEntries.map(([sectionName], idx) => (
                              <TabsTrigger
                                key={`tab-${idx}`}
                                value={`section-${idx}`}
                                className="max-w-[min(100%,18rem)] shrink-0 text-left whitespace-normal data-[state=active]:text-foreground"
                              >
                                {sectionName}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </div>
                        {sectionEntries.map(([, answers], idx) => (
                          <TabsContent
                            key={`panel-${idx}`}
                            value={`section-${idx}`}
                            className="mt-3 space-y-2 focus-visible:outline-none"
                          >
                            <div className="grid gap-2">
                              {answers.map((pair) => (
                                <div
                                  key={pair.id}
                                  className="bg-muted/30 rounded-lg p-3 border border-border/30"
                                >
                                  <p className="text-xs font-semibold text-foreground mb-0.5">
                                    {pair.question}
                                  </p>
                                  {pair.questionDescription &&
                                  String(pair.questionDescription).trim() !== '' &&
                                  pair.questionDescription !== pair.question ? (
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {pair.questionDescription}
                                    </p>
                                  ) : null}
                                  <p className="text-sm text-foreground font-medium">
                                    {pair.answer === undefined ||
                                    pair.answer === null ||
                                    pair.answer === '' ||
                                    (Array.isArray(pair.answer) && pair.answer.length === 0)
                                      ? 'Sin respuesta'
                                      : isFileAnswer(pair.answer) ? (
                                          <a
                                            href={(pair.answer as { data: string }).data}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline hover:no-underline"
                                          >
                                            {(pair.answer as { fileName: string }).fileName} (abrir)
                                          </a>
                                        ) : (
                                          formatAnswerValue(pair.answer, pair.options)
                                        )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    );
                  })()
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
