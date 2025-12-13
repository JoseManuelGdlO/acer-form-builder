import { useState } from 'react';
import { FormSubmission, SubmissionStatus, SUBMISSION_STATUS_CONFIG } from '@/types/form';
import { SubmissionCard } from './SubmissionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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
    toast.info(`Ver respuestas de ${submission.respondentName}`);
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
