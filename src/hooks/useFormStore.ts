import { useState, useCallback } from 'react';
import { Form, FormSection, Question, QuestionType } from '@/types/form';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useFormStore = () => {
  const [forms, setForms] = useState<Form[]>([
    {
      id: 'demo-form',
      name: 'Solicitud de Visa B1/B2',
      description: 'Formulario para recopilar información de solicitantes de visa de turismo',
      sections: [
        {
          id: 's1',
          title: 'Información Personal',
          description: 'Datos básicos del solicitante',
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: '¿Cuál es su ocupación actual?',
              required: true,
            },
            {
              id: 'q2',
              type: 'date',
              title: '¿Cuál es su fecha de nacimiento?',
              required: true,
            },
          ],
        },
        {
          id: 's2',
          title: 'Historial de Viajes',
          description: 'Información sobre viajes anteriores',
          questions: [
            {
              id: 'q3',
              type: 'multiple_choice',
              title: '¿Ha viajado a Estados Unidos antes?',
              required: true,
              options: [
                { id: 'o1', label: 'Sí, una vez' },
                { id: 'o2', label: 'Sí, varias veces' },
                { id: 'o3', label: 'No, nunca' },
              ],
            },
            {
              id: 'q4',
              type: 'dropdown',
              title: '¿Qué tipo de visa necesita?',
              required: true,
              options: [
                { id: 'v1', label: 'Visa de turista (B1/B2)' },
                { id: 'v2', label: 'Visa de trabajo (H1B)' },
                { id: 'v3', label: 'Visa de estudiante (F1)' },
              ],
            },
          ],
        },
        {
          id: 's3',
          title: 'Detalles del Viaje',
          questions: [
            {
              id: 'q5',
              type: 'date',
              title: '¿Cuándo planea realizar su viaje?',
              required: false,
            },
            {
              id: 'q6',
              type: 'checkbox',
              title: '¿Qué ciudades planea visitar?',
              required: false,
              options: [
                { id: 'c1', label: 'Nueva York' },
                { id: 'c2', label: 'Los Ángeles' },
                { id: 'c3', label: 'Miami' },
                { id: 'c4', label: 'Las Vegas' },
              ],
            },
            {
              id: 'q7',
              type: 'long_text',
              title: '¿Cuál es el motivo principal de su viaje?',
              description: 'Sea lo más específico posible',
              required: true,
            },
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
      sections: [],
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
      sections: [
        {
          id: generateId(),
          title: 'Sección 1',
          questions: [],
        },
      ],
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

  // Section operations
  const addSection = useCallback((formId: string) => {
    const newSection: FormSection = {
      id: generateId(),
      title: 'Nueva sección',
      questions: [],
    };

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: [...form.sections, newSection], updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: [...prev.sections, newSection], updatedAt: new Date() } : null
      );
    }

    return newSection;
  }, [currentForm]);

  const updateSection = useCallback((formId: string, sectionId: string, updates: Partial<FormSection>) => {
    const updateSections = (sections: FormSection[]) =>
      sections.map(s => (s.id === sectionId ? { ...s, ...updates } : s));

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: updateSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: updateSections(prev.sections), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const deleteSection = useCallback((formId: string, sectionId: string) => {
    const filterSections = (sections: FormSection[]) =>
      sections.filter(s => s.id !== sectionId);

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: filterSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: filterSections(prev.sections), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const reorderSections = useCallback((formId: string, sections: FormSection[]) => {
    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections, updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections, updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  // Question operations
  const addQuestion = useCallback((formId: string, sectionId: string, type: QuestionType) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      title: 'Nueva pregunta',
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown'
        ? [{ id: generateId(), label: 'Opción 1' }]
        : undefined,
    };

    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      );

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: updateSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: updateSections(prev.sections), updatedAt: new Date() } : null
      );
    }

    return newQuestion;
  }, [currentForm]);

  const updateQuestion = useCallback((formId: string, sectionId: string, questionId: string, updates: Partial<Question>) => {
    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) }
          : s
      );

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: updateSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: updateSections(prev.sections), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const deleteQuestion = useCallback((formId: string, sectionId: string, questionId: string) => {
    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
          : s
      );

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: updateSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: updateSections(prev.sections), updatedAt: new Date() } : null
      );
    }
  }, [currentForm]);

  const reorderQuestions = useCallback((formId: string, sectionId: string, questions: Question[]) => {
    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions }
          : s
      );

    setForms(prev =>
      prev.map(form =>
        form.id === formId
          ? { ...form, sections: updateSections(form.sections), updatedAt: new Date() }
          : form
      )
    );

    if (currentForm?.id === formId) {
      setCurrentForm(prev =>
        prev ? { ...prev, sections: updateSections(prev.sections), updatedAt: new Date() } : null
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
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    selectForm,
  };
};
