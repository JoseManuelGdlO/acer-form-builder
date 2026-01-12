import { useState, useEffect } from 'react';
import { FAQ } from '@/types/chatbot';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Tag } from 'lucide-react';

interface FAQFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: FAQ | null;
  onSave: (question: string, answer: string, category?: string) => void;
  onUpdate?: (id: string, updates: Partial<FAQ>) => void;
}

export const FAQFormModal = ({
  open,
  onOpenChange,
  faq,
  onSave,
  onUpdate,
}: FAQFormModalProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<{ question?: string; answer?: string }>({});

  const isEditing = !!faq;

  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategory(faq.category || '');
    } else {
      setQuestion('');
      setAnswer('');
      setCategory('');
    }
    setErrors({});
  }, [faq, open]);

  const validate = () => {
    const newErrors: { question?: string; answer?: string } = {};
    
    if (!question.trim()) {
      newErrors.question = 'La pregunta es requerida';
    }
    
    if (!answer.trim()) {
      newErrors.answer = 'La respuesta es requerida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing && onUpdate && faq) {
      onUpdate(faq.id, {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || undefined,
      });
    } else {
      onSave(question.trim(), answer.trim(), category.trim() || undefined);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Pregunta *</Label>
            <Input
              id="question"
              placeholder="¿Cuál es la pregunta frecuente?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={errors.question ? 'border-destructive' : ''}
            />
            {errors.question && (
              <p className="text-sm text-destructive">{errors.question}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Respuesta *</Label>
            <Textarea
              id="answer"
              placeholder="Escribe la respuesta que dará el bot..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className={errors.answer ? 'border-destructive' : ''}
            />
            {errors.answer && (
              <p className="text-sm text-destructive">{errors.answer}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categoría (opcional)
            </Label>
            <Input
              id="category"
              placeholder="Ej: Documentos, Precios, Tiempos..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Guardar Cambios' : 'Agregar FAQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
