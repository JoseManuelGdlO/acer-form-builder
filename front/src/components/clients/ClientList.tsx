import { useState, useMemo, useEffect, useRef } from 'react';
import { Client } from '@/types/form';
import { User } from '@/types/user';
import { Product } from '@/types/product';
import { VisaStatusTemplate } from '@/types/settings';
import { ClientCard } from './ClientCard';
import { ClientFormModal } from './ClientFormModal';
import { ClientProfileView } from './ClientProfileView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Users, Plus, CheckCircle2, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { useClientStore } from '@/hooks/useClientStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';

interface ClientListProps {
  clients: Client[];
  products?: Product[];
  visaStatusTemplates?: VisaStatusTemplate[];
  stats: {
    total: number;
  };
  onDelete: (clientId: string) => Promise<void>;
  onCreate: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => Promise<void>;
  onUpdate: (clientId: string, updates: Partial<Client>) => Promise<void>;
  initialClientId?: string | null;
  users?: User[];
  isAdmin?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  initialQuery?: {
    q?: string;
    visaStatusTemplateId?: string;
    checklistTemplateId?: string;
    productId?: string;
  };
  onFiltersChange: (filters: {
    q?: string;
    visaStatusTemplateId?: string;
    checklistTemplateId?: string;
    productId?: string;
  }) => void;
  onPageChange: (page: number) => void;
}

type ChecklistFilterType = 'all' | string; // 'all' or templateId
type ProductFilterType = 'all' | string;
type VisaStatusFilterType = 'all' | string;

