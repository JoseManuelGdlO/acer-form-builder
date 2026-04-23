export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  advisorClientAccessMode?: 'assigned_only' | 'company_wide';
}

export interface UserRoleInfo {
  id: string;
  name: string;
  systemKey: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: UserRoleInfo;
  /** Effective permission keys from the user's role (for UI gating). */
  permissions: string[];
  createdAt: Date;
  status: 'active' | 'inactive';
  company?: Company | null;
  branchId?: string | null;
  branch?: { id: string; name: string; isActive: boolean } | null;
}
