import { create } from 'zustand';
import { User } from '@/types/user';
import { api } from '@/lib/api';

function mapApiUser(u: Record<string, unknown>): User {
  const role = u.role as { id?: string; name?: string; systemKey?: string | null } | undefined;
  return {
    id: String(u.id),
    name: String(u.name),
    email: String(u.email),
    roleId: String(u.roleId ?? ''),
    role: role?.id
      ? { id: role.id, name: role.name ?? '', systemKey: role.systemKey ?? null }
      : { id: '', name: '', systemKey: null },
    permissions: Array.isArray(u.permissions) ? (u.permissions as string[]) : [],
    status: (u.status as User['status']) || 'active',
    createdAt: new Date((u.createdAt as string) || Date.now()),
    branchId: (u.branchId as string | null | undefined) ?? null,
    branch: (u.branch as User['branch']) ?? null,
  };
}

interface UserStore {
  users: User[];
  isLoading: boolean;
  fetchUsers: (token: string) => Promise<void>;
  addUser: (
    token: string,
    name: string,
    email: string,
    roleId: string,
    password: string,
    branchId?: string | null
  ) => Promise<void>;
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
      const users: User[] = (Array.isArray(usersData) ? usersData : []).map((u) =>
        mapApiUser(u as Record<string, unknown>)
      );
      set({ users, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  addUser: async (token, name, email, roleId, password, branchId) => {
    try {
      const newUser = await api.createUser(
        { name, email, roleId, password, branchId: branchId ?? null },
        token
      );
      const user = mapApiUser(newUser as Record<string, unknown>);
      set((state) => ({ users: [...state.users, user] }));
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  updateUser: async (token, id, updates) => {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.roleId !== undefined) payload.roleId = updates.roleId;
      if (updates.branchId !== undefined) payload.branchId = updates.branchId;
      const updatedUser = await api.updateUser(id, payload, token);
      const existingUser = get().users.find((u) => u.id === id);
      const user = mapApiUser(updatedUser as Record<string, unknown>);
      if (!user.createdAt.getTime()) {
        user.createdAt = existingUser?.createdAt ?? new Date();
      }
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...user } : u)),
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
