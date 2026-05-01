import { useState, useCallback } from 'react';
import { Client } from '@/types/form';
import { ChecklistTemplate, VisaStatusTemplate } from '@/types/settings';
import { api } from '@/lib/api';

type ClientQueryParams = {
  q?: string;
  assignedUserId?: string;
  branchId?: string;
  productId?: string;
  visaStatusTemplateId?: string;
  checklistTemplateId?: string;
  checklistMode?: 'completed' | 'not_completed';
  page?: number;
  limit?: number;
};

const mapAssignedUser = (u: any) =>
  u ? { id: u.id, name: u.name, email: u.email } : null;
const mapProduct = (p: any) =>
  p ? { id: p.id, title: p.title } : null;

const mapClient = (c: any): Client => ({
    id: c.id,
    parentClientId: c.parent_client_id ?? c.parentClientId ?? null,
    name: c.name,
    email: c.email,
    phone: c.phone,
    postalCode: c.postal_code ?? c.postalCode ?? null,
    address: c.address,
    birthDate: c.birth_date ?? c.birthDate ?? null,
    relationshipToHolder: c.relationship_to_holder ?? c.relationshipToHolder ?? null,
    notes: c.notes,
    visaCasAppointmentDate: c.visa_cas_appointment_date ?? c.visaCasAppointmentDate ?? null,
    visaCasAppointmentLocation: c.visa_cas_appointment_location ?? c.visaCasAppointmentLocation ?? null,
    visaConsularAppointmentDate: c.visa_consular_appointment_date ?? c.visaConsularAppointmentDate ?? null,
    visaConsularAppointmentLocation: c.visa_consular_appointment_location ?? c.visaConsularAppointmentLocation ?? null,
    visaStatusTemplateId: c.visa_status_template_id || c.visaStatusTemplateId,
    visaStatusTemplate: c.visa_status_template || c.visaStatusTemplate || null,
    formsCompleted: c.forms_completed || c.formsCompleted || 0,
    assignedUserId: c.assigned_user_id || c.assignedUserId,
    assignedUser: mapAssignedUser(c.assigned_user || c.assignedUser),
    productId: c.product_id || c.productId,
    product: mapProduct(c.product),
    totalAmountDue: c.total_amount_due != null ? Number(c.total_amount_due) : (c.totalAmountDue != null ? Number(c.totalAmountDue) : undefined),
    totalPaid: c.total_paid != null ? Number(c.total_paid) : (c.totalPaid != null ? Number(c.totalPaid) : 0),
    createdAt: new Date(c.created_at || c.createdAt),
    updatedAt: new Date(c.updated_at || c.updatedAt),
    checklistProgress: c.checklist_progress || c.checklistProgress || 0,
    checklistStatus: c.checklist_status || c.checklistStatus || 'not_started',
    checklistCompleted: c.checklist_completed || c.checklistCompleted || 0,
    checklistTotal: c.checklist_total || c.checklistTotal || 0,
    checklistByTemplate: c.checklist_by_template || c.checklistByTemplate || {},
    parent: c.parent ? { id: c.parent.id, name: c.parent.name, email: c.parent.email, phone: c.parent.phone } : null,
    children: Array.isArray(c.children)
      ? c.children.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          email: ch.email,
          phone: ch.phone,
          parentClientId: ch.parent_client_id ?? ch.parentClientId ?? null,
          assignedUserId: ch.assigned_user_id ?? ch.assignedUserId ?? undefined,
          createdAt: new Date(ch.created_at || ch.createdAt),
          updatedAt: new Date(ch.updated_at || ch.updatedAt),
        }))
      : [],
    assignedTrips: c.assignedTrips || c.assigned_trips || [],
    nextOfficeAppointment: c.nextOfficeAppointment || c.next_office_appointment || null,
});

