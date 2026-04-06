import { useState, useCallback } from 'react';
import { Form, FormSection, Question, QuestionType } from '@/types/form';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useFormStore = () => {
  const { token } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to map backend form data to frontend Form type
  const mapFormData = (formData: any): Form => {
    let sections: FormSection[] = [];

    if (Array.isArray(formData.sections)) {
      sections = formData.sections as FormSection[];
    } else if (typeof formData.sections === 'string') {
      try {
        const parsed = JSON.parse(formData.sections);
        sections = Array.isArray(parsed) ? (parsed as FormSection[]) : [];
      } catch (error) {
        console.error('Failed to parse form sections JSON:', error, formData.sections);
        sections = [];
      }
    } else if (formData.sections && typeof formData.sections === 'object') {
      // In case it comes as a JSON object that is not an array, try to coerce or fall back
      sections = [];
    }

    return {
      id: formData.id,
      name: formData.name,
      description: formData.description || '',
      sections,
      createdAt: formData.created_at ? new Date(formData.created_at) : new Date(formData.createdAt || Date.now()),
      updatedAt: formData.updated_at ? new Date(formData.updated_at) : new Date(formData.updatedAt || Date.now()),
    };
  };

  // Fetch all forms from API
  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getForms();
      const formsData = Array.isArray(response) ? response : [];
      const mappedForms = formsData.map(mapFormData);
      setForms(mappedForms);
      return mappedForms;
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      toast.error('Error al cargar formularios');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch a single form by ID
  const fetchForm = useCallback(async (formId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getForm(formId);
      const mappedForm = mapFormData(response);
      setCurrentForm(mappedForm);
      // Also update in forms list if it exists
      setForms(prev => {
        const existingIndex = prev.findIndex(f => f.id === formId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = mappedForm;
          return updated;
        }
        return [...prev, mappedForm];
      });
      return mappedForm;
    } catch (error) {
      console.error('Failed to fetch form:', error);
      toast.error('Error al cargar el formulario');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createForm = useCallback(async (name: string, description?: string) => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      const formData = {
        name,
        description,
        sections: [
          {
            id: generateId(),
            title: 'Sección 1',
            questions: [],
          },
        ],
      };
      const response = await api.createForm(formData, token);
      const mappedForm = mapFormData(response);
      setForms(prev => [...prev, mappedForm]);
      toast.success('Formulario creado correctamente');
      return mappedForm;
    } catch (error) {
      console.error('Failed to create form:', error);
      toast.error('Error al crear el formulario');
      throw error;
    }
  }, [token]);

  const updateForm = useCallback(async (formId: string, updates: Partial<Form>) => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      const formToUpdate = forms.find(f => f.id === formId) || currentForm;
      if (!formToUpdate) {
        throw new Error('Form not found');
      }
      
      const updatedFormData = { ...formToUpdate, ...updates };
      const response = await api.updateForm(formId, updatedFormData, token);
      const mappedForm = mapFormData(response);
      
      setForms(prev =>
        prev.map(form =>
          form.id === formId ? mappedForm : form
        )
      );
      if (currentForm?.id === formId) {
        setCurrentForm(mappedForm);
      }
      toast.success('Formulario actualizado correctamente');
      return mappedForm;
    } catch (error) {
      console.error('Failed to update form:', error);
      toast.error('Error al actualizar el formulario');
      throw error;
    }
  }, [currentForm, forms, token]);

  const deleteForm = useCallback(async (formId: string) => {
    if (!token) {
      throw new Error('No token available');
    }
    try {
      await api.deleteForm(formId, token);
      setForms(prev => prev.filter(form => form.id !== formId));
      if (currentForm?.id === formId) {
        setCurrentForm(null);
      }
      toast.success('Formulario eliminado correctamente');
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Error al eliminar el formulario');
      throw error;
    }
  }, [currentForm, token]);

  const duplicateForm = useCallback(
    async (formId: string) => {
      if (!token) {
        throw new Error('No token available');
      }
      try {
        const response = await api.duplicateForm(formId, token);
        const mappedForm = mapFormData(response);
        setForms((prev) => [...prev, mappedForm]);
        toast.success('Formulario duplicado correctamente');
        return mappedForm;
      } catch (error) {
        console.error('Failed to duplicate form:', error);
        toast.error('Error al duplicar el formulario');
        throw error;
      }
    },
    [token]
  );

  // Section operations
  const addSection = useCallback(async (formId: string) => {
    const newSection: FormSection = {
      id: generateId(),
      title: 'Nueva sección',
      questions: [],
    };

    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updatedSections = [...formToUpdate.sections, newSection];
    await updateForm(formId, { sections: updatedSections });

    return newSection;
  }, [currentForm, forms, updateForm]);

  const updateSection = useCallback(async (formId: string, sectionId: string, updates: Partial<FormSection>) => {
    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updateSections = (sections: FormSection[]) =>
      sections.map(s => (s.id === sectionId ? { ...s, ...updates } : s));

    const updatedSections = updateSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });
  }, [currentForm, forms, updateForm]);

  const deleteSection = useCallback(async (formId: string, sectionId: string) => {
    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const filterSections = (sections: FormSection[]) =>
      sections.filter(s => s.id !== sectionId);

    const updatedSections = filterSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });
  }, [currentForm, forms, updateForm]);

  const reorderSections = useCallback(async (formId: string, sections: FormSection[]) => {
    await updateForm(formId, { sections });
  }, [updateForm]);

  // Question operations
  const addQuestion = useCallback(async (formId: string, sectionId: string, type: QuestionType) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      title: 'Nueva pregunta',
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown'
        ? [{ id: generateId(), label: 'Opción 1' }]
        : undefined,
    };

    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      );

    const updatedSections = updateSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });

    return newQuestion;
  }, [currentForm, forms, updateForm]);

  const updateQuestion = useCallback(async (formId: string, sectionId: string, questionId: string, updates: Partial<Question>) => {
    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) }
          : s
      );

    const updatedSections = updateSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });
  }, [currentForm, forms, updateForm]);

  const deleteQuestion = useCallback(async (formId: string, sectionId: string, questionId: string) => {
    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
          : s
      );

    const updatedSections = updateSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });
  }, [currentForm, forms, updateForm]);

  const reorderQuestions = useCallback(async (formId: string, sectionId: string, questions: Question[]) => {
    const formToUpdate = forms.find(f => f.id === formId) || currentForm;
    if (!formToUpdate) {
      throw new Error('Form not found');
    }

    const updateSections = (sections: FormSection[]) =>
      sections.map(s =>
        s.id === sectionId
          ? { ...s, questions }
          : s
      );

    const updatedSections = updateSections(formToUpdate.sections);
    await updateForm(formId, { sections: updatedSections });
  }, [currentForm, forms, updateForm]);

  const selectForm = useCallback(async (formId: string | null) => {
    if (formId === null) {
      setCurrentForm(null);
    } else {
      const form = forms.find(f => f.id === formId);
      if (form) {
        setCurrentForm(form);
      } else {
        // If form not in list, fetch it
        await fetchForm(formId);
      }
    }
  }, [forms, fetchForm]);

  return {
    forms,
    currentForm,
    isLoading,
    fetchForms,
    fetchForm,
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
  };
};
