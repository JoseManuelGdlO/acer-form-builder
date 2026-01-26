import { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { useUserStore } from '@/hooks/useUserStore';
import { useAuth } from '@/contexts/AuthContext';
import { UserCard } from './UserCard';
import { UserFormModal } from './UserFormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Shield, Eye } from 'lucide-react';
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
  const { users, addUser, updateUser, deleteUser, toggleUserStatus, fetchUsers } = useUserStore();
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load users when component mounts or token changes
  useEffect(() => {
    if (token && users.length === 0) {
      fetchUsers(token).catch((error) => {
        console.error('Failed to fetch users:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const superAdminCount = users.filter((u) => u.roles.includes('super_admin')).length;
  const reviewerCount = users.filter((u) => u.roles.includes('reviewer')).length;

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (name: string, email: string, role: string, password: string) => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      await addUser(token, name, email, role as any, password);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>) => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      await updateUser(token, id, updates);
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total usuarios</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{superAdminCount}</p>
            <p className="text-sm text-muted-foreground">Super Admins</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <Eye className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{reviewerCount}</p>
            <p className="text-sm text-muted-foreground">Revisores</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
        </div>
      ) : (
        <div className="grid gap-4">
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

      {/* Form Modal */}
      <UserFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onUpdate={handleUpdate}
        user={editingUser}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
