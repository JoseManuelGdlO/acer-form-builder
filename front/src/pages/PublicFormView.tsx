import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { User, Mail, Phone, CalendarIcon, CheckCircle2, ArrowRight, ArrowLeft, Send, Loader2, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import saruLogo from '@/assets/saru-logo.png';

export type FileAnswerValue = { fileName: string; mimeType: string; data: string };

const ACCEPTED_FILE_TYPES = 'image/*,.pdf,application/pdf';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const defaultClientInfo = {
  name: '',
  phone: '',
  email: '',
};

export default function PublicFormView() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('token');

  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'sections' | 'success'>('info');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Client info
  const [clientInfo, setClientInfo] = useState(defaultClientInfo);
  
  // Form answers (string | string[] | Date | FileAnswerValue for file_upload)
  const [answers, setAnswers] = useState<Record<string, string | string[] | Date | FileAnswerValue>>({});
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse progress from API into state
  const applyProgress = useCallback((progress: any) => {
    if (!progress) return;
    if (progress.clientInfo) {
      setClientInfo({ ...defaultClientInfo, ...progress.clientInfo });
    }
    if (progress.answers) {
      const restored: Record<string, string | string[] | Date | FileAnswerValue> = {};
      Object.entries(progress.answers).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && 'data' in value && 'fileName' in value) {
          restored[key] = value as FileAnswerValue;
        } else if (typeof value === 'string' && (value as string).match(/^\d{4}-\d{2}-\d{2}T/)) {
          restored[key] = new Date(value as string);
        } else {
          restored[key] = value as string | string[] | Date;
        }
      });
      setAnswers(restored);
    }
    if (progress.step && progress.step !== 'success') {
      setStep(progress.step);
    }
    if (typeof progress.currentSectionIndex === 'number') {
      setCurrentSectionIndex(progress.currentSectionIndex);
    }
  }, []);

  // Save progress to API (DB)
  const saveProgress = useCallback(async () => {
    if (!formId || !sessionToken || step === 'success') return;
    try {
      const progress = {
        clientInfo,
        answers: Object.fromEntries(
          Object.entries(answers).map(([key, value]) => [
            key,
            value instanceof Date
              ? value.toISOString()
              : typeof value === 'object' && value !== null && !Array.isArray(value) && 'data' in value
                ? value
                : value,
          ])
        ),
        step,
        currentSectionIndex,
        savedAt: new Date().toISOString(),
      };
      await api.updateFormSessionProgress(formId, sessionToken, progress);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [formId, sessionToken, clientInfo, answers, step, currentSectionIndex]);

  useEffect(() => {
    const loadForm = async () => {
      if (!formId) return;
      if (!sessionToken) {
        setIsLoading(false);
        setForm(null);
        return;
      }
      setIsLoading(true);
      try {
        const formData = await api.getForm(formId);
        const mappedForm: Form = {
          id: formData.id,
          name: formData.name,
          description: formData.description || '',
          sections: formData.sections || [],
          createdAt: formData.created_at ? new Date(formData.created_at) : new Date(formData.createdAt || Date.now()),
          updatedAt: formData.updated_at ? new Date(formData.updated_at) : new Date(formData.updatedAt || Date.now()),
        };
        setForm(mappedForm);

        const sessionData = await api.getFormSessionProgress(formId, sessionToken);
        if (sessionData.status === 'completed') {
          setStep('success');
        } else if (sessionData.progress && Object.keys(sessionData.progress).length > 0) {
          applyProgress(sessionData.progress);
        }
      } catch (error) {
        console.error('Failed to load form or session:', error);
        toast.error('Error al cargar el formulario o el enlace no es válido.');
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [formId, sessionToken, applyProgress]);

  // Save progress only when changing step or section (navigation), not while typing
  useEffect(() => {
    if (step === 'success' || !formId || !sessionToken) return;
    saveProgress();
    // Intentionally only run on step/section change; saveProgress is stable enough for this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentSectionIndex]);

  // Format phone number with mask (XXX)-XXXX-XXXX
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Apply mask: (XXX)-XXXX-XXXX
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)})-${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)})-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  };

  // Get clean phone number (only digits)
  const getCleanPhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const validateClientInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!clientInfo.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    // Phone validation - exactly 10 digits
    const cleanPhone = getCleanPhone(clientInfo.phone);
    if (!cleanPhone) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'El teléfono debe tener exactamente 10 dígitos';
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      newErrors.phone = 'El teléfono debe contener solo números';
    }
    
    // Email optional - only validate format if provided
    if (clientInfo.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientInfo.email.trim())) {
        newErrors.email = 'Ingrese un correo electrónico válido (ejemplo: correo@dominio.com)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartForm = () => {
    if (validateClientInfo()) {
      setStep('sections');
    }
  };

  const handleAnswer = (questionId: string, value: string | string[] | Date | FileAnswerValue) => {
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
      const allAnswers: Record<string, string | string[] | Date | FileAnswerValue> = { ...answers };
      
      // Ensure we have answers for all questions (even if empty)
      form.sections.forEach(section => {
        section.questions.forEach(question => {
          if (!(question.id in allAnswers)) {
            // Question not answered, skip it (don't add empty values)
          }
        });
      });

      // Convert Date objects to ISO strings and include question information
      const formattedAnswers: Record<string, any> = {};
      form.sections.forEach(section => {
        section.questions.forEach(question => {
          const answerValue = allAnswers[question.id];
          if (answerValue !== undefined && answerValue !== null) {
            // Format the answer value (file_upload stays as object with fileName, mimeType, data)
            let formattedValue: string | string[] | FileAnswerValue;
            if (answerValue instanceof Date) {
              formattedValue = answerValue.toISOString();
            } else if (Array.isArray(answerValue)) {
              formattedValue = answerValue;
            } else if (typeof answerValue === 'string') {
              formattedValue = answerValue;
            } else if (typeof answerValue === 'object' && answerValue !== null && 'data' in answerValue && 'fileName' in answerValue) {
              formattedValue = answerValue as FileAnswerValue;
            } else {
              formattedValue = String(answerValue);
            }

            // Get question title, ensuring it's not "Nueva pregunta" or empty
            let questionTitle = question.title || question.label || question.text || '';
            // If title is "Nueva pregunta" or invalid, try to get a better value
            if (!questionTitle || 
                questionTitle.trim() === '' || 
                questionTitle.trim().toLowerCase() === 'nueva pregunta' ||
                questionTitle.trim().toLowerCase() === 'nueva pregunta frecuente') {
              // Try alternative fields
              questionTitle = question.label || question.text || question.id || `Pregunta ${question.id.slice(0, 8)}`;
            }

            // Include both the answer and question information
            formattedAnswers[question.id] = {
              questionId: question.id,
              question: questionTitle,
              questionType: question.type,
              questionDescription: question.description,
              answer: formattedValue,
              options: question.options, // Preserve options for display
            };
          }
        });
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

      // Get clean phone number (only digits) for submission
      const cleanPhoneNumber = getCleanPhone(clientInfo.phone);

      const submissionData = {
        formId: form.id,
        formName: form.name,
        respondentName: clientInfo.name,
        respondentEmail: clientInfo.email.trim() || undefined,
        respondentPhone: cleanPhoneNumber || undefined,
        address: undefined,
        answers: formattedAnswers,
      };

      console.log('Full submission data:', JSON.stringify(submissionData, null, 2));

      const response = await api.createSubmission(submissionData);
      
      console.log('Submission response:', response);
      console.log('Response answers:', response.answers);
      
      if (sessionToken) {
        await api.completeFormSession(form.id, sessionToken);
      }
      
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
            onBlur={saveProgress}
            className={cn('h-12', error && 'border-destructive')}
          />
        );

      case 'long_text':
        return (
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={(value as string) || ''}
            onChange={e => handleAnswer(question.id, e.target.value)}
            onBlur={saveProgress}
            rows={4}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'multiple_choice':
        return (
          <RadioGroup
            value={(value as string) || ''}
            onValueChange={val => {
              handleAnswer(question.id, val);
              saveProgress();
            }}
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
                    saveProgress();
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
            onValueChange={val => {
              handleAnswer(question.id, val);
              saveProgress();
            }}
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
                onSelect={date => {
                  if (date) {
                    handleAnswer(question.id, date);
                    saveProgress();
                  }
                }}
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
                onClick={() => {
                  handleAnswer(question.id, star.toString());
                  saveProgress();
                }}
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

      case 'file_upload': {
        const fileValue = value as FileAnswerValue | undefined;
        const readFileAsBase64 = (file: File): Promise<FileAnswerValue> => {
          return new Promise((resolve, reject) => {
            if (file.size > MAX_FILE_SIZE_BYTES) {
              reject(new Error(`El archivo no debe superar ${MAX_FILE_SIZE_MB} MB`));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const data = reader.result as string;
              resolve({ fileName: file.name, mimeType: file.type, data });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
        };
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const isImage = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf';
          if (!isImage && !isPdf) {
            toast.error('Solo se permiten imágenes (JPG, PNG, etc.) y archivos PDF.');
            return;
          }
          try {
            const fileAnswer = await readFileAsBase64(file);
            handleAnswer(question.id, fileAnswer);
            saveProgress();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al leer el archivo');
          }
          e.target.value = '';
        };
        return (
          <div className="space-y-3">
            <label className={cn(
              'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
              error ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center px-2">
                {fileValue ? fileValue.fileName : 'Haz clic o arrastra imagen o PDF (máx. 10 MB)'}
              </span>
            </label>
            {fileValue && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-sm truncate">{fileValue.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => {
                    setAnswers(prev => {
                      const next = { ...prev };
                      delete next[question.id];
                      return next;
                    });
                    setErrors(prev => ({ ...prev, [question.id]: '' }));
                    saveProgress();
                  }}
                  title="Quitar archivo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {errors[question.id] && (
              <p className="text-sm text-destructive">{errors[question.id]}</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <img src={saruLogo} alt="Saru Visas" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
            <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
          </div>
        </div>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <img src={saruLogo} alt="Saru Visas" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
            <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
          </div>
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Enlace no válido</h1>
          <p className="text-muted-foreground">
            Para contestar este formulario necesitas usar el enlace único que te compartieron. Cada enlace guarda tu progreso en la nube.
          </p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <img src={saruLogo} alt="Saru Visas" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
            <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Formulario no encontrado</h1>
          <p className="text-muted-foreground">El enlace que has seguido no es válido o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <img src={saruLogo} alt="Saru Visas" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
            <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
          </div>
        </div>
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 shrink-0">
              <img src={saruLogo} alt="Saru Visas" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
                <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-foreground">{form.name}</h2>
          </div>
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
                    onBlur={saveProgress}
                    className={cn('h-12', errors.name && 'border-destructive')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
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
                    placeholder="(XXX)-XXXX-XXXX"
                    value={clientInfo.phone}
                    onChange={e => {
                      const inputValue = e.target.value;
                      const formatted = formatPhoneNumber(inputValue);
                      setClientInfo(prev => ({ ...prev, phone: formatted }));
                      const cleanPhone = getCleanPhone(formatted);
                      if (cleanPhone.length === 0) {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      } else if (cleanPhone.length !== 10) {
                        setErrors(prev => ({ ...prev, phone: 'El teléfono debe tener exactamente 10 dígitos' }));
                      } else {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    onBlur={() => {
                      saveProgress();
                      const cleanPhone = getCleanPhone(clientInfo.phone);
                      if (cleanPhone.length === 0) {
                        setErrors(prev => ({ ...prev, phone: 'El teléfono es obligatorio' }));
                      } else if (cleanPhone.length !== 10) {
                        setErrors(prev => ({ ...prev, phone: 'El teléfono debe tener exactamente 10 dígitos' }));
                      }
                    }}
                    maxLength={14}
                    className={cn('h-12', errors.phone && 'border-destructive')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo electrónico (opcional)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={clientInfo.email}
                    onChange={e => {
                      const emailValue = e.target.value;
                      setClientInfo(prev => ({ ...prev, email: emailValue }));
                      if (emailValue.trim()) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(emailValue.trim())) {
                          setErrors(prev => ({ ...prev, email: 'Ingrese un correo electrónico válido (ejemplo: correo@dominio.com)' }));
                        } else {
                          setErrors(prev => ({ ...prev, email: '' }));
                        }
                      } else {
                        setErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    onBlur={() => {
                      saveProgress();
                      if (clientInfo.email.trim()) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(clientInfo.email.trim())) {
                          setErrors(prev => ({ ...prev, email: 'Ingrese un correo electrónico válido (ejemplo: correo@dominio.com)' }));
                        }
                      }
                    }}
                    className={cn('h-12', errors.email && 'border-destructive')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
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
}
