import { useState, useCallback } from 'react';
import { FormSubmission, SubmissionStatus } from '@/types/form';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSubmissionStore = () => {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to map backend submission data to frontend FormSubmission type
  const mapSubmissionData = (submissionData: any): FormSubmission => {
    // Map form data if included
    let formData = undefined;
    if (submissionData.form) {
      formData = {
        id: submissionData.form.id,
        name: submissionData.form.name,
        description: submissionData.form.description || '',
        sections: submissionData.form.sections || [],
        createdAt: submissionData.form.created_at ? new Date(submissionData.form.created_at) : new Date(submissionData.form.createdAt || Date.now()),
        updatedAt: submissionData.form.updated_at ? new Date(submissionData.form.updated_at) : new Date(submissionData.form.updatedAt || Date.now()),
      };
    }

    return {
      id: submissionData.id,
      formId: submissionData.form_id || submissionData.formId,
      formName: submissionData.form_name || submissionData.formName,
      respondentName: submissionData.respondent_name || submissionData.respondentName,
      respondentEmail: submissionData.respondent_email || submissionData.respondentEmail,
      status: submissionData.status,
      answers: submissionData.answers || {},
      submittedAt: submissionData.submitted_at ? new Date(submissionData.submitted_at) : new Date(submissionData.submittedAt || Date.now()),
      updatedAt: submissionData.updated_at ? new Date(submissionData.updated_at) : new Date(submissionData.updatedAt || Date.now()),
      clientId: submissionData.client_id || submissionData.clientId,
      form: formData, // Include form data with sections if provided
    };
  };

  // Fetch all submissions from API
  const fetchSubmissions = useCallback(async (params?: { formId?: string; clientId?: string; status?: string }) => {
    if (!token) {
      throw new Error('No token available');
    }
    setIsLoading(true);
    try {
      const response = await api.getSubmissions(params, token);
      const submissionsData = Array.isArray(response) ? response : [];
      const mappedSubmissions = submissionsData.map(mapSubmissionData);
      setSubmissions(mappedSubmissions);
      return mappedSubmissions;
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      toast.error('Error al cargar respuestas');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch submission stats from API
  const fetchSubmissionStats = useCallback(async () => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      const response = await api.getSubmissionStats(token);
      return {
        total: response.total || 0,
        pending: response.pending || 0,
        in_progress: response.in_progress || 0,
        completed: response.completed || 0,
        cancelled: response.cancelled || 0,
      };
    } catch (error) {
      console.error('Failed to fetch submission stats:', error);
      throw error;
    }
  }, [token]);

  const updateSubmissionStatus = useCallback(async (submissionId: string, status: SubmissionStatus) => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      const response = await api.updateSubmission(submissionId, { status }, token);
      const mappedSubmission = mapSubmissionData(response);
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId ? mappedSubmission : sub
        )
      );
      toast.success('Estado actualizado correctamente');
      return mappedSubmission;
    } catch (error) {
      console.error('Failed to update submission status:', error);
      toast.error('Error al actualizar el estado');
      throw error;
    }
  }, [token]);

  const deleteSubmission = useCallback(async (submissionId: string) => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      await api.deleteSubmission(submissionId, token);
      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
      toast.success('Respuesta eliminada correctamente');
    } catch (error) {
      console.error('Failed to delete submission:', error);
      toast.error('Error al eliminar la respuesta');
      throw error;
    }
  }, [token]);

  const getSubmissionsByForm = useCallback((formId: string) => {
    return submissions.filter(sub => sub.formId === formId);
  }, [submissions]);

  const getSubmissionStats = useCallback(() => {
    return {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 'pending').length,
      in_progress: submissions.filter(s => s.status === 'in_progress').length,
      completed: submissions.filter(s => s.status === 'completed').length,
      cancelled: submissions.filter(s => s.status === 'cancelled').length,
    };
  }, [submissions]);

  return {
    submissions,
    isLoading,
    fetchSubmissions,
    fetchSubmissionStats,
    updateSubmissionStatus,
    deleteSubmission,
    getSubmissionsByForm,
    getSubmissionStats,
  };
};
