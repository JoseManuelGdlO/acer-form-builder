import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Form, FormSection, Question, QUESTION_TYPE_CONFIG } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { User, Mail, Phone, CalendarIcon, CheckCircle2, ArrowRight, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PublicFormView = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'sections' | 'success'>('info');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Client info
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  // Form answers
  const [answers, setAnswers] = useState<Record<string, string | string[] | Date>>({});
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadForm = async () => {
      if (!formId) return;
      setIsLoading(true);
      try {
        const formData = await api.getForm(formId);
        // Map backend data to frontend Form type
        const mappedForm: Form = {
          id: formData.id,
          name: formData.name,
          description: formData.description || '',
          sections: formData.sections || [],
          createdAt: formData.created_at ? new Date(formData.created_at) : new Date(formData.createdAt || Date.now()),
          updatedAt: formData.updated_at ? new Date(formData.updated_at) : new Date(formData.updatedAt || Date.now()),
        };
        setForm(mappedForm);
      } catch (error) {
        console.error('Failed to load form:', error);
        toast.error('Error al cargar el formulario');
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [formId]);

  const validateClientInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!clientInfo.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!clientInfo.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientInfo.email)) {
      newErrors.email = 'Ingrese un correo válido';
    }
    
    if (!clientInfo.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartForm = () => {
    if (validateClientInfo()) {
      setStep('sections');
    }
  };

  const handleAnswer = (questionId: string, value: string | string[] | Date) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      console.log('Answer updated:', { questionId, value, allAnswers: updated });
      return updated;
    });
    setErrors(prev => ({ ...prev, [questionId]: '' }));
  };

  const validateCurrentSection = () => {
    if (!form) return true;
    const section = form.sections[currentSectionIndex];
    const newErrors: Record<string, string> = {};
    
    section.questions.forEach(question => {
      if (question.required && !answers[question.id]) {
        newErrors[question.id] = 'Esta pregunta es obligatoria';
      }
    });
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!form) return;
    
    if (validateCurrentSection()) {
      if (currentSectionIndex < form.sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStep('info');
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    
    try {
      // Collect all answers from all sections
      const allAnswers: Record<string, string | string[] | Date> = { ...answers };
      
      // Ensure we have answers for all questions (even if empty)
      form.sections.forEach(section => {
        section.questions.forEach(question => {
          if (!(question.id in allAnswers)) {
            // Question not answered, skip it (don't add empty values)
          }
        });
      });

      // Convert Date objects to ISO strings for API
      const formattedAnswers: Record<string, string | string[]> = {};
      Object.entries(allAnswers).forEach(([key, value]) => {
        if (value instanceof Date) {
          formattedAnswers[key] = value.toISOString();
        } else if (value !== undefined && value !== null) {
          // Include empty strings and arrays - they are valid answers
          if (Array.isArray(value)) {
            formattedAnswers[key] = value;
          } else if (typeof value === 'string') {
            formattedAnswers[key] = value;
          }
        }
      });

      // Debug: Log answers before sending
      console.log('Raw answers state:', answers);
      console.log('All answers collected:', allAnswers);
      console.log('Formatted answers to send:', formattedAnswers);
      console.log('Number of answers:', Object.keys(formattedAnswers).length);

      // Validate we have at least some answers
      if (Object.keys(formattedAnswers).length === 0) {
        console.warn('No answers to send!');
        toast.error('Por favor, completa al menos una pregunta antes de enviar.');
        return;
      }

      const submissionData = {
        formId: form.id,
        formName: form.name,
        respondentName: clientInfo.name,
        respondentEmail: clientInfo.email,
        answers: formattedAnswers,
      };

      console.log('Full submission data:', JSON.stringify(submissionData, null, 2));

      const response = await api.createSubmission(submissionData);
      
      console.log('Submission response:', response);
      console.log('Response answers:', response.answers);
      
      toast.success('Formulario enviado correctamente');
      setStep('success');
    } catch (error: any) {
      console.error('Failed to submit form:', error);
      console.error('Error details:', error);
      const errorMessage = error?.message || 'Error desconocido';
      toast.error(`Error al enviar el formulario: ${errorMessage}`);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id];
    const error = errors[question.id];

    switch (question.type) {
      case 'short_text':
        return (
          <Input
            placeholder="Escribe tu respuesta..."
            value={(value as string) || ''}
            onChange={e => handleAnswer(question.id, e.target.value)}
            className={cn('h-12', error && 'border-destructive')}
          />
        );

      case 'long_text':
        return (
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={(value as string) || ''}
            onChange={e => handleAnswer(question.id, e.target.value)}
            rows={4}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'multiple_choice':
        return (
          <RadioGroup
            value={(value as string) || ''}
            onValueChange={val => handleAnswer(question.id, val)}
            className="space-y-3"
          >
            {question.options?.map(option => (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                  value === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={option.id} />
                <span className="text-foreground">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-3">
            {question.options?.map(option => (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                  selectedValues.includes(option.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Checkbox
                  checked={selectedValues.includes(option.id)}
                  onCheckedChange={checked => {
                    const newValues = checked
                      ? [...selectedValues, option.id]
                      : selectedValues.filter(v => v !== option.id);
                    handleAnswer(question.id, newValues);
                  }}
                />
                <span className="text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={val => handleAnswer(question.id, val)}
          >
            <SelectTrigger className={cn('h-12', error && 'border-destructive')}>
              <SelectValue placeholder="Selecciona una opción" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-12 justify-start text-left font-normal',
                  !value && 'text-muted-foreground',
                  error && 'border-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                {value ? format(value as Date, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona una fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value as Date}
                onSelect={date => date && handleAnswer(question.id, date)}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        );

      case 'rating':
        const rating = (value as string) || '0';
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => handleAnswer(question.id, star.toString())}
                className={cn(
                  'w-12 h-12 rounded-lg border transition-all text-2xl',
                  parseInt(rating) >= star
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                ★
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Formulario no encontrado</h1>
          <p className="text-muted-foreground">El enlace que has seguido no es válido o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              ¡Formulario enviado!
            </h1>
            <p className="text-muted-foreground mb-6">
              Hemos recibido tu información. Nos pondremos en contacto contigo pronto.
            </p>
            <p className="text-sm text-muted-foreground">
              Puedes cerrar esta ventana.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuestions = form.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progress = step === 'info' 
    ? 0 
    : ((currentSectionIndex + 1) / form.sections.length) * 100;

  const currentSection = form.sections[currentSectionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">{form.name}</h1>
          {step === 'sections' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>Sección {currentSectionIndex + 1} de {form.sections.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {step === 'info' ? (
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Antes de comenzar
                </h2>
                <p className="text-muted-foreground">
                  Por favor ingresa tu información de contacto
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre completo *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Juan Pérez García"
                    value={clientInfo.name}
                    onChange={e => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                    className={cn('h-12', errors.name && 'border-destructive')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo electrónico *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={clientInfo.email}
                    onChange={e => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                    className={cn('h-12', errors.email && 'border-destructive')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Número de teléfono *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={clientInfo.phone}
                    onChange={e => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className={cn('h-12', errors.phone && 'border-destructive')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleStartForm} 
                className="w-full mt-8 h-12 text-lg gap-2"
              >
                Comenzar formulario
                <ArrowRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 md:p-8">
              {/* Section Header */}
              <div className="mb-8 pb-6 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                    {currentSectionIndex + 1}
                  </span>
                  <h2 className="text-xl font-bold text-foreground">
                    {currentSection.title}
                  </h2>
                </div>
                {currentSection.description && (
                  <p className="text-muted-foreground ml-11">
                    {currentSection.description}
                  </p>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {currentSection.questions.map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {index + 1}. {question.title}
                        {question.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </h3>
                      {question.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.description}
                        </p>
                      )}
                    </div>
                    
                    {renderQuestion(question)}
                    
                    {errors[question.id] && (
                      <p className="text-sm text-destructive">
                        {errors[question.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNext}
                  className="gap-2"
                >
                  {currentSectionIndex === form.sections.length - 1 ? (
                    <>
                      Enviar
                      <Send className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Siguiente sección
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicFormView;
