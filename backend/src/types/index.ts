export type UserRole = 'super_admin' | 'reviewer';
export type ClientStatus = 'active' | 'inactive' | 'pending';
export type SubmissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type QuestionType = 
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'checkbox'
  | 'date'
  | 'file_upload'
  | 'dropdown'
  | 'rating';
export type BotTone = 'formal' | 'friendly' | 'professional';
export type MessageSender = 'user' | 'client';

export interface JwtPayload {
  userId: string;
  email: string;
  roles: UserRole[];
}
