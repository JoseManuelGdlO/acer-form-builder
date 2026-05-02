import { useState, useEffect } from 'react';
import { Client } from '@/types/form';
import { User as AdvisorUser } from '@/types/user';
import { Product } from '@/types/product';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, MapPin, FileText, ShoppingBag, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneNumberDisplay, isValidClientPhoneLength, normalizePhoneDigits } from '@/lib/phone';

interface ClientFormModalProps {
  client?: Client | null;
  availableClients?: Client[];
  defaultParentClientId?: string | null;
  /** Asesor sugerido al crear un familiar (p. ej. el del titular); solo usa admin con dropdown. */
  defaultAssignedUserId?: string | null;
  hideParentSelector?: boolean;
  products?: Product[];
  /** Revisores del listado para asignar asesor (solo admin: nuevo familiar o editar familiar). */
  users?: AdvisorUser[];
  isAdmin?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => Promise<void>;
}

export const ClientFormModal = ({
  client,
  availableClients = [],
  defaultParentClientId = null,
  defaultAssignedUserId = null,
  hideParentSelector = false,
  products = [],
  users = [],
  isAdmin = false,
  open,
  onOpenChange,
  onSave,
}: ClientFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    postalCode: '',
    address: '',
    birthDate: '',
    relationshipToHolder: '',
    notes: '',
    status: 'pending' as Client['status'],
    productId: undefined as string | undefined,
    parentClientId: 'none',
    assignedUserId: '__none__' as string,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [postalCodeError, setPostalCodeError] = useState('');

  useEffect(() => {
    const advisorValueForNewFamily =
      isAdmin && defaultParentClientId
        ? defaultAssignedUserId || users[0]?.id || '__none__'
        : '__none__';
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: normalizePhoneDigits(client.phone || ''),
        postalCode: client.postalCode != null ? String(client.postalCode) : '',
        address: client.address || '',
        birthDate: client.birthDate || '',
        relationshipToHolder: client.relationshipToHolder || '',
        notes: client.notes || '',
        status: client.status,
        productId: client.productId || undefined,
        parentClientId: client.parentClientId || 'none',
        assignedUserId: client.assignedUserId ?? '__none__',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        postalCode: '',
        address: '',
        birthDate: '',
        relationshipToHolder: '',
        notes: '',
        status: 'pending',
        productId: undefined,
        parentClientId: defaultParentClientId || 'none',
        assignedUserId: advisorValueForNewFamily,
      });
    }
    setError('');
    setPhoneError('');
    setPostalCodeError('');
    setIsLoading(false);
    // No incluir `users` en deps: el padre las refresca con
    // clientes/submissions (polling, SW de WhatsApp) y nuevas referencias de array
    // vaciarían el borrador. El otro useEffect aplica la plantilla por defecto al cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: solo al abrir / cambiar cliente
  }, [client, open, defaultParentClientId, defaultAssignedUserId, isAdmin]);

  const validatePhone = (value: string): boolean => {
    if (!value || value.trim() === '+') {
      setPhoneError('');
      return true;
    }
    if (!isValidClientPhoneLength(value)) {
      setPhoneError('El teléfono debe tener 10 u 11 dígitos. Puedes usar + para prefijo (p. ej. +1 EE. UU.).');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const validatePostalCode = (value: string): boolean => {
    if (!value.trim()) {
      setPostalCodeError('');
      return true;
    }
    if (!/^\d+$/.test(value)) {
      setPostalCodeError('El código postal debe contener solo números.');
      return false;
    }
    if (value.length !== 5) {
      setPostalCodeError('El código postal debe tener exactamente 5 dígitos.');
      return false;
    }
    if (value === '00000') {
      setPostalCodeError('El código postal 00000 no es válido.');
      return false;
    }
    setPostalCodeError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPhoneError('');
    setPostalCodeError('');

    if (!validatePhone(formData.phone)) {
      setIsLoading(false);
      return;
    }
    if (!validatePostalCode(formData.postalCode)) {
      setIsLoading(false);
      return;
    }

    try {
      const { assignedUserId: formAdvisor, ...formFields } = formData;
      const isFamilyNew = !!defaultParentClientId && !client;
      const isEditFamily = !!client?.parentClientId;
      const payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'> = {
        ...formFields,
        birthDate: formData.birthDate || null,
        relationshipToHolder: formData.relationshipToHolder.trim() || null,
        phone: formData.phone || '',
        postalCode: formData.postalCode.trim() ? Number(formData.postalCode) : null,
        parentClientId: formData.parentClientId === 'none' ? null : formData.parentClientId,
      };
      if (isAdmin && (isFamilyNew || isEditFamily)) {
        (payload as { assignedUserId?: string | null }).assignedUserId =
          formAdvisor === '__none__' ? null : formAdvisor;
      }
      await onSave(payload);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving client:', error);
      setError(error.message || 'Error al guardar el cliente. Por favor, intenta nuevamente.');
      toast.error(error.message || 'Error al guardar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!client;
  const isFamilyMode = !!defaultParentClientId && !isEditing;
  const showAdvisorField =
    isAdmin && users.length > 0 && (isFamilyMode || (!!client?.parentClientId && isEditing));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Cliente' : isFamilyMode ? 'Nuevo Familiar' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre completo *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Juan Pérez García"
              required
            />
          </div>

          {!isFamilyMode && (
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Correo electrónico *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          )}

          {!isFamilyMode && (
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formatPhoneNumberDisplay(formData.phone)}
                onChange={e => {
                  const normalized = normalizePhoneDigits(e.target.value);
                  setFormData(prev => ({ ...prev, phone: normalized }));
                  if (!normalized || normalized === '+') {
                    setPhoneError('');
                  } else if (!isValidClientPhoneLength(normalized)) {
                    setPhoneError('El teléfono debe tener 10 u 11 dígitos. Puedes usar + para prefijo (p. ej. +1 EE. UU.).');
                  } else {
                    setPhoneError('');
                  }
                }}
                onBlur={() => validatePhone(formData.phone)}
                placeholder="(618)-290-1223 o +1 (555) 123-4567"
                maxLength={22}
                className={cn(phoneError && 'border-destructive')}
                aria-invalid={!!phoneError}
              />
              {phoneError ? (
                <p className="text-sm text-destructive">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  10 u 11 dígitos; opcional + al inicio. Se guarda tal como lo capturas (sin espacios de la máscara).
                </p>
              )}
            </div>
          )}

          {!isFamilyMode && (
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código postal</Label>
              <Input
                id="postalCode"
                type="text"
                inputMode="numeric"
                value={formData.postalCode}
                onChange={e => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setFormData(prev => ({ ...prev, postalCode: digitsOnly }));
                  if (!digitsOnly) {
                    setPostalCodeError('');
                  } else if (digitsOnly === '00000') {
                    setPostalCodeError('El código postal 00000 no es válido.');
                  } else if (digitsOnly.length !== 5) {
                    setPostalCodeError('El código postal debe tener exactamente 5 dígitos.');
                  } else {
                    setPostalCodeError('');
                  }
                }}
                onBlur={() => validatePostalCode(formData.postalCode)}
                placeholder="Ej: 64000"
                maxLength={5}
                className={cn(postalCodeError && 'border-destructive')}
                aria-invalid={!!postalCodeError}
              />
              {postalCodeError ? (
                <p className="text-sm text-destructive">{postalCodeError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">5 dígitos numéricos. No se permite 00000.</p>
              )}
            </div>
          )}

          {!isFamilyMode && (
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dirección
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Calle, Ciudad, Estado"
              />
            </div>
          )}

          {isFamilyMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationshipToHolder">Parentesco con titular</Label>
                <Input
                  id="relationshipToHolder"
                  value={formData.relationshipToHolder}
                  onChange={e => setFormData(prev => ({ ...prev, relationshipToHolder: e.target.value }))}
                  placeholder="Ej: Hijo, Esposa, Hermano"
                />
              </div>
            </div>
          )}

          {showAdvisorField && (
            <div className="space-y-2">
              <Label htmlFor="assignedUserId" className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Asesor asignado al familiar
              </Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, assignedUserId: value }))}
              >
                <SelectTrigger id="assignedUserId">
                  <SelectValue placeholder="Selecciona asesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFamilyMode && (
                <p className="text-xs text-muted-foreground">
                  Si un revisor crea el familiar, queda asignado a él automáticamente (sin este campo).
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Estado del cliente</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value as Client['status'] }))
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!defaultParentClientId && !hideParentSelector && (
            <div className="space-y-2">
              <Label htmlFor="parentClientId">Cliente principal</Label>
              <Select
                value={formData.parentClientId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parentClientId: value }))}
              >
                <SelectTrigger id="parentClientId">
                  <SelectValue placeholder="Selecciona un cliente principal (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente principal</SelectItem>
                  {availableClients
                    .filter((candidate) => !candidate.parentClientId && candidate.id !== client?.id)
                    .map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="product" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Producto adquirido
            </Label>
            <Select
              value={formData.productId ?? 'none'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value === 'none' ? undefined : value }))}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecciona un producto (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin producto</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre el cliente..."
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
