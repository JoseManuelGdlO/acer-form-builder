import { useState, useMemo, useEffect } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { useUserStore } from '@/hooks/useUserStore';
import { useAuth } from '@/contexts/AuthContext';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { ClientList } from '@/components/clients/ClientList';
import { UserList } from '@/components/users/UserList';
import { ChatbotSettings } from '@/components/chatbot/ChatbotSettings';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ViewAsSelector } from '@/components/admin/ViewAsSelector';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, ClipboardList, Users, UserCog, Bot, Settings } from 'lucide-react';
import { User } from '@/types/user';
import { Client, ClientStatus } from '@/types/form';

type View = 'dashboard' | 'forms' | 'submissions' | 'clients' | 'users' | 'chatbot' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [viewingAs, setViewingAs] = useState<User | null>(null);
  
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
    checklistTemplates,
    fetchClients,
    createClient: createClientStore,
    updateClient: updateClientStore,
    deleteClient: deleteClientStore,
    updateClientStatus: updateClientStatusStore,
    getClientStats,
  } = useClientStore();
  const { token } = useAuth();
  const { users } = useUserStore();

  // Load clients when component mounts or when token changes
  useEffect(() => {
    if (token && clients.length === 0) {
      fetchClients(token).catch((error) => {
        console.error('Failed to fetch clients:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load clients when switching to clients view
  useEffect(() => {
    if (token && activeView === 'clients') {
      fetchClients(token).catch((error) => {
        console.error('Failed to fetch clients:', error);
      });
    }
  }, [activeView, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapper functions to pass token automatically
  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    if (!token) {
      throw new Error('No token available');
    }
    return createClientStore(token, clientData);
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!token) {
      throw new Error('No token available');
    }
    return updateClientStore(token, clientId, updates);
  };

  const deleteClient = async (clientId: string) => {
    if (!token) {
      throw new Error('No token available');
    }
    return deleteClientStore(token, clientId);
  };

  const updateClientStatus = async (clientId: string, status: ClientStatus) => {
    if (!token) {
      throw new Error('No token available');
    }
    return updateClientStatusStore(token, clientId, status);
  };

  // Filter clients based on "View As" selection
  const filteredClients = useMemo(() => {
    if (!viewingAs) return clients;
    // Super admins see all, reviewers see only their assigned clients
    if (viewingAs.roles.includes('super_admin')) return clients;
    return clients.filter(client => client.assignedUserId === viewingAs.id);
  }, [clients, viewingAs]);

  const filteredClientStats = useMemo(() => {
    return {
      total: filteredClients.length,
      active: filteredClients.filter(c => c.status === 'active').length,
      inactive: filteredClients.filter(c => c.status === 'inactive').length,
      pending: filteredClients.filter(c => c.status === 'pending').length,
    };
  }, [filteredClients]);

  const NavigationButtons = ({ current }: { current: View }) => (
    <>
      <Button
        variant={current === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('dashboard')}
        className="gap-2"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Button>
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
        {filteredClients.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
            {filteredClients.length}
          </span>
        )}
      </Button>
      <RoleGuard allowedRoles={['super_admin']}>
        <Button
          variant={current === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('users')}
          className="gap-2"
        >
          <UserCog className="w-4 h-4" />
          <span className="hidden sm:inline">Usuarios</span>
        </Button>
      </RoleGuard>
      <RoleGuard allowedRoles={['super_admin']}>
        <Button
          variant={current === 'chatbot' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('chatbot')}
          className="gap-2"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Chatbot</span>
        </Button>
      </RoleGuard>
      <RoleGuard allowedRoles={['super_admin']}>
        <Button
          variant={current === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('settings')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Configuración</span>
        </Button>
      </RoleGuard>
    </>
  );

  // Floating View As selector - always visible
  const FloatingViewAs = () => (
    <ViewAsSelector
      users={users}
      viewingAs={viewingAs}
      onSelectUser={setViewingAs}
    />
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
      <>
        <FloatingViewAs />
        <div className={viewingAs ? 'pt-10' : ''}>
          <SubmissionList
            submissions={submissions}
            stats={getSubmissionStats()}
            onUpdateStatus={updateSubmissionStatus}
            onDelete={deleteSubmission}
            onBack={() => setActiveView('dashboard')}
          />
        </div>
      </>
    );
  }

  // Vista de clientes
  if (activeView === 'clients') {
    return (
      <>
        <FloatingViewAs />
        <div className={viewingAs ? 'pt-10' : ''}>
          <ClientList
            clients={filteredClients}
            stats={filteredClientStats}
            onUpdateStatus={updateClientStatus}
            onDelete={deleteClient}
            onCreate={createClient}
            onUpdate={updateClient}
            onBack={() => setActiveView('dashboard')}
          />
        </div>
      </>
    );
  }

  // Vista de usuarios
  if (activeView === 'users') {
    return (
      <RoleGuard allowedRoles={['super_admin']} fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p></div>}>
        <>
          <FloatingViewAs />
          <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
            <AppHeader>
              <NavigationButtons current="users" />
            </AppHeader>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-3xl font-bold text-primary mb-6">Gestión de Usuarios</h1>
              <UserList />
            </div>
          </div>
        </>
      </RoleGuard>
    );
  }

  // Vista de chatbot
  if (activeView === 'chatbot') {
    return (
      <RoleGuard allowedRoles={['super_admin']} fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p></div>}>
        <>
          <FloatingViewAs />
          <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
            <AppHeader>
              <NavigationButtons current="chatbot" />
            </AppHeader>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-3xl font-bold text-primary mb-6">Configuración del Chatbot</h1>
              <ChatbotSettings />
            </div>
          </div>
        </>
      </RoleGuard>
    );
  }

  // Vista de configuración
  if (activeView === 'settings') {
    return (
      <RoleGuard allowedRoles={['super_admin']} fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p></div>}>
        <>
          <FloatingViewAs />
          <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
            <AppHeader>
              <NavigationButtons current="settings" />
            </AppHeader>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <SettingsPage />
            </div>
          </div>
        </>
      </RoleGuard>
    );
  }

  // Vista del dashboard
  if (activeView === 'dashboard') {
    const formStats = {
      total: forms.length,
      published: forms.length,
      draft: 0,
    };
    const submissionStats = getSubmissionStats();

    return (
      <>
        <FloatingViewAs />
        <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
          <AppHeader>
            <NavigationButtons current="dashboard" />
          </AppHeader>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Dashboard
              forms={forms}
              submissions={submissions}
              clients={filteredClients}
              formStats={formStats}
              submissionStats={{
                total: submissionStats.total,
                pending: submissionStats.pending,
                reviewed: submissionStats.in_progress,
                completed: submissionStats.completed,
              }}
              clientStats={filteredClientStats}
            />
          </div>
        </div>
      </>
    );
  }

  // Vista de formularios con navegación
  return (
    <>
      <FloatingViewAs />
      <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
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
    </>
  );
};

export default Index;
