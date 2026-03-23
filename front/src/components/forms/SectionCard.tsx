import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FormSection, Question, QuestionType, QUESTION_TYPE_CONFIG } from '@/types/form';
import { QuestionCard } from './QuestionCard';
import { QuestionTypeIcon } from './QuestionTypeIcon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  section: FormSection;
  sectionIndex: number;
  isExpanded: boolean;
  isActive: boolean;
  isDragOver: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onUpdate: (updates: Partial<FormSection>) => void;
  onDelete: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (questionId: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions: (questions: Question[]) => void;
  canDelete: boolean;
  /**
   * Lista completa de preguntas del formulario (para configurar dependencias).
   */
  allQuestions: Question[];
}

export const SectionCard = ({
  section,
  sectionIndex,
  isExpanded,
  isActive,
  isDragOver,
  onToggle,
  onSelect,
  onUpdate,
  onDelete,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
  canDelete,
  allQuestions,
}: SectionCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { isSection: true },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: section.id,
    data: { sectionDropzone: true },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const questionTypes = Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[];

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'bg-card rounded-xl border transition-all duration-200',
        isDragging && 'opacity-50',
        isActive ? 'border-primary shadow-md' : 'border-border',
        (isDragOver || isOver) && 'border-primary border-2 bg-primary/5'
      )}
      onClick={onSelect}
    >
      {/* Section Header */}
      <div
        className={cn(
          'flex items-center gap-3 p-4 cursor-pointer',
          isExpanded && 'border-b border-border'
        )}
      >
        <button
          className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
            {sectionIndex + 1}
          </span>

          {isEditingTitle ? (
            <Input
              value={section.title}
              onChange={e => onUpdate({ title: e.target.value })}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
              className="h-8 text-base font-semibold"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3
              className="font-semibold text-foreground truncate cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {section.title}
            </h3>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          {section.questions.length} preguntas
        </span>

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div ref={setDroppableRef} className="p-4 space-y-4">
          {/* Section Description */}
          <Textarea
            value={section.description || ''}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Descripción de la sección (opcional)..."
            className="min-h-[60px] resize-none text-sm"
            onClick={e => e.stopPropagation()}
          />

          {/* Questions */}
          <SortableContext
            items={section.questions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {section.questions.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  sectionId={section.id}
                  onUpdate={updates => onUpdateQuestion(question.id, updates)}
                  onDelete={() => onDeleteQuestion(question.id)}
                  allQuestions={allQuestions}
                />
              ))}
            </div>
          </SortableContext>

          {/* Add Question Area */}
          <div className={cn(
            'border-2 border-dashed rounded-lg p-4 transition-all',
            (isDragOver || isOver) ? 'border-primary bg-primary/10' : 'border-border'
          )}>
            {(isDragOver || isOver) ? (
              <p className="text-center text-primary font-medium">
                Suelta aquí para agregar la pregunta
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Agregar pregunta
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    {questionTypes.map(type => {
                      const config = QUESTION_TYPE_CONFIG[type];
                      return (
                        <DropdownMenuItem
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddQuestion(type);
                          }}
                          className="gap-3"
                        >
                          <QuestionTypeIcon type={type} className="w-4 h-4" />
                          <span>{config.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-sm text-muted-foreground">
                  o arrastra desde el panel derecho
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
