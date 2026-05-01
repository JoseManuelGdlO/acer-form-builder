import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  clientChecklistId?: string;
}

interface ClientChecklistProps {
  clientId: string;
  items: ChecklistItem[];
  onToggle: (itemId: string) => void;
}

export const ClientChecklist = ({ clientId, items, onToggle }: ClientChecklistProps) => {
  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Checklist de Acciones
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/30 ${
              item.completed 
                ? 'border-primary/30 bg-primary/5' 
                : 'border-border/50'
            }`}
            onClick={() => onToggle(item.id)}
          >
            <Checkbox 
              checked={item.completed}
              onCheckedChange={() => onToggle(item.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className={`flex-1 text-sm ${
              item.completed 
                ? 'text-muted-foreground line-through' 
                : 'text-foreground'
            }`}>
              {item.label}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
