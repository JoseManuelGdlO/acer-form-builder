import { create } from 'zustand';
import { User, UserRole } from '@/types/user';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserStore {
  users: User[];
  isLoading: boolean;
  fetchUsers: (token: string) => Promise<void>;
  addUser: (token: string, name: string, email: string, role: UserRole, password: string, branchId?: string | null) => Promise<void>;
  updateUser: (token: string, id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>) => Promise<void>;
  deleteUser: (token: string, id: string) => Promise<void>;
  toggleUserStatus: (token: string, id: string) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  isLoading: false,
  
  fetchUsers: async (token: string) => {
    set({ isLoading: true });
    try {
      const usersData = await api.getUsers(token);
      const users: User[] = usersData.map(
        (u: {
          id: string;
          name: string;
          email: string;
          roles?: UserRole[];
          status: 'active' | 'inactive';
          createdAt: string | Date;
          branchId?: string | null;
          branch?: { id: string; name: string; isActive: boolean } | null;
        }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roles: u.roles || ['reviewer'],
          status: u.status,
          createdAt: new Date(u.createdAt),
          branchId: u.branchId ?? null,
          branch: u.branch ?? null,
        }),
      );
      set({ users, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  addUser: async (token, name, email, role, password, branchId) => {
    try {
      const newUser = await api.createUser(
        { name, email, role, password, branchId: branchId ?? null },
        token,
      );
      const user: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles || [role],
        status: newUser.status,
        createdAt: new Date(newUser.createdAt || Date.now()),
        branchId: newUser.branchId ?? null,
        branch: newUser.branch ?? null,
      };
      set((state) => ({ users: [...state.users, user] }));
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },
  
  updateUser: async (token, id, updates) => {
    try {
      const updatedUser = await api.updateUser(id, updates, token);
      const existingUser = get().users.find((u) => u.id === id);
      const user: User = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedUser.roles || ['reviewer'],
        status: updatedUser.status,
        createdAt: updatedUser.createdAt 
          ? new Date(updatedUser.createdAt) 
          : (existingUser?.createdAt || new Date()),
        branchId: updatedUser.branchId ?? existingUser?.branchId ?? null,
        branch: updatedUser.branch ?? existingUser?.branch ?? null,
      };
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? user : u)),
      }));
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },
  
  deleteUser: async (token, id) => {
    try {
      await api.deleteUser(id, token);
      set((state) => ({ users: state.users.filter((user) => user.id !== id) }));
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },
  
  toggleUserStatus: async (token, id) => {
    const user = get().users.find((u) => u.id === id);
    if (user) {
      await get().updateUser(token, id, {
        status: user.status === 'active' ? 'inactive' : 'active',
      });
    }
  },
}));