export const useClientStore = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [pickerClients, setPickerClients] = useState<Client[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [visaStatusTemplates, setVisaStatusTemplates] = useState<VisaStatusTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState<ClientQueryParams>({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchClients = useCallback(async (token: string, params?: ClientQueryParams) => {
    setIsLoading(true);
    try {
      const nextQuery: ClientQueryParams = {
        ...query,
        ...params,
      };
      const response = await api.getClients(nextQuery, token);
      const normalizedResponse = Array.isArray(response)
        ? { data: response, meta: undefined, templates: [], visaStatusTemplates: [] }
        : (response || {});
      const clientsData = Array.isArray(normalizedResponse.data) ? normalizedResponse.data : [];
      const templates = Array.isArray(normalizedResponse.templates) ? normalizedResponse.templates : [];
      const visaTemplates = Array.isArray(normalizedResponse.visaStatusTemplates) ? normalizedResponse.visaStatusTemplates : [];
      setQuery(nextQuery);
      setPagination(normalizedResponse.meta || {
        page: nextQuery.page || 1,
        limit: nextQuery.limit || 20,
        total: clientsData.length,
        totalPages: clientsData.length > 0 ? 1 : 0,
      });
      
      const clients: Client[] = clientsData.map((c: any) => mapClient(c));
      setClients(clients);
      
      // Store templates if provided
      if (templates.length > 0) {
        const mappedTemplates: ChecklistTemplate[] = templates.map((t: any) => ({
          id: t.id,
          label: t.label,
          order: t.order || 0,
          isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
          createdAt: new Date(t.created_at || t.createdAt || Date.now()),
        }));
        setChecklistTemplates(mappedTemplates);
      }
      if (visaTemplates.length > 0) {
        const mappedVisaTemplates: VisaStatusTemplate[] = visaTemplates.map((t: any) => ({
          id: t.id,
          label: t.label,
          order: t.order || 0,
          isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
          color: t.color ?? null,
          createdAt: new Date(t.created_at || t.createdAt || Date.now()),
        }));
        setVisaStatusTemplates(mappedVisaTemplates);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  /** Todos los clientes del alcance actual (sin filtros de búsqueda/listado) para modales de viajes y grupos. */
  const fetchClientsForPickers = useCallback(async (
    token: string,
    opts?: { assignedUserId?: string }
  ) => {
    try {
      const merged: Client[] = [];
      const seen = new Set<string>();
      let page = 1;
      let totalPages = 1;
      do {
        const response = await api.getClients(
          {
            page,
            limit: 100,
            ...(opts?.assignedUserId ? { assignedUserId: opts.assignedUserId } : {}),
          },
          token
        );
        const normalizedResponse = Array.isArray(response)
          ? { data: response, meta: undefined }
          : (response || {});
        const clientsData = Array.isArray(normalizedResponse.data) ? normalizedResponse.data : [];
        for (const c of clientsData) {
          const cl = mapClient(c);
          if (!seen.has(cl.id)) {
            seen.add(cl.id);
            merged.push(cl);
          }
        }
        const meta = normalizedResponse.meta;
        totalPages = meta?.totalPages ?? 1;
        if (!meta || clientsData.length === 0) break;
        page += 1;
      } while (page <= totalPages);
      setPickerClients(merged);
    } catch (error) {
      console.error('Failed to fetch clients for pickers:', error);
      throw error;
    }
  }, []);

  const createClient = useCallback(async (token: string, clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    try {
      const newClient = await api.createClient(clientData, token);
      const client = mapClient(newClient);
      setClients(prev => {
        const next = [client, ...prev];
        if (!client.parentClientId) return next;
        return next.map((existing) => {
          if (existing.id !== client.parentClientId) return existing;
          const currentChildren = existing.children ?? [];
          const alreadyExists = currentChildren.some((child) => child.id === client.id);
          if (alreadyExists) return existing;
          return {
            ...existing,
            children: [
              ...currentChildren,
              {
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                parentClientId: client.parentClientId ?? null,
                assignedUserId: client.assignedUserId,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt,
              },
            ],
          };
        });
      });
      setPickerClients(prev => {
        const idx = prev.findIndex(p => p.id === client.id);
        if (idx === -1) return [client, ...prev];
        const next = [...prev];
        next[idx] = client;
        return next;
      });
      return client;
    } catch (error) {
      console.error('Failed to create client:', error);
      throw error;
    }
  }, []);

  const updateClient = useCallback(async (token: string, clientId: string, updates: Partial<Client>) => {
    try {
      const updatedClient = await api.updateClient(clientId, updates, token);
      const client = mapClient(updatedClient);

      const mergeLists = (prev: Client[]) => {
        const prevRow = prev.find((c) => c.id === clientId);
        const oldPid = prevRow?.parentClientId ?? null;
        const newPid = client.parentClientId ?? null;
        const childSummary = {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          parentClientId: client.parentClientId ?? null,
          assignedUserId: client.assignedUserId,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        };

        let next = prev.map((c) => (c.id === clientId ? client : c));

        if (oldPid !== newPid) {
          if (oldPid) {
            next = next.map((c) =>
              c.id === oldPid
                ? { ...c, children: (c.children ?? []).filter((x) => x.id !== clientId) }
                : c
            );
          }
          if (newPid) {
            next = next.map((c) => {
              if (c.id !== newPid) return c;
              const ch = c.children ?? [];
              if (ch.some((x) => x.id === clientId)) return c;
              return { ...c, children: [...ch, childSummary] };
            });
          }
        } else if (newPid) {
          next = next.map((c) => {
            if (c.id !== newPid) return c;
            const ch = c.children ?? [];
            return {
              ...c,
              children: ch.map((x) => (x.id === clientId ? childSummary : x)),
            };
          });
        }

        return next;
      };

      setClients(mergeLists);
      setPickerClients(mergeLists);
    } catch (error) {
      console.error('Failed to update client:', error);
      throw error;
    }
  }, []);

  const deleteClient = useCallback(async (token: string, clientId: string) => {
    try {
      await api.deleteClient(clientId, token);
      setClients(prev => prev.filter(client => client.id !== clientId));
      setPickerClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Failed to delete client:', error);
      throw error;
    }
  }, []);

  const updateClientStatus = useCallback(async (token: string, clientId: string, visaStatusTemplateId: string) => {
    await updateClient(token, clientId, { visaStatusTemplateId });
  }, [updateClient]);

  const getClientStats = useCallback(async (
    token: string,
    params?: { assignedUserId?: string }
  ) => {
    try {
      return await api.getClientStats(token, params);
    } catch (error) {
      console.error('Failed to get client stats:', error);
      return {
        total: clients.length,
        visaStatusCounts: [],
      };
    }
  }, [clients.length]);

  return {
    clients,
    pickerClients,
    checklistTemplates,
    visaStatusTemplates,
    query,
    pagination,
    isLoading,
    setQuery,
    fetchClients,
    fetchClientsForPickers,
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    getClientStats,
  };
};
