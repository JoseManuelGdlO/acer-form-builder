import { useMemo, useState } from 'react';
import { StaffMember } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaffCatalogViewProps {
  staffMembers: StaffMember[];
  onBack: () => void;
  onCreate: (data: { name: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function StaffCatalogView({ staffMembers, onBack, onCreate, onUpdate, onDelete }: StaffCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', role: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!search.trim()) return staffMembers;
    const q = search.toLowerCase();
    return staffMembers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(search)) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [staffMembers, search]);

  const resetForm = () => {
    setForm({ name: '', phone: '', role: '', notes: '' });
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, {
          name: form.name,
          phone: form.phone || null,
          role: form.role || null,
          notes: form.notes || null,
        });
        toast.success('Staff actualizado');
      } else {
        await onCreate({
          name: form.name,
          phone: form.phone || null,
          role: form.role || null,
          notes: form.notes || null,
        });
        toast.success('Staff creado');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a viajes
          </Button>
          <h1 className="text-2xl font-bold">Catálogo de staff</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-medium">{editingId ? 'Editar staff' : 'Nuevo staff'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input placeholder="Rol / cargo" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
            </div>
            <Textarea placeholder="Notas" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving} className="gap-2">
                <Plus className="w-4 h-4" />
                {editingId ? 'Guardar cambios' : 'Agregar staff'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Buscar staff por nombre, teléfono o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-2">
              {list.map((s) => (
                <div key={s.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    {s.role && <p className="text-sm text-muted-foreground">Rol: {s.role}</p>}
                    {s.phone && <p className="text-sm text-muted-foreground">Tel: {s.phone}</p>}
                    {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(s.id);
                        setForm({
                          name: s.name,
                          phone: s.phone ?? '',
                          role: s.role ?? '',
                          notes: s.notes ?? '',
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        try {
                          await onDelete(s.id);
                          toast.success('Staff eliminado');
                        } catch (err: any) {
                          toast.error(err.message || 'No se pudo eliminar');
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay staff registrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
