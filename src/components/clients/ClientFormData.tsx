import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface FormAnswer {
  question: string;
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
            <CardContent className="space-y-4">
              {Object.entries(sections).map(([sectionName, answers]) => (
                <div key={sectionName} className="space-y-2">
                  <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {sectionName}
                  </h4>
                  <div className="grid gap-2 pl-6">
                    {answers.map((answer, idx) => (
                      <div 
                        key={idx}
                        className="bg-muted/30 rounded-lg p-3 border border-border/30"
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {answer.question}
                        </p>
                        <p className="text-sm text-foreground font-medium">
                          {answer.answer || 'Sin respuesta'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
