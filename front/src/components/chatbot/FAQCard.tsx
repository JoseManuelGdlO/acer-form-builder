import { FAQ } from '@/types/chatbot';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, GripVertical, MessageCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface FAQCardProps {
  faq: FAQ;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  isDragging?: boolean;
}

export const FAQCard = ({ faq, onEdit, onDelete, onToggleStatus, isDragging }: FAQCardProps) => {
  return (
    <Card className={`transition-all duration-200 ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="cursor-grab text-muted-foreground hover:text-foreground mt-1">
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MessageCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground line-clamp-2">{faq.question}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {faq.category && (
                  <Badge variant="outline" className="text-xs">
                    {faq.category}
                  </Badge>
                )}
                <Badge 
                  variant={faq.isActive ? 'default' : 'secondary'}
                  className={faq.isActive ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                >
                  {faq.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 pl-6">
              {faq.answer}
            </p>
            
            <div className="flex items-center justify-between pl-6">
              <span className="text-xs text-muted-foreground">
                Actualizada: {faq.updatedAt.toLocaleDateString('es-ES')}
              </span>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleStatus}
                  className="h-8 w-8 p-0"
                >
                  {faq.isActive ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
