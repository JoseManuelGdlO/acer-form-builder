import { useState, useEffect } from 'react';
import { Client } from '@/types/form';
import { Product } from '@/types/product';
import { VisaStatusTemplate } from '@/types/settings';
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
import { User, Mail, Phone, MapPin, FileText, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneNumberDisplay, normalizePhoneDigits } from '@/lib/phone';

interface ClientFormModalProps {
  client?: Client | null;
  availableClients?: Client[];
  defaultParentClientId?: string | null;
  hideParentSelector?: boolean;
  products?: Product[];
  visaStatusTemplates?: VisaStatusTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'formsCompleted'>) => Promise<void>;
}

export const ClientFormModal = ({
  client,
  availableClients = [],
  defaultParentClientId = null,
  hideParentSelector = false,
  products = [],
  visaStatusTemplates = [],
  open,
  onOpenChange,
  onSave,
}: ClientFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    visaCasAppointmentDate: '',
    visaCasAppointmentLocation: '',
    visaConsularAppointmentDate: '',
    visaConsularAppointmentLocation: '',
    visaStatusTemplateId: '',
    productId: undefined as string | undefined,
    parentClientId: 'none',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: normalizePhoneDigits(client.phone || ''),
        address: client.address || '',
        notes: client.notes || '',
        visaCasAppointmentDate: client.visaCasAppointmentDate || '',
        visaCasAppointmentLocation: client.visaCasAppointmentLocation || '',
        visaConsularAppointmentDate: client.visaConsularAppointmentDate || '',
        visaConsularAppointmentLocation: client.visaConsularAppointmentLocation || '',
        visaStatusTemplateId: client.visaStatusTemplateId || '',
        productId: client.productId || undefined,
        parentClientId: client.parentClientId || 'none',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        visaCasAppointmentDate: '',
        visaCasAppointmentLocation: '',
        visaConsularAppointmentDate: '',
        visaConsularAppointmentLocation: '',
        visaStatusTemplateId: visaStatusTemplates[0]?.id || '',
        productId: undefined,
        parentClientId: defaultParentClientId || 'none',
      });
    }
    setError('');
    setPhoneError('');
    setIsLoading(false);
  }, [client, open, visaStatusTemplates, defaultParentClientId]);

  const validatePhone = (digits: string): boolean => {
    if (!digits) {
      setPhoneError('');
      return true;
    }
    if (digits.length !== 10) {
      setPhoneError('El teléfono debe tener exactamente 10 dígitos (máximo 10).');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPhoneError('');

    if (!validatePhone(formData.phone)) {
      setIsLoading(false);
      return;
    }

    try {
      await onSave({
        ...formData,
        phone: formData.phone || '',
        visaCasAppointmentDate: formData.visaCasAppointmentDate || null,
        visaCasAppointmentLocation: formData.visaCasAppointmentLocation.trim() || null,
        visaConsularAppointmentDate: formData.visaConsularAppointmentDate || null,
        visaConsularAppointmentLocation: formData.visaConsularAppointmentLocation.trim() || null,
        parentClientId: formData.parentClientId === 'none' ? null : formData.parentClientId,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                const digits = normalizePhoneDigits(e.target.value);
                setFormData(prev => ({ ...prev, phone: digits }));
                if (!digits) {
                  setPhoneError('');
                } else if (digits.length !== 10) {
                  setPhoneError('El teléfono debe tener exactamente 10 dígitos (máximo 10).');
                } else {
                  setPhoneError('');
                }
              }}
              onBlur={() => validatePhone(formData.phone)}
              placeholder="(618)-290-1223"
              maxLength={14}
              className={cn(phoneError && 'border-destructive')}
              aria-invalid={!!phoneError}
            />
            {phoneError ? (
              <p className="text-sm text-destructive">{phoneError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">10 dígitos; se guarda sin formato en el sistema.</p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="visaStatusTemplateId">Estado de visa *</Label>
            <Select
              value={formData.visaStatusTemplateId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, visaStatusTemplateId: value }))}
            >
              <SelectTrigger id="visaStatusTemplateId">
                <SelectValue placeholder="Selecciona un estado de visa" />
              </SelectTrigger>
              <SelectContent>
                {visaStatusTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
                        style={{ backgroundColor: template.color || '#94a3b8' }}
                      />
                      {template.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="visaCasAppointmentDate">Fecha cita CAS</Label>
              <Input
                id="visaCasAppointmentDate"
                type="date"
                value={formData.visaCasAppointmentDate}
                onChange={e => setFormData(prev => ({ ...prev, visaCasAppointmentDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visaCasAppointmentLocation">Lugar cita CAS</Label>
              <Input
                id="visaCasAppointmentLocation"
                value={formData.visaCasAppointmentLocation}
                onChange={e => setFormData(prev => ({ ...prev, visaCasAppointmentLocation: e.target.value }))}
                placeholder="Ej: CAS Monterrey"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="visaConsularAppointmentDate">Fecha cita Consulado</Label>
              <Input
                id="visaConsularAppointmentDate"
                type="date"
                value={formData.visaConsularAppointmentDate}
                onChange={e => setFormData(prev => ({ ...prev, visaConsularAppointmentDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visaConsularAppointmentLocation">Lugar cita Consulado</Label>
              <Input
                id="visaConsularAppointmentLocation"
                value={formData.visaConsularAppointmentLocation}
                onChange={e => setFormData(prev => ({ ...prev, visaConsularAppointmentLocation: e.target.value }))}
                placeholder="Ej: Consulado CDMX"
              />
            </div>
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
