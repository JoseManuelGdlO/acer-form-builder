import { create } from 'zustand';
import { User, UserRole } from '@/types/user';

interface UserStore {
  users: User[];
  addUser: (name: string, email: string, role: UserRole, password: string) => void;
  updateUser: (id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Carlos Administrador',
    email: 'carlos@empresa.com',
    role: 'super_admin',
    createdAt: new Date('2024-01-15'),
    status: 'active',
  },
  {
    id: '2',
    name: 'María Revisora',
    email: 'maria@empresa.com',
    role: 'reviewer',
    createdAt: new Date('2024-02-20'),
    status: 'active',
  },
  {
    id: '3',
    name: 'Juan Revisor',
    email: 'juan@empresa.com',
    role: 'reviewer',
    createdAt: new Date('2024-03-10'),
    status: 'inactive',
  },
];

export const useUserStore = create<UserStore>((set) => ({
  users: mockUsers,
  
  addUser: (name, email, role, _password) => {
    // En producción, la contraseña se enviaría al backend
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      role,
      createdAt: new Date(),
      status: 'active',
    };
    set((state) => ({ users: [...state.users, newUser] }));
  },
  
  updateUser: (id, updates) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id ? { ...user, ...updates } : user
      ),
    }));
  },
  
  deleteUser: (id) => {
    set((state) => ({ users: state.users.filter((user) => user.id !== id) }));
  },
  
  toggleUserStatus: (id) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
          : user
      ),
    }));
  },
}));
