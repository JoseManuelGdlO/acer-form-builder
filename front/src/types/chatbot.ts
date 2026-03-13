export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotBehavior {
  name: string;
  greeting: string;
  personality: string;
  tone: 'formal' | 'friendly' | 'professional';
  fallbackMessage: string;
  responseDelay: number; // en milisegundos
  isActive: boolean;
}

export const DEFAULT_BOT_BEHAVIOR: BotBehavior = {
  name: 'Asistente',
  greeting: '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte hoy?',
  personality: 'Soy un asistente amable y profesional. Mi objetivo es ayudar a resolver dudas de manera clara y eficiente.',
  tone: 'professional',
  fallbackMessage: 'Lo siento, no tengo información sobre esa consulta. Por favor, contacta a nuestro equipo de soporte para más ayuda.',
  responseDelay: 500,
  isActive: true,
};
