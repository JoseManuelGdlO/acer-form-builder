import { useState, useEffect, useCallback } from 'react';
import {
  BusTemplate,
  BusLayout,
  BusLayoutElement,
  BusLayoutElementType,
} from '@/types/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Armchair, Droplets, ArrowUpDown, DoorOpen, User, Bus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

const ELEMENT_TYPES: { type: BusLayoutElementType; label: string; Icon: typeof Armchair }[] = [
  { type: 'seat', label: 'Asiento', Icon: Armchair },
  { type: 'bathroom', label: 'Baño', Icon: Droplets },
  { type: 'stairs', label: 'Escaleras', Icon: ArrowUpDown },
  { type: 'door', label: 'Puerta', Icon: DoorOpen },
  { type: 'driver', label: 'Conductor', Icon: User },
];

function makeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface BusTemplateFormModalProps {
  template: BusTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    layout: BusLayout;
  }) => Promise<void>;
}

function PaletteItem({ type, label, Icon }: { type: BusLayoutElementType; label: string; Icon: typeof Armchair }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette', elementType: type },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-2 cursor-grab active:cursor-grabbing shadow-sm',
        isDragging && 'opacity-60'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function CanvasElement({
  element,
  floorIndex,
  onUpdatePosition,
  onRemove,
  onEditLabel,
}: {
  element: BusLayoutElement;
  floorIndex: number;
  onUpdatePosition: (floorIndex: number, elementId: string, x: number, y: number) => void;
  onRemove: (floorIndex: number, elementId: string) => void;
  onEditLabel: (floorIndex: number, elementId: string, label: string) => void;
}) {
  const isSeat = element.type === 'seat';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
    data: { type: 'layout-element', elementId: element.id, floorIndex },
  });
  const size = 44;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: size,
    minWidth: size,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };
  const Icon = ELEMENT_TYPES.find(t => t.type === element.type)?.Icon ?? Armchair;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card shadow cursor-grab active:cursor-grabbing select-none z-10 box-border',
        isDragging && 'opacity-80 shadow-lg z-20',
        element.type === 'seat' && 'bg-primary/10 border-primary/30'
      )}
      {...listeners}
      {...attributes}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onRemove(floorIndex, element.id);
      }}
    >
      <div className="flex items-center gap-0.5 w-full justify-center px-0.5 flex-1 min-h-0">
        <Icon className="w-4 h-4 shrink-0" />
        {isSeat ? (
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="text-xs font-medium truncate max-w-[70px] border-0 bg-transparent cursor-pointer hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {element.label || '?'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48" onClick={(e) => e.stopPropagation()}>
              <Label className="text-xs">Nombre del asiento</Label>
              <Input
                value={element.label ?? ''}
                onChange={(e) => onEditLabel(floorIndex, element.id, e.target.value)}
                placeholder="Ej. 1A"
                className="mt-1"
              />
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">
            {element.type === 'bathroom' ? 'Baño' : element.type === 'stairs' ? 'Esc.' : element.type === 'door' ? 'Puerta' : 'Cond.'}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label="Eliminar"
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity z-30"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(floorIndex, element.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function FloorCanvas({
  floorIndex,
  elements,
  onMoveElement,
  onRemoveElement,
  onEditSeatLabel,
}: {
  floorIndex: number;
  elements: BusLayoutElement[];
  onMoveElement: (floorIndex: number, elementId: string, deltaX: number, deltaY: number) => void;
  onRemoveElement: (floorIndex: number, elementId: string) => void;
  onEditSeatLabel: (floorIndex: number, elementId: string, label: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas-floor-${floorIndex}`,
    data: { type: 'canvas', floorIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative rounded-xl border-2 border-dashed bg-muted/20 min-w-[400px] min-h-[600px]',
        isOver && 'border-primary bg-primary/5'
      )}
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      {elements.map((el) => (
        <CanvasElement
          key={el.id}
          element={el}
          floorIndex={floorIndex}
          onUpdatePosition={onMoveElement}
          onRemove={onRemoveElement}
          onEditLabel={onEditSeatLabel}
        />
      ))}
    </div>
  );
}

const defaultLayout = (): BusLayout => ({
  floors: [{ elements: [] }],
});

export const BusTemplateFormModal = ({
  template,
  open,
  onOpenChange,
  onSave,
}: BusTemplateFormModalProps) => {
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<BusLayout>(defaultLayout);
  const [activeFloorTab, setActiveFloorTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      if (template.layout?.floors?.length) {
        setLayout({ floors: template.layout.floors.map(f => ({ elements: [...(f.elements || [])] })) });
      } else {
        setLayout(defaultLayout());
      }
    } else {
      setName('');
      setLayout(defaultLayout());
    }
  }, [template, open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const addFloor = useCallback(() => {
    setLayout(prev => ({
      floors: [...prev.floors, { elements: [] }],
    }));
    setActiveFloorTab(layout.floors.length);
  }, [layout.floors.length]);

  const moveElement = useCallback((floorIndex: number, elementId: string, deltaX: number, deltaY: number) => {
    setLayout(prev => {
      const floors = prev.floors.map((f, fi) => {
        if (fi !== floorIndex) return f;
        return {
          elements: f.elements.map(el => {
            if (el.id !== elementId) return el;
            const x = Math.max(0, Math.min(CANVAS_WIDTH - 44, el.x + deltaX));
            const y = Math.max(0, Math.min(CANVAS_HEIGHT - 44, el.y + deltaY));
            return { ...el, x, y };
          }),
        };
      });
      return { floors };
    });
  }, []);

  const removeElement = useCallback((floorIndex: number, elementId: string) => {
    setLayout(prev => ({
      floors: prev.floors.map((f, fi) =>
        fi === floorIndex ? { elements: f.elements.filter(el => el.id !== elementId) } : f
      ),
    }));
  }, []);

  const editSeatLabel = useCallback((floorIndex: number, elementId: string, label: string) => {
    setLayout(prev => ({
      floors: prev.floors.map((f, fi) =>
        fi === floorIndex
          ? { elements: f.elements.map(el => (el.id === elementId ? { ...el, label } : el)) }
          : f
      ),
    }));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const data = active.data.current;
      if (!data) return;

      if (data.type === 'layout-element' && typeof data.floorIndex === 'number' && typeof data.elementId === 'string') {
        moveElement(data.floorIndex, data.elementId, delta?.x ?? 0, delta?.y ?? 0);
        return;
      }

      const overId = event.over?.id;
      if (data.type === 'palette' && typeof overId === 'string' && overId.startsWith('canvas-floor-')) {
        const floorIndex = parseInt(overId.replace('canvas-floor-', ''), 10);
        if (!Number.isNaN(floorIndex)) {
          setLayout(prev => {
            if (!prev.floors[floorIndex]) return prev;
            const elementType = data.elementType as BusLayoutElementType;
            const id = makeId(elementType);
            const seatCount = (prev.floors[floorIndex].elements || []).filter((e: BusLayoutElement) => e.type === 'seat').length;
            const newEl: BusLayoutElement = {
              id,
              type: elementType,
              x: Math.max(0, CANVAS_WIDTH / 2 - 22),
              y: Math.max(0, CANVAS_HEIGHT / 2 - 22),
              label: elementType === 'seat' ? String(seatCount + 1) : undefined,
            };
            const nextFloors = [...prev.floors];
            nextFloors[floorIndex] = { elements: [...(nextFloors[floorIndex].elements || []), newEl] };
            return { floors: nextFloors };
          });
        }
      }
    },
    [moveElement]
  );

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await onSave({ name: name.trim(), layout });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5" />
            {template ? 'Editar plantilla de camión' : 'Nueva plantilla de camión'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Arrastra elementos desde la paleta al canvas. Coloca asientos, baño, escaleras, puerta y conductor. Añade pisos si necesitas. Doble clic o botón eliminar para quitar un elemento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 flex-1 min-h-0">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Camión 30 plazas"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Paleta</p>
              <div className="flex flex-col gap-2">
                {ELEMENT_TYPES.map(({ type, label, Icon }) => (
                  <PaletteItem key={type} type={type} label={label} Icon={Icon} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Arrastra al canvas. Doble clic en elemento para eliminar. Clic en etiqueta de asiento para editar.
            </p>
          </div>

          <div className="flex flex-col min-h-[320px] overflow-hidden">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Tabs value={String(activeFloorTab)} onValueChange={v => setActiveFloorTab(Number(v))} className="flex-1">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${layout.floors.length}, minmax(0, 1fr))` }}>
                    {layout.floors.map((_, i) => (
                      <TabsTrigger key={i} value={String(i)}>Piso {i + 1}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={addFloor}>
                  <Plus className="w-4 h-4" />
                  Añadir piso
                </Button>
              </div>
              {layout.floors.map((floor, fi) => (
                <div key={fi} className={cn('flex-1 overflow-auto', activeFloorTab !== fi && 'hidden')}>
                  <FloorCanvas
                    floorIndex={fi}
                    elements={floor.elements || []}
                    onMoveElement={moveElement}
                    onRemoveElement={removeElement}
                    onEditSeatLabel={editSeatLabel}
                  />
                </div>
              ))}
            </DndContext>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
