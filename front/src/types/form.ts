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

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
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

export type ClientStatus = 'active' | 'inactive' | 'pending';

export interface ClientAssignedUser {
  id: string;
  name: string;
  email?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: ClientStatus;
  formsCompleted: number;
  assignedUserId?: string;
  assignedUser?: ClientAssignedUser | null;
  totalAmountDue?: number;
  totalPaid?: number;
  createdAt: Date;
  updatedAt: Date;
  checklistProgress?: number;
  checklistStatus?: 'completed' | 'in_progress' | 'not_started';
  checklistCompleted?: number;
  checklistTotal?: number;
  checklistByTemplate?: Record<string, { completed: boolean; templateId: string }>;
}

export type PaymentType = 'tarjeta' | 'transferencia' | 'efectivo';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

export interface ClientPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
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
  note?: string | null;
  createdAt: Date;
  deletedByUser?: { id: string; name: string; email?: string } | null;
}

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'success' },
  inactive: { label: 'Inactivo', color: 'destructive' },
  pending: { label: 'Pendiente', color: 'warning' },
};
