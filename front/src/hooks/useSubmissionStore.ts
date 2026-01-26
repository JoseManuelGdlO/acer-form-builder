import { useState, useCallback } from 'react';
import { FormSubmission, SubmissionStatus } from '@/types/form';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useSubmissionStore = () => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([
    {
      id: 's1',
      formId: '1',
      formName: 'Solicitud de Visa B1/B2',
      respondentName: 'María García López',
      respondentEmail: 'maria.garcia@email.com',
      status: 'completed',
      answers: {},
      submittedAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-25'),
    },
    {
      id: 's2',
      formId: '1',
      formName: 'Solicitud de Visa B1/B2',
      respondentName: 'Carlos Rodríguez Pérez',
      respondentEmail: 'carlos.rodriguez@email.com',
      status: 'in_progress',
      answers: {},
      submittedAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-12'),
    },
    {
      id: 's3',
      formId: '1',
      formName: 'Solicitud de Visa B1/B2',
      respondentName: 'Ana Martínez Silva',
      respondentEmail: 'ana.martinez@email.com',
      status: 'pending',
      answers: {},
      submittedAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-02-15'),
    },
    {
      id: 's4',
      formId: '2',
      formName: 'Documentación Adicional',
      respondentName: 'José Hernández Ruiz',
      respondentEmail: 'jose.hernandez@email.com',
      status: 'cancelled',
      answers: {},
      submittedAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-05'),
    },
    {
      id: 's5',
      formId: '1',
      formName: 'Solicitud de Visa B1/B2',
      respondentName: 'Laura Sánchez Vega',
      respondentEmail: 'laura.sanchez@email.com',
      status: 'completed',
      answers: {},
      submittedAt: new Date('2024-02-18'),
      updatedAt: new Date('2024-02-20'),
    },
  ]);

  const updateSubmissionStatus = useCallback((submissionId: string, status: SubmissionStatus) => {
    setSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? { ...sub, status, updatedAt: new Date() }
          : sub
      )
    );
  }, []);

  const deleteSubmission = useCallback((submissionId: string) => {
    setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
  }, []);

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
    updateSubmissionStatus,
    deleteSubmission,
    getSubmissionsByForm,
    getSubmissionStats,
  };
};
