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

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  respondentName: string;
  respondentEmail: string;
  status: SubmissionStatus;
  answers: Record<string, string | string[]>;
  submittedAt: Date;
  updatedAt: Date;
}

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  in_progress: { label: 'En progreso', color: 'info' },
  completed: { label: 'Completado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'destructive' },
};

// ============= Clients =============

export type ClientStatus = 'active' | 'inactive' | 'pending';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: ClientStatus;
  formsCompleted: number;
  assignedUserId?: string; // ID del usuario asignado
  createdAt: Date;
  updatedAt: Date;
}

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'success' },
  inactive: { label: 'Inactivo', color: 'destructive' },
  pending: { label: 'Pendiente', color: 'warning' },
};
