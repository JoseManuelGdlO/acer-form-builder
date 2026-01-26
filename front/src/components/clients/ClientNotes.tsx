import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  StickyNote, Plus, Trash2, Calendar, X, Check 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ClientNote {
  id: string;
  content: string;
  createdAt: Date;
}

interface ClientNotesProps {
  clientId: string;
  notes: ClientNote[];
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const ClientNotes = ({ 
  clientId, 
  notes, 
  onAddNote, 
  onDeleteNote 
}: ClientNotesProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleSubmit = () => {
    if (newNoteContent.trim()) {
      onAddNote(newNoteContent.trim());
      setNewNoteContent('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewNoteContent('');
    setIsAdding(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            Notas del Cliente
            <span className="text-xs font-normal text-muted-foreground ml-1">
              ({notes.length})
            </span>
          </CardTitle>
          {!isAdding && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsAdding(true)}
              className="gap-1.5 text-primary hover:text-primary"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new note form */}
        {isAdding && (
          <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3">
            <Textarea
              placeholder="Escribe una nota sobre el cliente..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="min-h-[80px] resize-none border-border/50 focus:border-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={!newNoteContent.trim()}
                className="gap-1.5"
              >
                <Check className="w-4 h-4" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay notas aún</p>
            <p className="text-xs">Agrega notas para recordar información importante</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {notes.map((note) => (
              <div 
                key={note.id}
                className="group bg-muted/30 border border-border/30 rounded-lg p-3 hover:border-border/60 transition-colors"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(note.createdAt, "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
