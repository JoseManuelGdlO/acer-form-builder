import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Question, QUESTION_TYPE_CONFIG } from '@/types/form';
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
import { User, Mail, Phone, CalendarIcon, CheckCircle2, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Mock forms - in real app this would come from database
const mockForms: Form[] = [
  {
    id: 'demo-form',
    name: 'Solicitud de Visa de Turismo',
    description: 'Complete este formulario para iniciar su proceso de visa.',
    questions: [
      { id: 'q1', type: 'short_text', title: '¿Cuál es su ocupación actual?', required: true },
      { id: 'q2', type: 'long_text', title: '¿Cuál es el motivo principal de su viaje?', description: 'Sea lo más específico posible', required: true },
      { id: 'q3', type: 'multiple_choice', title: '¿Ha viajado a Estados Unidos anteriormente?', required: true, options: [
        { id: 'o1', label: 'Sí, una vez' },
        { id: 'o2', label: 'Sí, varias veces' },
        { id: 'o3', label: 'No, nunca' },
      ]},
      { id: 'q4', type: 'dropdown', title: '¿Qué tipo de visa necesita?', required: true, options: [
        { id: 'v1', label: 'Visa de turista (B1/B2)' },
        { id: 'v2', label: 'Visa de trabajo (H1B)' },
        { id: 'v3', label: 'Visa de estudiante (F1)' },
        { id: 'v4', label: 'Visa de negocios' },
      ]},
      { id: 'q5', type: 'date', title: '¿Cuándo planea realizar su viaje?', required: false },
      { id: 'q6', type: 'checkbox', title: '¿Qué ciudades planea visitar?', required: false, options: [
        { id: 'c1', label: 'Nueva York' },
        { id: 'c2', label: 'Los Ángeles' },
        { id: 'c3', label: 'Miami' },
        { id: 'c4', label: 'Las Vegas' },
        { id: 'c5', label: 'Chicago' },
      ]},
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const PublicFormView = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState<'info' | 'questions' | 'success'>('info');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
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
    // In real app, fetch form from database
    const foundForm = mockForms.find(f => f.id === formId);
    if (foundForm) {
      setForm(foundForm);
    }
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
      setStep('questions');
    }
  };

  const handleAnswer = (questionId: string, value: string | string[] | Date) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrors(prev => ({ ...prev, [questionId]: '' }));
  };

  const validateCurrentQuestion = () => {
    if (!form) return true;
    const question = form.questions[currentQuestionIndex];
    
    if (question.required && !answers[question.id]) {
      setErrors(prev => ({ ...prev, [question.id]: 'Esta pregunta es obligatoria' }));
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (!form) return;
    
    if (validateCurrentQuestion()) {
      if (currentQuestionIndex < form.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setStep('info');
    }
  };

  const handleSubmit = () => {
    // In real app, save to database
    console.log('Submission:', { clientInfo, answers });
    toast.success('Formulario enviado correctamente');
    setStep('success');
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
            className={cn('h-12 text-lg', error && 'border-destructive')}
          />
        );

      case 'long_text':
        return (
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={(value as string) || ''}
            onChange={e => handleAnswer(question.id, e.target.value)}
            rows={4}
            className={cn('text-lg', error && 'border-destructive')}
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
            <SelectTrigger className={cn('h-12 text-lg', error && 'border-destructive')}>
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
                  'w-full h-12 justify-start text-left font-normal text-lg',
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

  const progress = step === 'info' 
    ? 0 
    : ((currentQuestionIndex + 1) / form.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">{form.name}</h1>
          {step === 'questions' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>Pregunta {currentQuestionIndex + 1} de {form.questions.length}</span>
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
              <div className="mb-8">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                    {currentQuestionIndex + 1}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {form.questions[currentQuestionIndex].title}
                      {form.questions[currentQuestionIndex].required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </h2>
                    {form.questions[currentQuestionIndex].description && (
                      <p className="text-muted-foreground mt-1">
                        {form.questions[currentQuestionIndex].description}
                      </p>
                    )}
                  </div>
                </div>

                {renderQuestion(form.questions[currentQuestionIndex])}
                
                {errors[form.questions[currentQuestionIndex].id] && (
                  <p className="text-sm text-destructive mt-2">
                    {errors[form.questions[currentQuestionIndex].id]}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
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
                  {currentQuestionIndex === form.questions.length - 1 ? (
                    <>
                      Enviar
                      <Send className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Siguiente
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
