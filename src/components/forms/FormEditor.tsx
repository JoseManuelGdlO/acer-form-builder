import { useState } from 'react';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Form, FormSection, Question, QuestionType } from '@/types/form';
import { QuestionCard } from './QuestionCard';
import { QuestionTypePalette } from './QuestionTypePalette';
import { SectionCard } from './SectionCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface FormEditorProps {
  form: Form;
  onBack: () => void;
  onUpdateForm: (updates: Partial<Form>) => void;
  onAddSection: () => void;
  onUpdateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderSections: (sections: FormSection[]) => void;
  onAddQuestion: (sectionId: string, type: QuestionType) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onReorderQuestions: (sectionId: string, questions: Question[]) => void;
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
}: FormEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    form.sections.length > 0 ? form.sections[0].id : null
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(form.sections.map(s => s.id))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dropping a new question type
    if (active.data.current?.isNew && activeSectionId) {
      const type = active.data.current.type as QuestionType;
      onAddQuestion(activeSectionId, type);
      return;
    }

    // Reorder sections
    if (active.data.current?.isSection && over.data.current?.isSection) {
      const oldIndex = form.sections.findIndex(s => s.id === active.id);
      const newIndex = form.sections.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newSections = arrayMove(form.sections, oldIndex, newIndex);
        onReorderSections(newSections);
      }
      return;
    }

    // Reorder questions within the same section
    const sectionId = active.data.current?.sectionId;
    if (sectionId && active.id !== over.id) {
      const section = form.sections.find(s => s.id === sectionId);
      if (section) {
        const oldIndex = section.questions.findIndex(q => q.id === active.id);
        const newIndex = section.questions.findIndex(q => q.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newQuestions = arrayMove(section.questions, oldIndex, newIndex);
          onReorderQuestions(sectionId, newQuestions);
        }
      }
    }
  };

  const activeQuestion = activeId
    ? form.sections.flatMap(s => s.questions).find(q => q.id === activeId)
    : null;

  const getTotalQuestions = () => form.sections.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <Input
                      value={form.name}
                      onChange={e => onUpdateForm({ name: e.target.value })}
                      className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {form.sections.length} secciones · {getTotalQuestions()} preguntas
                </span>
                <Button className="gradient-primary text-primary-foreground">
                  Guardar
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
                  value={form.description || ''}
                  onChange={e => onUpdateForm({ description: e.target.value })}
                  placeholder="Agrega una descripción para tu formulario..."
                  className="min-h-[80px] resize-none border-0 p-0 text-base focus-visible:ring-0"
                />
              </div>

              {/* Sections List */}
              <div className="space-y-4">
                <SortableContext
                  items={form.sections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {form.sections.map((section, sectionIndex) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      sectionIndex={sectionIndex}
                      isExpanded={expandedSections.has(section.id)}
                      isActive={activeSectionId === section.id}
                      onToggle={() => toggleSection(section.id)}
                      onSelect={() => setActiveSectionId(section.id)}
                      onUpdate={updates => onUpdateSection(section.id, updates)}
                      onDelete={() => onDeleteSection(section.id)}
                      onUpdateQuestion={(questionId, updates) =>
                        onUpdateQuestion(section.id, questionId, updates)
                      }
                      onDeleteQuestion={questionId =>
                        onDeleteQuestion(section.id, questionId)
                      }
                      onReorderQuestions={questions =>
                        onReorderQuestions(section.id, questions)
                      }
                      canDelete={form.sections.length > 1}
                    />
                  ))}
                </SortableContext>

                {/* Add Section Button */}
                <Button
                  variant="outline"
                  onClick={onAddSection}
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
                {activeSectionId ? (
                  <QuestionTypePalette />
                ) : (
                  <div className="bg-card rounded-xl border border-border p-6 text-center">
                    <p className="text-muted-foreground">
                      Selecciona una sección para agregar preguntas
                    </p>
                  </div>
                )}
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
      </DragOverlay>
    </DndContext>
  );
};
