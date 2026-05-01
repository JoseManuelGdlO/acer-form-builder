import { useState, useMemo } from 'react';
import { Group, Client } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddClientsToGroupModal } from './AddClientsToGroupModal';
import {
  Users,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Mail,
  Phone,
  FileText,
  MapPin,
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

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return clients;
    const q = memberSearch.toLowerCase();
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(memberSearch)) ||
        ('lastSubmission' in c && c.lastSubmission?.formName?.toLowerCase().includes(q))
    );
  }, [clients, memberSearch]);

  const handleAddClients = async (clientIdsToAdd: string[]) => {
    const currentIds = clients.map(c => c.id);
    const newIds = [...currentIds, ...clientIdsToAdd];
    await onUpdate(group.id, { clientIds: newIds });
  };

  const handleRemoveFromGroup = async (clientId: string) => {
    const newIds = clients.filter(c => c.id !== clientId).map(c => c.id);
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al listado
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-8 h-8 text-primary" />
                {group.title}
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditTitle(group)}
                className="gap-2"
              >
                <Pencil className="w-4 h-4" />
                Editar título
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar grupo
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">
              {clients.length} cliente{clients.length === 1 ? '' : 's'} en el grupo
            </p>
            {group.assignedTrips && group.assignedTrips.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                En viaje(s): {group.assignedTrips.map(t => t.title).join(', ')}
              </p>
            )}
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar clientes
          </Button>
        </div>

        {clients.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en el grupo por nombre, email o teléfono..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <ul className="divide-y">
                    {filteredMembers.map(client => (
                      <li
                        key={client.id}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{client.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {client.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                {client.email}
                              </span>
                            )}
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                {formatPhoneNumberDisplay(client.phone)}
                              </span>
                            )}
                            {'lastSubmission' in client && client.lastSubmission ? (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                Último formulario: {client.lastSubmission.formName}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 italic">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                Sin formularios
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
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
            {filteredMembers.length === 0 && memberSearch.trim() && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay miembros que coincidan con la búsqueda.
              </p>
            )}
          </div>
        )}

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Este grupo aún no tiene clientes.</p>
              <Button onClick={() => setAddModalOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Agregar clientes
              </Button>
            </CardContent>
          </Card>
        )}

        <AddClientsToGroupModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          groupTitle={group.title}
          currentClientIds={clients.map(c => c.id)}
          availableClients={availableClients}
          onAdd={handleAddClients}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
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
    </div>
  );
};
