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

export interface Form {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
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
