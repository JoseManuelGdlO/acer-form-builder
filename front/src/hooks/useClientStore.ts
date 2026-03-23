import { useState, useCallback } from 'react';
import { Client } from '@/types/form';
import { ChecklistTemplate, VisaStatusTemplate } from '@/types/settings';
import { api } from '@/lib/api';

export const useClientStore = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [visaStatusTemplates, setVisaStatusTemplates] = useState<VisaStatusTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchClients = useCallback(async (token: string, params?: { assignedUserId?: string; productId?: string; visaStatusTemplateId?: string }) => {
    setIsLoading(true);
    try {
      const response = await api.getClients(params, token);
      // Handle both old format (array) and new format (object with clients and templates)
      const clientsData = Array.isArray(response) ? response : (response.clients || response);
      const templates = response.templates || [];
      const visaTemplates = response.visaStatusTemplates || [];
      
      const mapAssignedUser = (u: any) =>
        u ? { id: u.id, name: u.name, email: u.email } : null;
      const mapProduct = (p: any) =>
        p ? { id: p.id, title: p.title } : null;
      const clients: Client[] = clientsData.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
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
      }));
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
  }, []);

  const mapAssignedUser = (u: any) =>
    u ? { id: u.id, name: u.name, email: u.email } : null;
  const mapProduct = (p: any) =>
    p ? { id: p.id, title: p.title } : null;

  const createClient = useCallback(async (token: string, clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => {
    try {
      const newClient = await api.createClient(clientData, token);
      const client: Client = {
        id: newClient.id,
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
        notes: newClient.notes,
        visaCasAppointmentDate: newClient.visa_cas_appointment_date ?? newClient.visaCasAppointmentDate ?? null,
        visaCasAppointmentLocation: newClient.visa_cas_appointment_location ?? newClient.visaCasAppointmentLocation ?? null,
        visaConsularAppointmentDate: newClient.visa_consular_appointment_date ?? newClient.visaConsularAppointmentDate ?? null,
        visaConsularAppointmentLocation: newClient.visa_consular_appointment_location ?? newClient.visaConsularAppointmentLocation ?? null,
        visaStatusTemplateId: newClient.visa_status_template_id || newClient.visaStatusTemplateId,
        visaStatusTemplate: newClient.visa_status_template || newClient.visaStatusTemplate || null,
        formsCompleted: newClient.forms_completed || newClient.formsCompleted || 0,
        assignedUserId: newClient.assigned_user_id || newClient.assignedUserId,
        assignedUser: mapAssignedUser(newClient.assigned_user || newClient.assignedUser),
        productId: newClient.product_id || newClient.productId,
        product: mapProduct(newClient.product),
        totalAmountDue: newClient.total_amount_due != null ? Number(newClient.total_amount_due) : newClient.totalAmountDue,
        totalPaid: newClient.total_paid != null ? Number(newClient.total_paid) : (newClient.totalPaid ?? 0),
        createdAt: new Date(newClient.created_at || newClient.createdAt || Date.now()),
        updatedAt: new Date(newClient.updated_at || newClient.updatedAt || Date.now()),
        checklistProgress: newClient.checklist_progress || newClient.checklistProgress || 0,
        checklistStatus: newClient.checklist_status || newClient.checklistStatus || 'not_started',
        checklistCompleted: newClient.checklist_completed || newClient.checklistCompleted || 0,
        checklistTotal: newClient.checklist_total || newClient.checklistTotal || 0,
        checklistByTemplate: newClient.checklist_by_template || newClient.checklistByTemplate || {},
      };
      setClients(prev => [client, ...prev]);
      return client;
    } catch (error) {
      console.error('Failed to create client:', error);
      throw error;
    }
  }, []);

  const updateClient = useCallback(async (token: string, clientId: string, updates: Partial<Client>) => {
    try {
      const updatedClient = await api.updateClient(clientId, updates, token);
      const client: Client = {
        id: updatedClient.id,
        name: updatedClient.name,
        email: updatedClient.email,
        phone: updatedClient.phone,
        address: updatedClient.address,
        notes: updatedClient.notes,
        visaCasAppointmentDate: updatedClient.visa_cas_appointment_date ?? updatedClient.visaCasAppointmentDate ?? null,
        visaCasAppointmentLocation: updatedClient.visa_cas_appointment_location ?? updatedClient.visaCasAppointmentLocation ?? null,
        visaConsularAppointmentDate: updatedClient.visa_consular_appointment_date ?? updatedClient.visaConsularAppointmentDate ?? null,
        visaConsularAppointmentLocation: updatedClient.visa_consular_appointment_location ?? updatedClient.visaConsularAppointmentLocation ?? null,
        visaStatusTemplateId: updatedClient.visa_status_template_id || updatedClient.visaStatusTemplateId,
        visaStatusTemplate: updatedClient.visa_status_template || updatedClient.visaStatusTemplate || null,
        formsCompleted: updatedClient.forms_completed || updatedClient.formsCompleted || 0,
        assignedUserId: updatedClient.assigned_user_id || updatedClient.assignedUserId,
        assignedUser: mapAssignedUser(updatedClient.assigned_user || updatedClient.assignedUser),
        productId: updatedClient.product_id || updatedClient.productId,
        product: mapProduct(updatedClient.product),
        totalAmountDue: updatedClient.total_amount_due != null ? Number(updatedClient.total_amount_due) : updatedClient.totalAmountDue,
        totalPaid: updatedClient.total_paid != null ? Number(updatedClient.total_paid) : (updatedClient.totalPaid ?? 0),
        createdAt: new Date(updatedClient.created_at || updatedClient.createdAt),
        updatedAt: new Date(updatedClient.updated_at || updatedClient.updatedAt),
        checklistProgress: updatedClient.checklist_progress || updatedClient.checklistProgress || 0,
        checklistStatus: updatedClient.checklist_status || updatedClient.checklistStatus || 'not_started',
        checklistCompleted: updatedClient.checklist_completed || updatedClient.checklistCompleted || 0,
        checklistTotal: updatedClient.checklist_total || updatedClient.checklistTotal || 0,
        checklistByTemplate: updatedClient.checklist_by_template || updatedClient.checklistByTemplate || {},
      };
      setClients(prev =>
        prev.map(c => c.id === clientId ? client : c)
      );
    } catch (error) {
      console.error('Failed to update client:', error);
      throw error;
    }
  }, []);

  const deleteClient = useCallback(async (token: string, clientId: string) => {
    try {
      await api.deleteClient(clientId, token);
      setClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Failed to delete client:', error);
      throw error;
    }
  }, []);

  const updateClientStatus = useCallback(async (token: string, clientId: string, visaStatusTemplateId: string) => {
    await updateClient(token, clientId, { visaStatusTemplateId });
  }, [updateClient]);

  const getClientStats = useCallback(async (token: string) => {
    try {
      const stats = await api.getClientStats(token);
      return stats;
    } catch (error) {
      console.error('Failed to get client stats:', error);
      return {
        total: clients.length,
        visaStatusCounts: [],
      };
    }
  }, [clients]);

  return {
    clients,
    checklistTemplates,
    visaStatusTemplates,
    isLoading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    getClientStats,
  };
};
