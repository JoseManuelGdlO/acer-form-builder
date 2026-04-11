export type QuestionType = 
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'checkbox'
  | 'date'
  | 'file_upload'
  | 'dropdown'
  | 'rating';

export interface QuestionOption {
  id: string;
  label: string;
}

export type QuestionVisibilityMode = 'any' | 'all';

export interface QuestionVisibilityRule {
  /**
   * id de la pregunta "padre" de la que depende esta pregunta.
   */
  dependsOnQuestionId: string;
  /**
   * ids de opciones (de la pregunta padre) que hacen que la regla sea verdadera.
   */
  optionIds: string[];
}

export interface QuestionVisibility {
  /**
   * - 'any': al menos una regla debe ser verdadera
   * - 'all': todas las reglas deben ser verdaderas
   */
  mode: QuestionVisibilityMode;
  rules: QuestionVisibilityRule[];
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  /**
   * Lógica condicional opcional: controla si esta pregunta se muestra o no
   * según la respuesta de otras preguntas.
   */
  visibility?: QuestionVisibility;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  sections: FormSection[];
  createdAt: Date;
  updatedAt: Date;
}

export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; icon: string; description: string }> = {
  short_text: {
    label: 'Texto corto',
    icon: 'Type',
    description: 'Respuesta de una línea'
  },
  long_text: {
    label: 'Texto largo',
    icon: 'AlignLeft',
    description: 'Respuesta de múltiples líneas'
  },
  multiple_choice: {
    label: 'Opción múltiple',
    icon: 'CircleDot',
    description: 'Seleccionar una opción'
  },
  checkbox: {
    label: 'Casillas',
    icon: 'CheckSquare',
    description: 'Seleccionar varias opciones'
  },
  date: {
    label: 'Fecha',
    icon: 'Calendar',
    description: 'Seleccionar una fecha'
  },
  file_upload: {
    label: 'Subir archivo',
    icon: 'Upload',
    description: 'Cargar imagen o documento'
  },
  dropdown: {
    label: 'Lista desplegable',
    icon: 'ChevronDown',
    description: 'Seleccionar de una lista'
  },
  rating: {
    label: 'Calificación',
    icon: 'Star',
    description: 'Valoración con estrellas'
  }
};

export type SubmissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Answer format - supports both old format (direct value) and new format (object with question info)
export type SubmissionAnswer = 
  | string 
  | string[] 
  | {
      questionId: string;
      question: string;
      questionType?: QuestionType;
      questionDescription?: string;
      answer: string | string[];
      options?: QuestionOption[];
    };

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  respondentName: string;
  respondentEmail: string;
  respondentPhone?: string;
  status: SubmissionStatus;
  answers: Record<string, SubmissionAnswer>;
  submittedAt: Date;
  updatedAt: Date;
  clientId?: string;
  form?: Form; // Form data when fetched with include
}

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  in_progress: { label: 'En progreso', color: 'info' },
  completed: { label: 'Completado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'destructive' },
};

// ============= Clients =============

export interface ClientAssignedUser {
  id: string;
  name: string;
  email?: string;
}

export interface Client {
  id: string;
  parentClientId?: string | null;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string | null;
  relationshipToHolder?: string | null;
  notes?: string;
  visaCasAppointmentDate?: string | null;
  visaCasAppointmentLocation?: string | null;
  visaConsularAppointmentDate?: string | null;
  visaConsularAppointmentLocation?: string | null;
  visaStatusTemplateId: string;
  visaStatusTemplate?: { id: string; label: string; order?: number; isActive?: boolean; color?: string | null } | null;
  formsCompleted: number;
  assignedUserId?: string;
  assignedUser?: ClientAssignedUser | null;
  productId?: string;
  product?: { id: string; title: string } | null;
  totalAmountDue?: number;
  totalPaid?: number;
  createdAt: Date;
  updatedAt: Date;
  checklistProgress?: number;
  checklistStatus?: 'completed' | 'in_progress' | 'not_started';
  checklistCompleted?: number;
  checklistTotal?: number;
  checklistByTemplate?: Record<string, { completed: boolean; templateId: string }>;
  assignedTrips?: { id: string; title: string }[];
  nextOfficeAppointment?: { appointmentDate: string; purposeNote?: string | null } | null;
  parent?: Pick<Client, 'id' | 'name' | 'email' | 'phone'> | null;
  children?: Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'parentClientId' | 'assignedUserId' | 'createdAt' | 'updatedAt'>[];
}

export type InternalAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type OfficeRole = 'reviewer' | 'admin';

export interface InternalAppointment {
  id: string;
  companyId: string;
  clientId: string;
  appointmentDate: string;
  /** HH:mm opcional (citas internas) */
  appointmentTime?: string | null;
  appointedByUserId: string;
  appointedByUser?: { id: string; name: string; email?: string } | null;
  officeRole: OfficeRole;
  purposeNote: string;
  status: InternalAppointmentStatus;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  type:
    | 'office'
    | 'cas'
    | 'consular'
    | 'trip_departure'
    | 'trip_return'
    | 'trip_visa_cas_dep'
    | 'trip_visa_cas_ret'
    | 'trip_visa_con_dep'
    | 'trip_visa_con_ret';
  date: string;
  title: string;
  /** HH:mm (principalmente citas internas) */
  startTime?: string | null;
  clientId?: string;
  clientName?: string;
  tripId?: string;
  note?: string;
  status?: string;
  /** Sucursal (asesor del cliente / viaje) para filtros y badge en oficina */
  branchName?: string;
  /** Cita oficina: asesor asignado al cliente */
  advisorName?: string;
}

