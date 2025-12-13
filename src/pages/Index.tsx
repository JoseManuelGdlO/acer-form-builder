import { useState } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { ClientList } from '@/components/clients/ClientList';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList, Users } from 'lucide-react';

type View = 'forms' | 'submissions' | 'clients';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('forms');
  
  const {
    forms,
    currentForm,
    createForm,
    updateForm,
    deleteForm,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    selectForm,
  } = useFormStore();

  const {
    submissions,
    updateSubmissionStatus,
    deleteSubmission,
    getSubmissionStats,
  } = useSubmissionStore();

  const {
    clients,
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    getClientStats,
  } = useClientStore();

  // Si estamos editando un formulario, mostramos el editor
  if (currentForm) {
    return (
      <FormEditor
        form={currentForm}
        onBack={() => selectForm(null)}
        onUpdateForm={updates => updateForm(currentForm.id, updates)}
        onAddQuestion={type => addQuestion(currentForm.id, type)}
        onUpdateQuestion={(questionId, updates) =>
          updateQuestion(currentForm.id, questionId, updates)
        }
        onDeleteQuestion={questionId => deleteQuestion(currentForm.id, questionId)}
        onReorderQuestions={questions => reorderQuestions(currentForm.id, questions)}
      />
    );
  }

  // Vista de respuestas
  if (activeView === 'submissions') {
    return (
      <SubmissionList
        submissions={submissions}
        stats={getSubmissionStats()}
        onUpdateStatus={updateSubmissionStatus}
        onDelete={deleteSubmission}
        onBack={() => setActiveView('forms')}
      />
    );
  }

  // Vista de clientes
  if (activeView === 'clients') {
    return (
      <ClientList
        clients={clients}
        stats={getClientStats()}
        onUpdateStatus={updateClientStatus}
        onDelete={deleteClient}
        onCreate={createClient}
        onUpdate={updateClient}
        onBack={() => setActiveView('forms')}
      />
    );
  }

  // Vista de formularios con navegación
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Formularios
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('submissions')}
              className="gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              Respuestas
              {submissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20">
                  {submissions.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('clients')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Clientes
              {clients.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20">
                  {clients.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <FormList
        forms={forms}
        onSelectForm={selectForm}
        onCreateForm={createForm}
        onDeleteForm={deleteForm}
      />
    </div>
  );
};

export default Index;
