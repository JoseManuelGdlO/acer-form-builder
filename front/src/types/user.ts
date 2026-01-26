export type UserRole = 'super_admin' | 'reviewer';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  createdAt: Date;
  status: 'active' | 'inactive';
}
