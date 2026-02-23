export type UserRole = 'super_admin' | 'reviewer';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  createdAt: Date;
  status: 'active' | 'inactive';
  company?: Company | null;
}
