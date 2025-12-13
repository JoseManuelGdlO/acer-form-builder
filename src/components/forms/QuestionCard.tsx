import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Question, QUESTION_TYPE_CONFIG } from '@/types/form';
import { QuestionTypeIcon } from './QuestionTypeIcon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
}

export const QuestionCard = ({ question, onUpdate, onDelete }: QuestionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = QUESTION_TYPE_CONFIG[question.type];

  const addOption = () => {
    const newOption = {
      id: Math.random().toString(36).substr(2, 9),
      label: `Opción ${(question.options?.length || 0) + 1}`,
    };
    onUpdate({ options: [...(question.options || []), newOption] });
  };

  const updateOption = (optionId: string, label: string) => {
    onUpdate({
      options: question.options?.map(opt =>
        opt.id === optionId ? { ...opt, label } : opt
      ),
    });
  };

  const deleteOption = (optionId: string) => {
    onUpdate({
      options: question.options?.filter(opt => opt.id !== optionId),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-xl border border-border p-5 shadow-card transition-all duration-200',
        'hover:shadow-card-hover hover:border-primary/30',
        isDragging && 'opacity-50 shadow-xl scale-[1.02] z-50'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-1 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Question Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <QuestionTypeIcon type={question.type} className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
          </div>

          {/* Title Input */}
          <Input
            value={question.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Escribe tu pregunta aquí..."
            className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />

          {/* Description Input */}
          <Textarea
            value={question.description || ''}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Descripción opcional..."
            className="min-h-[60px] resize-none text-sm"
          />

          {/* Options for choice-based questions */}
          {question.options && (
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 group">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  <Input
                    value={option.label}
                    onChange={e => updateOption(option.id, e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  {question.options && question.options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteOption(option.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={addOption}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar opción
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Switch
                checked={question.required}
                onCheckedChange={checked => onUpdate({ required: checked })}
              />
              <span className="text-sm text-muted-foreground">Obligatorio</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
