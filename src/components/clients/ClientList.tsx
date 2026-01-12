import { useState } from 'react';
import { Client, ClientStatus } from '@/types/form';
import { ClientCard } from './ClientCard';
import { ClientFormModal } from './ClientFormModal';
import { ClientProfileView } from './ClientProfileView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, UserCheck, UserX, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ClientListProps {
  clients: Client[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
  };
  onUpdateStatus: (clientId: string, status: ClientStatus) => void;
  onDelete: (clientId: string) => void;
  onCreate: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => void;
  onUpdate: (clientId: string, updates: Partial<Client>) => void;
  onBack: () => void;
}

type FilterType = 'all' | ClientStatus;

export const ClientList = ({
  clients,
  stats,
  onUpdateStatus,
  onDelete,
  onCreate,
  onUpdate,
  onBack,
}: ClientListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.includes(searchQuery));
    
    const matchesFilter = activeFilter === 'all' || client.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (clientId: string) => {
    onDelete(clientId);
    toast.success('Cliente eliminado');
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

  const handleCreateOrUpdate = (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    if (editingClient) {
      onUpdate(editingClient.id, clientData);
      toast.success('Cliente actualizado');
    } else {
      onCreate(clientData);
      toast.success('Cliente creado');
    }
    setEditingClient(null);
  };

  const handleOpenNewClient = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const filterButtons: { key: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Todos', icon: <Users className="w-4 h-4" />, count: stats.total },
    { key: 'active', label: 'Activos', icon: <UserCheck className="w-4 h-4" />, count: stats.active },
    { key: 'pending', label: 'Pendientes', icon: <Clock className="w-4 h-4" />, count: stats.pending },
    { key: 'inactive', label: 'Inactivos', icon: <UserX className="w-4 h-4" />, count: stats.inactive },
  ];

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
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              ← Volver a formularios
            </Button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              {searchQuery || activeFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'Comienza agregando tu primer cliente'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
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
