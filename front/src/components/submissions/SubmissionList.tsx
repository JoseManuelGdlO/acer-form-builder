import { useState } from 'react';
import { FormSubmission, SubmissionStatus, SUBMISSION_STATUS_CONFIG, Question } from '@/types/form';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPhoneNumberDisplay } from '@/lib/phone';
import { parseFormSectionsFromApi } from '@/lib/formSections';

interface SubmissionListProps {
  submissions: FormSubmission[];
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  onUpdateStatus: (submissionId: string, status: SubmissionStatus) => void;
  onDelete: (submissionId: string) => void;
  onBack: () => void;
}

type FilterType = 'all' | SubmissionStatus;

export const SubmissionList = ({
  submissions,
  stats,
  onUpdateStatus,
  onDelete,
  onBack,
}: SubmissionListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch =
      sub.respondentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.respondentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.formName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || sub.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (submissionId: string) => {
    onDelete(submissionId);
    toast.success('Respuesta eliminada');
  };

  const handleViewSubmission = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailOpen(true);
  };

  const handleExportPDF = (submission: FormSubmission) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Respuesta', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Form name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Formulario: ${submission.formName}`, 20, yPos);
    yPos += 10;

    // Respondent info
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Solicitante', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${submission.respondentName}`, 20, yPos);
    yPos += 6;
    doc.text(`Email: ${submission.respondentEmail}`, 20, yPos);
    yPos += 6;
    if (submission.respondentPhone) {
      doc.text(`Teléfono: ${formatPhoneNumberDisplay(submission.respondentPhone)}`, 20, yPos);
      yPos += 6;
    }
    doc.text(`Estado: ${SUBMISSION_STATUS_CONFIG[submission.status].label}`, 20, yPos);
    yPos += 6;
    doc.text(`Fecha: ${format(submission.submittedAt, "d 'de' MMMM, yyyy", { locale: es })}`, 20, yPos);
    yPos += 15;

    // Separator line
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Questions and Answers
    doc.setFont('helvetica', 'bold');
    doc.text('Respuestas', 20, yPos);
    yPos += 10;

    // Get all questions - try to use saved questions from answers first, then form sections
    const getAllQuestions = (): Array<{ id: string; title: string; type?: string }> => {
      const answers = submission.answers || {};
      const savedQuestions: Array<{ id: string; title: string; type?: string }> = [];
      
      // First, try to extract questions from saved answers (new format)
      Object.entries(answers).forEach(([questionId, answerData]) => {
        if (answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData) {
          savedQuestions.push({
            id: questionId,
            title: answerData.question,
            type: answerData.questionType,
          });
        }
      });
      
      // If we have saved questions, use them
      if (savedQuestions.length > 0) {
        return savedQuestions;
      }
      
      // Otherwise, fall back to form sections
      if (submission.form) {
        const sections = parseFormSectionsFromApi(submission.form.sections);
        if (sections.length > 0) {
          return sections.flatMap(section => section.questions || []);
        }
      }
      
      return [];
    };

    const questions = getAllQuestions();
    const answers = submission.answers || {};

    questions.forEach((question, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${question.title}`, 20, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const answerData = answers[question.id];
      
      // Support both old format (direct answer) and new format (object with question info)
      const isNewFormat = answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData;
      const answer = isNewFormat ? answerData.answer : answerData;
      
      let answerText = 'Sin respuesta';
      if (answer !== undefined && answer !== null && answer !== '') {
        if (Array.isArray(answer)) {
          // If new format with options, convert IDs to labels
          if (isNewFormat && answerData.options) {
            answerText = answer.map((id: string) => {
              const option = answerData.options.find((opt: any) => opt.id === id);
              return option ? option.label : id;
            }).join(', ');
          } else {
            answerText = answer.join(', ');
          }
        } else {
          // If new format with options and answer is an option ID, convert to label
          if (isNewFormat && answerData.options) {
            const option = answerData.options.find((opt: any) => opt.id === answer);
            answerText = option ? option.label : String(answer);
          } else {
            answerText = String(answer);
          }
        }
      }
      const splitAnswer = doc.splitTextToSize(answerText, pageWidth - 50);
      doc.text(splitAnswer, 25, yPos);
      yPos += splitAnswer.length * 5 + 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generado el ${format(new Date(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}`, pageWidth / 2, 290, { align: 'center' });

    doc.save(`respuesta-${submission.respondentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast.success('PDF exportado correctamente');
  };

  const filterButtons: { key: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Todos', icon: <FileText className="w-4 h-4" />, count: stats.total },
    { key: 'pending', label: 'Pendientes', icon: <Clock className="w-4 h-4" />, count: stats.pending },
    { key: 'in_progress', label: 'En progreso', icon: <Loader2 className="w-4 h-4" />, count: stats.in_progress },
    { key: 'completed', label: 'Completados', icon: <CheckCircle2 className="w-4 h-4" />, count: stats.completed },
    { key: 'cancelled', label: 'Cancelados', icon: <XCircle className="w-4 h-4" />, count: stats.cancelled },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              ← Volver a formularios
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Respuestas de Formularios
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y revisa todas las respuestas recibidas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {filterButtons.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                activeFilter === filter.key
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {filter.icon}
                <span className="text-sm">{filter.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{filter.count}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o formulario..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No hay respuestas
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || activeFilter !== 'all'
                ? 'No se encontraron respuestas con los filtros aplicados'
                : 'Aún no has recibido respuestas en tus formularios'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onUpdateStatus={status => onUpdateStatus(submission.id, status)}
                onDelete={() => handleDelete(submission.id)}
                onView={() => handleViewSubmission(submission)}
                onExportPDF={() => handleExportPDF(submission)}
              />
            ))}
          </div>
        )}

        <SubmissionDetailModal
          submission={selectedSubmission}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </div>
    </div>
  );
};