export type PaymentType = 'tarjeta' | 'transferencia' | 'efectivo';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

export interface ClientAcquiredPackage {
  id: string;
  productId: string;
  product: { id: string; title: string } | null;
  beneficiaryClientId?: string | null;
  beneficiary?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ClientPayment {
  id: string;
  clientId?: string;
  tripId?: string | null;
  acquiredPackageId?: string | null;
  acquiredPackage?: {
    id: string;
    product?: { id: string; title: string };
  } | null;
  client?: { id: string; name: string };
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  referenceNumber?: string;
  note?: string;
  createdAt: Date;
}

export interface AmountDueLogEntry {
  id: string;
  previousValue: number | null;
  newValue: number | null;
  createdAt: Date;
  changedByUser?: { id: string; name: string; email?: string } | null;
}

export interface PaymentDeletedLogEntry {
  id: string;
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  referenceNumber?: string | null;
  note?: string | null;
  createdAt: Date;
  deletedByUser?: { id: string; name: string; email?: string } | null;
}

// ============= Groups =============

export interface ClientLastSubmission {
  formName: string;
  submittedAt: string;
}

export interface Group {
  id: string;
  title: string;
  assignedUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  clients?: (Client & { lastSubmission?: ClientLastSubmission | null })[];
  assignedTrips?: { id: string; title: string }[];
}

// ============= Trips =============

/** Asesor del cliente en contexto de viaje, con sucursal (oficina) si aplica */
export interface TripParticipantAdvisor extends ClientAssignedUser {
  branch?: { id: string; name: string } | null;
}

export interface TripParticipantClient extends Omit<Client, 'assignedUser'> {
  company?: { id: string; name: string };
  totalAmountDue?: number | null;
  /** Saldo pendiente (total a pagar − suma de pagos), solo titulares; lo envía el API del viaje */
  tripBalanceDue?: number | null;
  assignedUser?: TripParticipantAdvisor | null;
}

export interface TripSeatAssignmentEntry {
  id?: string;
  clientId: string;
  seatNumber?: number | null;
  seatId?: string | null;
  client?: Client & { company?: { id: string; name: string } };
}

export type BusBathroomPosition = 'front' | 'middle' | 'back';

export type BusLayoutElementType = 'seat' | 'bathroom' | 'stairs' | 'door' | 'driver' | 'aisle' | 'blocked';

export interface BusLayoutCanvas {
  width: number;
  height: number;
  gridSize: number;
}

export interface BusLayoutElement {
  id: string;
  type: BusLayoutElementType;
  x: number;
  y: number;
  label?: string;
  width?: number;
  height?: number;
  rotation?: number;
  metadata?: Record<string, unknown>;
}

export interface BusLayoutFloor {
  elements: BusLayoutElement[];
}

export interface BusLayout {
  floors: BusLayoutFloor[];
  /**
   * Optional rendering hints. When missing, consumers must fall back to defaults.
   */
  canvas?: BusLayoutCanvas;
}

export interface BusTemplate {
  id: string;
  companyId: string;
  name: string;
  totalSeats: number;
  rows: number;
  bathroomPosition: BusBathroomPosition;
  floors: number;
  stairsPosition?: string | null;
  seatLabels?: string[] | null;
  layout?: BusLayout | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination?: string | null;
  departureDate: string;
  returnDate: string;
  isVisaTrip?: boolean;
  casDepartureDate?: string | null;
  casReturnDate?: string | null;
  consulateDepartureDate?: string | null;
  consulateReturnDate?: string | null;
  notes?: string | null;
  totalSeats: number;
  companyId?: string;
  busTemplateId?: string | null;
  busTemplate?: BusTemplate | null;
  assignedUserId?: string | null;
  sharedCompanies?: { id: string; name: string }[];
  participants?: { id: string; clientId: string; client?: TripParticipantClient }[];
  seatAssignments?: TripSeatAssignmentEntry[];
  participantCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripInvitation {
  id: string;
  tripId: string;
  trip?: {
    id: string;
    title: string;
    destination?: string;
    departureDate: string;
    returnDate: string;
    totalSeats: number;
    isVisaTrip?: boolean;
    casDepartureDate?: string | null;
    casReturnDate?: string | null;
    consulateDepartureDate?: string | null;
    consulateReturnDate?: string | null;
  };
  invitedCompanyId: string;
  invitedBy?: { id: string; name: string; email?: string };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface TripChangeLogEntry {
  id: string;
  tripId: string;
  userId: string;
  user?: { id: string; name: string };
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface TripIncome {
  id: string;
  clientId: string;
  tripId?: string | null;
  client?: { id: string; name: string };
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  referenceNumber?: string;
  note?: string;
  createdAt?: string;
}

export interface TripExpense {
  id: string;
  tripId: string;
  amount: number;
  expenseDate: string;
  category?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  createdAt?: string;
}

export interface TripFinanceSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
}
