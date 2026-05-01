import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type CatalogGroup = { id: string; label: string; keys: string[] };

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  systemKey: string | null;
  permissions: string[];
};

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

  if (!can('roles.view')) {
    return <p className="text-muted-foreground">No tienes permiso para ver esta sección.</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Roles y permisos</h2>
          <p className="text-sm text-muted-foreground">
            Los roles de sistema no se pueden editar aquí. Crea roles personalizados para tu equipo.
          </p>
        </div>
        {can('roles.create') && (
          <Button
            type="button"
            onClick={() => {
              setNewKeys(new Set());
              setNewName('');
              setNewDesc('');
              setCreateOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo rol
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedId === r.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  {r.isSystem && (
                    <span className="text-[10px] uppercase text-muted-foreground shrink-0">Sistema</span>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">
              {selected ? selected.name : 'Selecciona un rol'}
            </CardTitle>
            {selected && !selected.isSystem && can('roles.delete') && (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Elige un rol de la lista.</p>
            ) : selected.isSystem ? (
              <ScrollArea className="h-[360px] pr-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Rol de sistema: los permisos están definidos por la plataforma.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                  {selected.permissions.sort().map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} disabled={!can('roles.update')} />
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
                <ScrollArea className="h-[300px] border rounded-md p-3">
                  <div className="space-y-6">
                    {catalog.map((group) => (
                      <div key={group.id}>
                        <p className="text-sm font-medium mb-2">{group.label}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.keys.map((key) => (
                            <label key={key} className="flex items-start gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={draftKeys.has(key)}
                                onCheckedChange={() => toggleKey(key, setDraftKeys)}
                                disabled={!can('roles.update')}
                              />
                              <span className="font-mono leading-tight break-all">{key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {can('roles.update') && (
                  <Button type="button" className="gap-2" onClick={() => void handleSave()}>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
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
            <ScrollArea className="h-[280px] border rounded-md p-3">
              <div className="space-y-4">
                {catalog.map((group) => (
                  <div key={group.id}>
                    <p className="text-sm font-medium mb-2">{group.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.keys.map((key) => (
                        <label key={key} className="flex items-start gap-2 text-xs cursor-pointer">
                          <Checkbox checked={newKeys.has(key)} onCheckedChange={() => toggleKey(key, setNewKeys)} />
                          <span className="font-mono leading-tight break-all">{key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
