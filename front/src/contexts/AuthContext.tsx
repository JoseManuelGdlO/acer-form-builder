import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { User, UserRole } from '@/types/user';

interface LoginResponse {
  token: string;
  user: { id: string; email: string; name: string; status: string; roles: string[]; company?: { id: string; name: string; slug: string; logoUrl: string | null } | null };
}

interface AuthContextType {
  user: User | null;
  company: User['company'];
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setAuthFromLoginResponse: (response: LoginResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        roles: response.user.roles || ['reviewer'],
        status: response.user.status,
        createdAt: new Date(response.user.createdAt || Date.now()),
        company: response.user.company ?? null,
      });
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
    setUser({
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      roles: response.user.roles || ['reviewer'],
      status: response.user.status,
      createdAt: new Date(),
      company: response.user.company ?? null,
    });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    // Redirect to login
    window.location.href = '/login';
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
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
        hasRole,
        hasAnyRole,
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
