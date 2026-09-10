import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Form, FormSection, Question, QUESTION_TYPE_CONFIG, QuestionVisibility } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { toast } from 'sonner';
import { User, Mail, Phone, CheckCircle2, ArrowRight, ArrowLeft, Send, Loader2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getYear, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  formatPhoneNumberDisplay,
  isValidClientPhoneLength,
  normalizePhoneDigits,
} from '@/lib/phone';
import { api } from '@/lib/api';
import { useTenant } from '@/contexts/TenantContext';
import { getCompanyBrandLogo } from '@/lib/theme';
import DatePicker, { registerLocale, ReactDatePickerCustomHeaderProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';

// Registrar locale español para react-datepicker
registerLocale('es', es);

// Meses en español
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

// Generar rango de años (desde 1950 hasta año actual + 10)
const range = (start: number, end: number) => {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
};

const years = range(1920, getYear(new Date()) + 10);

// Componente CustomHeader para el DatePicker
const CustomHeader = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) => (
  <div className="flex items-center justify-between px-4 py-2">
    <button
      type="button"
      onClick={decreaseMonth}
      disabled={prevMonthButtonDisabled}
      className="rounded-md p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
    >
      <ChevronLeft className="h-5 w-5 text-foreground" />
    </button>
    
    <div className="flex gap-2">
      <select
        value={getYear(date)}
        onChange={({ target: { value } }) => changeYear(+value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={MONTHS[getMonth(date)]}
        onChange={({ target: { value } }) =>
          changeMonth(MONTHS.indexOf(value as (typeof MONTHS)[number]))
        }
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {MONTHS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>

    <button
      type="button"
      onClick={increaseMonth}
      disabled={nextMonthButtonDisabled}
      className="rounded-md p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
    >
      <ChevronRight className="h-5 w-5 text-foreground" />
    </button>
  </div>
);

function FormBrandMark({
  name,
  logoUrl,
  compact = false,
}: {
  name: string;
  logoUrl: string | null;
  compact?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={cn('w-auto object-contain', compact ? 'h-8' : 'h-10')}
        />
      ) : null}
      <p className="truncate font-display text-lg font-semibold leading-none text-primary">{name}</p>
    </div>
  );
}

function PublicStatusScreen({
  brandName,
  brandLogoUrl,
  title,
  description,
  children,
}: {
  brandName: string;
  brandLogoUrl: string | null;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-card">
        <div className="h-1.5 bg-secondary" aria-hidden />
        <CardContent className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <FormBrandMark name={brandName} logoUrl={brandLogoUrl} />
          </div>
          {children ?? (
            <>
              <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type FileAnswerValue = { fileName: string; mimeType: string; data: string };

const ACCEPTED_FILE_TYPES = 'image/*,.pdf,application/pdf';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const defaultClientInfo = {
  name: '',
  phone: '',
  email: '',
};

const normalizeFormSections = (rawSections: unknown): FormSection[] => {
  let candidate: unknown = rawSections;

  // Some legacy records store JSON as string.
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return [];
    }
  }

  // Some records may persist sections as object keyed by index/id.
  if (!Array.isArray(candidate) && candidate && typeof candidate === 'object') {
    candidate = Object.values(candidate as Record<string, unknown>);
  }

  if (!Array.isArray(candidate)) {
    return [];
  }

  const normalizeVisibility = (rawVisibility: unknown): Question['visibility'] => {
    if (!rawVisibility || typeof rawVisibility !== 'object' || Array.isArray(rawVisibility)) return undefined;
    const rv = rawVisibility as Record<string, unknown>;

    const mode = rv.mode;
    if (mode !== 'any' && mode !== 'all') return undefined;

    const rulesRaw = Array.isArray(rv.rules) ? rv.rules : [];
    const rules = rulesRaw
      .map(rule => {
        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;
        const rr = rule as Record<string, unknown>;
        const dependsOnQuestionId = rr.dependsOnQuestionId;
        const optionIdsRaw = rr.optionIds;
        const optionIds = Array.isArray(optionIdsRaw)
          ? optionIdsRaw.filter((id): id is string => typeof id === 'string')
          : [];
        if (typeof dependsOnQuestionId !== 'string') return null;
        return { dependsOnQuestionId, optionIds };
      })
      .filter((r): r is NonNullable<QuestionVisibility['rules'][number]> => r !== null);

    return {
      mode,
      rules,
    };
  };

  return candidate
    .map((section): FormSection | null => {
      if (!section || typeof section !== 'object') return null;
      const raw = section as Record<string, unknown>;
      const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
      const questions = questionsRaw
        .map((question): Question | null => {
          if (!question || typeof question !== 'object') return null;
          const q = question as Record<string, unknown>;
          const options = Array.isArray(q.options)
            ? q.options
                .filter((opt): opt is { id: string; label: string } => {
                  return !!opt && typeof opt === 'object' && typeof (opt as { id?: unknown }).id === 'string' && typeof (opt as { label?: unknown }).label === 'string';
                })
                .map(opt => ({ id: opt.id, label: opt.label }))
            : undefined;

          const typeCandidate = q.type;
          if (typeof q.id !== 'string' || typeof typeCandidate !== 'string' || typeof q.title !== 'string') {
            return null;
          }

          // Valida contra los tipos soportados por el sistema (evita pasar un `string` genérico)
          if (!(typeCandidate in QUESTION_TYPE_CONFIG)) {
            return null;
          }

          return {
            id: q.id,
            type: typeCandidate as keyof typeof QUESTION_TYPE_CONFIG,
            title: q.title,
            description: typeof q.description === 'string' ? q.description : '',
            required: Boolean(q.required),
            options,
            visibility: normalizeVisibility(q.visibility),
          };
        })
        .filter((question): question is Question => question !== null);

      if (typeof raw.id !== 'string' || typeof raw.title !== 'string') {
        return null;
      }

      return {
        id: raw.id,
        title: raw.title,
        description: typeof raw.description === 'string' ? raw.description : '',
        questions,
      };
    })
    .filter((section): section is FormSection => section !== null);
};

export default function PublicFormView() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('token');
  const { tenant } = useTenant();

  const [form, setForm] = useState<Form | null>(null);
  const [formCompany, setFormCompany] = useState<{ name: string; logoUrl: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'sections' | 'success'>('info');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [assignedClientName, setAssignedClientName] = useState<string | null>(null);
  
  // Client info
  const [clientInfo, setClientInfo] = useState(defaultClientInfo);
  
  // Submission ID (created after info step)
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  // Form answers (string | string[] | Date | FileAnswerValue for file_upload)
  const [answers, setAnswers] = useState<Record<string, string | string[] | Date | FileAnswerValue>>({});
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse progress from API into state
  const applyProgress = useCallback((progress: any) => {
    if (!progress) return;
    if (progress.clientInfo) {
      const nextClientInfo = { ...defaultClientInfo, ...progress.clientInfo };
      if (typeof nextClientInfo.phone === 'string') {
        nextClientInfo.phone = normalizePhoneDigits(nextClientInfo.phone);
      }
      setClientInfo(nextClientInfo);
    }
    if (progress.submissionId) {
      setSubmissionId(progress.submissionId);
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

  // Save progress to API (DB). En secciones no incluimos answers (están en la submission)
  // para evitar enviar ~12MB de base64 en cada guardado.
  const saveProgress = useCallback(async () => {
    if (!formId || !sessionToken || step === 'success') return;
    try {
      const progress: Record<string, any> = {
        clientInfo,
        submissionId,
        step,
        currentSectionIndex,
        savedAt: new Date().toISOString(),
      };
      // En sections no incluimos answers (evita ~12MB por guardado); se restauran desde la submission al recargar
      await api.updateFormSessionProgress(formId, sessionToken, progress);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [formId, sessionToken, clientInfo, submissionId, answers, step, currentSectionIndex]);

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
          sections: normalizeFormSections(formData.sections),
          createdAt: formData.created_at ? new Date(formData.created_at) : new Date(formData.createdAt || Date.now()),
          updatedAt: formData.updated_at ? new Date(formData.updated_at) : new Date(formData.updatedAt || Date.now()),
        };
        setForm(mappedForm);
        if (formData.company) {
          setFormCompany({ name: formData.company.name, logoUrl: formData.company.logoUrl ?? null });
        } else {
          setFormCompany(null);
        }

        const sessionData = await api.getFormSessionProgress(formId, sessionToken);
        const sessionClientName = sessionData.clientInfo?.name?.trim() || null;
        if (sessionClientName) {
          setAssignedClientName(sessionClientName);
          setClientInfo((prev) => ({ ...prev, name: sessionClientName }));
        }
        if (sessionData.status === 'completed') {
          setStep('success');
        } else if (sessionData.progress && Object.keys(sessionData.progress).length > 0) {
          const prog = sessionData.progress;
          applyProgress(prog);
          // Si estamos en sections con submissionId, cargar answers desde la submission (no del progress)
          if (prog.submissionId && prog.step === 'sections') {
            try {
              const sub = await api.getSubmissionBySession(formId, sessionToken);
              if (sub?.answers && Object.keys(sub.answers).length > 0) {
                const restored: Record<string, string | string[] | Date | FileAnswerValue> = {};
                Object.entries(sub.answers).forEach(([key, val]: [string, any]) => {
                  const v = val?.answer ?? val;
                  if (v && typeof v === 'object' && !Array.isArray(v) && 'data' in v && 'fileName' in v) {
                    restored[key] = v as FileAnswerValue;
                  } else if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
                    restored[key] = new Date(v);
                  } else {
                    restored[key] = v as string | string[] | Date;
                  }
                });
                setAnswers(restored);
              }
            } catch {
              // Fallback: usar progress.answers si existe (compatibilidad con datos antiguos)
              if (prog.answers) applyProgress({ answers: prog.answers });
            }
          }
        }

        if (sessionClientName) {
          setStep('sections');
          const progressSubmissionId = (sessionData.progress as any)?.submissionId;
          if (progressSubmissionId) {
            setSubmissionId(progressSubmissionId);
          } else {
            try {
              const submission = await api.createSubmissionFromSession(formId, sessionToken, {});
              setSubmissionId(submission.id);
            } catch (error) {
              console.error('Failed to create assigned-client submission:', error);
            }
          }
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

  // Save progress only when changing step, section, or submissionId (navigation), not while typing
  useEffect(() => {
    if (step === 'success' || !formId || !sessionToken) return;
    saveProgress();
    // Intentionally only run on step/section/submissionId change; saveProgress is stable enough for this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentSectionIndex, submissionId]);

  const getCleanPhone = (phone: string): string => {
    return normalizePhoneDigits(phone);
  };

  const validateClientInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!clientInfo.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    const cleanPhone = getCleanPhone(clientInfo.phone);
    if (!cleanPhone || cleanPhone === '+') {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!isValidClientPhoneLength(cleanPhone)) {
      newErrors.phone =
        'El teléfono debe tener 10 u 11 dígitos (puede incluir + para prefijo internacional).';
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

  // Al avanzar desde la pantalla de datos (nombre, teléfono, correo), se crea el cliente
  // y el submission, y se pausa la conversación con el agente para ese teléfono (baja lógica).
  const handleStartForm = async () => {
    if (!validateClientInfo()) return;
    
    if (!formId || !sessionToken) {
      toast.error('Error: No se pudo identificar el formulario');
      return;
    }

    const cleanPhone = getCleanPhone(clientInfo.phone);
    
    try {
      // Pause conversation with the agent
      try {
        await api.pauseConversationByPhone(cleanPhone, true);
      } catch (err) {
        console.error('No se pudo pausar la conversación con el asistente:', err);
        toast.warning('No se pudo pausar la conversación con el asistente, pero puedes continuar con el formulario.');
      }

      // Check if submission already exists (user may have started on another device)
      if (!submissionId) {
        // Create client and submission only if it doesn't exist yet
        const submission = await api.createSubmissionFromSession(
          formId,
          sessionToken,
          clientInfo
        );
        
        setSubmissionId(submission.id);
        console.log('Created submission:', submission.id);
      } else {
        console.log('Submission already exists:', submissionId);
      }
      
      setStep('sections');
    } catch (error: any) {
      console.error('Failed to create submission:', error);
      toast.error('Error al crear el registro. Por favor intenta de nuevo.');
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

  const isAnswered = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    if (typeof value === 'object') return true; // includes file_upload answers
    return true;
  };

  const allQuestions = useMemo(() => {
    return (form?.sections ?? []).flatMap(s => s.questions ?? []);
  }, [form]);

  const questionById = useMemo(() => {
    const map: Record<string, Question> = {};
    for (const q of allQuestions) map[q.id] = q;
    return map;
  }, [allQuestions]);

  const visibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();

    if (!form) return map;

    const visiting = new Set<string>();

    const isVisibleById = (questionId: string): boolean => {
      if (map.has(questionId)) return map.get(questionId) as boolean;
      if (visiting.has(questionId)) return false; // avoid cycles

      visiting.add(questionId);

      const q = questionById[questionId];
      if (!q) {
        visiting.delete(questionId);
        map.set(questionId, true);
        return true;
      }

      const visibility = q.visibility;
      if (!visibility) {
        visiting.delete(questionId);
        map.set(questionId, true);
        return true;
      }

      const rules = Array.isArray(visibility.rules) ? visibility.rules : [];
      if (rules.length === 0) {
        visiting.delete(questionId);
        map.set(questionId, false);
        return false;
      }

      const results = rules.map(rule => {
        // If parent is not visible, the child is not visible either.
        if (!isVisibleById(rule.dependsOnQuestionId)) return false;

        const parentAnswer = answers[rule.dependsOnQuestionId];
        if (parentAnswer === undefined || parentAnswer === null) return false;

        const optionIds = Array.isArray(rule.optionIds) ? rule.optionIds : [];
        if (optionIds.length === 0) return false;

        if (typeof parentAnswer === 'string') {
          return optionIds.includes(parentAnswer);
        }
        if (Array.isArray(parentAnswer)) {
          return parentAnswer.some(v => optionIds.includes(v));
        }

        return false;
      });

      const isVisible = visibility.mode === 'any' ? results.some(Boolean) : results.every(Boolean);
      visiting.delete(questionId);
      map.set(questionId, isVisible);
      return isVisible;
    };

    for (const q of allQuestions) {
      isVisibleById(q.id);
    }

    return map;
  }, [form, allQuestions, questionById, answers]);

  // Cleanup: si una pregunta deja de ser visible, eliminamos su respuesta y error.
  useEffect(() => {
    if (!form) return;

    const invisibleQuestionIds: string[] = [];
    for (const q of allQuestions) {
      if (!visibilityMap.get(q.id)) invisibleQuestionIds.push(q.id);
    }

    if (invisibleQuestionIds.length === 0) return;

    setAnswers(prev => {
      let changed = false;
      const next = { ...prev };
      for (const qId of invisibleQuestionIds) {
        if (qId in next) {
          delete (next as any)[qId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setErrors(prev => {
      let changed = false;
      const next = { ...prev };
      for (const qId of invisibleQuestionIds) {
        if (qId in next) {
          delete (next as any)[qId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [form, allQuestions, visibilityMap]);

  const validateCurrentSection = () => {
    if (!form) return true;
    const section = form.sections[currentSectionIndex];
    const newErrors: Record<string, string> = {};
    
    const visibleQuestions = section.questions.filter(q => visibilityMap.get(q.id));
    visibleQuestions.forEach(question => {
      if (question.required && !isAnswered(answers[question.id])) {
        newErrors[question.id] = 'Esta pregunta es obligatoria';
      }
    });
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Format answers for API - shared by handleNext and handleSubmit
  const formatAnswersForApi = useCallback((questions: Question[]) => {
    const result: Record<string, any> = {};
    questions.forEach(question => {
      const answerValue = answers[question.id];
      if (answerValue !== undefined && answerValue !== null) {
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
        const questionTitle = question.title && question.title.trim() && !/nueva pregunta/i.test(question.title.trim())
          ? question.title
          : (question.id?.slice(0, 8) ?? question.id);
        result[question.id] = {
          questionId: question.id,
          question: questionTitle,
          questionType: question.type,
          questionDescription: question.description,
          answer: formattedValue,
          options: question.options,
        };
      }
    });
    return result;
  }, [answers]);

  const handleNext = async () => {
    if (!form) return;
    
    if (validateCurrentSection()) {
      const isLastSection = currentSectionIndex >= form.sections.length - 1;

      if (formId && sessionToken && !isLastSection) {
        // Solo enviar respuestas de la sección actual (reduce payload ~10x con archivos)
        const section = form.sections[currentSectionIndex];
        const visibleQuestions = section.questions.filter(q => visibilityMap.get(q.id));
        const sectionAnswers = formatAnswersForApi(visibleQuestions);
        if (Object.keys(sectionAnswers).length > 0) {
          api.updateSubmissionFromSession(formId, sessionToken, sectionAnswers)
            .then(() => console.log('Progreso guardado'))
            .catch((err) => {
              console.warn('Error al guardar progreso:', err);
              toast.warning('No se pudo guardar el progreso, pero puedes continuar');
            });
          // No await: avanza inmediato, guarda en segundo plano
        }
      }

      if (isLastSection) {
        handleSubmit();
      } else {
        setCurrentSectionIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!assignedClientName) {
      setStep('info');
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    
    if (!formId || !sessionToken) {
      toast.error('Error: No se pudo identificar el formulario');
      return;
    }
    
    try {
      const visibleQuestions = form.sections
        .flatMap(s => s.questions ?? [])
        .filter(q => visibilityMap.get(q.id));

      const requiredVisibleQuestions = visibleQuestions.filter(q => q.required);
      const missingRequired = requiredVisibleQuestions.filter(q => !isAnswered(answers[q.id]));

      if (missingRequired.length > 0) {
        const nextErrors: Record<string, string> = {};
        missingRequired.forEach(q => {
          nextErrors[q.id] = 'Esta pregunta es obligatoria';
        });
        setErrors(prev => ({ ...prev, ...nextErrors }));
        toast.error('Por favor, completa las preguntas obligatorias.');
        return;
      }

      const formattedAnswers = formatAnswersForApi(visibleQuestions);

      // Update the existing submission with final answers and mark as pending (completed)
      const response = await api.updateSubmissionFromSession(
        formId,
        sessionToken,
        formattedAnswers,
        { status: 'pending' }
      );
      
      console.log('Submission updated:', response);
      console.log('Response answers:', response.answers);
      
      // Complete the session
      await api.completeFormSession(form.id, sessionToken);
      
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
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                  value === option.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
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
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                  selectedValues.includes(option.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
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

      case 'date': {
        return (
          <div className={cn('relative', error && 'rounded-lg')}>
            <DatePicker
              selected={value as Date | null}
              onChange={(date: Date | null) => {
                if (date) {
                  handleAnswer(question.id, date);
                  saveProgress();
                }
              }}
              renderCustomHeader={CustomHeader}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona una fecha"
              locale="es"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              className={cn(
                'h-12 w-full rounded-md border border-input bg-background px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                error && 'border-destructive'
              )}
              wrapperClassName="w-full"
              calendarClassName="rounded-lg border border-border shadow-lg"
            />
          </div>
        );
      }

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
                  'h-12 w-12 rounded-md border text-2xl transition-colors',
                  parseInt(rating) >= star
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border hover:border-secondary/50'
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
              'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
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
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
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

  const companyDisplayName = formCompany?.name || tenant?.company?.name || 'Compañía';
  const companyLogoUrl = getCompanyBrandLogo(tenant?.theme, formCompany?.logoUrl ?? tenant?.company?.logoUrl);

  if (isLoading) {
    return (
      <PublicStatusScreen brandName={companyDisplayName} brandLogoUrl={companyLogoUrl}>
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando formulario...</p>
      </PublicStatusScreen>
    );
  }

  if (!sessionToken) {
    return (
      <PublicStatusScreen
        brandName={companyDisplayName}
        brandLogoUrl={companyLogoUrl}
        title="Enlace no válido"
        description="Para contestar este formulario necesitas usar el enlace único que te compartieron. Cada enlace guarda tu progreso en la nube."
      />
    );
  }

  if (!form) {
    return (
      <PublicStatusScreen
        brandName={companyDisplayName}
        brandLogoUrl={companyLogoUrl}
        title="Formulario no encontrado"
        description="El enlace que has seguido no es válido o ha expirado."
      />
    );
  }

  if (step === 'success') {
    return (
      <PublicStatusScreen brandName={companyDisplayName} brandLogoUrl={companyLogoUrl}>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">
          ¡Formulario enviado!
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Hemos recibido tu información. Nos pondremos en contacto contigo pronto.
        </p>
        <p className="text-sm text-muted-foreground">
          Puedes cerrar esta ventana.
        </p>
      </PublicStatusScreen>
    );
  }

  const progress = form.sections.length > 0
    ? ((currentSectionIndex + 1) / form.sections.length) * 100
    : 0;

  if (step === 'sections' && form.sections.length === 0) {
    return (
      <PublicStatusScreen
        brandName={companyDisplayName}
        brandLogoUrl={companyLogoUrl}
        title="Formulario no disponible"
        description="Este formulario no tiene secciones configuradas. Solicita a tu asesor que vuelva a generar el enlace."
      />
    );
  }

  const currentSection = form.sections[currentSectionIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-card/80">
        <div className="h-1 bg-secondary" aria-hidden />
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <FormBrandMark name={companyDisplayName} logoUrl={companyLogoUrl} compact />
            <h2 className="font-display text-lg font-semibold text-foreground">{form.name}</h2>
          </div>
          {step === 'sections' && (
            <div className="mt-3">
              {assignedClientName && (
                <div className="mb-2">
                  <StatusBadge tone="accent">Cliente: {assignedClientName}</StatusBadge>
                </div>
              )}
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Sección {currentSectionIndex + 1} de {form.sections.length}</span>
                <span className="font-display font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-muted" />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {step === 'info' && !assignedClientName ? (
          <Card className="overflow-hidden shadow-card">
            <CardContent className="p-6 md:p-8">
              <div className="mb-8 text-center">
                <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">
                  Antes de comenzar
                </h2>
                <p className="text-sm text-muted-foreground">
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
                    placeholder="(XXX)-XXX-XXXX o +1 (555) 123-4567"
                    value={formatPhoneNumberDisplay(clientInfo.phone)}
                    onChange={e => {
                      const normalized = normalizePhoneDigits(e.target.value);
                      setClientInfo(prev => ({ ...prev, phone: normalized }));
                      if (!normalized || normalized === '+') {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      } else if (!isValidClientPhoneLength(normalized)) {
                        setErrors(prev => ({
                          ...prev,
                          phone:
                            'El teléfono debe tener 10 u 11 dígitos (puede incluir + para prefijo internacional).',
                        }));
                      } else {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    onBlur={() => {
                      saveProgress();
                      const p = clientInfo.phone;
                      if (!p || p === '+') {
                        setErrors(prev => ({ ...prev, phone: 'El teléfono es obligatorio' }));
                      } else if (!isValidClientPhoneLength(p)) {
                        setErrors(prev => ({
                          ...prev,
                          phone:
                            'El teléfono debe tener 10 u 11 dígitos (puede incluir + para prefijo internacional).',
                        }));
                      }
                    }}
                    maxLength={22}
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
                className="mt-8 h-12 w-full gap-2 text-base"
                size="lg"
              >
                Comenzar formulario
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-card">
            <CardContent className="p-6 md:p-8">
              <div className="mb-8 border-b border-border pb-6">
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
                    {currentSectionIndex + 1}
                  </span>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {currentSection.title}
                  </h2>
                </div>
                {currentSection.description && (
                  <p className="ml-11 text-sm text-muted-foreground">
                    {currentSection.description}
                  </p>
                )}
              </div>

              <div className="space-y-8">
                {currentSection.questions
                  .filter(question => visibilityMap.get(question.id))
                  .map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        {index + 1}. {question.title}
                        {question.required && (
                          <span className="ml-1 text-destructive">*</span>
                        )}
                      </h3>
                      {question.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
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

              <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNext}
                  className="gap-2"
                >
                  {currentSectionIndex === form.sections.length - 1 ? (
                    <>
                      Enviar
                      <Send className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Siguiente sección
                      <ArrowRight className="h-4 w-4" />
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