export const ClientList = ({
  clients,
  products = [],
  visaStatusTemplates = [],
  stats,
  onDelete,
  onCreate,
  onUpdate,
  initialClientId = null,
  users = [],
  isAdmin = false,
  pagination,
  initialQuery,
  onFiltersChange,
  onPageChange,
}: ClientListProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery?.q || '');
  const [visaStatusFilter, setVisaStatusFilter] = useState<VisaStatusFilterType>(initialQuery?.visaStatusTemplateId || 'all');
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilterType>(initialQuery?.checklistTemplateId || 'all');
  const [productFilter, setProductFilter] = useState<ProductFilterType>(initialQuery?.productId || 'all');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [defaultParentClientId, setDefaultParentClientId] = useState<string | null>(null);
  const hasAutoOpenedInitialClient = useRef(false);
  
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

  useEffect(() => {
    if (hasAutoOpenedInitialClient.current) return;
    if (!initialClientId) return;
    if (clients.length === 0) return;

    const targetClient = clients.find((client) => client.id === initialClientId);
    if (!targetClient) return;

    setViewingClient(targetClient);
    hasAutoOpenedInitialClient.current = true;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('view');
      params.delete('clientId');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [clients, initialClientId]);

  useEffect(() => {
    if (!viewingClient) return;
    const latest = clients.find((c) => c.id === viewingClient.id);
    if (!latest) return;
    if (latest !== viewingClient) {
      setViewingClient(latest);
    }
  }, [clients, viewingClient]);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onFiltersChange({
        q: searchQuery.trim() || undefined,
        visaStatusTemplateId: visaStatusFilter === 'all' ? undefined : visaStatusFilter,
        checklistTemplateId: checklistFilter === 'all' ? undefined : checklistFilter,
        productId: productFilter === 'all' ? undefined : productFilter,
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, visaStatusFilter, checklistFilter, productFilter, onFiltersChange]);

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

  const handleBackFromProfile = () => {
    if (viewingClient?.parentClientId) {
      const parentClient = clients.find((c) => c.id === viewingClient.parentClientId);
      if (parentClient) {
        setViewingClient(parentClient);
        return;
      }
    }
    setViewingClient(null);
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
    setDefaultParentClientId(null);
    setIsFormOpen(true);
  };

  const handleCreateChildFromProfile = () => {
    if (!viewingClient) return;
    setEditingClient(null);
    setDefaultParentClientId(viewingClient.id);
    setIsFormOpen(true);
  };

  const visaStatusFilterButtons = useMemo(() => {
    const buttons: { key: VisaStatusFilterType; label: string; icon: React.ReactNode; count: number }[] = [
      { key: 'all', label: 'Todos', icon: <Users className="w-4 h-4" />, count: stats.total },
    ];
    visaStatusTemplates.forEach((template) => {
      const count = clients.filter((client) => client.visaStatusTemplateId === template.id).length;
      buttons.push({
        key: template.id,
        label: template.label,
        icon: (
          <CheckCircle2
            className="w-4 h-4"
            style={template.color ? { color: template.color } : undefined}
          />
        ),
        count,
      });
    });
    return buttons;
  }, [clients, stats.total, visaStatusTemplates]);

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

  const productFilterButtons = useMemo(() => {
    const buttons: { key: ProductFilterType; label: string; icon: React.ReactNode; count: number }[] = [
      { key: 'all', label: 'Todos', icon: <Users className="w-4 h-4" />, count: stats.total },
    ];

    products.forEach((product) => {
      const count = clients.filter((client) => client.productId === product.id).length;
      buttons.push({
        key: product.id,
        label: product.title,
        icon: <CheckCircle2 className="w-4 h-4" />,
        count,
      });
    });

    return buttons;
  }, [products, clients, stats.total]);

  const hasActiveFilters = useMemo(() => {
    return (
      visaStatusFilter !== 'all' ||
      checklistFilter !== 'all' ||
      productFilter !== 'all'
    );
  }, [visaStatusFilter, checklistFilter, productFilter]);

  const clearFilters = () => {
    setVisaStatusFilter('all');
    setChecklistFilter('all');
    setProductFilter('all');
  };

  // Show profile view if a client is selected
  if (viewingClient) {
    return (
      <>
        <ClientProfileView
          client={viewingClient}
          onBack={handleBackFromProfile}
          onEdit={handleEditFromProfile}
          onCreateChild={handleCreateChildFromProfile}
          onOpenClient={(clientId) => {
            const nextClient = clients.find((c) => c.id === clientId);
            if (nextClient) setViewingClient(nextClient);
          }}
        />
        <ClientFormModal
          client={editingClient}
          availableClients={clients}
          hideParentSelector={!editingClient}
          products={products}
          visaStatusTemplates={visaStatusTemplates}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingClient(null);
              setDefaultParentClientId(null);
            }
          }}
          defaultParentClientId={defaultParentClientId}
          onSave={async (data) => {
            if (editingClient) {
              await onUpdate(editingClient.id, data);
              // Update the viewing client with new data
              setViewingClient({ ...viewingClient, ...data, updatedAt: new Date() });
              toast.success('Cliente actualizado');
            } else {
              await onCreate({
                ...data,
                parentClientId: defaultParentClientId ?? data.parentClientId ?? null,
              });
              toast.success('Cliente creado');
            }
            setEditingClient(null);
            setDefaultParentClientId(null);
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsFiltersModalOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              className="gap-2"
              onClick={clearFilters}
            >
              <X className="w-4 h-4" />
              Quitar filtros
            </Button>
          )}
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
        {clients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No hay clientes
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || visaStatusFilter !== 'all' || checklistFilter !== 'all' || productFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'Comienza agregando tu primer cliente'}
            </p>
            {!searchQuery && visaStatusFilter === 'all' && checklistFilter === 'all' && productFilter === 'all' && (
              <Button onClick={handleOpenNewClient} className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar Cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
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

        {pagination.totalPages > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Pagina {pagination.page} de {pagination.totalPages} - {pagination.total} clientes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        <ClientFormModal
          client={editingClient}
          availableClients={clients}
          hideParentSelector={!editingClient}
          products={products}
          visaStatusTemplates={visaStatusTemplates}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setDefaultParentClientId(null);
            }
          }}
          defaultParentClientId={defaultParentClientId}
          onSave={handleCreateOrUpdate}
        />

        <Dialog open={isFiltersModalOpen} onOpenChange={setIsFiltersModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros de clientes</DialogTitle>
              <DialogDescription>
                Selecciona los filtros para acotar la lista de clientes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">Filtro por Estado de Visa</h3>
                <div className="flex flex-wrap gap-2">
                  {visaStatusFilterButtons.map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setVisaStatusFilter(filter.key)}
                      className={`px-3 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                        visaStatusFilter === filter.key
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

              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">Filtro por Producto Adquirido</h3>
                <div className="flex flex-wrap gap-2">
                  {productFilterButtons.map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setProductFilter(filter.key)}
                      className={`px-3 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                        productFilter === filter.key
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
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Quitar filtros
                </Button>
              )}
              <Button onClick={() => setIsFiltersModalOpen(false)}>
                Listo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
