import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface FormAnswer {
  question: string;
  /** Texto de ayuda bajo el título (ej. “Como figuran en el pasaporte”) */
  questionDescription?: string;
  answer: string;
  section: string;
}

export interface ClientFormSubmission {
  id: string;
  formName: string;
  submittedAt: Date;
  answers: FormAnswer[];
}

interface ClientFormDataProps {
  submissions: ClientFormSubmission[];
}

export const ClientFormData = ({ submissions }: ClientFormDataProps) => {
  if (submissions.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              El cliente no ha completado ningún formulario
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        // Group answers by section
        const sections = submission.answers.reduce((acc, answer) => {
          if (!acc[answer.section]) {
            acc[answer.section] = [];
          }
          acc[answer.section].push(answer);
          return acc;
        }, {} as Record<string, FormAnswer[]>);

        const sectionEntries = Object.entries(sections);
        const firstTab = sectionEntries.length > 0 ? 'section-0' : '';

        return (
          <Card key={submission.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {submission.formName}
                </CardTitle>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Calendar className="w-3 h-3" />
                  {format(submission.submittedAt, "d 'de' MMM, yyyy", { locale: es })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sectionEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Sin respuestas en este envío.</p>
              ) : (
                <Tabs defaultValue={firstTab} className="w-full">
                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <TabsList className="inline-flex h-auto min-h-10 w-max max-w-none flex-wrap justify-start gap-1 bg-muted/50 p-1">
                      {sectionEntries.map(([sectionName], idx) => (
                        <TabsTrigger
                          key={`${submission.id}-tab-${idx}`}
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
                      key={`${submission.id}-panel-${idx}`}
                      value={`section-${idx}`}
                      className="mt-3 space-y-2 focus-visible:outline-none"
                    >
                      <div className="grid gap-2">
                        {answers.map((answer, aidx) => (
                          <div
                            key={aidx}
                            className="bg-muted/30 rounded-lg p-3 border border-border/30"
                          >
                            <p className="text-xs font-semibold text-foreground mb-0.5">
                              {answer.question}
                            </p>
                            {answer.questionDescription ? (
                              <p className="text-xs text-muted-foreground mb-1">
                                {answer.questionDescription}
                              </p>
                            ) : null}
                            <p className="text-sm text-foreground font-medium">
                              {answer.answer || 'Sin respuesta'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
