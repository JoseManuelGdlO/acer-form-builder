import { useState, useMemo, useEffect } from 'react';
import { Client, ClientPayment, AmountDueLogEntry, PaymentDeletedLogEntry, Form, InternalAppointment } from '@/types/form';
import { User as UserOption } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientChecklist, ChecklistItem } from './ClientChecklist';
import { ClientChat, ChatMessage } from './ClientChat';
import { ClientFormData, ClientFormSubmission } from './ClientFormData';
import { ClientNotes, ClientNote } from './ClientNotes';
import { ClientPaymentHistory } from './ClientPaymentHistory';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  User, Mail, Phone, Calendar, Clock, 
  ArrowLeft, Edit2, FileText, UserCircle, ShoppingBag, Plus, ListChecks, NotebookPen, Wallet, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatPhoneOptional } from '@/lib/phone';
import { APPOINTMENT_BADGE_CLASSES } from '@/lib/appointmentColors';
import { cn } from '@/lib/utils';
import { parseFormSectionsFromApi } from '@/lib/formSections';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignedFormSession {
  id: string;
  formId: string;
  formName: string;
  status: string;
  createdAt: Date;
}

const contrastTextColor = (backgroundHex?: string | null): string => {
  if (!backgroundHex) return '#ffffff';
  const raw = backgroundHex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(raw)) return '#ffffff';
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#0f172a' : '#ffffff';
};

interface ClientProfileViewProps {
  client: Client;
  /** Asesores para asignar a familiares (solo admin). */
  users?: UserOption[];
  onBack: () => void;
  onEdit: () => void;
  onCreateChild?: () => void;
  onOpenClient?: (clientId: string) => void;
  /** Solo administrador: cambia el asesor del familiar. */
  onAssignFamilyAdvisor?: (childClientId: string, assignedUserId: string | null) => Promise<void>;
  /** Desvincula un familiar del titular (el cliente pasa a ser titular independiente). */
  onRemoveFamilyMember?: (childClientId: string) => Promise<void>;
}

