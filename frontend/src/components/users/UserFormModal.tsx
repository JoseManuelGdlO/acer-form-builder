import { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';

export interface RoleOption {
  id: string;
  name: string;
  systemKey: string | null;
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    email: string,
    roleId: string,
    password: string,
    branchId?: string | null
  ) => Promise<void>;
  onUpdate?: (
    id: string,
    updates: { name?: string; email?: string; roleId?: string; branchId?: string | null }
  ) => Promise<void>;
  user?: User | null;
  roles: RoleOption[];
}

export function UserFormModal({ open, onClose, onSave, onUpdate, user, roles }: UserFormModalProps) {
  const NONE_VALUE = 'none';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState<string>(NONE_VALUE);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { token } = useAuth();
  const { branches, fetchBranches } = useSettingsStore();

  const defaultRoleId = roles[0]?.id ?? '';

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRoleId(user.roleId || defaultRoleId);
      setBranchId(user.branchId ?? NONE_VALUE);
      setPassword('');
      setConfirmPassword('');
    } else {
      setName('');
      setEmail('');
      setRoleId(defaultRoleId);
      setBranchId(NONE_VALUE);
      setPassword('');
      setConfirmPassword('');
    }
    setError('');
    setShowPassword(false);
  }, [user, open, defaultRoleId]);

  useEffect(() => {
    if (!open) return;
    if (token && branches.length === 0) {
      fetchBranches(token).catch((error) => {
        console.error('Failed to fetch branches:', error);
      });
    }
  }, [open, token, branches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!roleId) {
      setError('Selecciona un rol');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!user) {
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setIsLoading(false);
          return;
        }
      }

      if (user && onUpdate) {
        await onUpdate(user.id, {
          name,
          email,
          roleId,
          branchId: branchId === NONE_VALUE ? null : branchId || null,
        });
      } else {
        await onSave(name, email, roleId, password, branchId === NONE_VALUE ? null : branchId || null);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar el usuario. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            La sucursal es opcional. Si no se asigna, el usuario quedará sin sucursal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa el nombre"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent className="bg-popover border">
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Sucursal (opcional)</Label>
            <Select value={branchId} onValueChange={(value) => setBranchId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent className="bg-popover border">
                <SelectItem value={NONE_VALUE}>Sin sucursal</SelectItem>
                {branches
                  .filter((b) => b.isActive)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : user ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
