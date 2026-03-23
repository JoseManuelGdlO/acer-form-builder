import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, FileText, Plus, Save } from 'lucide-react';
import { Form, FormSection, Question, QuestionType, QUESTION_TYPE_CONFIG } from '@/types/form';
import { QuestionCard } from './QuestionCard';
import { QuestionTypePalette } from './QuestionTypePalette';
import { SectionCard } from './SectionCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FormEditorProps {
  form: Form;
  onBack: () => void;
  onUpdateForm: (updates: Partial<Form>) => void | Promise<void>;
  onAddSection: () => void | Promise<void>;
  onUpdateSection: (sectionId: string, updates: Partial<FormSection>) => void | Promise<void>;
  onDeleteSection: (sectionId: string) => void | Promise<void>;
  onReorderSections: (sections: FormSection[]) => void | Promise<void>;
  onAddQuestion: (sectionId: string, type: QuestionType) => void | Promise<void>;
  onUpdateQuestion: (sectionId: string, questionId: string, updates: Partial<Question>) => void | Promise<void>;
  onDeleteQuestion: (sectionId: string, questionId: string) => void | Promise<void>;
  onReorderQuestions: (sectionId: string, questions: Question[]) => void | Promise<void>;
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

export const FormEditor = ({
  form,
  onBack,
  onUpdateForm,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
  onUnsavedChangesChange,
}: FormEditorProps) => {
  // Local state for unsaved changes
  const [localForm, setLocalForm] = useState<Form>({
    ...form,
    sections: Array.isArray(form.sections) ? form.sections : [],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Update local form when prop changes (only when form ID changes or when saved)
  useEffect(() => {
    setLocalForm({
      ...form,
      sections: Array.isArray(form.sections) ? form.sections : [],
    });
    setHasUnsavedChanges(false);
  }, [form.id, form.updatedAt]); // Reset when form ID changes or when form is updated from backend

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    Array.isArray(localForm.sections) && localForm.sections.length > 0 ? localForm.sections[0].id : null
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set((Array.isArray(localForm.sections) ? localForm.sections : []).map(s => s.id))
  );
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const allQuestions = (Array.isArray(localForm.sections) ? localForm.sections : [])
    .flatMap(s => s.questions ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Local update handlers that don't save to backend
  const handleLocalUpdateForm = (updates: Partial<Form>) => {
    setLocalForm(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleLocalUpdateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setLocalForm(prev => ({
      ...prev,
      sections: (Array.isArray(prev.sections) ? prev.sections : []).map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleLocalUpdateQuestion = (sectionId: string, questionId: string, updates: Partial<Question>) => {
    setLocalForm(prev => ({
      ...prev,
      sections: (Array.isArray(prev.sections) ? prev.sections : []).map(s =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            }
          : s
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleLocalAddSection = () => {
    const newSection: FormSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Nueva sección',
      questions: [],
    };
    setLocalForm(prev => {
      const prevSections = Array.isArray(prev.sections) ? prev.sections : [];
      return {
        ...prev,
        sections: [...prevSections, newSection],
      };
    });
    setExpandedSections(prev => new Set([...prev, newSection.id]));
    setHasUnsavedChanges(true);
  };

  const handleLocalDeleteSection = (sectionId: string) => {
    setLocalForm(prev => ({
      ...prev,
      sections: (Array.isArray(prev.sections) ? prev.sections : []).filter(s => s.id !== sectionId),
    }));
    setHasUnsavedChanges(true);
  };

  const handleLocalAddQuestion = (sectionId: string, type: QuestionType) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: 'Nueva pregunta',
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown'
        ? [{ id: Math.random().toString(36).substr(2, 9), label: 'Opción 1' }]
        : undefined,
    };
    setLocalForm(prev => {
      const prevSections = Array.isArray(prev.sections) ? prev.sections : [];
      return {
        ...prev,
        sections: prevSections.map(s =>
          s.id === sectionId
            ? { ...s, questions: [...(s.questions ?? []), newQuestion] }
            : s
        ),
      };
    });
    setExpandedSections(prev => new Set([...prev, sectionId]));
    setHasUnsavedChanges(true);
  };

  const handleLocalDeleteQuestion = (sectionId: string, questionId: string) => {
    setLocalForm(prev => ({
      ...prev,
      sections: (Array.isArray(prev.sections) ? prev.sections : []).map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
          : s
      ),
    }));
    setHasUnsavedChanges(true);
  };

  // Save all changes to backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save form updates
      await onUpdateForm({
        name: localForm.name,
        description: localForm.description,
        sections: Array.isArray(localForm.sections) ? localForm.sections : [],
      });
      
      setHasUnsavedChanges(false);
      toast.success('Formulario guardado correctamente');
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error('Error al guardar el formulario');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over?.data.current?.sectionDropzone) {
      setDragOverSectionId(over.id as string);
    } else {
      setDragOverSectionId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverSectionId(null);

    if (!over) return;

    // Check if dropping a new question type onto a section dropzone
    if (active.data.current?.isNew) {
      const type = active.data.current.type as QuestionType;
      
      // Check if dropped on section dropzone
      if (over.data.current?.sectionDropzone) {
        const sectionId = over.id as string;
        handleLocalAddQuestion(sectionId, type);
        // Ensure section is expanded
        setExpandedSections(prev => new Set([...prev, sectionId]));
        return;
      }
      
      // Fallback to active section
      if (activeSectionId) {
        handleLocalAddQuestion(activeSectionId, type);
        return;
      }
    }

    // Reorder sections
    if (active.data.current?.isSection && over.data.current?.isSection) {
      const sections = Array.isArray(localForm.sections) ? localForm.sections : [];
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
        setLocalForm(prev => ({ ...prev, sections: newSections }));
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Reorder questions within the same section
    const sectionId = active.data.current?.sectionId;
    if (sectionId && active.id !== over.id) {
    const sections = Array.isArray(localForm.sections) ? localForm.sections : [];
    const section = sections.find(s => s.id === sectionId);
      if (section) {
        const oldIndex = section.questions.findIndex(q => q.id === active.id);
        const newIndex = section.questions.findIndex(q => q.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newQuestions = arrayMove(section.questions ?? [], oldIndex, newIndex);
          setLocalForm(prev => ({
            ...prev,
            sections: (Array.isArray(prev.sections) ? prev.sections : []).map(s =>
              s.id === sectionId ? { ...s, questions: newQuestions } : s
            ),
          }));
          setHasUnsavedChanges(true);
        }
      }
    }
  };

  const activeQuestion = activeId
    ? (Array.isArray(localForm.sections) ? localForm.sections : [])
        .flatMap(s => s.questions ?? [])
        .find(q => q.id === activeId)
    : null;

  const activeDragType = activeId?.startsWith('new-') 
    ? activeId.replace('new-', '') as QuestionType 
    : null;

  const getTotalQuestions = () =>
    (Array.isArray(localForm.sections) ? localForm.sections : []).reduce(
      (acc, s) => acc + (s.questions?.length ?? 0),
      0
    );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?')) {
                        onBack();
                      }
                    } else {
                      onBack();
                    }
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <Input
                      value={localForm.name}
                      onChange={e => handleLocalUpdateForm({ name: e.target.value })}
                      className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {localForm.sections.length} secciones · {getTotalQuestions()} preguntas
                </span>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600">Cambios sin guardar</span>
                )}
                <Button 
                  className="gradient-primary text-primary-foreground gap-2"
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sections & Questions Area */}
            <div className="flex-1 min-w-0">
              {/* Form Description */}
              <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
                <Textarea
                  value={localForm.description || ''}
                  onChange={e => handleLocalUpdateForm({ description: e.target.value })}
                  placeholder="Agrega una descripción para tu formulario..."
                  className="min-h-[80px] resize-none border-0 p-0 text-base focus-visible:ring-0"
                />
              </div>

              {/* Sections List */}
              <div className="space-y-4">
                <SortableContext
                  items={localForm.sections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localForm.sections.map((section, sectionIndex) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      sectionIndex={sectionIndex}
                      isExpanded={expandedSections.has(section.id)}
                      isActive={activeSectionId === section.id}
                      isDragOver={dragOverSectionId === section.id}
                      onToggle={() => toggleSection(section.id)}
                      onSelect={() => setActiveSectionId(section.id)}
                      onUpdate={updates => handleLocalUpdateSection(section.id, updates)}
                      onDelete={() => handleLocalDeleteSection(section.id)}
                      onAddQuestion={type => handleLocalAddQuestion(section.id, type)}
                      onUpdateQuestion={(questionId, updates) =>
                        handleLocalUpdateQuestion(section.id, questionId, updates)
                      }
                      onDeleteQuestion={questionId =>
                        handleLocalDeleteQuestion(section.id, questionId)
                      }
                      onReorderQuestions={questions => {
                        setLocalForm(prev => ({
                          ...prev,
                          sections: prev.sections.map(s =>
                            s.id === section.id ? { ...s, questions } : s
                          ),
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      canDelete={localForm.sections.length > 1}
                      allQuestions={allQuestions}
                    />
                  ))}
                </SortableContext>

                {/* Add Section Button */}
                <Button
                  variant="outline"
                  onClick={handleLocalAddSection}
                  className="w-full h-14 border-dashed gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar nueva sección
                </Button>
              </div>
            </div>

            {/* Sidebar - Question Types */}
            <div className="w-72 flex-shrink-0">
              <div className="sticky top-24">
                <QuestionTypePalette />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeQuestion && (
          <div className="bg-card rounded-xl border border-primary p-4 shadow-xl opacity-90">
            <p className="font-medium">{activeQuestion.title}</p>
          </div>
        )}
        {activeDragType && (
          <div className="bg-card rounded-xl border border-primary p-4 shadow-xl opacity-90">
            <p className="font-medium">{QUESTION_TYPE_CONFIG[activeDragType].label}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
