import { useState, useMemo, useEffect } from 'react';
import { Client } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientChecklist, ChecklistItem } from './ClientChecklist';
import { ClientChat, ChatMessage } from './ClientChat';
import { ClientFormData, ClientFormSubmission } from './ClientFormData';
import { ClientNotes, ClientNote } from './ClientNotes';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  User, Mail, Phone, MapPin, Calendar, Clock, 
  ArrowLeft, Edit2, FileText 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientProfileViewProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
}

export const ClientProfileView = ({ client, onBack, onEdit }: ClientProfileViewProps) => {
  const { getActiveChecklistItems, fetchChecklistTemplates } = useSettingsStore();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [submissions, setSubmissions] = useState<ClientFormSubmission[]>([]);

  // Load all data when component mounts
  useEffect(() => {
    if (token) {
      loadClientData();
    }
  }, [client.id, token]);

  const loadClientData = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Load data in parallel
      const [notesData, messagesData, submissionsData, checklistData] = await Promise.all([
        api.getClientNotes(client.id, token).catch(() => []),
        api.getClientMessages(client.id, token).catch(() => []),
        api.getSubmissions({ clientId: client.id }, token).catch(() => []),
        api.getClientChecklist(client.id, token).catch(() => []),
      ]);

      // Transform notes
      const notes: ClientNote[] = notesData.map((n: any) => ({
        id: n.id,
        content: n.content,
        createdAt: new Date(n.created_at || n.createdAt),
      }));
      setClientNotes(notes);

      // Transform messages
      const chatMessages: ChatMessage[] = messagesData.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender: m.sender === 'user' ? 'agent' : 'client',
        timestamp: new Date(m.created_at || m.createdAt),
      }));
      setMessages(chatMessages);

      // Transform submissions - need to get form structure to map answers
      const formSubmissions: ClientFormSubmission[] = await Promise.all(
        submissionsData.map(async (sub: any) => {
          try {
            const form = await api.getForm(sub.form_id || sub.formId);
            // Transform answers from JSON to the format expected by ClientFormData
            // Support both old format (questionId: answer) and new format (questionId: { question, answer, ... })
            // Iterate over saved answers directly (not form questions) to show all answered questions
            const answers: any[] = [];
            if (sub.answers) {
              Object.entries(sub.answers).forEach(([questionId, answerData]: [string, any]) => {
                // Check if it's the new format (object with question info)
                const isNewFormat = answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData;
                
                // Try to find question from form first (as fallback)
                let foundQuestion: any = null;
                let sectionName: string = 'Sin sección';
                if (form.sections) {
                  for (const section of form.sections) {
                    const question = section.questions?.find((q: any) => q.id === questionId);
                    if (question) {
                      foundQuestion = question;
                      sectionName = section.title || section.label || 'Sin sección';
                      break;
                    }
                  }
                }
                
                let questionText: string;
                let answerValue: string | string[];
                
                if (isNewFormat) {
                  // New format: use questionDescription as primary, question as fallback
                  const savedQuestionDescription = answerData.questionDescription;
                  const savedQuestionText = answerData.question;
                  
                  // Prefer questionDescription over question
                  if (savedQuestionDescription && 
                      typeof savedQuestionDescription === 'string' &&
                      savedQuestionDescription.trim() !== '') {
                    questionText = savedQuestionDescription;
                  } else if (savedQuestionText && 
                             typeof savedQuestionText === 'string' &&
                             savedQuestionText.trim() !== '' &&
                             savedQuestionText.trim().toLowerCase() !== 'nueva pregunta' &&
                             savedQuestionText.trim().toLowerCase() !== 'nueva pregunta frecuente') {
                    questionText = savedQuestionText;
                  } else if (foundQuestion) {
                    // Use form question text as fallback
                    const formQuestionText = foundQuestion.title || foundQuestion.label || foundQuestion.text;
                    questionText = (formQuestionText && formQuestionText.trim() !== '' && formQuestionText.trim().toLowerCase() !== 'nueva pregunta')
                      ? formQuestionText
                      : savedQuestionDescription || savedQuestionText || `Pregunta ${questionId.slice(0, 8)}`;
                  } else {
                    questionText = savedQuestionDescription || savedQuestionText || `Pregunta ${questionId.slice(0, 8)}`;
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
                }
                
                answers.push({
                  section: sectionName,
                  question: questionText,
                  answer: Array.isArray(answerValue) ? answerValue.join(', ') : String(answerValue),
                });
              });
            }
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

  const infoItems = [
    { icon: Mail, label: 'Correo', value: client.email },
    { icon: Phone, label: 'Teléfono', value: client.phone || 'No registrado' },
    { icon: MapPin, label: 'Dirección', value: client.address || 'No registrada' },
    { icon: FileText, label: 'Formularios', value: `${client.formsCompleted} completados` },
    { 
      icon: Calendar, 
      label: 'Registro', 
      value: format(client.createdAt, "d MMM yyyy 'a las' HH:mm", { locale: es }) 
    },
    { 
      icon: Clock, 
      label: 'Actualización', 
      value: format(client.updatedAt, "d MMM yyyy 'a las' HH:mm", { locale: es }) 
    },
  ];

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
                <ClientStatusBadge status={client.status} />
              </div>
            </div>
          </div>
          <Button onClick={onEdit} variant="outline" className="gap-2">
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Info, Checklist, Form Data */}
          <div className="space-y-6">
            {/* Client Info Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {infoItems.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-3',
                        item.label === 'Dirección' && 'sm:col-span-2'
                      )}
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
              </CardContent>
            </Card>

            {/* Client Notes */}
            <ClientNotes
              clientId={client.id}
              notes={clientNotes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
            />

            {/* Checklist */}
            <ClientChecklist 
              clientId={client.id}
              items={checklist}
              onToggle={handleToggleChecklist}
            />

            {/* Form Submissions */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Información de Formularios
              </h3>
              <ClientFormData submissions={submissions} />
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
            <ClientChat
              clientId={client.id}
              clientName={client.name.split(' ')[0]}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
