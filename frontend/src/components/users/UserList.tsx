import { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { useUserStore } from '@/hooks/useUserStore';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { UserCard } from './UserCard';
import { UserFormModal, type RoleOption } from './UserFormModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toolbar } from '@/components/layout/Toolbar';
import { Plus, Users, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function UserList() {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus, fetchUsers, isLoading } = useUserStore();
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (token && users.length === 0) {
      fetchUsers(token).catch((error) => {
        console.error('Failed to fetch users:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    api
      .listRoles(token)
      .then((list) => {
        setRoles(
          (Array.isArray(list) ? list : []).map((r) => ({
            id: r.id,
            name: r.name,
            systemKey: r.systemKey,
          }))
        );
      })
      .catch(() => setRoles([]));
  }, [token]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const superAdminCount = users.filter((u) => u.role.systemKey === 'super_admin').length;
  const reviewerCount = users.filter((u) => u.role.systemKey === 'reviewer').length;

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (
    name: string,
    email: string,
    roleId: string,
    password: string,
    branchId?: string | null
  ) => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      await addUser(token, name, email, roleId, password, branchId ?? null);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const handleUpdate = async (
    id: string,
    updates: { name?: string; email?: string; roleId?: string; branchId?: string | null }
  ) => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      await updateUser(token, id, updates as Partial<Omit<User, 'id' | 'createdAt'>>);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingUserId && token) {
      try {
        await deleteUser(token, deletingUserId);
        setDeletingUserId(null);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Total usuarios</p>
          <p className="mt-2 font-display text-2xl font-semibold">{users.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Super administradores</p>
          <p className="mt-2 font-display text-2xl font-semibold">{superAdminCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Revisores (plantilla)</p>
          <p className="mt-2 font-display text-2xl font-semibold">{reviewerCount}</p>
        </Card>
      </div>

      <Toolbar search={searchQuery} onSearchChange={setSearchQuery} placeholder="Buscar usuarios…">
        <Button type="button" onClick={openNew}>
          <Plus />
          Nuevo usuario
        </Button>
      </Toolbar>

      {isLoading && users.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {searchQuery ? 'Sin resultados' : 'No hay usuarios registrados'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery
              ? 'No se encontraron usuarios con ese término'
              : 'Crea el primero para dar acceso al equipo'}
          </p>
          {!searchQuery ? (
            <Button type="button" onClick={openNew}>
              <Plus />
              Nuevo usuario
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleEdit}
              onDelete={setDeletingUserId}
              onToggleStatus={(id) => token && toggleUserStatus(token, id)}
            />
          ))}
        </div>
      )}

      <UserFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onUpdate={handleUpdate}
        user={editingUser}
        roles={roles}
      />

      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
