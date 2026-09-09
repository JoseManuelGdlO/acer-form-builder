import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { useFormStore } from '@/hooks/useFormStore';
import { useSubmissionStore } from '@/hooks/useSubmissionStore';
import { useClientStore } from '@/hooks/useClientStore';
import { useGroupStore } from '@/hooks/useGroupStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useHotelStore } from '@/hooks/useHotelStore';
import { useTripStore } from '@/hooks/useTripStore';
import { useStaffStore } from '@/hooks/useStaffStore';
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
import { CommissionsDashboard } from '@/components/commissions/CommissionsDashboard';
import { ProductsList } from '@/components/products/ProductsList';
import { HotelList } from '@/components/hotels/HotelList';
import { HotelFormModal, type HotelFormSaveData } from '@/components/hotels/HotelFormModal';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { CalendarPage } from '@/components/calendar/CalendarPage';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { CategoryManagerModal } from '@/components/products/CategoryManagerModal';
import { useCategoryStore } from '@/hooks/useCategoryStore';
import type { Category } from '@/types/category';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ViewAsSelector } from '@/components/admin/ViewAsSelector';
import { AppShell } from '@/components/layout/AppShell';
import type { AppHeaderCta } from '@/components/layout/AppHeader';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { type ShellView } from '@/auth/viewPermissions';
import { userSeesAllClients } from '@/auth/userPermissions';
import { RolesAdminPage } from '@/components/admin/RolesAdminPage';
import { Button } from '@/components/ui/button';
import { User } from '@/types/user';
import { Client, CalendarEvent } from '@/types/form';
import { Product } from '@/types/product';
import type { Hotel } from '@/types/hotel';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type View = ShellView;

const parseInitialClientNavigation = (): { initialView: View; initialClientId: string | null } => {
  if (typeof window === 'undefined') {
    return { initialView: 'dashboard', initialClientId: null };
  }

  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  const clientIdParam = params.get('clientId');

  const fromQuery: View[] = [
    'dashboard',
    'forms',
    'clients',
    'products',
    'hotels',
    'calendar',
    'finance',
    'paymentLogs',
    'commissions',
    'groups',
    'trips',
    'users',
    'roles',
    'chatbot',
    'settings',
  ];
  if (viewParam && fromQuery.includes(viewParam as View)) {
    return {
      initialView: viewParam as View,
      initialClientId: viewParam === 'clients' ? clientIdParam : null,
    };
  }

  return { initialView: 'dashboard', initialClientId: null };
};

type NotificationSyncEventData = {
  type?: string;
  notificationType?: string;
  notificationData?: { type?: string } | null;
};

const isWhatsappReplyEvent = (eventData: NotificationSyncEventData | null | undefined): boolean => {
  if (!eventData || eventData.type !== 'NOTIFICATIONS_UPDATED') return false;
  if (eventData.notificationType === 'whatsapp_reply') return true;
  return eventData.notificationData?.type === 'whatsapp_reply';
};

