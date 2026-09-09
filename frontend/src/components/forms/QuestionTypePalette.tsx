import { useDraggable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { QuestionType, QUESTION_TYPE_CONFIG } from '@/types/form';
import { QuestionTypeIcon } from './QuestionTypeIcon';
import { Card } from '@/components/ui/card';
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
        'mt-2 flex w-full cursor-grab items-center gap-2 rounded-md bg-card p-2 text-left text-xs active:cursor-grabbing',
        'border border-transparent hover:border-primary/40',
        isDragging && 'opacity-50 shadow-md',
      )}
      title={config.description}
    >
      <Plus className="size-3 shrink-0 text-muted-foreground" />
      <QuestionTypeIcon type={type} className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 truncate font-medium">{config.label}</span>
    </div>
  );
};

export const QuestionTypePalette = () => {
  const questionTypes = Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[];

  return (
    <Card className="bg-muted/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tipos de pregunta
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Arrastra un tipo a una sección. Incluye carga de archivos y visibilidad condicional.
      </p>
      {questionTypes.map(type => (
        <DraggableQuestionType key={type} type={type} />
      ))}
    </Card>
  );
};
