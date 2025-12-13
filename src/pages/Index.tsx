import { useState } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { ClientList } from '@/components/clients/ClientList';
import { UserList } from '@/components/users/UserList';
import { AppHeader } from '@/components/layout/AppHeader';
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

  const NavigationButtons = ({ current }: { current: View }) => (
    <>
      <Button
        variant={current === 'forms' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('forms')}
        className="gap-2"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Formularios</span>
      </Button>
      <Button
        variant={current === 'submissions' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('submissions')}
        className="gap-2"
      >
        <ClipboardList className="w-4 h-4" />
        <span className="hidden sm:inline">Respuestas</span>
        {submissions.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
            {submissions.length}
          </span>
        )}
      </Button>
      <Button
        variant={current === 'clients' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('clients')}
        className="gap-2"
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Clientes</span>
        {clients.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
            {clients.length}
          </span>
        )}
      </Button>
      <Button
        variant={current === 'users' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('users')}
        className="gap-2"
      >
        <UserCog className="w-4 h-4" />
        <span className="hidden sm:inline">Usuarios</span>
      </Button>
    </>
  );

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
        <AppHeader>
          <NavigationButtons current="users" />
        </AppHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-primary mb-6">Gestión de Usuarios</h1>
          <UserList />
        </div>
      </div>
    );
  }

  // Vista de formularios con navegación
  return (
    <div className="min-h-screen bg-background">
      <AppHeader>
        <NavigationButtons current="forms" />
      </AppHeader>

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
