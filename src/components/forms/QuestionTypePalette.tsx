import { useDraggable } from '@dnd-kit/core';
import { QuestionType, QUESTION_TYPE_CONFIG } from '@/types/form';
import { QuestionTypeIcon } from './QuestionTypeIcon';
import { cn } from '@/lib/utils';

interface DraggableQuestionTypeProps {
  type: QuestionType;
}

const DraggableQuestionType = ({ type }: DraggableQuestionTypeProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-${type}`,
    data: { type, isNew: true },
  });

  const config = QUESTION_TYPE_CONFIG[type];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-grab transition-all duration-200',
        'bg-card border border-border hover:border-primary/50 hover:shadow-md',
        'active:cursor-grabbing',
        isDragging && 'opacity-50 scale-105 shadow-lg'
      )}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <QuestionTypeIcon type={type} className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{config.label}</p>
        <p className="text-xs text-muted-foreground truncate">{config.description}</p>
      </div>
    </div>
  );
};

export const QuestionTypePalette = () => {
  const questionTypes = Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[];

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Tipos de Pregunta</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Arrastra un tipo de pregunta al formulario
      </p>
      <div className="space-y-2">
        {questionTypes.map(type => (
          <DraggableQuestionType key={type} type={type} />
        ))}
      </div>
    </div>
  );
};
