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
import { Client } from '@/types/form';
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

const parseInitialClientNavigation = (): { initialView: View; initialClientId: string | null } => {
  if (typeof window === 'undefined') {
    return { initialView: 'dashboard', initialClientId: null };
  }

  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  const clientIdParam = params.get('clientId');

  if (viewParam === 'clients') {
    return { initialView: 'clients', initialClientId: clientIdParam };
  }

  return { initialView: 'dashboard', initialClientId: null };
};

const Index = () => {
  const initialNavigation = useMemo(parseInitialClientNavigation, []);
  const [activeView, setActiveView] = useState<View>(initialNavigation.initialView);
  const [viewingAs, setViewingAs] = useState<User | null>(null);
  const [editorHasUnsavedChanges, setEditorHasUnsavedChanges] = useState(false);
  
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
    visaStatusTemplates,
    pagination: clientPagination,
    fetchClients,
    createClient: createClientStore,
    updateClient: updateClientStore,
    deleteClient: deleteClientStore,
    getClientStats,
  } = useClientStore();
  const {
    groups,
    fetchGroups,
    createGroup: createGroupStore,
    updateGroup: updateGroupStore,
    deleteGroup: deleteGroupStore,
  } = useGroupStore();
  const {
    products,
    isLoading: productsLoading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    replaceProducts,
  } = useProductStore();
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
    tripFinanceSummary,
    tripIncomes,
    tripExpenses,
    fetchTripFinance,
    createTripIncome,
    deleteTripIncome,
    createTripExpense,
    deleteTripExpense,
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
  const [clientListQuery, setClientListQuery] = useState<{
    q?: string;
    visaStatusTemplateId?: string;
    checklistTemplateId?: string;
    productId?: string;
    page: number;
    limit: number;
  }>({ page: 1, limit: 20 });
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();

  const areClientQueriesEqual = (
    a: { q?: string; visaStatusTemplateId?: string; checklistTemplateId?: string; productId?: string; page: number; limit: number },
    b: { q?: string; visaStatusTemplateId?: string; checklistTemplateId?: string; productId?: string; page: number; limit: number }
  ) =>
    a.q === b.q &&
    a.visaStatusTemplateId === b.visaStatusTemplateId &&
    a.checklistTemplateId === b.checklistTemplateId &&
    a.productId === b.productId &&
    a.page === b.page &&
    a.limit === b.limit;

  useEffect(() => {
    // When leaving the editor (or when it isn't mounted), reset the flag.
    if (!currentForm) setEditorHasUnsavedChanges(false);
  }, [currentForm]);

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
        fetchClients(token, clientListQuery).catch((error) => {
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
      fetchClients(token, clientListQuery).catch((error) => {
        console.error('Failed to fetch clients:', error);
      });
      fetchProducts(token).catch((error) => {
        console.error('Failed to fetch products:', error);
      });
      if (hasRole('super_admin')) {
        fetchUsers(token).catch((error) => {
          console.error('Failed to fetch users:', error);
        });
      }
    }
  }, [activeView, token, clientListQuery]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const normalize = (s?: string | null) => (s || '').trim().toLowerCase();
    const approved = filteredClients.filter(c => normalize(c.visaStatusTemplate?.label).includes('aprob')).length;
    const denied = filteredClients.filter(c => normalize(c.visaStatusTemplate?.label).includes('negad')).length;
    const inProcess = filteredClients.filter(c => {
      const label = normalize(c.visaStatusTemplate?.label);
      return !label.includes('aprob') && !label.includes('negad');
    }).length;
    return {
      total: filteredClients.length,
      active: approved,
      inactive: denied,
      pending: inProcess,
    };
  }, [filteredClients]);

  const handleClientFiltersChange = useCallback((filters: {
    q?: string;
    visaStatusTemplateId?: string;
    checklistTemplateId?: string;
    productId?: string;
  }) => {
    setClientListQuery((prev) => {
      const next = { ...prev, ...filters, page: 1 };
      return areClientQueriesEqual(prev, next) ? prev : next;
    });
  }, []);

  const handleClientPageChange = useCallback((page: number) => {
    setClientListQuery((prev) => {
      const next = { ...prev, page };
      return areClientQueriesEqual(prev, next) ? prev : next;
    });
  }, []);

  const handleNavigate = useCallback(
    async (next: View) => {
      // If we're editing a form, the editor view "wins" over activeView in the render tree.
      // Clear currentForm first so the navbar navigation actually takes effect.
      if (currentForm && next !== 'forms') {
        if (editorHasUnsavedChanges) {
          const confirmed = window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?');
          if (!confirmed) return;
        }

        await selectForm(null);
        if (token) {
          // Refresh the forms list after leaving the editor.
          await fetchForms();
        }
      }

      setActiveView(next);
    },
    [currentForm, editorHasUnsavedChanges, selectForm, token, fetchForms]
  );

  const NavigationButtons = ({ current }: { current: View }) => (
    <>
      <Button
        variant={current === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleNavigate('dashboard')}
        className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
      >
        <LayoutDashboard className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Dashboard</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={['clients', 'groups'].includes(current) ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Clientes</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => handleNavigate('clients')} className="gap-2 cursor-pointer">
            <Users className="w-4 h-4" />
            Clientes
            {filteredClients.length > 0 && (
              <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
                {filteredClients.length}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigate('groups')} className="gap-2 cursor-pointer">
            <UsersRound className="w-4 h-4" />
            Familias
            {groups.length > 0 && (
              <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-secondary/20 text-secondary">
                {groups.length}
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {hasRole('super_admin') && (
        <Button
          variant={current === 'trips' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleNavigate('trips')}
          className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
        >
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Viajes</span>
        </Button>
      )}
      <Button
        variant={current === 'forms' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleNavigate('forms')}
        className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Formularios</span>
      </Button>
      <Button
        variant={current === 'products' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleNavigate('products')}
        className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
      >
        <ShoppingBag className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Productos</span>
      </Button>
      <RoleGuard allowedRoles={['super_admin']}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={['paymentLogs', 'users', 'chatbot', 'settings'].includes(current) ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Administración</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => handleNavigate('paymentLogs')} className="gap-2 cursor-pointer">
              <Receipt className="w-4 h-4" />
              Logs de pagos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate('users')} className="gap-2 cursor-pointer">
              <UserCog className="w-4 h-4" />
              Usuarios
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate('chatbot')} className="gap-2 cursor-pointer">
              <Bot className="w-4 h-4" />
              Chatbot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate('settings')} className="gap-2 cursor-pointer">
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
      <>
        <FloatingViewAs />
        <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
          <AppHeader>
            <NavigationButtons current="forms" />
          </AppHeader>
          <FormEditor
            form={currentForm}
            onBack={async () => {
              await selectForm(null);
              // Reload forms after editing
              if (token) {
                await fetchForms();
              }
            }}
            onUnsavedChangesChange={setEditorHasUnsavedChanges}
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
        </div>
      </>
    );
  }

  // Vista de clientes
  if (activeView === 'clients') {
    return (
      <>
        <FloatingViewAs />
        <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
          <AppHeader>
            <NavigationButtons current="clients" />
          </AppHeader>
          <ClientList
            clients={filteredClients}
            products={products}
            visaStatusTemplates={visaStatusTemplates}
            stats={filteredClientStats}
            initialClientId={initialNavigation.initialClientId}
            onDelete={deleteClient}
            onCreate={async (data) => { await createClient(data); }}
            onUpdate={async (id, data) => { await updateClient(id, data); }}
            users={users}
            isAdmin={hasRole('super_admin')}
            pagination={clientPagination}
            initialQuery={clientListQuery}
            onFiltersChange={handleClientFiltersChange}
            onPageChange={handleClientPageChange}
          />
        </div>
      </>
    );
  }

  // Vista de productos (visas)
  if (activeView === 'products') {
    const mapApiProductsToUi = (list: any[]): Product[] => {
      return (Array.isArray(list) ? list : []).map((p: any) => ({
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
      }));
    };

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
        replaceProducts(mapApiProductsToUi(filtered));
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-4">
            <div className="space-y-3">
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
              <div className="flex items-center justify-between gap-3">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryManagerOpen(true)}
                >
                  Gestionar categorías
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
              const deleting = categories.find((c) => c.id === id);
              const deletedKey = deleting?.key;

              const affectsActiveFilter = deletedKey
                ? selectedFilterCategories.includes(deletedKey)
                : false;
              const nextSelectedFilterCategories = affectsActiveFilter && deletedKey
                ? selectedFilterCategories.filter((k) => k !== deletedKey)
                : selectedFilterCategories;

              try {
                await deleteCategory(token, id);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Error al eliminar categoría');
                return;
              }

              if (affectsActiveFilter) {
                setSelectedFilterCategories(nextSelectedFilterCategories);
                if (nextSelectedFilterCategories.length === 0) {
                  await fetchProducts(token);
                } else {
                  const filtered = await api.getProductsByCategories(nextSelectedFilterCategories, token);
                  replaceProducts(mapApiProductsToUi(filtered));
                }
              }
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
        <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
          <AppHeader>
            <NavigationButtons current="groups" />
          </AppHeader>
          <GroupList
            groups={groups}
            availableClients={filteredClients}
            onCreate={async (data) => { await createGroup(data); }}
            onUpdate={async (id, data) => { await updateGroup(id, data); }}
            onDelete={deleteGroup}
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
        <div className={`min-h-screen bg-background ${viewingAs ? 'pt-10' : ''}`}>
          <AppHeader>
            <NavigationButtons current="trips" />
          </AppHeader>
          <TripList
            trips={trips}
            invitations={invitations}
            availableClients={filteredClients}
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
            onLoadTripFinance={(tripId) => { fetchTripFinance(tripId, token!); }}
            onCreateTripIncome={async (tripId, data) => { await createTripIncome(tripId, data, token!); await fetchTrip(tripId, token!); }}
            onDeleteTripIncome={async (tripId, incomeId) => { await deleteTripIncome(tripId, incomeId, token!); await fetchTrip(tripId, token!); }}
            onCreateTripExpense={async (tripId, data) => { await createTripExpense(tripId, data, token!); }}
            onDeleteTripExpense={async (tripId, expenseId) => { await deleteTripExpense(tripId, expenseId, token!); }}
            financeSummary={tripFinanceSummary}
            tripIncomes={tripIncomes}
            tripExpenses={tripExpenses}
            onFetchTrip={(tripId) => { fetchTrip(tripId, token!); }}
            busTemplates={busTemplates}
            onCreateBusTemplate={async (data) => { await createBusTemplateStore(token!, data); }}
            onUpdateBusTemplate={async (id, data) => { await updateBusTemplateStore(token!, id, data); }}
            onDeleteBusTemplate={async (id) => { await deleteBusTemplateStore(token!, id); }}
            changeLog={changeLog}
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
