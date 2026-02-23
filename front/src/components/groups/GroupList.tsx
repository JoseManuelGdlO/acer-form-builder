import { useState, useMemo } from 'react';
import { Group, Client } from '@/types/form';
import { GroupCard } from './GroupCard';
import { GroupDetailView } from './GroupDetailView';
import { GroupFormModal } from './GroupFormModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface GroupListProps {
  groups: Group[];
  availableClients: Client[];
  onCreate: (data: { title: string; clientIds?: string[] }) => Promise<void>;
  onUpdate: (groupId: string, data: { title?: string; clientIds?: string[] }) => Promise<void>;
  onDelete: (groupId: string) => Promise<void>;
  onBack: () => void;
}

export const GroupList = ({
  groups,
  availableClients,
  onCreate,
  onUpdate,
  onDelete,
  onBack,
}: GroupListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      g =>
        g.title.toLowerCase().includes(q) ||
        (g.clients ?? []).some(
          c =>
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
    () => (viewingGroupId ? groups.find(g => g.id === viewingGroupId) ?? null : null),
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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              ← Volver
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Grupos</h1>
            <p className="text-muted-foreground mt-1">
              Agrupa clientes (por ejemplo, familias para trámites de visa)
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo grupo
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o nombre de cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No hay grupos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No se encontraron grupos con ese criterio'
                : 'Crea un grupo y agrega clientes (ej. Familia Martínez)'}
            </p>
            {!searchQuery && (
              <Button onClick={openNew} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo grupo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
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
          onOpenChange={open => {
            setIsFormOpen(open);
            if (!open) setEditingGroup(null);
          }}
          onSave={handleSave}
          availableClients={availableClients}
        />
      </div>
    </div>
  );
};
