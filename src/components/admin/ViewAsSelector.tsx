import { useState } from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, User as UserIcon, X, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ViewAsSelectorProps {
  users: User[];
  viewingAs: User | null;
  onSelectUser: (user: User | null) => void;
}

export const ViewAsSelector = ({ users, viewingAs, onSelectUser }: ViewAsSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setOpen(false);
  };

  const activeUsers = users.filter(u => u.status === 'active');

  return (
    <>
      {/* Banner when viewing as another user */}
      {viewingAs && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Viendo como: <strong>{viewingAs.name}</strong>
            </span>
            <Badge variant="outline" className="bg-amber-400/50 text-amber-950 border-amber-600 text-xs">
              {viewingAs.role === 'super_admin' ? 'Super Admin' : 'Revisor'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectUser(null)}
            className="text-amber-950 hover:bg-amber-400/50 gap-1.5"
          >
            <X className="w-4 h-4" />
            Salir del modo vista
          </Button>
        </div>
      )}

      {/* Selector button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Ver como</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Ver como usuario
            </DialogTitle>
            <DialogDescription>
              Selecciona un usuario para ver el sistema desde su perspectiva
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {activeUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No hay usuarios activos</p>
                </div>
              ) : (
                activeUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      viewingAs?.id === user.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      {user.role === 'super_admin' ? (
                        <Shield className="w-5 h-5 text-primary" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        user.role === 'super_admin' 
                          ? 'bg-primary/10 text-primary border-primary/30' 
                          : 'bg-accent/10 text-accent border-accent/30'
                      }
                    >
                      {user.role === 'super_admin' ? 'Admin' : 'Revisor'}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
