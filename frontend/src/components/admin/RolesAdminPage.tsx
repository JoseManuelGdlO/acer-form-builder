import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { toast } from 'sonner';
import { Loader2, Trash2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type CatalogGroup = { id: string; label: string; keys: string[] };

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  systemKey: string | null;
  permissions: string[];
};

function PermissionGroups({
  catalog,
  selectedKeys,
  onToggle,
  disabled = false,
}: {
  catalog: CatalogGroup[];
  selectedKeys: Set<string>;
  onToggle?: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      {catalog.map((group) => (
        <div key={group.id}>
          <p className="mb-2 font-display text-sm font-semibold">
            {group.label === 'Mensajes, notas y seguimiento'
              ? 'Mensajes, notas y seguimiento'
              : group.label}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.keys.map((key) => (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 rounded-md bg-muted p-3 text-sm',
                  disabled ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                <Checkbox
                  checked={selectedKeys.has(key)}
                  onCheckedChange={() => onToggle?.(key)}
                  disabled={disabled}
                />
                <span className="leading-tight break-all">{key}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RolesAdminPage() {
  const { token, can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set());
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  const selected = useMemo(() => roles.find((r) => r.id === selectedId) ?? null, [roles, selectedId]);

  const catalogKeySet = useMemo(
    () => new Set(catalog.flatMap((group) => group.keys)),
    [catalog],
  );

  const loadAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cat, list] = await Promise.all([api.getPermissionCatalog(token), api.listRoles(token)]);
      const rows = (Array.isArray(list) ? list : []) as RoleRow[];
      setCatalog(Array.isArray(cat.groups) ? cat.groups : []);
      setRoles(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = roles.find((x) => x.id === selectedId);
    if (!r) return;
    setDraftKeys(new Set(r.permissions));
    setDraftName(r.name);
    setDraftDescription(r.description ?? '');
  }, [selectedId, roles]);

  const toggleKey = (key: string, setFn: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!token || !selected || selected.isSystem) return;
    if (!draftName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      const updated = await api.updateRole(
        selected.id,
        {
          name: draftName.trim(),
          description: draftDescription.trim() || undefined,
          permissionKeys: [...draftKeys],
        },
        token
      );
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      toast.success('Rol actualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleCreate = async () => {
    if (!token || !newName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      const created = await api.createRole(
        { name: newName.trim(), description: newDesc.trim() || undefined, permissionKeys: [...newKeys] },
        token
      );
      setRoles((prev) => [...prev, created]);
      setSelectedId(created.id);
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      setNewKeys(new Set());
      toast.success('Rol creado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear rol');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const r = roles.find((x) => x.id === id);
    if (!r || r.isSystem) return;
    if (!window.confirm(`¿Eliminar el rol "${r.name}"?`)) return;
    try {
      await api.deleteRole(id, token);
      setRoles((prev) => prev.filter((x) => x.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      toast.success('Rol eliminado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  const openCreate = () => {
    setNewKeys(new Set());
    setNewName('');
    setNewDesc('');
    setCreateOpen(true);
  };

  if (!can('roles.view')) {
    return <p className="text-muted-foreground">No tienes permiso para ver esta sección.</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-5">
          <SectionTitle
            title="Roles"
            action={can('roles.create') ? '+ Nuevo' : undefined}
            onAction={can('roles.create') ? openCreate : undefined}
          />
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay roles en el catálogo.</p>
          ) : (
            roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'mb-1 w-full rounded-md p-3 text-left text-sm transition-colors',
                  selectedId === r.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <span className="text-xs opacity-60">{r.permissions.length}</span>
                </div>
                {r.isSystem ? (
                  <span className="mt-1 block text-[10px] uppercase tracking-wide opacity-60">Sistema</span>
                ) : null}
              </button>
            ))
          )}
        </Card>

        <Card className="min-h-[420px] p-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Elige un rol de la lista.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.isSystem
                      ? 'Rol de sistema: los permisos están definidos por la plataforma.'
                      : selected.description || 'Rol personalizado'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {selected.isSystem || !can('roles.delete') ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selected.id)}
                    >
                      <Trash2 />
                      Eliminar
                    </Button>
                  )}
                  {selected.isSystem || !can('roles.update') ? null : (
                    <Button type="button" onClick={() => void handleSave()}>
                      <Save />
                      Guardar
                    </Button>
                  )}
                </div>
              </div>

              {selected.isSystem ? (
                <div className="mt-5 space-y-4">
                  <PermissionGroups catalog={catalog} selectedKeys={new Set(selected.permissions)} disabled />
                  {selected.permissions.some((key) => !catalogKeySet.has(key)) ? (
                    <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                      {selected.permissions
                        .filter((key) => !catalogKeySet.has(key))
                        .sort()
                        .map((key) => (
                          <li key={key}>{key}</li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        disabled={!can('roles.update')}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Descripción (opcional)</Label>
                      <Input
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        disabled={!can('roles.update')}
                      />
                    </div>
                  </div>
                  <PermissionGroups
                    catalog={catalog}
                    selectedKeys={draftKeys}
                    onToggle={(key) => toggleKey(key, setDraftKeys)}
                    disabled={!can('roles.update')}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <ScrollArea className="h-[280px] rounded-md border p-3">
              <PermissionGroups
                catalog={catalog}
                selectedKeys={newKeys}
                onToggle={(key) => toggleKey(key, setNewKeys)}
              />
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCreate()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