/** Normaliza GET /clients/stats (conteos por status real del cliente). */
function normalizeClientStatsPayload(raw: unknown): {
  total: number;
  active: number;
  inactive: number;
  pending: number;
} {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    total: typeof r.total === 'number' ? r.total : 0,
    active: typeof r.active === 'number' ? r.active : 0,
    inactive: typeof r.inactive === 'number' ? r.inactive : 0,
    pending: typeof r.pending === 'number' ? r.pending : 0,
  };
}

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
    duplicateForm,
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
    pickerClients,
    checklistTemplates,
    pagination: clientPagination,
    fetchClients,
    fetchClientsForPickers,
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
    hotels,
    fetchHotels,
    createHotel,
    updateHotel,
    deleteHotel,
  } = useHotelStore();
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
    updateParticipantPickup,
    setSeatAssignment,
    clearSeatAssignment,
    resetSeatAssignments,
    tripFinanceSummary,
    tripIncomes,
    tripExpenses,
    fetchTripFinance,
    deleteTripIncome,
    createTripExpense,
    deleteTripExpense,
    attachTripHotel,
    updateTripHotelBooking,
    detachTripHotel,
    assignTripHotelRoom,
    clearTripHotelRoomAssignment,
  } = useTripStore();
  const {
    staffMembers,
    fetchStaffMembers,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
  } = useStaffStore();
  const {
    templates: busTemplates,
    fetchTemplates: fetchBusTemplates,
    createTemplate: createBusTemplateStore,
    updateTemplate: updateBusTemplateStore,
    deleteTemplate: deleteBusTemplateStore,
  } = useBusTemplateStore();
  const [companiesForTripShare, setCompaniesForTripShare] = useState<{ id: string; name: string }[]>([]);
  const { token, can, canAny } = useAuth();
  const { users, fetchUsers } = useUserStore();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [selectedFilterCategories, setSelectedFilterCategories] = useState<string[]>([]);
  const [headerSearch, setHeaderSearch] = useState('');
  const [clientCreateSignal, setClientCreateSignal] = useState(0);
  const [tripCreateSignal, setTripCreateSignal] = useState(0);
  const [clientListQuery, setClientListQuery] = useState<{
    q?: string;
    status?: 'active' | 'inactive' | 'pending';
    checklistTemplateId?: string;
    checklistMode?: 'completed' | 'not_completed';
    productId?: string;
    branchId?: string;
    assignedUserId?: string;
    page: number;
    limit: number;
  }>({ page: 1, limit: 20 });
  const [dashboardClientStats, setDashboardClientStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
  } | null>(null);
  /** Totales del alcance actual (GET /clients/stats), para nav y pastillas de estado en clientes */
  const [scopeClientStats, setScopeClientStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
  } | null>(null);

  const [tripStats, setTripStats] = useState<{
    upcomingTrips: number;
    departingIn30Days: number;
    totalSeatsUpcoming: number;
    participantCountUpcoming: number;
    occupancyRate: number;
  } | null>(null);
  /** Agenda del dashboard: `null` si no hay `appointments.view` */
  const [dashboardAgenda, setDashboardAgenda] = useState<CalendarEvent[] | null>(null);
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();

  const areClientQueriesEqual = (
    a: {
      q?: string;
      status?: 'active' | 'inactive' | 'pending';
      checklistTemplateId?: string;
      checklistMode?: 'completed' | 'not_completed';
      productId?: string;
      branchId?: string;
      assignedUserId?: string;
      page: number;
      limit: number;
    },
    b: {
      q?: string;
      status?: 'active' | 'inactive' | 'pending';
      checklistTemplateId?: string;
      checklistMode?: 'completed' | 'not_completed';
      productId?: string;
      branchId?: string;
      assignedUserId?: string;
      page: number;
      limit: number;
    }
  ) =>
    a.q === b.q &&
    a.status === b.status &&
    a.checklistTemplateId === b.checklistTemplateId &&
    a.checklistMode === b.checklistMode &&
    a.productId === b.productId &&
    a.branchId === b.branchId &&
    a.assignedUserId === b.assignedUserId &&
    a.page === b.page &&
    a.limit === b.limit;

  useEffect(() => {
    // When leaving the editor (or when it isn't mounted), reset the flag.
    if (!currentForm) setEditorHasUnsavedChanges(false);
  }, [currentForm]);

  useEffect(() => {
    if (currentForm && !can('forms.update')) {
      void selectForm(null);
    }
  }, [currentForm, can, selectForm]);

  const normalizeCategoryKey = (input: string): string | null => {
    const v = String(input || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');

    if (v === 'VIAJE_SOLO' || v === 'VIAJA_POR_TU_CUENTA' || v === 'VIAJA_POR_SU_CUENTA') return 'SOLO';
    if (
      v === 'VIAJE_SARUVISAS' ||
      v === 'VIAJA_CON_SARUVISAS' ||
      v === 'CON_SARUVISAS' ||
      v === 'VIAJE_ASER' ||
      v === 'VIAJA_CON_ASER' ||
      v === 'VIAJE_ASERVISAS' ||
      v === 'VIAJA_CON_ASERVISAS'
    )
      return 'CON_ASER';

    return v;
  };

  const handleLoadTripChangeLog = useCallback(
    (tripId: string) => {
      if (token) fetchChangeLog(tripId, token);
    },
    [fetchChangeLog, token]
  );

  useEffect(() => {
    if (!token || !can('session.view_as')) return;
    fetchUsers(token).catch(() => {});
  }, [token, can, fetchUsers]);

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

      // Load products
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
      if (canAny(['users.view', 'clients.reassign_advisor'])) {
        fetchUsers(token).catch((error) => {
          console.error('Failed to fetch users:', error);
        });
      }
    }
  }, [activeView, token, clientListQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !token) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!isWhatsappReplyEvent(event.data)) return;
      fetchClients(token, clientListQuery).catch((error) => {
        console.error('Failed to refresh clients after WhatsApp reply:', error);
      });
      fetchSubmissions().catch((error) => {
        console.error('Failed to refresh submissions after WhatsApp reply:', error);
      });
      const aid =
        viewingAs && !userSeesAllClients(viewingAs)
          ? viewingAs.id
          : can('clients.view_all') && clientListQuery.assignedUserId?.trim()
            ? clientListQuery.assignedUserId.trim()
            : undefined;
      getClientStats(token, aid ? { assignedUserId: aid } : undefined)
        .then((raw) => {
          setScopeClientStats(normalizeClientStatsPayload(raw));
        })
        .catch(() => {});
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, [token, clientListQuery, fetchClients, fetchSubmissions, getClientStats, viewingAs, can]);

  useEffect(() => {
    if (!token || activeView !== 'clients') return;

    const intervalId = window.setInterval(() => {
      fetchClients(token, clientListQuery).catch((error) => {
        console.error('Failed to refresh clients by polling:', error);
      });
      fetchSubmissions().catch((error) => {
        console.error('Failed to refresh submissions by polling:', error);
      });
      const aid =
        viewingAs && !userSeesAllClients(viewingAs)
          ? viewingAs.id
          : can('clients.view_all') && clientListQuery.assignedUserId?.trim()
            ? clientListQuery.assignedUserId.trim()
            : undefined;
      getClientStats(token, aid ? { assignedUserId: aid } : undefined)
        .then((raw) => {
          setScopeClientStats(normalizeClientStatsPayload(raw));
        })
        .catch(() => {});
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [token, activeView, clientListQuery, fetchClients, fetchSubmissions, getClientStats, viewingAs, can]);

  // Inicio: totales reales (la lista de clientes va paginada; no usar solo clients.length)
  useEffect(() => {
    if (!token || activeView !== 'dashboard') return;
    let cancelled = false;
    const assignedUserId =
      viewingAs && !userSeesAllClients(viewingAs) ? viewingAs.id : undefined;
    getClientStats(token, assignedUserId ? { assignedUserId } : undefined)
      .then((raw) => {
        if (cancelled) return;
        setDashboardClientStats(normalizeClientStatsPayload(raw));
      })
      .catch(() => {
        if (!cancelled) setDashboardClientStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeView, viewingAs, getClientStats]);

  useEffect(() => {
    if (!token || activeView !== 'dashboard') return;
    if (!can('trips.view')) {
      setTripStats(null);
      return;
    }
    let cancelled = false;
    api
      .getTripStats(token)
      .then((data) => {
        if (!cancelled) setTripStats(data);
      })
      .catch(() => {
        if (!cancelled) setTripStats(null);
      });
    fetchTrips(token).catch((error) => {
      console.error('Failed to fetch trips for dashboard:', error);
    });
    return () => {
      cancelled = true;
    };
  }, [token, activeView, can, fetchTrips]);

  useEffect(() => {
    if (!token || activeView !== 'dashboard') return;
    if (!can('appointments.view')) {
      setDashboardAgenda(null);
      return;
    }
    let cancelled = false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    api
      .getCalendarEvents(today, today, token)
      .then((data) => {
        if (!cancelled) setDashboardAgenda(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDashboardAgenda([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeView, can]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const assignedUserIdForStats =
      viewingAs && !userSeesAllClients(viewingAs)
        ? viewingAs.id
        : can('clients.view_all') && clientListQuery.assignedUserId?.trim()
          ? clientListQuery.assignedUserId.trim()
          : undefined;
    getClientStats(token, assignedUserIdForStats ? { assignedUserId: assignedUserIdForStats } : undefined)
      .then((raw) => {
        if (cancelled) return;
        setScopeClientStats(normalizeClientStatsPayload(raw));
      })
      .catch(() => {
        if (!cancelled) setScopeClientStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, viewingAs, clientListQuery.assignedUserId, getClientStats, can]);

  useEffect(() => {
    if (!token) return;
    if (activeView !== 'trips' && activeView !== 'groups') return;
    const opts =
      viewingAs && !userSeesAllClients(viewingAs)
        ? { assignedUserId: viewingAs.id }
        : undefined;
    fetchClientsForPickers(token, opts).catch((error) => {
      console.error('Failed to load clients for trip/group pickers:', error);
    });
  }, [token, activeView, viewingAs, fetchClientsForPickers]);

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

  useEffect(() => {
    if (token && activeView === 'hotels' && can('hotels.view')) {
      fetchHotels(token).catch((error) => {
        console.error('Failed to fetch hotels:', error);
      });
    }
  }, [activeView, token, can, fetchHotels]);

  useEffect(() => {
    if (!token || activeView !== 'trips' || !can('hotels.view')) return;
    fetchHotels(token).catch(() => {});
  }, [activeView, token, can, fetchHotels]);

  // Load groups when switching to groups view
  useEffect(() => {
    if (token && activeView === 'groups') {
      fetchGroups(token).catch((error) => {
        console.error('Failed to fetch groups:', error);
      });
    }
  }, [activeView, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viajes: lista para admin y revisor; invitaciones y plantillas solo admin
  useEffect(() => {
    if (!token || activeView !== 'trips') return;
    if (can('trips.view')) {
      fetchTrips(token).catch((error) => {
        console.error('Failed to fetch trips:', error);
      });
    }
    if (can('trips.office_admin')) {
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
    if (can('trips.participants_manage')) {
      fetchStaffMembers(token).catch((error) => {
        console.error('Failed to fetch staff members:', error);
      });
    }
  }, [activeView, token, can]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapper functions to pass token automatically
  const assignedUserIdForClientStats = () =>
    viewingAs && !userSeesAllClients(viewingAs)
      ? viewingAs.id
      : can('clients.view_all') && clientListQuery.assignedUserId?.trim()
        ? clientListQuery.assignedUserId.trim()
        : undefined;

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    if (!token) {
      throw new Error('No token available');
    }
    const created = await createClientStore(token, clientData);
    const aid = assignedUserIdForClientStats();
    getClientStats(token, aid ? { assignedUserId: aid } : undefined)
      .then((raw) => {
        setScopeClientStats(normalizeClientStatsPayload(raw));
      })
      .catch(() => {});
    return created;
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!token) {
      throw new Error('No token available');
    }
    const result = await updateClientStore(token, clientId, updates);
    const aid = assignedUserIdForClientStats();
    getClientStats(token, aid ? { assignedUserId: aid } : undefined)
      .then((raw) => {
        setScopeClientStats(normalizeClientStatsPayload(raw));
      })
      .catch(() => {});
    return result;
  };

  const deleteClient = async (clientId: string) => {
    if (!token) {
      throw new Error('No token available');
    }
    await deleteClientStore(token, clientId);
    const aid = assignedUserIdForClientStats();
    getClientStats(token, aid ? { assignedUserId: aid } : undefined)
      .then((raw) => {
        setScopeClientStats(normalizeClientStatsPayload(raw));
      })
      .catch(() => {});
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
    if (userSeesAllClients(viewingAs)) return clients;
    return clients.filter(client => client.assignedUserId === viewingAs.id);
  }, [clients, viewingAs]);

  const clientsForTripAndGroupPickers = useMemo(() => {
    if (!viewingAs) return pickerClients;
    if (userSeesAllClients(viewingAs)) return pickerClients;
    return pickerClients.filter((c) => c.assignedUserId === viewingAs.id);
  }, [pickerClients, viewingAs]);

  const filteredClientStats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let pending = 0;
    for (const c of filteredClients) {
      if (c.status === 'active') active++;
      else if (c.status === 'inactive') inactive++;
      else pending++;
    }
    return {
      total: filteredClients.length,
      active,
      inactive,
      pending,
    };
  }, [filteredClients]);

  const handleClientFiltersChange = useCallback((filters: {
    q?: string;
    status?: 'active' | 'inactive' | 'pending';
    checklistTemplateId?: string;
    checklistMode?: 'completed' | 'not_completed';
    productId?: string;
    branchId?: string;
    assignedUserId?: string;
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

  useEffect(() => {
    if (activeView !== 'clients') return;
    const timeout = window.setTimeout(() => {
      handleClientFiltersChange({ q: headerSearch.trim() || undefined });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [headerSearch, activeView, handleClientFiltersChange]);

  useEffect(() => {
    const q = clientListQuery.q ?? '';
    setHeaderSearch((prev) => (prev === q ? prev : q));
  }, [clientListQuery.q]);

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

  const buildHeaderCta = (view: View): AppHeaderCta | null => {
    if (view === 'clients') {
      return { label: 'Nuevo cliente', onClick: () => setClientCreateSignal((n) => n + 1) };
    }
    if (view === 'trips' && (can('trips.create') || can('trips.office_admin'))) {
      return { label: 'Nuevo viaje', onClick: () => setTripCreateSignal((n) => n + 1) };
    }
    if (view === 'products' && canAny(['products.create', 'products.update'])) {
      return {
        label: 'Nuevo producto',
        onClick: () => {
          setEditingProduct(null);
          setProductModalOpen(true);
        },
      };
    }
    if (view === 'hotels' && canAny(['hotels.create', 'hotels.update'])) {
      return {
        label: 'Nuevo hotel',
        onClick: () => {
          setEditingHotel(null);
          setHotelModalOpen(true);
        },
      };
    }
    return null;
  };

  const FloatingViewAs = () =>
    can('session.view_as') ? (
      <ViewAsSelector
        users={users}
        viewingAs={viewingAs}
        onSelectUser={setViewingAs}
      />
    ) : null;

  const renderShell = (current: View, body: ReactNode) => (
    <>
      <FloatingViewAs />
      <AppShell
        currentView={current}
        viewingAs={Boolean(viewingAs)}
        onNavigate={handleNavigate}
        clientCount={scopeClientStats?.total ?? null}
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
        cta={buildHeaderCta(current)}
      >
        {body}
      </AppShell>
    </>
  );

  // Si estamos editando un formulario, mostramos el editor (solo quien puede editar formularios)
  if (currentForm && can('forms.update')) {
    return renderShell(
      'forms',
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
    );
  }

  // Vista de clientes
  if (activeView === 'clients') {
    return renderShell(
      'clients',
      <ClientList
            clients={filteredClients}
            products={products}
            stats={{
              total: scopeClientStats?.total ?? clientPagination.total,
              ...(scopeClientStats
                ? {
                    active: scopeClientStats.active,
                    inactive: scopeClientStats.inactive,
                    pending: scopeClientStats.pending,
                  }
                : {}),
            }}
            initialClientId={initialNavigation.initialClientId}
            onDelete={deleteClient}
            onCreate={async (data) => { await createClient(data); }}
            onUpdate={async (id, data) => { await updateClient(id, data); }}
            users={users}
            isAdmin={viewingAs ? userSeesAllClients(viewingAs) : can('clients.view_all')}
            pagination={clientPagination}
            initialQuery={clientListQuery}
            onFiltersChange={handleClientFiltersChange}
            onPageChange={handleClientPageChange}
            createOpenSignal={clientCreateSignal}
          />
    );
  }

  // Vista de productos
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

    const productQuery = headerSearch.trim().toLowerCase();
    const listedProducts = productQuery
      ? products.filter(
          (p) =>
            p.title.toLowerCase().includes(productQuery) ||
            (p.description ?? '').toLowerCase().includes(productQuery),
        )
      : products;

    return renderShell(
      'products',
      <>
          <ProductsList
            products={listedProducts}
            readOnly={!canAny(['products.create', 'products.update', 'products.delete'])}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            categories={categories}
            selectedFilterCategories={selectedFilterCategories}
            onToggleFilterCategory={toggleFilterCategory}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
            canManageCategories={canAny(['categories.create', 'categories.update', 'categories.delete'])}
            onManageCategories={() => setCategoryManagerOpen(true)}
            filtersReady={Boolean(token)}
            categoriesMap={categories.reduce<Record<string, Category>>((acc, cat) => {
              const normalizedKey = normalizeCategoryKey(cat.key);
              acc[cat.key] = cat;
              if (normalizedKey) {
                acc[normalizedKey] = cat;
              }
              return acc;
            }, {})}
          />
          {canAny(['products.create', 'products.update']) && (
            <>
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
            </>
          )}
      </>
    );
  }

  if (activeView === 'hotels') {
    const handleCreateHotel = () => {
      setEditingHotel(null);
      setHotelModalOpen(true);
    };
    const handleEditHotel = (h: Hotel) => {
      setEditingHotel(h);
      setHotelModalOpen(true);
    };
    const handleDeleteHotel = async (h: Hotel) => {
      if (!token) throw new Error('No token available');
      const confirmed = window.confirm(`¿Eliminar el hotel "${h.name}"?`);
      if (!confirmed) return;
      await deleteHotel(token, h.id);
    };
    const handleSubmitHotel = async (data: HotelFormSaveData) => {
      if (!token) throw new Error('No token available');
      try {
        if (editingHotel) {
          await updateHotel(token, editingHotel.id, data);
        } else {
          await createHotel(token, data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar el hotel');
        throw err;
      }
    };

    return renderShell(
      'hotels',
      <>
          <HotelList
            hotels={hotels}
            readOnly={!canAny(['hotels.create', 'hotels.update', 'hotels.delete'])}
            onCreate={handleCreateHotel}
            onEdit={handleEditHotel}
            onDelete={handleDeleteHotel}
          />
          {canAny(['hotels.create', 'hotels.update']) && (
            <HotelFormModal
              open={hotelModalOpen}
              hotel={editingHotel}
              onClose={() => setHotelModalOpen(false)}
              onSubmit={handleSubmitHotel}
            />
          )}
      </>
    );
  }

  if (activeView === 'calendar') {
    return renderShell('calendar', <CalendarPage />);
  }

  if (activeView === 'finance') {
    return (
      <PermissionGuard
        anyOf={['finance.view', 'nav.finance.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('finance', <FinanceDashboard />)}
      </PermissionGuard>
    );
  }

  if (activeView === 'paymentLogs') {
    return (
      <PermissionGuard
        anyOf={['payment_logs.view', 'nav.payment_logs.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('paymentLogs', <PaymentLogsPage />)}
      </PermissionGuard>
    );
  }

  if (activeView === 'commissions') {
    return (
      <PermissionGuard
        anyOf={['commissions.view', 'nav.commissions.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('commissions', <CommissionsDashboard />)}
      </PermissionGuard>
    );
  }

  // Vista de grupos
  if (activeView === 'groups') {
    return renderShell(
      'groups',
      <GroupList
            groups={groups}
            availableClients={clientsForTripAndGroupPickers}
            onCreate={async (data) => { await createGroup(data); }}
            onUpdate={async (id, data) => { await updateGroup(id, data); }}
            onDelete={deleteGroup}
          />
    );
  }

  // Vista de viajes (admin y revisor)
  if (activeView === 'trips') {
    if (!can('trips.view')) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      );
    }
    const tripReviewerMode = !can('trips.office_admin');
    return renderShell(
      'trips',
      <TripList
            reviewerMode={tripReviewerMode}
            trips={trips}
            invitations={invitations}
            availableClients={clientsForTripAndGroupPickers}
            availableStaffMembers={staffMembers}
            companiesForInvite={companiesForTripShare}
            onCreate={async (data) => {
              await createTrip(token!, data);
            }}
            onUpdate={async (tripId, data) => {
              await updateTrip(token!, tripId, {
                title: data.title,
                destination: data.destination,
                notes: data.notes,
                totalSeats: data.totalSeats,
                busTemplateId: data.busTemplateId,
                invitedCompanyIds: data.invitedCompanyIds,
                departureDate: data.departureDate,
                returnDate: data.returnDate,
                reminderConfig: data.reminderConfig,
              });
              await fetchTrip(tripId, token!);
            }}
            onDelete={async (tripId) => { await deleteTrip(token!, tripId); }}
            onAddParticipants={async (tripId, payload) => { await addParticipants(token!, tripId, payload); await fetchTrip(tripId, token!); }}
            onRemoveParticipant={async (tripId, participantId) => { await removeParticipant(token!, tripId, participantId); await fetchTrip(tripId, token!); }}
            onUpdateParticipantPickup={async (tripId, participantId, pickupLocation) => {
              await updateParticipantPickup(token!, tripId, participantId, pickupLocation);
            }}
            onAcceptInvitation={async (invitationId) => { await acceptInvitation(invitationId, token!); await fetchTrips(token!); await fetchInvitations(token!); }}
            onRejectInvitation={async (invitationId) => { await rejectInvitation(invitationId, token!); await fetchInvitations(token!); }}
            onResetSeatAssignments={async (tripId) => { await resetSeatAssignments(token!, tripId); await fetchTrip(tripId, token!); }}
            onSetSeatAssignment={async (tripId, participantId, seat) => { await setSeatAssignment(token!, tripId, participantId, seat); await fetchTrip(tripId, token!); }}
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
            onDeleteTripIncome={async (tripId, incomeId) => { await deleteTripIncome(tripId, incomeId, token!); await fetchTrip(tripId, token!); }}
            onCreateTripExpense={async (tripId, data) => { await createTripExpense(tripId, data, token!); }}
            onDeleteTripExpense={async (tripId, expenseId) => { await deleteTripExpense(tripId, expenseId, token!); }}
            onCreateStaffMember={async (data) => { await createStaffMember(token!, data); }}
            onUpdateStaffMember={async (id, data) => { await updateStaffMember(token!, id, data); }}
            onDeleteStaffMember={async (id) => { await deleteStaffMember(token!, id); }}
            financeSummary={tripFinanceSummary}
            tripIncomes={tripIncomes}
            tripExpenses={tripExpenses}
            onFetchTrip={(tripId) => { fetchTrip(tripId, token!); }}
            busTemplates={busTemplates}
            onCreateBusTemplate={async (data) => { await createBusTemplateStore(token!, data); }}
            onUpdateBusTemplate={async (id, data) => { await updateBusTemplateStore(token!, id, data); }}
            onDeleteBusTemplate={async (id) => { await deleteBusTemplateStore(token!, id); }}
            changeLog={changeLog}
            catalogHotels={can('hotels.view') ? hotels : []}
            onRefreshHotelCatalog={token && can('hotels.view') ? () => fetchHotels(token) : undefined}
            canManageTripHotels={can('trips.participants_manage') && !tripReviewerMode}
            onAttachTripHotel={
              token && can('trips.participants_manage')
                ? async (tripId, data) => {
                    await attachTripHotel(token, tripId, data);
                  }
                : undefined
            }
            onUpdateTripHotel={
              token && can('trips.participants_manage')
                ? async (tripId, tripHotelId, data) => {
                    await updateTripHotelBooking(token, tripId, tripHotelId, data);
                  }
                : undefined
            }
            onDetachTripHotel={
              token && can('trips.participants_manage')
                ? async (tripId, tripHotelId) => {
                    await detachTripHotel(token, tripId, tripHotelId);
                  }
                : undefined
            }
            onAssignTripHotelRoom={
              token && can('trips.participants_manage')
                ? async (tripId, tripHotelId, roomId, participantId) => {
                    await assignTripHotelRoom(token, tripId, tripHotelId, roomId, participantId);
                  }
                : undefined
            }
            onClearTripHotelRoomAssignment={
              token && can('trips.participants_manage')
                ? async (tripId, tripHotelId, roomId, participantId) => {
                    await clearTripHotelRoomAssignment(token, tripId, tripHotelId, roomId, participantId);
                  }
                : undefined
            }
            searchQuery={headerSearch}
            onSearchChange={setHeaderSearch}
            createOpenSignal={tripCreateSignal}
          />
    );
  }

  if (activeView === 'roles') {
    return (
      <PermissionGuard
        anyOf={['roles.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('roles', <RolesAdminPage />)}
      </PermissionGuard>
    );
  }

  if (activeView === 'users') {
    return (
      <PermissionGuard
        anyOf={['users.view', 'nav.users.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('users', <UserList />)}
      </PermissionGuard>
    );
  }

  if (activeView === 'chatbot') {
    return (
      <PermissionGuard
        anyOf={['bot_behavior.view', 'nav.chatbot.view']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('chatbot', <ChatbotSettings />)}
      </PermissionGuard>
    );
  }

  if (activeView === 'settings') {
    return (
      <PermissionGuard
        anyOf={[
          'nav.settings.view',
          'company_branding.view',
          'branches.view',
          'checklist_templates.view',
          'faqs.view',
        ]}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </div>
        }
      >
        {renderShell('settings', <SettingsPage />)}
      </PermissionGuard>
    );
  }

  // Vista del dashboard
  if (activeView === 'dashboard') {
    const submissionStats = getSubmissionStats();

    return renderShell(
      'dashboard',
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
              clientStats={dashboardClientStats ?? filteredClientStats}
              tripStats={can('trips.view') ? tripStats : null}
              trips={can('trips.view') ? trips : undefined}
              canViewTrips={can('trips.view')}
              agendaEvents={can('appointments.view') ? dashboardAgenda ?? [] : null}
              canViewCalendar={can('nav.calendar.view')}
              onNavigate={handleNavigate}
            />
          </div>
    );
  }

  // Vista de formularios con navegación
  return renderShell(
    'forms',
    <FormList
          forms={forms}
          readOnly={!canAny(['forms.update', 'forms.create', 'forms.delete'])}
          onSelectForm={async (formId) => {
            await selectForm(formId);
          }}
          onDuplicateForm={async (formId) => {
            await duplicateForm(formId);
            if (token) await fetchForms();
          }}
          onCreateForm={async (name, description) => {
            await createForm(name, description);
            if (token) {
              await fetchForms();
            }
          }}
          onDeleteForm={async (formId) => {
            await deleteForm(formId);
            if (token) {
              await fetchForms();
            }
          }}
        />
  );
};

export default Index;
