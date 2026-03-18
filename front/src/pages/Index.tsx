import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { useGroupStore } from '@/hooks/useGroupStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useTripStore } from '@/hooks/useTripStore';
import { useBusTemplateStore } from '@/hooks/useBusTemplateStore';
import { useUserStore } from '@/hooks/useUserStore';
import { useAuth } from '@/contexts/AuthContext';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';
import { ClientList } from '@/components/clients/ClientList';
import { GroupList } from '@/components/groups/GroupList';
import { TripList } from '@/components/trips/TripList';
import { UserList } from '@/components/users/UserList';
import { ChatbotSettings } from '@/components/chatbot/ChatbotSettings';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { PaymentLogsPage } from '@/components/payments/PaymentLogsPage';
import { ProductsList } from '@/components/products/ProductsList';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { CategoryManagerModal } from '@/components/products/CategoryManagerModal';
import { useCategoryStore } from '@/hooks/useCategoryStore';
import type { Category } from '@/types/category';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ViewAsSelector } from '@/components/admin/ViewAsSelector';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, FileText, Users, UsersRound, UserCog, Bot, Settings, Receipt, ChevronDown, ShoppingBag, MapPin } from 'lucide-react';
import { User } from '@/types/user';
import { Client, ClientStatus } from '@/types/form';
import { Product } from '@/types/product';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type View =
  | 'dashboard'
  | 'forms'
  | 'clients'
  | 'products'
  | 'paymentLogs'
  | 'groups'
  | 'trips'
  | 'users'
  | 'chatbot'
  | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [viewingAs, setViewingAs] = useState<User | null>(null);
  
  const {
    forms,
    currentForm,
    isLoading: formsLoading,
    fetchForms,
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

  const { submissions, fetchSubmissions, getSubmissionStats } = useSubmissionStore();

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
  const {
    groups,
    fetchGroups,
    createGroup: createGroupStore,
    updateGroup: updateGroupStore,
    deleteGroup: deleteGroupStore,
  } = useGroupStore();
  const { products, isLoading: productsLoading, fetchProducts, createProduct, updateProduct, deleteProduct } =
    useProductStore();
  const {
    trips,
    invitations,
    changeLog,
    fetchTrips,
    fetchTrip,
    fetchInvitations,
    fetchChangeLog,
    acceptInvitation,
    rejectInvitation,
    createTrip,
    updateTrip,
    deleteTrip,
    addParticipants,
    removeParticipant,
    setSeatAssignment,
    clearSeatAssignment,
    resetSeatAssignments,
  } = useTripStore();
  const {
    templates: busTemplates,
    fetchTemplates: fetchBusTemplates,
    createTemplate: createBusTemplateStore,
    updateTemplate: updateBusTemplateStore,
    deleteTemplate: deleteBusTemplateStore,
  } = useBusTemplateStore();
  const [companiesForTripShare, setCompaniesForTripShare] = useState<{ id: string; name: string }[]>([]);
  const { token, hasRole } = useAuth();
  const { users, fetchUsers } = useUserStore();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [selectedFilterCategories, setSelectedFilterCategories] = useState<string[]>([]);
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();

  const normalizeCategoryKey = (input: string): string | null => {
    const v = String(input || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');

    if (v === 'VIAJE_SOLO' || v === 'VIAJA_POR_TU_CUENTA' || v === 'VIAJA_POR_SU_CUENTA') return 'SOLO';
    if (v === 'VIAJE_SARUVISAS' || v === 'VIAJA_CON_SARUVISAS') return 'CON_SARUVISAS';

    return v;
  };

  const handleLoadTripChangeLog = useCallback(
    (tripId: string) => {
      if (token) fetchChangeLog(tripId, token);
    },
    [fetchChangeLog, token]
  );

  // Load data when component mounts or when token changes
  useEffect(() => {
    if (token) {
      // Load forms
      if (forms.length === 0) {
        fetchForms().catch((error) => {
          console.error('Failed to fetch forms:', error);
        });
      }
      
      // Load submissions
      if (submissions.length === 0) {
        fetchSubmissions().catch((error) => {
          console.error('Failed to fetch submissions:', error);
        });
      }
      
      // Load clients
      if (clients.length === 0) {
        fetchClients(token).catch((error) => {
          console.error('Failed to fetch clients:', error);
        });
      }

      // Load products (visas)
      if (products.length === 0) {
        fetchProducts(token).catch((error) => {
          console.error('Failed to fetch products:', error);
        });
      }
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load clients (and users for admin assign dropdown) when switching to clients view
  useEffect(() => {
    if (token && activeView === 'clients') {
      fetchClients(token).catch((error) => {
        console.error('Failed to fetch clients:', error);
      });
      if (hasRole('super_admin')) {
        fetchUsers(token).catch((error) => {
          console.error('Failed to fetch users:', error);
        });
      }
    }
  }, [activeView, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load products & categories when switching to products view
  useEffect(() => {
    if (token && activeView === 'products') {
      fetchProducts(token).catch((error) => {
        console.error('Failed to fetch products:', error);
      });
      fetchCategories(token).catch((error) => {
        console.error('Failed to fetch categories:', error);
      });
    }
  }, [activeView, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load groups when switching to groups view
  useEffect(() => {
    if (token && activeView === 'groups') {
      fetchGroups(token).catch((error) => {
        console.error('Failed to fetch groups:', error);
      });
    }
  }, [activeView, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load trips, invitations, companies, groups and bus templates when switching to trips view (super_admin only)
  useEffect(() => {
    if (token && activeView === 'trips' && hasRole('super_admin')) {
      fetchTrips(token).catch((error) => {
        console.error('Failed to fetch trips:', error);
      });
      fetchInvitations(token).catch((error) => {
        console.error('Failed to fetch invitations:', error);
      });
      fetchGroups(token).catch((error) => {
        console.error('Failed to fetch groups:', error);
      });
      fetchBusTemplates(token).catch((error) => {
        console.error('Failed to fetch bus templates:', error);
      });
      api.getCompaniesForTripShare(token).then((list) => {
        setCompaniesForTripShare(Array.isArray(list) ? list : []);
      }).catch(() => setCompaniesForTripShare([]));
    }
  }, [activeView, token, hasRole]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const createGroup = async (data: { title: string; clientIds?: string[] }) => {
    if (!token) throw new Error('No token available');
    return createGroupStore(token, data);
  };
  const updateGroup = async (groupId: string, data: { title?: string; clientIds?: string[] }) => {
    if (!token) throw new Error('No token available');
    return updateGroupStore(token, groupId, data);
  };
  const deleteGroup = async (groupId: string) => {
    if (!token) throw new Error('No token available');
    return deleteGroupStore(token, groupId);
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
        className="gap-1.5 shrink-0"
      >
        <LayoutDashboard className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Dashboard</span>
      </Button>
      <Button
        variant={current === 'forms' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('forms')}
        className="gap-1.5 shrink-0"
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Formularios</span>
      </Button>
      <Button
        variant={current === 'clients' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('clients')}
        className="gap-1.5 shrink-0"
      >
        <Users className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Clientes</span>
        {filteredClients.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
            {filteredClients.length}
          </span>
        )}
      </Button>
      <Button
        variant={current === 'products' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('products')}
        className="gap-1.5 shrink-0"
      >
        <ShoppingBag className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Productos</span>
      </Button>
      <Button
        variant={current === 'groups' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setActiveView('groups')}
        className="gap-2"
      >
        <UsersRound className="w-4 h-4" />
        <span className="hidden sm:inline">Grupos</span>
        {groups.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
            {groups.length}
          </span>
        )}
      </Button>
      {hasRole('super_admin') && (
        <Button
          variant={current === 'trips' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('trips')}
          className="gap-2"
        >
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">Viajes</span>
        </Button>
      )}
      <RoleGuard allowedRoles={['super_admin']}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={['paymentLogs', 'users', 'chatbot', 'settings'].includes(current) ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Administración</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setActiveView('paymentLogs')} className="gap-2 cursor-pointer">
              <Receipt className="w-4 h-4" />
              Logs de pagos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('users')} className="gap-2 cursor-pointer">
              <UserCog className="w-4 h-4" />
              Usuarios
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('chatbot')} className="gap-2 cursor-pointer">
              <Bot className="w-4 h-4" />
              Chatbot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('settings')} className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Configuración
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        onBack={async () => {
          await selectForm(null);
          // Reload forms after editing
          if (token) {
            await fetchForms();
          }
        }}
        onUpdateForm={async (updates) => {
          await updateForm(currentForm.id, updates);
        }}
        onAddSection={async () => {
          await addSection(currentForm.id);
        }}
        onUpdateSection={async (sectionId, updates) => {
          await updateSection(currentForm.id, sectionId, updates);
        }}
        onDeleteSection={async (sectionId) => {
          await deleteSection(currentForm.id, sectionId);
        }}
        onReorderSections={async (sections) => {
          await reorderSections(currentForm.id, sections);
        }}
        onAddQuestion={async (sectionId, type) => {
          await addQuestion(currentForm.id, sectionId, type);
        }}
        onUpdateQuestion={async (sectionId, questionId, updates) => {
          await updateQuestion(currentForm.id, sectionId, questionId, updates);
        }}
        onDeleteQuestion={async (sectionId, questionId) => {
          await deleteQuestion(currentForm.id, sectionId, questionId);
        }}
        onReorderQuestions={async (sectionId, questions) => {
          await reorderQuestions(currentForm.id, sectionId, questions);
        }}
      />
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
            onCreate={async (data) => { await createClient(data); }}
            onUpdate={async (id, data) => { await updateClient(id, data); }}
            onBack={() => setActiveView('dashboard')}
            users={users}
            isAdmin={hasRole('super_admin')}
          />
        </div>
      </>
    );
  }

  // Vista de productos (visas)
  if (activeView === 'products') {
    const handleCreate = () => {
      setEditingProduct(null);
      setProductModalOpen(true);
    };

    const handleEdit = (product: Product) => {
      setEditingProduct(product);
      setProductModalOpen(true);
    };

    const handleDelete = async (product: Product) => {
      if (!token) {
        throw new Error('No token available');
      }
      const confirmed = window.confirm(
        `¿Seguro que quieres eliminar el producto "${product.title}"?`
      );
      if (!confirmed) return;
      await deleteProduct(token, product.id);
    };

    const handleSubmit = async (data: {
      title: string;
      includes: string;
      price: number;
      description?: string;
      requirements?: string;
      categories?: string[];
      imageFile?: File | null;
    }) => {
      if (!token) {
        throw new Error('No token available');
      }
      try {
        if (editingProduct) {
          await updateProduct(token, editingProduct.id, data);
        } else {
          await createProduct(token, data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar el producto');
        throw err;
      }
    };

    const toggleFilterCategory = (key: string) => {
      setSelectedFilterCategories(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
    };

    const applyFilters = async () => {
      if (!token) return;
      if (selectedFilterCategories.length === 0) {
        await fetchProducts(token);
      } else {
        const filtered = await api.getProductsByCategories(selectedFilterCategories, token);
        const list = Array.isArray(filtered) ? filtered : [];
        setProducts(
          list.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? null,
            requirements: p.requirements ?? null,
            includes: p.includes,
            categories: Array.isArray(p.categories) ? p.categories : [],
            price: Number(p.price),
            imagePath: p.image_path || p.imagePath || null,
            createdAt: new Date(p.created_at || p.createdAt || Date.now()),
            updatedAt: new Date(p.updated_at || p.updatedAt || Date.now()),
          }))
        );
      }
    };

    const clearFilters = async () => {
      if (!token) return;
      setSelectedFilterCategories([]);
      await fetchProducts(token);
    };

    return (
      <>
        <FloatingViewAs />
        <div className={viewingAs ? 'pt-10' : ''}>
          <AppHeader>
            <NavigationButtons current="products" />
          </AppHeader>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryManagerOpen(true)}
            >
              Gestionar categorías
            </Button>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Filtrar por categoría:</span>
                {categories.map((cat: Category) => {
                  const active = selectedFilterCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleFilterCategory(cat.key)}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground hover:bg-accent'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={applyFilters}
                  disabled={!token}
                >
                  Aplicar filtros
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!token && selectedFilterCategories.length === 0}
                >
                  Quitar filtros
                </Button>
              </div>
            </div>
          </div>
          <ProductsList
            products={products}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            categoriesMap={categories.reduce<Record<string, Category>>((acc, cat) => {
              const normalizedKey = normalizeCategoryKey(cat.key);
              acc[cat.key] = cat;
              if (normalizedKey) {
                acc[normalizedKey] = cat;
              }
              return acc;
            }, {})}
          />
          <ProductFormModal
            open={productModalOpen}
            product={editingProduct}
            onClose={() => setProductModalOpen(false)}
            availableCategories={categories}
            onSubmit={handleSubmit}
          />
          <CategoryManagerModal
            open={categoryManagerOpen}
            categories={categories}
            onClose={() => setCategoryManagerOpen(false)}
            onCreate={async (data) => {
              if (!token) throw new Error('No token available');
              await createCategory(token, data);
            }}
            onUpdate={async (id, data) => {
              if (!token) throw new Error('No token available');
              await updateCategory(token, id, data);
            }}
            onDelete={async (id) => {
              if (!token) throw new Error('No token available');
              await deleteCategory(token, id);
            }}
          />
        </div>
      </>
    );
  }

  // Vista de logs de pagos (solo super_admin)
  if (activeView === 'paymentLogs') {
    return (
      <RoleGuard allowedRoles={['super_admin']} fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p></div>}>
        <>
          <FloatingViewAs />
          <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
            <AppHeader>
              <NavigationButtons current="paymentLogs" />
            </AppHeader>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-3xl font-bold text-primary mb-6">Logs de pagos</h1>
              <PaymentLogsPage />
            </div>
          </div>
        </>
      </RoleGuard>
    );
  }

  // Vista de grupos
  if (activeView === 'groups') {
    return (
      <>
        <FloatingViewAs />
        <div className={viewingAs ? 'pt-10' : ''}>
          <GroupList
            groups={groups}
            availableClients={filteredClients}
            onCreate={async (data) => { await createGroup(data); }}
            onUpdate={async (id, data) => { await updateGroup(id, data); }}
            onDelete={deleteGroup}
            onBack={() => setActiveView('dashboard')}
          />
        </div>
      </>
    );
  }

  // Vista de viajes (solo super_admin)
  if (activeView === 'trips') {
    if (!hasRole('super_admin')) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      );
    }
    return (
      <>
        <FloatingViewAs />
        <div className={viewingAs ? 'pt-10' : ''}>
          <TripList
            trips={trips}
            invitations={invitations}
            availableClients={filteredClients}
            availableGroups={groups}
            companiesForInvite={companiesForTripShare}
            onCreate={async (data) => {
              await createTrip(token!, data);
            }}
            onUpdate={async (tripId, data) => {
              await updateTrip(token!, tripId, {
                title: data.title,
                destination: data.destination,
                departureDate: data.departureDate,
                returnDate: data.returnDate,
                notes: data.notes,
                totalSeats: data.totalSeats,
                busTemplateId: (data as { busTemplateId?: string | null }).busTemplateId,
                invitedCompanyIds: (data as { invitedCompanyIds?: string[] }).invitedCompanyIds,
              });
              await fetchTrip(tripId, token!);
            }}
            onDelete={async (tripId) => { await deleteTrip(token!, tripId); }}
            onAddParticipants={async (tripId, payload) => { await addParticipants(token!, tripId, payload); await fetchTrip(tripId, token!); }}
            onRemoveParticipant={async (tripId, clientId) => { await removeParticipant(token!, tripId, clientId); await fetchTrip(tripId, token!); }}
            onAcceptInvitation={async (invitationId) => { await acceptInvitation(token!, invitationId); await fetchTrips(token!); await fetchInvitations(token!); }}
            onRejectInvitation={async (invitationId) => { await rejectInvitation(token!, invitationId); await fetchInvitations(token!); }}
            onResetSeatAssignments={async (tripId) => { await resetSeatAssignments(token!, tripId); await fetchTrip(tripId, token!); }}
            onSetSeatAssignment={async (tripId, clientId, seat) => { await setSeatAssignment(token!, tripId, clientId, seat); await fetchTrip(tripId, token!); }}
            onClearSeatAssignment={async (tripId, opts) => { await clearSeatAssignment(token!, tripId, opts); await fetchTrip(tripId, token!); }}
            onUpdateTemplateSeatLabel={async (tripId, templateId, seatId, label) => {
              const t = busTemplates.find((x) => x.id === templateId);
              if (!t?.layout?.floors) return;
              const newLayout = JSON.parse(JSON.stringify(t.layout)) as typeof t.layout;
              for (const floor of newLayout.floors ?? []) {
                for (const el of floor.elements ?? []) {
                  if (el.id === seatId) {
                    el.label = label;
                    break;
                  }
                }
              }
              await updateBusTemplateStore(token!, templateId, { layout: newLayout });
              await fetchTrip(tripId, token!);
            }}
            onLoadChangeLog={handleLoadTripChangeLog}
            onFetchTrip={(tripId) => { fetchTrip(tripId, token!); }}
            busTemplates={busTemplates}
            onCreateBusTemplate={async (data) => { await createBusTemplateStore(token!, data); }}
            onUpdateBusTemplate={async (id, data) => { await updateBusTemplateStore(token!, id, data); }}
            onDeleteBusTemplate={async (id) => { await deleteBusTemplateStore(token!, id); }}
            changeLog={changeLog}
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
          onSelectForm={async (formId) => {
            await selectForm(formId);
          }}
          onCreateForm={async (name, description) => {
            await createForm(name, description);
            // Reload forms after creation
            if (token) {
              await fetchForms();
            }
          }}
          onDeleteForm={async (formId) => {
            await deleteForm(formId);
            // Reload forms after deletion
            if (token) {
              await fetchForms();
            }
          }}
        />
      </div>
    </>
  );
};

export default Index;
