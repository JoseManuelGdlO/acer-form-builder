export type UserRole = 'super_admin' | 'reviewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  status: 'active' | 'inactive';
}
