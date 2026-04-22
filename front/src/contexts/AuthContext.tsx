import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/auth/userPermissions';

interface LoginResponse {
  token: string;
  user: Record<string, unknown>;
}

function mapApiUser(raw: Record<string, unknown>): User {
  const role = raw.role as { id?: string; name?: string; systemKey?: string | null } | undefined;
  return {
    id: String(raw.id),
    email: String(raw.email),
    name: String(raw.name),
    status: (raw.status as User['status']) || 'active',
    roleId: String(raw.roleId ?? ''),
    role: role?.id
      ? { id: role.id, name: role.name ?? '', systemKey: role.systemKey ?? null }
      : { id: '', name: '', systemKey: null },
    permissions: Array.isArray(raw.permissions) ? (raw.permissions as string[]) : [],
    createdAt: new Date((raw.createdAt as string) || Date.now()),
    company: (raw.company as User['company']) ?? null,
    branchId: (raw.branchId as string | null | undefined) ?? null,
    branch: (raw.branch as User['branch']) ?? null,
  };
}

interface AuthContextType {
  user: User | null;
  company: User['company'];
  token: string | null;
  isLoading: boolean;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  setAuthFromLoginResponse: (response: LoginResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  can: (key: string) => boolean;
  canAny: (keys: string[]) => boolean;
  canAll: (keys: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const permissions = useMemo(() => user?.permissions ?? [], [user]);

  const can = useCallback((key: string) => hasPermission(permissions, key), [permissions]);
  const canAny = useCallback((keys: string[]) => hasAnyPermission(permissions, keys), [permissions]);
  const canAll = useCallback((keys: string[]) => hasAllPermissions(permissions, keys), [permissions]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await api.getMe(authToken);
      setUser(mapApiUser(response.user as Record<string, unknown>));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setAuthFromLoginResponse(response);
  };

  const setAuthFromLoginResponse = (response: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(mapApiUser(response.user as Record<string, unknown>));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company: user?.company ?? null,
        token,
        isLoading,
        login,
        setAuthFromLoginResponse,
        logout,
        isAuthenticated: !!user && !!token,
        permissions,
        can,
        canAny,
        canAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
