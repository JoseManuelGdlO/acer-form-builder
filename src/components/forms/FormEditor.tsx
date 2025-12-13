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
import { ArrowLeft, FileText } from 'lucide-react';
import { Form, Question, QuestionType } from '@/types/form';
import { QuestionCard } from './QuestionCard';
import { QuestionTypePalette } from './QuestionTypePalette';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface FormEditorProps {
  form: Form;
  onBack: () => void;
  onUpdateForm: (updates: Partial<Form>) => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (questionId: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions: (questions: Question[]) => void;
}

export const FormEditor = ({
  form,
  onBack,
  onUpdateForm,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: FormEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dropping a new question type
    if (active.data.current?.isNew) {
      const type = active.data.current.type as QuestionType;
      onAddQuestion(type);
      return;
    }

    // Reorder existing questions
    if (active.id !== over.id) {
      const oldIndex = form.questions.findIndex(q => q.id === active.id);
      const newIndex = form.questions.findIndex(q => q.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newQuestions = arrayMove(form.questions, oldIndex, newIndex);
        onReorderQuestions(newQuestions);
      }
    }
  };

  const activeQuestion = activeId
    ? form.questions.find(q => q.id === activeId)
    : null;

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
              <Button className="gradient-primary text-primary-foreground">
                Guardar
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Questions Area */}
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

              {/* Questions List */}
              <div className="space-y-4">
                <SortableContext
                  items={form.questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {form.questions.map(question => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onUpdate={updates => onUpdateQuestion(question.id, updates)}
                      onDelete={() => onDeleteQuestion(question.id)}
                    />
                  ))}
                </SortableContext>

                {form.questions.length === 0 && (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Sin preguntas aún
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Arrastra un tipo de pregunta desde el panel derecho para comenzar a crear tu formulario
                    </p>
                  </div>
                )}
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
      </DragOverlay>
    </DndContext>
  );
};
