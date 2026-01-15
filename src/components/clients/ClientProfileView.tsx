import { useState, useMemo } from 'react';
import { Client } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientChecklist, ChecklistItem } from './ClientChecklist';
import { ClientChat, ChatMessage } from './ClientChat';
import { ClientFormData, ClientFormSubmission } from './ClientFormData';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { 
  User, Mail, Phone, MapPin, Calendar, Clock, 
  ArrowLeft, Edit2, FileText 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientProfileViewProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
}

// Mock data for form submissions
const getMockFormSubmissions = (clientId: string): ClientFormSubmission[] => [
  {
    id: '1',
    formName: 'Solicitud de Visa Americana',
    submittedAt: new Date('2024-02-15'),
    answers: [
      { section: 'Datos Personales', question: 'Nombre completo', answer: 'Juan Pérez García' },
      { section: 'Datos Personales', question: 'Fecha de nacimiento', answer: '15/03/1985' },
      { section: 'Datos Personales', question: 'Nacionalidad', answer: 'Mexicana' },
      { section: 'Información Laboral', question: 'Ocupación actual', answer: 'Ingeniero de Software' },
      { section: 'Información Laboral', question: 'Empresa', answer: 'Tech Solutions SA' },
      { section: 'Historial de Viaje', question: '¿Ha visitado EE.UU. antes?', answer: 'Sí, en 2019' },
      { section: 'Historial de Viaje', question: 'Propósito del viaje', answer: 'Turismo familiar' },
    ],
  },
  {
    id: '2',
    formName: 'Documentos Adicionales',
    submittedAt: new Date('2024-02-18'),
    answers: [
      { section: 'Documentos', question: 'Pasaporte vigente', answer: 'Sí - Vence 2028' },
      { section: 'Documentos', question: 'Comprobante de domicilio', answer: 'Recibo CFE' },
      { section: 'Financieros', question: 'Estados de cuenta', answer: '3 meses adjuntos' },
    ],
  },
];

// Mock chat messages
const getMockChatMessages = (clientId: string): ChatMessage[] => [
  {
    id: '1',
    content: 'Hola, quisiera saber el estado de mi solicitud de visa.',
    sender: 'client',
    timestamp: new Date('2024-02-20T10:30:00'),
  },
  {
    id: '2',
    content: 'Buenos días Juan, tu solicitud está en proceso. Ya recibimos todos tus documentos.',
    sender: 'agent',
    timestamp: new Date('2024-02-20T10:35:00'),
  },
  {
    id: '3',
    content: '¿Cuándo podré agendar mi cita en el consulado?',
    sender: 'client',
    timestamp: new Date('2024-02-20T10:40:00'),
  },
  {
    id: '4',
    content: 'Te enviaremos un correo con las fechas disponibles esta semana. Estamos revisando los horarios.',
    sender: 'agent',
    timestamp: new Date('2024-02-20T10:45:00'),
  },
];

export const ClientProfileView = ({ client, onBack, onEdit }: ClientProfileViewProps) => {
  const { getActiveChecklistItems } = useSettingsStore();
  
  // Get checklist items from settings catalog
  const checklistFromCatalog = useMemo(() => {
    return getActiveChecklistItems().map(item => ({
      id: item.id,
      label: item.label,
      completed: false, // In real app, load completion status from database per client
    }));
  }, [getActiveChecklistItems]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(checklistFromCatalog);
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    getMockChatMessages(client.id)
  );

  const submissions = getMockFormSubmissions(client.id);

  const handleToggleChecklist = (itemId: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'agent',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const infoItems = [
    { icon: Mail, label: 'Correo', value: client.email },
    { icon: Phone, label: 'Teléfono', value: client.phone || 'No registrado' },
    { icon: MapPin, label: 'Dirección', value: client.address || 'No registrada' },
    { icon: FileText, label: 'Formularios', value: `${client.formsCompleted} completados` },
    { 
      icon: Calendar, 
      label: 'Registro', 
      value: format(client.createdAt, "d MMM yyyy", { locale: es }) 
    },
    { 
      icon: Clock, 
      label: 'Actualización', 
      value: format(client.updatedAt, "d MMM yyyy", { locale: es }) 
    },
  ];

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
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
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
