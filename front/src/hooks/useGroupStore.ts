import { useState, useCallback } from 'react';
import { Group, Client, ClientLastSubmission } from '@/types/form';
import { api } from '@/lib/api';

function mapGroup(raw: any): Group {
  const clients = (raw.clients || []).map((c: any) => {
    const client: Client & { lastSubmission?: ClientLastSubmission | null } = {
      id: c.id,
      name: c.name,
      email: c.email ?? '',
      phone: c.phone,
      address: c.address,
      notes: c.notes,
      visaStatusTemplateId: c.visa_status_template_id ?? c.visaStatusTemplateId ?? '',
      visaStatusTemplate: c.visa_status_template ?? c.visaStatusTemplate ?? null,
      formsCompleted: c.forms_completed ?? c.formsCompleted ?? 0,
      assignedUserId: c.assigned_user_id ?? c.assignedUserId,
      createdAt: new Date(c.created_at ?? c.createdAt ?? Date.now()),
      updatedAt: new Date(c.updated_at ?? c.updatedAt ?? Date.now()),
    };
    if (c.lastSubmission) {
      client.lastSubmission = {
        formName: c.lastSubmission.formName,
        submittedAt: c.lastSubmission.submittedAt ?? c.lastSubmission.submitted_at,
      };
    } else if (c.last_submission) {
      client.lastSubmission = {
        formName: c.last_submission.formName ?? c.last_submission.form_name,
        submittedAt: c.last_submission.submittedAt ?? c.last_submission.submitted_at,
      };
    }
    return client;
  });
  return {
    id: raw.id,
    title: raw.title,
    assignedUserId: raw.assigned_user_id ?? raw.assignedUserId,
    createdAt: new Date(raw.created_at ?? raw.createdAt ?? Date.now()),
    updatedAt: new Date(raw.updated_at ?? raw.updatedAt ?? Date.now()),
    clients,
  };
}

export const useGroupStore = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getGroups(token);
      const list = Array.isArray(response) ? response : [];
      setGroups(list.map(mapGroup));
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (token: string, data: { title: string; clientIds?: string[] }) => {
    try {
      const created = await api.createGroup(data, token);
      setGroups(prev => [mapGroup(created), ...prev]);
      return mapGroup(created);
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }, []);

  const updateGroup = useCallback(async (token: string, groupId: string, data: { title?: string; clientIds?: string[] }) => {
    try {
      const updated = await api.updateGroup(groupId, data, token);
      const group = mapGroup(updated);
      setGroups(prev => prev.map(g => g.id === groupId ? group : g));
      return group;
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  }, []);

  const deleteGroup = useCallback(async (token: string, groupId: string) => {
    try {
      await api.deleteGroup(groupId, token);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }, []);

  return {
    groups,
    isLoading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};
