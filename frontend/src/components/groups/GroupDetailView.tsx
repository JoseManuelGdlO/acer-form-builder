import { useState, useMemo } from 'react';
import { Group, Client } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toolbar } from '@/components/layout/Toolbar';
import { AddClientsToGroupModal } from './AddClientsToGroupModal';
import {
  Users,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatPhoneNumberDisplay } from '@/lib/phone';

interface GroupDetailViewProps {
  group: Group;
  availableClients: Client[];
  onBack: () => void;
  onUpdate: (groupId: string, data: { title?: string; clientIds?: string[] }) => Promise<void>;
  onDelete: (groupId: string) => Promise<void>;
  onEditTitle: (group: Group) => void;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const GroupDetailView = ({
  group,
  availableClients,
  onBack,
  onUpdate,
  onDelete,
  onEditTitle,
}: GroupDetailViewProps) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const clients = group.clients ?? [];
  const tripLabel =
    group.assignedTrips && group.assignedTrips.length > 0
      ? group.assignedTrips.map((t) => t.title).join(', ')
      : null;

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return clients;
    const q = memberSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(memberSearch)) ||
        ('lastSubmission' in c && c.lastSubmission?.formName?.toLowerCase().includes(q))
    );
  }, [clients, memberSearch]);

  const handleAddClients = async (clientIdsToAdd: string[]) => {
    const currentIds = clients.map((c) => c.id);
    const newIds = [...currentIds, ...clientIdsToAdd];
    await onUpdate(group.id, { clientIds: newIds });
  };

  const handleRemoveFromGroup = async (clientId: string) => {
    const newIds = clients.filter((c) => c.id !== clientId).map((c) => c.id);
    await onUpdate(group.id, { clientIds: newIds });
    toast.success('Cliente quitado del grupo');
  };

  const handleDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      await onDelete(group.id);
      toast.success('Grupo eliminado');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="ghost" onClick={onBack} className="-ml-2 mb-4 gap-2">
        <ArrowLeft className="size-4" />
        Volver al listado
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
              <Users className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{group.title}</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? 'integrante' : 'integrantes'}
            {tripLabel ? ` · Viaje: ${tripLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEditTitle(group)}>
            <Pencil />
            Editar título
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
            Eliminar grupo
          </Button>
          <Button type="button" onClick={() => setAddModalOpen(true)}>
            <UserPlus />
            Agregar clientes
          </Button>
        </div>
      </div>

      {clients.length > 0 ? (
        <div className="space-y-3">
          <Toolbar
            search={memberSearch}
            onSearchChange={setMemberSearch}
            placeholder="Buscar en el grupo por nombre, email o teléfono…"
          />
          <Card className="overflow-hidden border-border p-0 shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                <ul className="divide-y divide-border">
                  {filteredMembers.map((client) => (
                    <li key={client.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary/35 font-display text-sm font-bold text-secondary-foreground">
                          {initialsFromName(client.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{client.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {client.email ? (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="size-3.5 shrink-0" />
                                {client.email}
                              </span>
                            ) : null}
                            {client.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3.5 shrink-0" />
                                {formatPhoneNumberDisplay(client.phone)}
                              </span>
                            ) : null}
                            {'lastSubmission' in client && client.lastSubmission ? (
                              <span className="flex items-center gap-1">
                                <FileText className="size-3.5 shrink-0" />
                                Último formulario: {client.lastSubmission.formName}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 italic">
                                <FileText className="size-3.5 shrink-0" />
                                Sin formularios
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFromGroup(client.id)}
                      >
                        Quitar del grupo
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
          {filteredMembers.length === 0 && memberSearch.trim() ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay miembros que coincidan con la búsqueda.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold">Este grupo aún no tiene clientes</h3>
          <p className="mb-4 text-sm text-muted-foreground">Agrega integrantes para administrarlos aquí.</p>
          <Button type="button" onClick={() => setAddModalOpen(true)}>
            <UserPlus />
            Agregar clientes
          </Button>
        </div>
      )}

      <AddClientsToGroupModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        groupTitle={group.title}
        currentClientIds={clients.map((c) => c.id)}
        availableClients={availableClients}
        onAdd={handleAddClients}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el grupo &quot;{group.title}&quot;. Los clientes no se borran, solo se quitan del grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
