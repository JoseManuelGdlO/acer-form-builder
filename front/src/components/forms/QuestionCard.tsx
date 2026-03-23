import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Question, QUESTION_TYPE_CONFIG, QuestionVisibility, QuestionVisibilityMode } from '@/types/form';
import { QuestionTypeIcon } from './QuestionTypeIcon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  sectionId?: string;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  allQuestions: Question[];
}

export const QuestionCard = ({ question, sectionId, onUpdate, onDelete, allQuestions }: QuestionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: question.id,
    data: { sectionId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = QUESTION_TYPE_CONFIG[question.type];

  const selectableParentQuestions = allQuestions.filter(
    q =>
      q.id !== question.id &&
      (q.type === 'multiple_choice' || q.type === 'checkbox' || q.type === 'dropdown') &&
      Array.isArray(q.options) &&
      q.options.length > 0
  );

  const getDefaultVisibility = (): QuestionVisibility => {
    const defaultParentId = selectableParentQuestions[0]?.id ?? '';
    return {
      mode: 'any',
      rules: defaultParentId
        ? [
            {
              dependsOnQuestionId: defaultParentId,
              optionIds: [],
            },
          ]
        : [],
    };
  };

  const updateVisibility = (visibility: QuestionVisibility | undefined) => {
    onUpdate({ visibility });
  };

  const updateVisibilityMode = (mode: QuestionVisibilityMode) => {
    const current = question.visibility ?? getDefaultVisibility();
    updateVisibility({ ...current, mode });
  };

  const updateRule = (ruleIndex: number, updates: Partial<NonNullable<QuestionVisibility['rules'][number]>>) => {
    const current = question.visibility ?? getDefaultVisibility();
    const nextRules = current.rules.map((r, idx) => (idx === ruleIndex ? { ...r, ...updates } : r));
    updateVisibility({ ...current, rules: nextRules });
  };

  const removeRule = (ruleIndex: number) => {
    const current = question.visibility ?? getDefaultVisibility();
    const nextRules = current.rules.filter((_, idx) => idx !== ruleIndex);
    updateVisibility({ ...current, rules: nextRules });
  };

  const addRule = () => {
    const current = question.visibility ?? getDefaultVisibility();
    const defaultParentId = selectableParentQuestions.find(q => q.id !== question.id)?.id ?? '';

    if (!defaultParentId) {
      // No selectable parents: keep empty rules.
      updateVisibility({ ...current, rules: current.rules });
      return;
    }

    updateVisibility({
      ...current,
      rules: [
        ...current.rules,
        {
          dependsOnQuestionId: defaultParentId,
          optionIds: [],
        },
      ],
    });
  };

  const toggleParentOption = (ruleIndex: number, optionId: string, checked: boolean) => {
    const current = question.visibility ?? getDefaultVisibility();
    const rule = current.rules[ruleIndex];
    if (!rule) return;
    const nextOptionIds = checked
      ? Array.from(new Set([...(rule.optionIds ?? []), optionId]))
      : (rule.optionIds ?? []).filter(id => id !== optionId);
    updateRule(ruleIndex, { optionIds: nextOptionIds });
  };

  const renderVisibilityEditor = () => {
    const visibility = question.visibility;
    if (!visibility) return null;

    return (
      <div className="space-y-3 p-4 border border-border/50 rounded-xl bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Mostrar si</p>
            <p className="text-xs text-muted-foreground">Configura reglas basadas en otras preguntas.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => updateVisibility(undefined)}
            title="Eliminar lógica condicional"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">Condición</p>
            <Select value={visibility.mode} onValueChange={val => updateVisibilityMode(val as QuestionVisibilityMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">ANY (OR)</SelectItem>
                <SelectItem value="all">ALL (AND)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {visibility.rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Agrega reglas para definir cuándo se muestra esta pregunta.</p>
          ) : (
            visibility.rules.map((rule, ruleIndex) => {
              const parentQuestion = allQuestions.find(q => q.id === rule.dependsOnQuestionId) ?? null;

              return (
                <div key={`${rule.dependsOnQuestionId}-${ruleIndex}`} className="space-y-3 p-3 rounded-lg border border-border/40 bg-background">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Pregunta padre</p>
                      <Select
                        value={rule.dependsOnQuestionId}
                        onValueChange={val => {
                          const nextParentId = val;
                          updateRule(ruleIndex, {
                            dependsOnQuestionId: nextParentId,
                            // Reseteamos opciones cuando cambia el padre (las opciones pueden ser distintas)
                            optionIds: [],
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableParentQuestions.map(parent => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeRule(ruleIndex)}
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Opciones que activan</p>
                    {parentQuestion && parentQuestion.options && parentQuestion.options.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {parentQuestion.options.map(opt => (
                          <label
                            key={opt.id}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                              rule.optionIds.includes(opt.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            )}
                          >
                            <Checkbox
                              checked={rule.optionIds.includes(opt.id)}
                              onCheckedChange={checked => toggleParentOption(ruleIndex, opt.id, checked === true)}
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        La pregunta padre no tiene opciones configuradas.
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => addRule()}
            disabled={selectableParentQuestions.length === 0}
          >
            <Plus className="w-4 h-4" />
            Agregar regla
          </Button>

          <p className="text-xs text-muted-foreground">
            Si la pregunta padre no coincide, se oculta.
          </p>
        </div>
      </div>
    );
  };

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

          {/* Visibility editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Mostrar condicionalmente</p>
                <p className="text-xs text-muted-foreground">Oculta la pregunta según la respuesta de otras.</p>
              </div>
              <Switch
                checked={Boolean(question.visibility)}
                onCheckedChange={checked => {
                  if (checked) {
                    updateVisibility(question.visibility ?? getDefaultVisibility());
                  } else {
                    updateVisibility(undefined);
                  }
                }}
                aria-label="Mostrar condicionalmente"
              />
            </div>

            {renderVisibilityEditor()}
          </div>

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
