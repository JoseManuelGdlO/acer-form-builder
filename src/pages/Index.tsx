import { useState } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { ClientList } from '@/components/clients/ClientList';
import { UserList } from '@/components/users/UserList';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList, Users, UserCog } from 'lucide-react';

type View = 'forms' | 'submissions' | 'clients' | 'users';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('forms');
  
  const {
    forms,
    currentForm,
    createForm,
    updateForm,
    deleteForm,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
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
        onAddSection={() => addSection(currentForm.id)}
        onUpdateSection={(sectionId, updates) => updateSection(currentForm.id, sectionId, updates)}
        onDeleteSection={sectionId => deleteSection(currentForm.id, sectionId)}
        onReorderSections={sections => reorderSections(currentForm.id, sections)}
        onAddQuestion={(sectionId, type) => addQuestion(currentForm.id, sectionId, type)}
        onUpdateQuestion={(sectionId, questionId, updates) =>
          updateQuestion(currentForm.id, sectionId, questionId, updates)
        }
        onDeleteQuestion={(sectionId, questionId) => deleteQuestion(currentForm.id, sectionId, questionId)}
        onReorderQuestions={(sectionId, questions) => reorderQuestions(currentForm.id, sectionId, questions)}
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

  // Vista de usuarios
  if (activeView === 'users') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveView('forms')} className="gap-2">
                <FileText className="w-4 h-4" />
                Formularios
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('submissions')} className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Respuestas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('clients')} className="gap-2">
                <Users className="w-4 h-4" />
                Clientes
              </Button>
              <Button variant="default" size="sm" className="gap-2">
                <UserCog className="w-4 h-4" />
                Usuarios
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-6">Gestión de Usuarios</h1>
          <UserList />
        </div>
      </div>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('users')}
              className="gap-2"
            >
              <UserCog className="w-4 h-4" />
              Usuarios
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
