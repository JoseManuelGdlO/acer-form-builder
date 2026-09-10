import { useState, useEffect, ChangeEvent } from 'react';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Save, Upload } from 'lucide-react';
import { Form, FormSection, Question, QuestionType, QUESTION_TYPE_CONFIG, PdfTemplate } from '@/types/form';
import { QuestionTypePalette } from './QuestionTypePalette';
import { SectionCard } from './SectionCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
const MAX_TEMPLATE_SIZE_MB = 25;

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
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const loadTemplate = async () => {
      try {
        const tpl = await api.getFormPdfTemplate(form.id);
        if (!cancelled) setPdfTemplate(tpl);
      } catch {
        if (!cancelled) setPdfTemplate(null);
      }
    };
    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [form.id]);

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

  const handleTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_TEMPLATE_SIZE_MB * 1024 * 1024) {
      toast.error(`El PDF supera el limite de ${MAX_TEMPLATE_SIZE_MB}MB.`);
      event.target.value = '';
      return;
    }
    setIsUploadingTemplate(true);
    try {
      const tpl = await api.uploadFormPdfTemplate(form.id, file);
      setPdfTemplate(tpl);
      handleLocalUpdateForm({ pdfTemplateId: tpl.id });
      toast.success('Plantilla PDF subida correctamente');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo subir la plantilla PDF');
    } finally {
      setIsUploadingTemplate(false);
      event.target.value = '';
    }
  };

  const handleDownloadPreview = async () => {
    setIsDownloadingPreview(true);
    try {
      const blob = await api.downloadFormPdfPreview(form.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${localForm.name || 'form'}-preview.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el preview PDF');
    } finally {
      setIsDownloadingPreview(false);
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

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?')) {
        onBack();
      }
      return;
    }
    onBack();
  };

  const sections = Array.isArray(localForm.sections) ? localForm.sections : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <Button type="button" variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Volver a formularios
        </Button>

        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Constructor de formulario</p>
              <Input
                value={localForm.name}
                onChange={e => handleLocalUpdateForm({ name: e.target.value })}
                className="mt-1 h-auto border-0 bg-transparent p-0 font-display text-xl font-semibold focus-visible:ring-0"
                aria-label="Nombre del formulario"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {sections.length} {sections.length === 1 ? 'sección' : 'secciones'} · {getTotalQuestions()}{' '}
                {getTotalQuestions() === 1 ? 'pregunta' : 'preguntas'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasUnsavedChanges ? (
                <StatusBadge tone="warning">Cambios sin guardar</StatusBadge>
              ) : null}
              <input
                id="pdf-template-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleTemplateUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingTemplate}
                onClick={() => document.getElementById('pdf-template-upload')?.click()}
              >
                <Upload className="size-4" />
                {isUploadingTemplate ? 'Subiendo PDF...' : pdfTemplate ? 'Reemplazar PDF' : 'Subir plantilla PDF'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!pdfTemplate || isDownloadingPreview}
                onClick={handleDownloadPreview}
              >
                {isDownloadingPreview ? 'Generando preview...' : 'Descargar preview'}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
              >
                <Save className="size-4" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>

          <Textarea
            value={localForm.description || ''}
            onChange={e => handleLocalUpdateForm({ description: e.target.value })}
            placeholder="Agrega una descripción para tu formulario..."
            className="mt-5 min-h-[80px] resize-none bg-muted/40"
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="min-w-0 space-y-3">
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section, sectionIndex) => (
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
                        sections: (Array.isArray(prev.sections) ? prev.sections : []).map(s =>
                          s.id === section.id ? { ...s, questions } : s
                        ),
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    canDelete={sections.length > 1}
                    allQuestions={allQuestions}
                    pdfTemplate={pdfTemplate}
                  />
                ))}
              </SortableContext>

              <Button
                type="button"
                variant="outline"
                onClick={handleLocalAddSection}
                className="h-14 w-full gap-2 border-dashed"
              >
                <Plus className="size-5" />
                Agregar nueva sección
              </Button>
            </div>

            <div className="lg:sticky lg:top-28 lg:self-start">
              <QuestionTypePalette />
            </div>
          </div>
        </Card>
      </div>

      <DragOverlay>
        {activeQuestion ? (
          <div className="rounded-md border border-primary bg-card p-4 opacity-90 shadow-lg">
            <p className="font-medium">{activeQuestion.title}</p>
          </div>
        ) : null}
        {activeDragType ? (
          <div className="rounded-md border border-primary bg-card p-4 opacity-90 shadow-lg">
            <p className="font-medium">{QUESTION_TYPE_CONFIG[activeDragType].label}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
