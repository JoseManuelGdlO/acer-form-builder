import { useState, useCallback } from 'react';
import { Form, Question, QuestionType } from '@/types/form';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useFormStore = () => {
  const [forms, setForms] = useState<Form[]>([
    {
      id: '1',
      name: 'Solicitud de Visa B1/B2',
      description: 'Formulario para recopilar información de solicitantes de visa de turismo',
      questions: [
        {
          id: 'q1',
          type: 'short_text',
          title: '¿Cuál es su nombre completo?',
          required: true,
        },
        {
          id: 'q2',
          type: 'date',
          title: '¿Cuál es su fecha de nacimiento?',
          required: true,
        },
        {
          id: 'q3',
          type: 'multiple_choice',
          title: '¿Ha viajado a Estados Unidos antes?',
          required: true,
          options: [
            { id: 'o1', label: 'Sí' },
            { id: 'o2', label: 'No' },
          ],
        },
      ],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: '2',
      name: 'Documentación Adicional',
      description: 'Formulario para solicitar documentos complementarios',
      questions: [],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
  ]);

  const [currentForm, setCurrentForm] = useState<Form | null>(null);

  const createForm = useCallback((name: string, description?: string) => {
    const newForm: Form = {
      id: generateId(),
      name,
      description,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setForms(prev => [...prev, newForm]);
    return newForm;
  }, []);

  const updateForm = useCallback((formId: string, updates: Partial<Form>) => {
    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, ...updates, updatedAt: new Date() }
          : form
      )
    );
    if (currentForm?.id === formId) {
      setCurrentForm(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  }, [currentForm]);

  const deleteForm = useCallback((formId: string) => {
    setForms(prev => prev.filter(form => form.id !== formId));
    if (currentForm?.id === formId) {
      setCurrentForm(null);
    }
  }, [currentForm]);

  const addQuestion = useCallback((formId: string, type: QuestionType) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      title: 'Nueva pregunta',
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown'
        ? [{ id: generateId(), label: 'Opción 1' }]
        : undefined,
    };

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, questions: [...form.questions, newQuestion], updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, questions: [...prev.questions, newQuestion], updatedAt: new Date() } : null
      );
    }

    return newQuestion;
  }, [currentForm]);

  const updateQuestion = useCallback((formId: string, questionId: string, updates: Partial<Question>) => {
    const updateQuestions = (questions: Question[]) =>
      questions.map(q => (q.id === questionId ? { ...q, ...updates } : q));

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, questions: updateQuestions(form.questions), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, questions: updateQuestions(prev.questions), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const deleteQuestion = useCallback((formId: string, questionId: string) => {
    const filterQuestions = (questions: Question[]) =>
      questions.filter(q => q.id !== questionId);

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, questions: filterQuestions(form.questions), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, questions: filterQuestions(prev.questions), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const reorderQuestions = useCallback((formId: string, questions: Question[]) => {
    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, questions, updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, questions, updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const selectForm = useCallback((formId: string | null) => {
    if (formId === null) {
      setCurrentForm(null);
    } else {
      const form = forms.find(f => f.id === formId);
      setCurrentForm(form || null);
    }
  }, [forms]);

  return {
    forms,
    currentForm,
    createForm,
    updateForm,
    deleteForm,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    selectForm,
  };
};