export const ClientProfileView = ({
  client,
  users = [],
  onBack,
  onEdit,
  onCreateChild,
  onOpenClient,
  onAssignFamilyAdvisor,
  onRemoveFamilyMember,
}: ClientProfileViewProps) => {
  const { getActiveChecklistItems, fetchChecklistTemplates } = useSettingsStore();
  const { token, hasRole } = useAuth();
  const isAdmin = hasRole('super_admin');
  const canEditTotalAmountDue = hasRole('super_admin') || hasRole('reviewer');
  /** Solo el titular gestiona pagos; los hijos no tienen sección de pagos. */
  const isChildClient = Boolean(client.parentClientId);
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [amountDueHistory, setAmountDueHistory] = useState<AmountDueLogEntry[]>([]);
  const [paymentDeletedHistory, setPaymentDeletedHistory] = useState<PaymentDeletedLogEntry[]>([]);
  const [submissions, setSubmissions] = useState<ClientFormSubmission[]>([]);
  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const [assignedFormSessions, setAssignedFormSessions] = useState<AssignedFormSession[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [isAssigningForm, setIsAssigningForm] = useState(false);
  const [clientSnapshot, setClientSnapshot] = useState<Client>(client);
  const [isConversationPaused, setIsConversationPaused] = useState(false);
  const [hasConversationHistory, setHasConversationHistory] = useState(false);
  const [isTogglingConversationPause, setIsTogglingConversationPause] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<InternalAppointment[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<InternalAppointment[]>([]);
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newAppointmentTime, setNewAppointmentTime] = useState('');
  const [newAppointmentRole, setNewAppointmentRole] = useState<'reviewer' | 'admin'>('reviewer');
  const [newAppointmentPurpose, setNewAppointmentPurpose] = useState('');
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);
  const [familyMemberToRemove, setFamilyMemberToRemove] = useState<Pick<Client, 'id' | 'name'> | null>(null);
  const [isRemovingFamilyMember, setIsRemovingFamilyMember] = useState(false);
  const [updatingAdvisorForChildId, setUpdatingAdvisorForChildId] = useState<string | null>(null);

  useEffect(() => {
    setClientSnapshot(client);
  }, [client]);

  // Load all data when component mounts
  useEffect(() => {
    if (token) {
      loadClientData();
    }
  }, [client.id, client.parentClientId, token]);

  const loadClientData = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Refetch client to get latest data (e.g. totalAmountDue) from DB. Historial solo para admin.
      const [freshClientData, notesData, messagesData, conversationsData, submissionsData, checklistData, paymentsData, amountDueHistoryData, paymentDeletedHistoryData, formsData, formSessionsData, internalAppointmentsData] = await Promise.all([
        api.getClient(client.id, token).catch(() => null),
        api.getClientNotes(client.id, token).catch(() => []),
        api.getClientMessages(client.id, token).catch(() => []),
        api.getClientConversations(client.id, token).catch(() => []),
        api.getSubmissions({ clientId: client.id }, token).catch(() => []),
        api.getClientChecklist(client.id, token).catch(() => []),
        isChildClient ? Promise.resolve([]) : api.getClientPayments(client.id, token).catch(() => []),
        isChildClient || !isAdmin ? Promise.resolve([]) : api.getClientAmountDueHistory(client.id, token).catch(() => []),
        isChildClient || !isAdmin ? Promise.resolve([]) : api.getClientPaymentDeletedHistory(client.id, token).catch(() => []),
        api.getForms().catch(() => []),
        api.getClientFormSessions(client.id, token).catch(() => []),
        api.getClientInternalAppointments(client.id, token).catch(() => ({ upcoming: [], history: [] })),
      ]);

      setAvailableForms(
        (Array.isArray(formsData) ? formsData : []).map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description || '',
          sections: Array.isArray(f.sections) ? f.sections : [],
          createdAt: new Date(f.created_at || f.createdAt || Date.now()),
          updatedAt: new Date(f.updated_at || f.updatedAt || Date.now()),
        }))
      );
      setAssignedFormSessions(
        (Array.isArray(formSessionsData) ? formSessionsData : []).map((s: any) => ({
          id: s.id,
          formId: s.form_id || s.formId || s.form?.id,
          formName: s.form?.name || 'Formulario',
          status: s.status || 'in_progress',
          createdAt: new Date(s.created_at || s.createdAt || Date.now()),
        }))
      );
      const mapInternalAppointment = (a: any): InternalAppointment => ({
        id: a.id,
        companyId: a.company_id ?? a.companyId,
        clientId: a.client_id ?? a.clientId,
        appointmentDate: a.appointment_date ?? a.appointmentDate,
        appointmentTime: a.appointment_time ?? a.appointmentTime ?? null,
        appointedByUserId: a.appointed_by_user_id ?? a.appointedByUserId,
        appointedByUser: a.appointedByUser
          ? { id: a.appointedByUser.id, name: a.appointedByUser.name, email: a.appointedByUser.email }
          : null,
        officeRole: a.office_role ?? a.officeRole,
        purposeNote: a.purpose_note ?? a.purposeNote,
        status: a.status,
        completedAt: a.completed_at ?? a.completedAt ?? null,
        cancelledAt: a.cancelled_at ?? a.cancelledAt ?? null,
        createdAt: a.created_at ?? a.createdAt,
        updatedAt: a.updated_at ?? a.updatedAt,
      });
      setUpcomingAppointments((internalAppointmentsData.upcoming || []).map(mapInternalAppointment));
      setAppointmentHistory((internalAppointmentsData.history || []).map(mapInternalAppointment));

      if (freshClientData) {
        const totalDue = freshClientData.total_amount_due != null
          ? Number(freshClientData.total_amount_due)
          : (freshClientData.totalAmountDue != null ? Number(freshClientData.totalAmountDue) : undefined);
        const assignedUser = freshClientData.assigned_user || freshClientData.assignedUser;
        const productRaw = freshClientData.product;
        const visaTplRaw =
          freshClientData.visaStatusTemplate ??
          (freshClientData as { visa_status_template?: Client['visaStatusTemplate'] }).visa_status_template;
        setClientSnapshot({
          ...client,
          ...freshClientData,
          birthDate: freshClientData.birth_date ?? freshClientData.birthDate ?? null,
          relationshipToHolder: freshClientData.relationship_to_holder ?? freshClientData.relationshipToHolder ?? null,
          visaCasAppointmentDate: freshClientData.visa_cas_appointment_date ?? freshClientData.visaCasAppointmentDate ?? null,
          visaCasAppointmentLocation: freshClientData.visa_cas_appointment_location ?? freshClientData.visaCasAppointmentLocation ?? null,
          visaConsularAppointmentDate: freshClientData.visa_consular_appointment_date ?? freshClientData.visaConsularAppointmentDate ?? null,
          visaConsularAppointmentLocation: freshClientData.visa_consular_appointment_location ?? freshClientData.visaConsularAppointmentLocation ?? null,
          totalAmountDue: totalDue,
          assignedUserId: freshClientData.assigned_user_id ?? freshClientData.assignedUserId,
          assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
          product: productRaw && typeof productRaw === 'object' && 'title' in productRaw
            ? { id: String(productRaw.id), title: String(productRaw.title) }
            : productRaw === null
              ? null
              : client.product ?? null,
          visaStatusTemplate:
            visaTplRaw && typeof visaTplRaw === 'object' && 'label' in visaTplRaw
              ? {
                  id: String(visaTplRaw.id),
                  label: String(visaTplRaw.label),
                  order: typeof visaTplRaw.order === 'number' ? visaTplRaw.order : undefined,
                  isActive: typeof visaTplRaw.isActive === 'boolean' ? visaTplRaw.isActive : undefined,
                  color: visaTplRaw.color != null ? String(visaTplRaw.color) : null,
                }
              : visaTplRaw === null
                ? null
                : client.visaStatusTemplate ?? null,
          parentClientId: freshClientData.parent_client_id ?? freshClientData.parentClientId ?? null,
          parent: freshClientData.parent
            ? {
                id: freshClientData.parent.id,
                name: freshClientData.parent.name,
                email: freshClientData.parent.email,
                phone: freshClientData.parent.phone,
              }
            : null,
          children: Array.isArray(freshClientData.children)
            ? freshClientData.children.map((child: any) => ({
                id: child.id,
                name: child.name,
                email: child.email,
                phone: child.phone,
                parentClientId: child.parent_client_id ?? child.parentClientId ?? null,
                assignedUserId: child.assigned_user_id ?? child.assignedUserId ?? undefined,
                createdAt: new Date(child.created_at || child.createdAt),
                updatedAt: new Date(child.updated_at || child.updatedAt),
              }))
            : [],
          createdAt: new Date(freshClientData.created_at || freshClientData.createdAt),
          updatedAt: new Date(freshClientData.updated_at || freshClientData.updatedAt),
        } as Client);
      }

      // Transform notes
      const notes: ClientNote[] = notesData.map((n: any) => ({
        id: n.id,
        content: n.content,
        createdAt: new Date(n.created_at || n.createdAt),
      }));
      setClientNotes(notes);

      const paymentsList: ClientPayment[] = isChildClient
        ? []
        : (paymentsData as any[]).map((p: any) => {
            const ap = p.acquired_package ?? p.acquiredPackage;
            return {
              id: p.id,
              amount: Number(p.amount),
              paymentDate: p.payment_date || p.paymentDate,
              paymentType: (p.payment_type || p.paymentType || 'efectivo') as ClientPayment['paymentType'],
              referenceNumber: p.reference_number || p.referenceNumber,
              note: p.note,
              acquiredPackageId: p.acquired_package_id ?? p.acquiredPackageId ?? undefined,
              acquiredPackage: ap
                ? {
                    id: ap.id,
                    product: ap.product
                      ? { id: ap.product.id, title: ap.product.title }
                      : undefined,
                  }
                : undefined,
              createdAt: new Date(p.created_at || p.createdAt),
            };
          });
      setPayments(paymentsList);

      const historyEntries: AmountDueLogEntry[] = (amountDueHistoryData || []).map((h: any) => ({
        id: h.id,
        previousValue: h.previous_value != null ? Number(h.previous_value) : (h.previousValue != null ? Number(h.previousValue) : null),
        newValue: h.new_value != null ? Number(h.new_value) : (h.newValue != null ? Number(h.newValue) : null),
        createdAt: new Date(h.created_at || h.createdAt),
        changedByUser: h.changedByUser || h.changed_by_user ? { id: (h.changedByUser || h.changed_by_user).id, name: (h.changedByUser || h.changed_by_user).name, email: (h.changedByUser || h.changed_by_user).email } : null,
      }));
      setAmountDueHistory(historyEntries);

      const deletedEntries: PaymentDeletedLogEntry[] = (paymentDeletedHistoryData || []).map((h: any) => ({
        id: h.id,
        paymentId: h.payment_id || h.paymentId,
        amount: Number(h.amount),
        paymentDate: h.payment_date || h.paymentDate,
        paymentType: h.payment_type || h.paymentType || 'efectivo',
        referenceNumber: h.reference_number || h.referenceNumber || null,
        note: h.note,
        createdAt: new Date(h.created_at || h.createdAt),
        deletedByUser: h.deletedByUser || h.deleted_by_user ? { id: (h.deletedByUser || h.deleted_by_user).id, name: (h.deletedByUser || h.deleted_by_user).name, email: (h.deletedByUser || h.deleted_by_user).email } : null,
      }));
      setPaymentDeletedHistory(deletedEntries);

      // Transform messages
      const chatMessages: ChatMessage[] = messagesData.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender: m.sender === 'user' ? 'agent' : 'client',
        timestamp: new Date(m.created_at || m.createdAt),
      }));

      const conversationsList = Array.isArray(conversationsData) ? conversationsData : [];
      const lastConversation = conversationsList.length > 0
        ? conversationsList[conversationsList.length - 1]
        : null;
      setHasConversationHistory(conversationsList.length > 0);
      setIsConversationPaused(Boolean(lastConversation?.baja_logica));

      const botChatMessages: ChatMessage[] = conversationsList.map((m: any) => ({
        id: `conv-${m.id}`,
        content: m.mensaje ?? m.content,
        sender: m.from === 'bot' ? 'agent' : 'client',
        timestamp: new Date(m.created_at || m.createdAt),
      }));

      const mergedMessages = [...chatMessages, ...botChatMessages].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      setMessages(mergedMessages);

      // Transform submissions - need to get form structure to map answers
      const formSubmissions: ClientFormSubmission[] = await Promise.all(
        submissionsData.map(async (sub: any) => {
          try {
            const form = await api.getForm(sub.form_id || sub.formId);
            const formSections = parseFormSectionsFromApi(form?.sections);
            // Transform answers from JSON to the format expected by ClientFormData
            // Support both old format (questionId: answer) and new format (questionId: { question, answer, ... })
            // Iterate over saved answers directly (not form questions) to show all answered questions
            const answers: any[] = [];
            // `sub.answers` puede venir como JSON string (backend) o como objeto (compatibilidad con datos antiguos).
            // Si se itera un string directamente, `Object.entries` termina recorriendo índices/carácteres y genera miles de preguntas.
            const answersObj: Record<string, any> =
              typeof sub.answers === 'string'
                ? (() => {
                    try {
                      const parsed = JSON.parse(sub.answers);
                      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
                    } catch {
                      return {};
                    }
                  })()
                : sub.answers && typeof sub.answers === 'object' && !Array.isArray(sub.answers)
                  ? sub.answers
                  : {};

            Object.entries(answersObj).forEach(([questionId, answerData]: [string, any]) => {
                // Check if it's the new format (object with question info)
                const isNewFormat = answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData;
                
                // Try to find question from form first (as fallback)
                let foundQuestion: any = null;
                let sectionName: string = 'Sin sección';
                for (const section of formSections) {
                  const question = section.questions?.find((q: any) => q.id === questionId);
                  if (question) {
                    foundQuestion = question;
                    sectionName = section.title || (section as { label?: string }).label || 'Sin sección';
                    break;
                  }
                }
                
                let questionText: string;
                let answerValue: string | string[];
                let questionDescriptionOut: string | undefined;
                
                if (isNewFormat) {
                  const savedQuestionDescription = answerData.questionDescription;
                  const savedQuestionText = answerData.question;

                  const titleFromForm = foundQuestion
                    ? (foundQuestion.title || foundQuestion.label || foundQuestion.text)
                    : undefined;
                  const validSavedTitle =
                    savedQuestionText &&
                    typeof savedQuestionText === 'string' &&
                    savedQuestionText.trim() !== '' &&
                    savedQuestionText.trim().toLowerCase() !== 'nueva pregunta' &&
                    savedQuestionText.trim().toLowerCase() !== 'nueva pregunta frecuente';

                  // Título del campo: primero el guardado (`question`), luego el del formulario; la descripción es ayuda aparte
                  if (validSavedTitle) {
                    questionText = savedQuestionText.trim();
                  } else if (
                    titleFromForm &&
                    String(titleFromForm).trim() !== '' &&
                    String(titleFromForm).trim().toLowerCase() !== 'nueva pregunta'
                  ) {
                    questionText = String(titleFromForm).trim();
                  } else if (
                    savedQuestionDescription &&
                    typeof savedQuestionDescription === 'string' &&
                    savedQuestionDescription.trim() !== ''
                  ) {
                    questionText = savedQuestionDescription.trim();
                  } else {
                    questionText = `Pregunta ${questionId.slice(0, 8)}`;
                  }

                  const desc =
                    typeof savedQuestionDescription === 'string' && savedQuestionDescription.trim() !== ''
                      ? savedQuestionDescription.trim()
                      : undefined;
                  if (desc && desc !== questionText) {
                    questionDescriptionOut = desc;
                  } else if (foundQuestion?.description && String(foundQuestion.description).trim() !== '') {
                    const fd = String(foundQuestion.description).trim();
                    if (fd !== questionText) questionDescriptionOut = fd;
                  }
                  
                  answerValue = answerData.answer;
                  
                  // If answer is an option ID and we have options, convert to label
                  if (answerData.options && !Array.isArray(answerValue)) {
                    const option = answerData.options.find((opt: any) => opt.id === answerValue);
                    if (option) {
                      answerValue = option.label;
                    }
                  } else if (Array.isArray(answerValue) && answerData.options) {
                    // For arrays, convert option IDs to labels
                    answerValue = answerValue.map((id: string) => {
                      const option = answerData.options.find((opt: any) => opt.id === id);
                      return option ? option.label : id;
                    });
                  }
                } else {
                  // Old format: use question from form
                  questionText = foundQuestion 
                    ? (foundQuestion.title || foundQuestion.label || foundQuestion.text || `Pregunta ${questionId.slice(0, 8)}`)
                    : `Pregunta ${questionId.slice(0, 8)}`;
                  answerValue = answerData;
                  if (foundQuestion?.description && String(foundQuestion.description).trim() !== '') {
                    const fd = String(foundQuestion.description).trim();
                    if (fd !== questionText) questionDescriptionOut = fd;
                  }
                }
                
                const formatAnswer = (value: any): string => {
                  // Para respuestas tipo `date`, el backend suele mandar ISO con TZ
                  // Ej: `2026-01-30T06:00:00.000Z` -> queremos `2026-01-30`
                  if (typeof value === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
                  }
                  return String(value);
                };

                answers.push({
                  section: sectionName,
                  question: questionText,
                  ...(questionDescriptionOut ? { questionDescription: questionDescriptionOut } : {}),
                  answer: Array.isArray(answerValue)
                    ? answerValue.map((v) => formatAnswer(v)).join(', ')
                    : formatAnswer(answerValue),
                });
            });
            return {
              id: sub.id,
              formName: sub.form_name || sub.formName,
              submittedAt: new Date(sub.submitted_at || sub.submittedAt),
              answers,
            };
          } catch (error) {
            console.error('Error loading form for submission:', error);
            return {
              id: sub.id,
              formName: sub.form_name || sub.formName,
              submittedAt: new Date(sub.submitted_at || sub.submittedAt),
              answers: [],
            };
          }
        })
      );
      setSubmissions(formSubmissions);

      // Load checklist templates if not loaded
      await fetchChecklistTemplates(token);
      const activeTemplates = getActiveChecklistItems();
      
      // Map checklist data from backend
      const checklistItems: ChecklistItem[] = activeTemplates.map(template => {
        const clientItem = checklistData.find((item: any) => {
          const itemTemplateId = item.template_id || item.templateId || (item.template && item.template.id);
          return itemTemplateId === template.id;
        });
        return {
          id: template.id,
          label: template.label,
          completed: clientItem ? (clientItem.is_completed !== undefined ? clientItem.is_completed : clientItem.isCompleted || false) : false,
          clientChecklistId: clientItem?.id,
        };
      });
      setChecklist(checklistItems);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!token) return;
    try {
      const newNote = await api.createNote(client.id, content, token);
      const note: ClientNote = {
        id: newNote.id,
        content: newNote.content,
        createdAt: new Date(newNote.created_at || newNote.createdAt),
      };
      setClientNotes(prev => [note, ...prev]);
      toast.success('Nota agregada');
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar la nota');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!token) return;
    try {
      await api.deleteNote(noteId, token);
      setClientNotes(prev => prev.filter(note => note.id !== noteId));
      toast.success('Nota eliminada');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la nota');
    }
  };

  const handleAddPayment = async (data: {
    amount: number;
    paymentDate: string;
    paymentType: 'tarjeta' | 'transferencia' | 'efectivo';
    referenceNumber?: string;
    note?: string;
    acquiredPackageId?: string | null;
  }) => {
    if (!token) return;
    try {
      const newPayment = await api.createPayment(client.id, data, token);
      const ap = newPayment.acquired_package ?? newPayment.acquiredPackage;
      const payment: ClientPayment = {
        id: newPayment.id,
        amount: Number(newPayment.amount),
        paymentDate: newPayment.payment_date || newPayment.paymentDate,
        paymentType: (newPayment.payment_type || newPayment.paymentType || 'efectivo') as ClientPayment['paymentType'],
        referenceNumber: newPayment.reference_number || newPayment.referenceNumber,
        note: newPayment.note,
        acquiredPackageId: newPayment.acquired_package_id ?? newPayment.acquiredPackageId ?? undefined,
        acquiredPackage: ap
          ? {
              id: ap.id,
              product: ap.product ? { id: ap.product.id, title: ap.product.title } : undefined,
            }
          : undefined,
        createdAt: new Date(newPayment.created_at || newPayment.createdAt),
      };
      setPayments(prev => [payment, ...prev]);
      toast.success('Pago registrado');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!token) return;
    try {
      await api.deletePayment(paymentId, token);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      if (isAdmin) {
        const deletedData = await api.getClientPaymentDeletedHistory(client.id, token).catch(() => []);
        const entries: PaymentDeletedLogEntry[] = (deletedData || []).map((h: any) => ({
          id: h.id,
          paymentId: h.payment_id || h.paymentId,
          amount: Number(h.amount),
          paymentDate: h.payment_date || h.paymentDate,
          paymentType: h.payment_type || h.paymentType || 'efectivo',
          referenceNumber: h.reference_number || h.referenceNumber || null,
          note: h.note,
          createdAt: new Date(h.created_at || h.createdAt),
          deletedByUser: h.deletedByUser || h.deleted_by_user ? { id: (h.deletedByUser || h.deleted_by_user).id, name: (h.deletedByUser || h.deleted_by_user).name, email: (h.deletedByUser || h.deleted_by_user).email } : null,
        }));
        setPaymentDeletedHistory(entries);
      }
      toast.success('Pago eliminado');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el pago');
    }
  };

  const handleUpdateTotalAmountDue = async (value: number | null) => {
    if (!token || !canEditTotalAmountDue) return;
    try {
      await api.updateClient(client.id, { totalAmountDue: value }, token);
      setClientSnapshot(prev => ({ ...prev, totalAmountDue: value ?? undefined }));
      if (isAdmin) {
        const historyData = await api.getClientAmountDueHistory(client.id, token).catch(() => []);
        const entries: AmountDueLogEntry[] = (historyData || []).map((h: any) => ({
          id: h.id,
          previousValue: h.previous_value != null ? Number(h.previous_value) : (h.previousValue != null ? Number(h.previousValue) : null),
          newValue: h.new_value != null ? Number(h.new_value) : (h.newValue != null ? Number(h.newValue) : null),
          createdAt: new Date(h.created_at || h.createdAt),
          changedByUser: h.changedByUser || h.changed_by_user ? { id: (h.changedByUser || h.changed_by_user).id, name: (h.changedByUser || h.changed_by_user).name, email: (h.changedByUser || h.changed_by_user).email } : null,
        }));
        setAmountDueHistory(entries);
      }
      toast.success('Total a pagar actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el total');
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!token) return;
    const item = checklist.find(i => i.id === itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    
    try {
      // The backend should have initialized all items, so clientChecklistId should exist
      if (!item.clientChecklistId) {
        // Reload checklist to get initialized items
        await loadClientData();
        return;
      }
      
      await api.updateChecklistItem(client.id, item.clientChecklistId, { isCompleted: newCompleted }, token);
      
      setChecklist(prev => 
        prev.map(i => 
          i.id === itemId ? { ...i, completed: newCompleted } : i
        )
      );
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el checklist');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!token) return;
    try {
      const newMessage = await api.createMessage(client.id, content, 'user', token);
      const message: ChatMessage = {
        id: newMessage.id,
        content: newMessage.content,
        sender: 'agent',
        timestamp: new Date(newMessage.created_at || newMessage.createdAt),
      };
      setMessages(prev => [...prev, message]);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar el mensaje');
    }
  };

  const handleToggleConversationPause = async () => {
    const clientPhone = (clientSnapshot?.phone ?? client.phone ?? '').trim();
    if (!clientPhone) {
      toast.error('Este cliente no tiene teléfono registrado');
      return;
    }
    if (!hasConversationHistory) {
      toast.error('No hay conversación para pausar o reanudar');
      return;
    }

    const nextStatus = !isConversationPaused;
    setIsTogglingConversationPause(true);
    try {
      await api.pauseConversationByPhone(clientPhone, nextStatus);
      setIsConversationPaused(nextStatus);
      toast.success(nextStatus ? 'Conversación pausada' : 'Conversación reanudada');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado de conversación');
    } finally {
      setIsTogglingConversationPause(false);
    }
  };

  const handleAssignForm = async () => {
    if (!token) return;
    if (!selectedFormId) {
      toast.error('Selecciona un formulario para asignar');
      return;
    }
    const isAlreadyAssigned = assignedFormSessions.some((s) => s.formId === selectedFormId);
    if (isAlreadyAssigned) {
      toast.error('Este formulario ya está asignado a este cliente');
      return;
    }

    setIsAssigningForm(true);
    try {
      await api.createFormSession(selectedFormId, token, client.id);
      setSelectedFormId('');
      await loadClientData();
      toast.success('Formulario asignado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo asignar el formulario');
    } finally {
      setIsAssigningForm(false);
    }
  };

  const reloadInternalAppointments = async () => {
    if (!token) return;
    const data = await api.getClientInternalAppointments(client.id, token);
    const normalize = (a: any): InternalAppointment => ({
      id: a.id,
      companyId: a.company_id ?? a.companyId,
      clientId: a.client_id ?? a.clientId,
      appointmentDate: a.appointment_date ?? a.appointmentDate,
      appointmentTime: a.appointment_time ?? a.appointmentTime ?? null,
      appointedByUserId: a.appointed_by_user_id ?? a.appointedByUserId,
      appointedByUser: a.appointedByUser
        ? { id: a.appointedByUser.id, name: a.appointedByUser.name, email: a.appointedByUser.email }
        : null,
      officeRole: a.office_role ?? a.officeRole,
      purposeNote: a.purpose_note ?? a.purposeNote,
      status: a.status,
      completedAt: a.completed_at ?? a.completedAt ?? null,
      cancelledAt: a.cancelled_at ?? a.cancelledAt ?? null,
      createdAt: a.created_at ?? a.createdAt,
      updatedAt: a.updated_at ?? a.updatedAt,
    });
    setUpcomingAppointments((data.upcoming || []).map(normalize));
    setAppointmentHistory((data.history || []).map(normalize));
  };

  const handleCreateInternalAppointment = async () => {
    if (!token) return;
    if (!newAppointmentDate || !newAppointmentPurpose.trim()) {
      toast.error('Completa fecha y motivo de la cita');
      return;
    }
    setIsSubmittingAppointment(true);
    try {
      await api.createClientInternalAppointment(
        client.id,
        {
          appointmentDate: newAppointmentDate,
          appointmentTime: newAppointmentTime.trim() || null,
          officeRole: newAppointmentRole,
          purposeNote: newAppointmentPurpose.trim(),
        },
        token
      );
      setNewAppointmentDate('');
      setNewAppointmentTime('');
      setNewAppointmentPurpose('');
      await reloadInternalAppointments();
      toast.success('Cita interna creada');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo crear la cita');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleUpdateInternalAppointmentStatus = async (appointmentId: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    if (!token) return;
    try {
      await api.updateInternalAppointment(appointmentId, { status }, token);
      await reloadInternalAppointments();
      toast.success('Cita actualizada');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la cita');
    }
  };

  const handleDeleteInternalAppointment = async (appointmentId: string) => {
    if (!token) return;
    try {
      await api.deleteInternalAppointment(appointmentId, token);
      await reloadInternalAppointments();
      toast.success('Cita eliminada');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la cita');
    }
  };

  const handleCopyAssignedLink = async (session: AssignedFormSession) => {
    const publicUrl = `${window.location.origin}/form/${session.formId}?token=${session.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link del formulario copiado');
    } catch {
      toast.success(
        <span>
          Enlace generado. Cópialo manualmente: <br />
          <code className="text-xs break-all bg-muted px-1 rounded">{publicUrl}</code>
        </span>,
        { duration: 15000 }
      );
    }
  };

  const displayClient = clientSnapshot ?? client;
  const formatVisaAppointmentDate = (value?: string | null) => {
    if (!value) return 'Sin fecha';
    const normalized = value.length >= 10 ? value.slice(0, 10) : value;
    const parsedDate = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return normalized;
    return format(parsedDate, "d MMM yyyy", { locale: es });
  };
  const formatAppointmentLabel = (date?: string | null, location?: string | null) => {
    const dateText = formatVisaAppointmentDate(date);
    const locationText = location?.trim() ? ` - ${location.trim()}` : '';
    return `${dateText}${locationText}`;
  };
  const formatBirthDate = (value?: string | null) => {
    if (!value) return 'No registrada';
    return formatVisaAppointmentDate(value);
  };
  const formatInternalAppointmentDate = (value: string) => {
    const parsedDate = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return value;
    return format(parsedDate, "d MMM yyyy", { locale: es });
  };
  const formatInternalAppointmentDateTime = (appointment: Pick<InternalAppointment, 'appointmentDate' | 'appointmentTime'>) => {
    const datePart = formatInternalAppointmentDate(appointment.appointmentDate);
    const t = appointment.appointmentTime?.trim();
    if (t && /^\d{2}:\d{2}$/.test(t)) {
      return `${datePart} · ${t}`;
    }
    return datePart;
  };
  const familyInfoItems = displayClient.parentClientId
    ? [
        { icon: Calendar, label: 'Fecha de nacimiento', value: formatBirthDate(displayClient.birthDate) },
        { icon: UserCircle, label: 'Parentesco con titular', value: displayClient.relationshipToHolder?.trim() || 'No registrado' },
      ]
    : [];
  const contactInfoItems = displayClient.parentClientId
    ? []
    : [
        { icon: Mail, label: 'Correo', value: displayClient.email },
        { icon: Phone, label: 'Teléfono', value: formatPhoneOptional(displayClient.phone) },
      ];
  const infoItems = [
    ...contactInfoItems,
    ...familyInfoItems,
    {
      icon: ShoppingBag,
      label: 'Tipo de trámite',
      value: displayClient.product?.title?.trim() || 'Sin asignar',
    },
    { icon: UserCircle, label: 'Asesor', value: displayClient.assignedUser?.name ?? 'Sin asignar' },
    { icon: FileText, label: 'Formularios', value: `${displayClient.formsCompleted} completados` },
    { 
      icon: Calendar, 
      label: 'Registro', 
      value: format(displayClient.createdAt, "d MMM yyyy 'a las' HH:mm", { locale: es }) 
    },
    { 
      icon: Clock, 
      label: 'Actualización', 
      value: format(displayClient.updatedAt, "d MMM yyyy 'a las' HH:mm", { locale: es }) 
    },
  ];

  const handleConfirmRemoveFamilyMember = async () => {
    if (!familyMemberToRemove || !onRemoveFamilyMember) return;
    setIsRemovingFamilyMember(true);
    try {
      await onRemoveFamilyMember(familyMemberToRemove.id);
      toast.success('Familiar desvinculado del grupo');
      setFamilyMemberToRemove(null);
      await loadClientData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo desvincular al familiar';
      toast.error(message);
    } finally {
      setIsRemovingFamilyMember(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos del cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {client.name}
                </h1>
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-transparent"
                  style={
                    displayClient.visaStatusTemplate?.color
                      ? {
                          backgroundColor: displayClient.visaStatusTemplate.color,
                          color: contrastTextColor(displayClient.visaStatusTemplate.color),
                        }
                      : undefined
                  }
                >
                  {displayClient.visaStatusTemplate?.label || 'Sin estado'}
                </Badge>
                {displayClient.parentClientId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Estas viendo un cliente hijo, no el cliente principal.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={cn('inline-flex items-center gap-1', APPOINTMENT_BADGE_CLASSES.cas)}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    CAS: {formatAppointmentLabel(displayClient.visaCasAppointmentDate, displayClient.visaCasAppointmentLocation)}
                  </Badge>
                  <Badge className={cn('inline-flex items-center gap-1', APPOINTMENT_BADGE_CLASSES.consular)}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    Consulado:{' '}
                    {formatAppointmentLabel(
                      displayClient.visaConsularAppointmentDate,
                      displayClient.visaConsularAppointmentLocation
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!displayClient.parentClientId && (
              <Button onClick={onCreateChild} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar familiar
              </Button>
            )}
            <Button onClick={onEdit} variant="outline" className="gap-2">
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Info, checklist, notes, payments, forms */}
          <div className="space-y-6">
            <Accordion type="multiple" defaultValue={['info']} className="w-full rounded-lg border border-border/50 bg-card px-4 shadow-sm">
              <AccordionItem value="info">
                <AccordionTrigger className="text-base">
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Información del Cliente
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {infoItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 min-w-0"
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-medium text-foreground break-words">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {client.notes && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Notas</p>
                        <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                          {client.notes}
                        </p>
                      </div>
                    </>
                  )}
                  {displayClient.parent && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Cliente principal</p>
                        <Button variant="outline" size="sm" onClick={() => onOpenClient?.(displayClient.parent!.id)}>
                          {displayClient.parent.name}
                        </Button>
                      </div>
                    </>
                  )}
                  {(displayClient.children?.length ?? 0) > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Familiares de este cliente</p>
                        <div className="space-y-2">
                          {displayClient.children!.map((child) => (
                            <div
                              key={child.id}
                              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 bg-muted/15 p-2"
                            >
                              <div className="inline-flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-r-none border-0 shadow-none"
                                    onClick={() => onOpenClient?.(child.id)}
                                  >
                                    {child.name}
                                  </Button>
                                  {onRemoveFamilyMember && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 rounded-l-none text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFamilyMemberToRemove({ id: child.id, name: child.name });
                                      }}
                                      aria-label={`Quitar a ${child.name} del grupo familiar`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                {isAdmin && users.length > 0 && onAssignFamilyAdvisor && (
                                  <Select
                                    value={child.assignedUserId ?? '__none__'}
                                    disabled={updatingAdvisorForChildId === child.id}
                                    onValueChange={async (value) => {
                                      setUpdatingAdvisorForChildId(child.id);
                                      try {
                                        await onAssignFamilyAdvisor(
                                          child.id,
                                          value === '__none__' ? null : value
                                        );
                                        toast.success('Asesor del familiar actualizado');
                                        await loadClientData();
                                      } catch (err: unknown) {
                                        const message =
                                          err instanceof Error ? err.message : 'No se pudo actualizar el asesor';
                                        toast.error(message);
                                      } finally {
                                        setUpdatingAdvisorForChildId(null);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-[min(100%,220px)] sm:w-[220px]" data-no-view="true">
                                      <SelectValue placeholder="Asesor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Sin asignar</SelectItem>
                                      {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="checklist">
                <AccordionTrigger className="text-base">
                  <span className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-primary" />
                    Checklist
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ClientChecklist
                    clientId={client.id}
                    items={checklist}
                    onToggle={handleToggleChecklist}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notes">
                <AccordionTrigger className="text-base">
                  <span className="flex items-center gap-2">
                    <NotebookPen className="w-5 h-5 text-primary" />
                    Notas del cliente
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ClientNotes
                    clientId={client.id}
                    notes={clientNotes}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="internal-appointments">
                <AccordionTrigger className="text-base">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Proximas citas nuestras
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">Agendar cita a oficina</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <input
                          type="date"
                          value={newAppointmentDate}
                          onChange={(e) => setNewAppointmentDate(e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <input
                          type="time"
                          value={newAppointmentTime}
                          onChange={(e) => setNewAppointmentTime(e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          title="Hora (opcional)"
                        />
                        <select
                          value={newAppointmentRole}
                          onChange={(e) => setNewAppointmentRole(e.target.value as 'reviewer' | 'admin')}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="reviewer">Revisor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <Button onClick={handleCreateInternalAppointment} disabled={isSubmittingAppointment}>
                          {isSubmittingAppointment ? 'Guardando...' : 'Guardar cita'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">La hora es opcional; si la indicas, el calendario ordenará la cita por hora ese día.</p>
                      <textarea
                        value={newAppointmentPurpose}
                        onChange={(e) => setNewAppointmentPurpose(e.target.value)}
                        placeholder="Motivo de la cita en oficina"
                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">Proximas citas</p>
                      {upcomingAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay citas de oficina pendientes.</p>
                      ) : (
                        <div className="space-y-2">
                          {[...upcomingAppointments]
                            .sort((a, b) => {
                              const byDate = a.appointmentDate.localeCompare(b.appointmentDate);
                              if (byDate !== 0) return byDate;
                              const valid = (t?: string | null) => t && /^\d{2}:\d{2}$/.test(t);
                              const ta = a.appointmentTime;
                              const tb = b.appointmentTime;
                              if (valid(ta) && valid(tb)) return ta!.localeCompare(tb!);
                              if (valid(ta)) return -1;
                              if (valid(tb)) return 1;
                              return 0;
                            })
                            .map((appointment) => (
                            <div
                              key={appointment.id}
                              className="rounded-md border border-border/50 border-l-4 border-l-green-600 bg-card p-3 space-y-2 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={APPOINTMENT_BADGE_CLASSES.office}>Oficina</Badge>
                                <p className="text-sm font-medium">
                                  {formatInternalAppointmentDateTime(appointment)} —{' '}
                                  {appointment.officeRole === 'admin' ? 'Administrador' : 'Revisor'}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">{appointment.purposeNote}</p>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleUpdateInternalAppointmentStatus(appointment.id, 'completed')}>
                                  Completar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleUpdateInternalAppointmentStatus(appointment.id, 'cancelled')}>
                                  Cancelar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteInternalAppointment(appointment.id)}>
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">Historico de citas</p>
                      {appointmentHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin historial de citas de oficina.</p>
                      ) : (
                        <div className="space-y-2">
                          {appointmentHistory.map((appointment) => (
                            <div
                              key={appointment.id}
                              className="rounded-md border border-border/50 border-l-4 border-l-green-600 bg-card p-3 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge className={APPOINTMENT_BADGE_CLASSES.office}>Oficina</Badge>
                                <p className="text-sm font-medium">
                                  {formatInternalAppointmentDateTime(appointment)} — {appointment.status}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">{appointment.purposeNote}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {!displayClient.parentClientId && (
                <AccordionItem value="payments">
                  <AccordionTrigger className="text-base">
                    <span className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      Pagos e historial
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ClientPaymentHistory
                      clientId={client.id}
                      totalAmountDue={clientSnapshot.totalAmountDue}
                      onUpdateTotalAmountDue={handleUpdateTotalAmountDue}
                      payments={payments}
                      amountDueHistory={amountDueHistory}
                      paymentDeletedHistory={paymentDeletedHistory}
                      onAddPayment={handleAddPayment}
                      onDeletePayment={isAdmin ? handleDeletePayment : undefined}
                      familyMembers={displayClient.children ?? []}
                    />
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="forms">
                <AccordionTrigger className="text-base">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Información de Formularios
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">Asignar formulario al cliente</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1"
                          value={selectedFormId}
                          onChange={(e) => setSelectedFormId(e.target.value)}
                          disabled={isAssigningForm}
                        >
                          <option value="">Selecciona un formulario</option>
                          {availableForms.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <Button onClick={handleAssignForm} disabled={isAssigningForm || !selectedFormId}>
                          {isAssigningForm ? 'Asignando...' : 'Asignar formulario'}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-sm">
                      <p className="text-sm font-medium text-foreground">Formularios asignados</p>
                      {assignedFormSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay formularios asignados todavía.</p>
                      ) : (
                        <div className="space-y-2">
                          {assignedFormSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-card p-3 shadow-sm">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{session.formName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Asignado: {format(session.createdAt, "d 'de' MMM, yyyy", { locale: es })}
                                </p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleCopyAssignedLink(session)}>
                                Copiar link
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <ClientFormData submissions={submissions} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
            {displayClient.parentClientId ? (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Chat no disponible</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    El chat solo esta disponible para clientes principales.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ClientChat
                clientId={client.id}
                clientName={client.name.split(' ')[0]}
                messages={messages}
                onSendMessage={handleSendMessage}
                isConversationPaused={isConversationPaused}
                isTogglingConversationPause={isTogglingConversationPause}
                canToggleConversationPause={Boolean(displayClient.phone) && hasConversationHistory}
                onToggleConversationPause={handleToggleConversationPause}
              />
            )}
          </div>
        </div>
      </div>
    </div>

    <AlertDialog
      open={!!familyMemberToRemove}
      onOpenChange={(open) => {
        if (!open && !isRemovingFamilyMember) setFamilyMemberToRemove(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar familiar del grupo?</AlertDialogTitle>
          <AlertDialogDescription>
            {familyMemberToRemove
              ? `«${familyMemberToRemove.name}» dejará de estar vinculado a este cliente titular y pasará a ser un cliente independiente. No se borra su expediente.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemovingFamilyMember}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirmRemoveFamilyMember();
            }}
            disabled={isRemovingFamilyMember}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemovingFamilyMember ? 'Quitando…' : 'Quitar del grupo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
