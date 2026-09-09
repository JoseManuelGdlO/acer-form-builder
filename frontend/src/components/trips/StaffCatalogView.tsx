import { useMemo, useState } from 'react';
import { StaffMember } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Toolbar } from '@/components/layout/Toolbar';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaffCatalogViewProps {
  staffMembers: StaffMember[];
  onBack: () => void;
  onCreate: (data: { name: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="ghost" onClick={onBack} className="-ml-2 mb-4 gap-2">
        <ArrowLeft />
        Volver a viajes
      </Button>
      <h2 className="mb-5 font-display text-xl font-semibold">Catálogo de staff</h2>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <SectionTitle title={editingId ? 'Editar staff' : 'Nuevo staff'} />
          <div className="grid gap-2">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input placeholder="Rol / cargo" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
            <Textarea placeholder="Notas" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={submit} disabled={saving}>
              <Plus />
              {editingId ? 'Guardar cambios' : 'Agregar staff'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </Card>

        <div>
          <Toolbar search={search} onSearchChange={setSearch} placeholder="Buscar staff por nombre, teléfono o rol…" />
          {list.length === 0 ? (
            <p className="rounded-md bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No hay staff registrado.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((s) => (
                <Card key={s.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary/30 font-display font-bold">
                      {initialsFromName(s.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s.role?.trim() || 'Sin rol'}
                        {s.phone ? ` · ${s.phone}` : ''}
                      </p>
                      {s.notes ? <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Editar staff"
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
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label="Eliminar staff"
                        onClick={async () => {
                          try {
                            await onDelete(s.id);
                            toast.success('Staff eliminado');
                          } catch (err: any) {
                            toast.error(err.message || 'No se pudo eliminar');
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
