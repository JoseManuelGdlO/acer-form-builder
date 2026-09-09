import { useState, useMemo } from 'react';
import { Group, Client } from '@/types/form';
import { GroupCard } from './GroupCard';
import { GroupDetailView } from './GroupDetailView';
import { GroupFormModal } from './GroupFormModal';
import { Button } from '@/components/ui/button';
import { Toolbar } from '@/components/layout/Toolbar';
import { Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface GroupListProps {
  groups: Group[];
  availableClients: Client[];
  users?: Array<{ id: string; name: string }>;
  onCreate: (data: { title: string; clientIds?: string[] }) => Promise<void>;
  onUpdate: (groupId: string, data: { title?: string; clientIds?: string[] }) => Promise<void>;
  onDelete: (groupId: string) => Promise<void>;
}

export const GroupList = ({
  groups,
  availableClients,
  users,
  onCreate,
  onUpdate,
  onDelete,
}: GroupListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.clients ?? []).some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
        )
    );
  }, [groups, searchQuery]);

  const handleSave = async (data: { title: string; clientIds: string[] }) => {
    try {
      if (editingGroup) {
        await onUpdate(editingGroup.id, { title: data.title, clientIds: data.clientIds });
        toast.success('Grupo actualizado');
      } else {
        await onCreate({ title: data.title, clientIds: data.clientIds });
        toast.success('Grupo creado');
      }
      setEditingGroup(null);
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
      throw err;
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      await onDelete(groupId);
      toast.success('Grupo eliminado');
      setViewingGroupId(null);
      setEditingGroup(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el grupo');
      throw err;
    }
  };

  const openNew = () => {
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setViewingGroupId(null);
    setIsFormOpen(true);
  };

  const viewDetail = (group: Group) => {
    setViewingGroupId(group.id);
  };

  const viewingGroup = useMemo(
    () => (viewingGroupId ? groups.find((g) => g.id === viewingGroupId) ?? null : null),
    [groups, viewingGroupId]
  );

  if (viewingGroup) {
    return (
      <GroupDetailView
        group={viewingGroup}
        availableClients={availableClients}
        onBack={() => setViewingGroupId(null)}
        onUpdate={onUpdate}
        onDelete={handleDelete}
        onEditTitle={openEdit}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Toolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar grupo…"
      >
        <Button type="button" onClick={openNew}>
          <Plus />
          Nuevo grupo
        </Button>
      </Toolbar>

      {filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {searchQuery ? 'Sin resultados' : 'No hay grupos'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery
              ? 'No se encontraron grupos con ese criterio'
              : 'Crea un grupo y agrega clientes (ej. Familia Martínez)'}
          </p>
          {!searchQuery ? (
            <Button type="button" onClick={openNew}>
              <Plus />
              Nuevo grupo
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              users={users}
              onView={() => viewDetail(group)}
              onEdit={() => openEdit(group)}
              onDelete={() => handleDelete(group.id)}
            />
          ))}
        </div>
      )}

      <GroupFormModal
        group={editingGroup}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingGroup(null);
        }}
        onSave={handleSave}
        availableClients={availableClients}
      />
    </div>
  );
};
