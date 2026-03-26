import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types/user';
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
import { Shield, Eye, EyeOff } from 'lucide-react';

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, email: string, role: UserRole, password: string, branchId?: string | null) => Promise<void>;
  onUpdate?: (id: string, updates: { name?: string; email?: string; role?: UserRole; branchId?: string | null }) => Promise<void>;
  user?: User | null;
}

export function UserFormModal({ open, onClose, onSave, onUpdate, user }: UserFormModalProps) {
  const NONE_VALUE = 'none';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('reviewer');
  const [branchId, setBranchId] = useState<string>(NONE_VALUE);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { token } = useAuth();
  const { branches, fetchBranches } = useSettingsStore();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.roles[0] || 'reviewer');
      setBranchId(user.branchId ?? NONE_VALUE);
      setPassword('');
      setConfirmPassword('');
    } else {
      setName('');
      setEmail('');
      setRole('reviewer');
      setBranchId(NONE_VALUE);
      setPassword('');
      setConfirmPassword('');
    }
    setError('');
    setShowPassword(false);
  }, [user, open]);

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

    setIsLoading(true);
    setError('');

    try {
      // Validar contraseña solo para nuevos usuarios
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
          role,
          branchId: branchId === NONE_VALUE ? null : branchId || null,
        });
      } else {
        await onSave(name, email, role, password, branchId === NONE_VALUE ? null : branchId || null);
      }
      onClose();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar el usuario. Por favor, intenta nuevamente.');
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
            <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent className="bg-popover border">
                <SelectItem value="super_admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Super Administrador
                  </div>
                </SelectItem>
                <SelectItem value="reviewer">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Revisor
                  </div>
                </SelectItem>
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
          
          {/* Password fields - solo para nuevos usuarios */}
          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
