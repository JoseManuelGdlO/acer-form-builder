import { useState, useMemo, useEffect } from 'react';
import { Client, ClientStatus } from '@/types/form';
import { User } from '@/types/user';
import { ClientCard } from './ClientCard';
import { ClientFormModal } from './ClientFormModal';
import { ClientProfileView } from './ClientProfileView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, UserCheck, UserX, Clock, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useClientStore } from '@/hooks/useClientStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';

interface ClientListProps {
  clients: Client[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
  };
  onUpdateStatus: (clientId: string, status: ClientStatus) => Promise<void>;
  onDelete: (clientId: string) => Promise<void>;
  onCreate: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => Promise<void>;
  onUpdate: (clientId: string, updates: Partial<Client>) => Promise<void>;
  users?: User[];
  isAdmin?: boolean;
}

type StatusFilterType = 'all' | ClientStatus;
type ChecklistFilterType = 'all' | string; // 'all' or templateId

export const ClientList = ({
  clients,
  stats,
  onUpdateStatus,
  onDelete,
  onCreate,
  onUpdate,
  users = [],
  isAdmin = false,
}: ClientListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilterType>('all');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const { checklistTemplates: clientStoreTemplates } = useClientStore();
  const { checklistTemplates: settingsTemplates, fetchChecklistTemplates } = useSettingsStore();
  const { token } = useAuth();

  // Use templates from client store if available, otherwise from settings store
  // Filter only active templates and remove duplicates
  const checklistTemplates = useMemo(() => {
    let templates = clientStoreTemplates.length > 0 ? clientStoreTemplates : settingsTemplates;
    
    // Filter active templates and remove duplicates by id
    const uniqueTemplates = templates
      .filter(t => t.isActive)
      .filter((template, index, self) => 
        index === self.findIndex(t => t.id === template.id)
      );
    
    return uniqueTemplates.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [clientStoreTemplates, settingsTemplates]);

  // Load templates from settings if not available in client store
  useEffect(() => {
    if (token && checklistTemplates.length === 0 && settingsTemplates.length === 0) {
      fetchChecklistTemplates(token).catch((error) => {
        console.error('Failed to fetch checklist templates:', error);
      });
    }
  }, [token, checklistTemplates.length, settingsTemplates.length, fetchChecklistTemplates]);

  // Calculate checklist stats for each template
  // Count clients by their LAST completed checklist item
  const checklistStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    // Initialize all templates with 0
    checklistTemplates.forEach(template => {
      stats[template.id] = 0;
    });
    
    // For each client, find their last completed checklist item
    clients.forEach(client => {
      if (!client.checklistByTemplate) return;
      
      // Get all completed templates for this client, sorted by order
      const completedTemplates = checklistTemplates
        .filter(template => {
          const templateChecklist = client.checklistByTemplate?.[template.id];
          return templateChecklist?.completed === true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // If client has completed templates, count only the last one
      if (completedTemplates.length > 0) {
        const lastCompletedTemplate = completedTemplates[completedTemplates.length - 1];
        stats[lastCompletedTemplate.id] = (stats[lastCompletedTemplate.id] || 0) + 1;
      }
    });
    
    return stats;
  }, [clients, checklistTemplates]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.phone && client.phone.includes(searchQuery));
      
      const matchesStatusFilter = statusFilter === 'all' || client.status === statusFilter;
      
      // For checklist filter, check if client's LAST completed template matches
      let matchesChecklistFilter = true;
      if (checklistFilter !== 'all') {
        if (!client.checklistByTemplate) {
          matchesChecklistFilter = false;
        } else {
          // Get all completed templates for this client, sorted by order
          const completedTemplates = checklistTemplates
            .filter(template => {
              const templateChecklist = client.checklistByTemplate?.[template.id];
              return templateChecklist?.completed === true;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Check if the last completed template matches the filter
          if (completedTemplates.length > 0) {
            const lastCompletedTemplate = completedTemplates[completedTemplates.length - 1];
            matchesChecklistFilter = lastCompletedTemplate.id === checklistFilter;
          } else {
            // If no completed templates, only show if filter is 'all'
            matchesChecklistFilter = false;
          }
        }
      }
      
      return matchesSearch && matchesStatusFilter && matchesChecklistFilter;
    });
  }, [clients, searchQuery, statusFilter, checklistFilter, checklistTemplates]);

  const handleDelete = async (clientId: string) => {
    try {
      await onDelete(clientId);
      toast.success('Cliente eliminado');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el cliente');
    }
  };

  const handleViewClient = (client: Client) => {
    setViewingClient(client);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleEditFromProfile = () => {
    if (viewingClient) {
      setEditingClient(viewingClient);
      setIsFormOpen(true);
    }
  };

  const handleCreateOrUpdate = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    try {
      if (editingClient) {
        await onUpdate(editingClient.id, clientData);
        toast.success('Cliente actualizado');
      } else {
        await onCreate(clientData);
        toast.success('Cliente creado');
      }
      setEditingClient(null);
    } catch (error: any) {
      // Error is handled in ClientFormModal, just log here
      console.error('Error in handleCreateOrUpdate:', error);
    }
  };

  const handleOpenNewClient = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const statusFilterButtons: { key: StatusFilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Todos', icon: <Users className="w-4 h-4" />, count: stats.total },
    { key: 'active', label: 'Activos', icon: <UserCheck className="w-4 h-4" />, count: stats.active },
    { key: 'pending', label: 'Pendientes', icon: <Clock className="w-4 h-4" />, count: stats.pending },
    { key: 'inactive', label: 'Inactivos', icon: <UserX className="w-4 h-4" />, count: stats.inactive },
  ];

  const checklistFilterButtons = useMemo(() => {
    const buttons: { key: ChecklistFilterType; label: string; icon: React.ReactNode; count: number; color: string }[] = [
      { key: 'all', label: 'Todos', icon: <Users className="w-4 h-4" />, count: stats.total, color: '' },
    ];
    
    // Add a button for each active checklist template
    // Filter out duplicates by id
    const uniqueTemplates = checklistTemplates.filter((template, index, self) => 
      index === self.findIndex(t => t.id === template.id)
    );
    
    uniqueTemplates.forEach(template => {
      const count = checklistStats[template.id] || 0;
      
      buttons.push({
        key: template.id,
        label: template.label,
        icon: <CheckCircle2 className="w-4 h-4" />,
        count: count,
        color: 'text-primary',
      });
    });
    
    return buttons;
  }, [checklistTemplates, checklistStats, stats.total]);

  // Show profile view if a client is selected
  if (viewingClient) {
    return (
      <>
        <ClientProfileView
          client={viewingClient}
          onBack={() => setViewingClient(null)}
          onEdit={handleEditFromProfile}
        />
        <ClientFormModal
          client={editingClient}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingClient(null);
          }}
          onSave={(data) => {
            if (editingClient) {
              onUpdate(editingClient.id, data);
              // Update the viewing client with new data
              setViewingClient({ ...viewingClient, ...data, updatedAt: new Date() });
              toast.success('Cliente actualizado');
            }
            setEditingClient(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu base de clientes
            </p>
          </div>
          <Button onClick={handleOpenNewClient} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Status Filter Cards */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Filtro por Estado</h3>
          <div className="flex flex-wrap gap-2">
            {statusFilterButtons.map(filter => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-3 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                  statusFilter === filter.key
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                }`}
              >
                {filter.icon}
                <span className="text-sm font-medium">{filter.label}</span>
                <span className="text-sm font-bold text-primary">({filter.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Checklist Filter Cards */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Filtro por Último Checklist Completado</h3>
          <div className="flex flex-wrap gap-2">
            {checklistFilterButtons.map(filter => (
              <button
                key={filter.key}
                onClick={() => setChecklistFilter(filter.key)}
                className={`px-3 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                  checklistFilter === filter.key
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                }`}
              >
                {filter.icon}
                <span className="text-sm font-medium">{filter.label}</span>
                <span className="text-sm font-bold text-primary">({filter.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No hay clientes
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || checklistFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'Comienza agregando tu primer cliente'}
            </p>
            {!searchQuery && statusFilter === 'all' && checklistFilter === 'all' && (
              <Button onClick={handleOpenNewClient} className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar Cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onUpdateStatus={status => onUpdateStatus(client.id, status)}
                onDelete={() => handleDelete(client.id)}
                onView={() => handleViewClient(client)}
                onEdit={() => handleEditClient(client)}
                onUpdate={onUpdate}
                users={users}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        <ClientFormModal
          client={editingClient}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleCreateOrUpdate}
        />
      </div>
    </div>
  );
};
