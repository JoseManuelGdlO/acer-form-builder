import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Armchair, Ban, Droplets, DoorOpen, Layers, Minus, Plus, Trash2, User, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { BusLayout, BusLayoutElement, BusLayoutElementType } from '@/types/form';
import { toast } from 'sonner';

const DEFAULT_CANVAS_WIDTH = 400;
const DEFAULT_CANVAS_HEIGHT = 600;
const DEFAULT_GRID_SIZE = 10;
const DEFAULT_ELEMENT_SIZE = 44;

const ELEMENT_TYPES: { type: BusLayoutElementType; label: string; Icon: typeof Armchair }[] = [
  { type: 'seat', label: 'Asiento', Icon: Armchair },
  { type: 'bathroom', label: 'Baño', Icon: Droplets },
  { type: 'stairs', label: 'Escaleras', Icon: ArrowUpDown },
  { type: 'door', label: 'Puerta', Icon: DoorOpen },
  { type: 'driver', label: 'Conductor', Icon: User },
  { type: 'aisle', label: 'Pasillo', Icon: Minus },
  { type: 'blocked', label: 'Bloqueado', Icon: Ban },
];

function makeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getElementSize(el: BusLayoutElement) {
  const w = typeof el.width === 'number' ? el.width : DEFAULT_ELEMENT_SIZE;
  const h = typeof el.height === 'number' ? el.height : DEFAULT_ELEMENT_SIZE;
  return { w, h };
}

function snapToGrid(value: number, gridSize: number) {
  if (!gridSize || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

function normalizeNumberForKey(n: number): number {
  return Math.round(n * 100) / 100;
}

function getSlotKey(el: BusLayoutElement) {
  const { w, h } = getElementSize(el);
  return `${normalizeNumberForKey(el.x)}|${normalizeNumberForKey(el.y)}|${normalizeNumberForKey(w)}|${normalizeNumberForKey(h)}`;
}

function elementShortLabel(type: BusLayoutElementType) {
  switch (type) {
    case 'bathroom':
      return 'Baño';
    case 'stairs':
      return 'Esc.';
    case 'door':
      return 'Puerta';
    case 'driver':
      return 'Conductor';
    case 'aisle':
      return 'Pasillo';
    case 'blocked':
      return 'Bloq.';
    default:
      return '';
  }
}

export interface BusLayoutEditorProps {
  value: BusLayout;
  onChange: (next: BusLayout) => void;
  maxFloors?: number;
}

/**
 * Editor del layout con drag&drop.
 * - La interacción es completa (selección, propiedades, duplicar/eliminar, snap a grid).
 * - Aplica una prevención básica para evitar duplicar la misma “ranura” (x,y,width,height) en el mismo piso.
 */
export function BusLayoutEditor({ value, onChange, maxFloors = 2 }: BusLayoutEditorProps) {
  const toNumber = (v: unknown, fallback = 0) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalizeElement = (raw: any): BusLayoutElement | null => {
    if (!raw || typeof raw !== 'object') return null;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : makeId(String(raw.type ?? 'item'));
    const type = raw.type as BusLayoutElementType;
    const allowedTypes: BusLayoutElementType[] = ['seat', 'bathroom', 'stairs', 'door', 'driver', 'aisle', 'blocked'];
    if (!allowedTypes.includes(type)) return null;
    return {
      id,
      type,
      x: toNumber(raw.x, 0),
      y: toNumber(raw.y, 0),
      label: typeof raw.label === 'string' ? raw.label : undefined,
      width: raw.width != null ? toNumber(raw.width, DEFAULT_ELEMENT_SIZE) : undefined,
      height: raw.height != null ? toNumber(raw.height, DEFAULT_ELEMENT_SIZE) : undefined,
      rotation: raw.rotation != null ? toNumber(raw.rotation, 0) : undefined,
      metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : undefined,
    };
  };

  const normalizedValue = useMemo(() => {
    const canvas = value.canvas ?? { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, gridSize: DEFAULT_GRID_SIZE };
    const floors = (Array.isArray(value.floors) ? value.floors : []).map((rawFloor: any) => {
      const rawElements = Array.isArray(rawFloor?.elements)
        ? rawFloor.elements
        : Array.isArray(rawFloor?.items)
          ? rawFloor.items
          : [];
      const elements = rawElements
        .map(normalizeElement)
        .filter((el): el is BusLayoutElement => !!el);
      return { elements };
    });
    return {
      ...value,
      canvas,
      floors: floors.length > 0 ? floors : [{ elements: [] }],
    };
  }, [value]);

  // Active floor tab in the editor (limited to maxFloors).
  const [activeFloor, setActiveFloor] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{
    floorIndex: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    floorIndex: number;
    elementId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const canvasWidth = normalizedValue.canvas?.width ?? DEFAULT_CANVAS_WIDTH;
  const canvasHeight = normalizedValue.canvas?.height ?? DEFAULT_CANVAS_HEIGHT;
  const gridSize = normalizedValue.canvas?.gridSize ?? DEFAULT_GRID_SIZE;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visibleFloors = (normalizedValue.floors ?? []).slice(0, maxFloors);

  useEffect(() => {
    if (activeFloor > visibleFloors.length - 1) setActiveFloor(0);
  }, [activeFloor, visibleFloors.length]);

  // If stored layout has more floors, show a small warning and allow limiting.
  useEffect(() => {
    if ((normalizedValue.floors ?? []).length > maxFloors && !selectedElementId) {
      // Soft behavior: we keep extra floors untouched in state until user limits manually.
    }
  }, [normalizedValue.floors, maxFloors, selectedElementId]);

  const updateLayout = useCallback(
    (fn: (prev: BusLayout) => BusLayout) => {
      onChange(fn(normalizedValue));
    },
    [normalizedValue, onChange]
  );

  const addFloor = useCallback(() => {
    if (normalizedValue.floors.length >= maxFloors) return;
    updateLayout(prev => ({
      ...prev,
      floors: [...prev.floors, { elements: [] }],
    }));
    setActiveFloor(normalizedValue.floors.length);
  }, [maxFloors, normalizedValue.floors.length, updateLayout]);

  const removeElement = useCallback(
    (floorIndex: number, elementId: string) => {
      updateLayout(prev => ({
        ...prev,
        floors: prev.floors.map((f, fi) => (fi === floorIndex ? { elements: (f.elements ?? []).filter((e) => e.id !== elementId) } : f)),
      }));
      setSelectedElementId((id) => (id === elementId ? null : id));
      setSelectedElementIds((ids) => ids.filter((id) => id !== elementId));
    },
    [updateLayout]
  );

  const editSeatLabel = useCallback(
    (floorIndex: number, elementId: string, label: string) => {
      updateLayout(prev => ({
        ...prev,
        floors: prev.floors.map((f, fi) =>
          fi === floorIndex ? { elements: (f.elements ?? []).map((el) => (el.id === elementId ? { ...el, label } : el)) } : f
        ),
      }));
    },
    [updateLayout]
  );

  const updateElement = useCallback(
    (floorIndex: number, elementId: string, patch: Partial<BusLayoutElement>) => {
      updateLayout(prev => {
        const floors = prev.floors.map((f, fi) => {
          if (fi !== floorIndex) return f;
          const elements = (f.elements ?? []).map((el) => {
            if (el.id !== elementId) return el;
            return { ...el, ...patch };
          });

          // Collision prevention (same slot) for updated element.
          const target = elements.find((e) => e.id === elementId);
          if (!target) return f;
          const targetSlot = getSlotKey(target);
          const occupied = new Set<string>();
          for (const el of elements) {
            if (el.id === elementId) continue;
            const slot = getSlotKey(el);
            if (slot === targetSlot) {
              toast.error('Colisión: otra pieza ya ocupa esa posición exacta en este piso.');
              return f;
            }
            occupied.add(slot);
          }
          return { elements };
        });

        return { ...prev, floors };
      });
    },
    [updateLayout]
  );

  const findNearestFreePosition = useCallback(
    (floorElements: BusLayoutElement[], elementId: string | null, candidate: { x: number; y: number }, next: BusLayoutElement) => {
      const { w, h } = getElementSize(next);

      const clamp = (x: number, max: number) => Math.max(0, Math.min(max, x));
      const maxX = canvasWidth - w;
      const maxY = canvasHeight - h;

      const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x <= maxX && y <= maxY;

      const isOccupied = (x: number, y: number) => {
        return floorElements.some((el) => {
          if (elementId && el.id === elementId) return false;
          const { w: ew, h: eh } = getElementSize(el);
          const sameSlot = el.x === x && el.y === y && ew === w && eh === h;
          return sameSlot;
        });
      };

      const startX = snapToGrid(clamp(candidate.x, maxX), gridSize);
      const startY = snapToGrid(clamp(candidate.y, maxY), gridSize);

      if (inBounds(startX, startY) && !isOccupied(startX, startY)) return { x: startX, y: startY };

      // Search nearby grid slots.
      const steps = 8;
      const dirs: Array<[number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];

      for (let step = 1; step <= steps; step++) {
        for (const [dx, dy] of dirs) {
          const nx = snapToGrid(startX + dx * step * gridSize, gridSize);
          const ny = snapToGrid(startY + dy * step * gridSize, gridSize);
          const clampedX = clamp(nx, maxX);
          const clampedY = clamp(ny, maxY);
          if (inBounds(clampedX, clampedY) && !isOccupied(clampedX, clampedY)) return { x: clampedX, y: clampedY };
        }
      }

      return null;
    },
    [canvasHeight, canvasWidth, gridSize]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const data = active.data.current;
      if (!data) return;

      // Move existing element
      if (data.type === 'layout-element' && typeof data.floorIndex === 'number' && typeof data.elementId === 'string') {
        const floorIndex = data.floorIndex;
        const elementId = data.elementId;
        const currentFloor = normalizedValue.floors[floorIndex];
        if (!currentFloor) return;

        const selectedSet = new Set(selectedElementIds);
        const shouldMoveGroup = selectedSet.size > 1 && selectedSet.has(elementId);

        if (shouldMoveGroup) {
          const elements = currentFloor.elements ?? [];
          const groupElements = elements.filter((e) => selectedSet.has(e.id));
          if (!groupElements.length) return;

          const nonGroupElements = elements.filter((e) => !selectedSet.has(e.id));
          const occupiedByNonGroup = new Set(nonGroupElements.map((e) => getSlotKey(e)));

          // Apply same delta to all selected items (snap + clamp per element).
          const proposed = groupElements.map((el) => {
            const { w, h } = getElementSize(el);
            const rawX = el.x + (delta?.x ?? 0);
            const rawY = el.y + (delta?.y ?? 0);
            const x = Math.max(0, Math.min(canvasWidth - w, snapToGrid(rawX, gridSize)));
            const y = Math.max(0, Math.min(canvasHeight - h, snapToGrid(rawY, gridSize)));
            return { ...el, x, y };
          });

          // Validate no collisions against non-group and inside group.
          const proposedSlots = new Set<string>();
          for (const p of proposed) {
            const slot = getSlotKey(p);
            if (occupiedByNonGroup.has(slot)) {
              toast.error('No se puede mover la selección: colisión con otro elemento.');
              return;
            }
            if (proposedSlots.has(slot)) {
              toast.error('No se puede mover la selección: colisión interna.');
              return;
            }
            proposedSlots.add(slot);
          }

          updateLayout((prev) => {
            const floors = prev.floors.map((f, fi) => {
              if (fi !== floorIndex) return f;
              const mapById = new Map(proposed.map((p) => [p.id, p]));
              return {
                elements: (f.elements ?? []).map((el) => mapById.get(el.id) ?? el),
              };
            });
            return { ...prev, floors };
          });
          return;
        }

        const el = (currentFloor.elements ?? []).find((e) => e.id === elementId);
        if (!el) return;

        const nextCandidateX = el.x + (delta?.x ?? 0);
        const nextCandidateY = el.y + (delta?.y ?? 0);

        const snappedX = snapToGrid(nextCandidateX, gridSize);
        const snappedY = snapToGrid(nextCandidateY, gridSize);

        const nextPatch: BusLayoutElement = { ...el, x: snappedX, y: snappedY };
        const nextPos = findNearestFreePosition(currentFloor.elements ?? [], elementId, { x: snappedX, y: snappedY }, nextPatch);
        if (!nextPos) return; // keep old position if no free slot

        updateElement(floorIndex, elementId, { x: nextPos.x, y: nextPos.y });
        return;
      }

      // Add new element from palette
      const overId = event.over?.id;
      if (data.type === 'palette' && typeof overId === 'string' && overId.startsWith('canvas-floor-')) {
        const floorIndex = parseInt(overId.replace('canvas-floor-', ''), 10);
        if (Number.isNaN(floorIndex)) return;

        if (floorIndex >= maxFloors) return;
        const floor = normalizedValue.floors[floorIndex];
        if (!floor) return;

        const elementType = data.elementType as BusLayoutElementType;
        const { w, h } = getElementSize({
          id: 'tmp',
          type: elementType,
          x: 0,
          y: 0,
        } as any);

        const seatCount = (floor.elements ?? []).filter((e) => e.type === 'seat').length;
        const newEl: BusLayoutElement = {
          id: makeId(elementType),
          type: elementType,
          x: 0,
          y: 0,
          width: DEFAULT_ELEMENT_SIZE,
          height: DEFAULT_ELEMENT_SIZE,
          rotation: 0,
          ...(elementType === 'seat' ? { label: String(seatCount + 1) } : null),
        };

        const candidate = { x: canvasWidth / 2 - w / 2, y: canvasHeight / 2 - h / 2 };
        const pos = findNearestFreePosition(floor.elements ?? [], null, candidate, newEl);
        if (!pos) {
          toast.error('No hay espacio disponible en esa ranura para agregar el elemento.');
          return;
        }

        updateLayout(prev => {
          const floors = prev.floors.map((f, fi) => {
            if (fi !== floorIndex) return f;
            return { elements: [...(f.elements ?? []), { ...newEl, x: pos.x, y: pos.y }] };
          });
          return { ...prev, floors };
        });

        setSelectedElementId(null);
      }
    },
    [
      findNearestFreePosition,
      gridSize,
      canvasHeight,
      canvasWidth,
      maxFloors,
      normalizedValue.floors,
      selectedElementIds,
      updateElement,
      updateLayout,
    ]
  );

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    for (const [fi, floor] of (visibleFloors ?? []).entries()) {
      const el = (floor.elements ?? []).find((e) => e.id === selectedElementId);
      if (el) return { floorIndex: fi, element: el };
    }
    return null;
  }, [selectedElementId, visibleFloors]);

  const selectedElementType = selectedElement?.element?.type;
  const selectedLabelValue = selectedElement?.element?.label ?? '';
  const selectedWidthValue = selectedElement?.element?.width ?? DEFAULT_ELEMENT_SIZE;
  const selectedHeightValue = selectedElement?.element?.height ?? DEFAULT_ELEMENT_SIZE;
  const selectedRotationValue = selectedElement?.element?.rotation ?? 0;

  const activeFloorElements = useMemo(() => visibleFloors[activeFloor]?.elements ?? [], [activeFloor, visibleFloors]);

  useEffect(() => {
    if (!resizing) return;

    const onPointerMove = (evt: PointerEvent) => {
      const deltaX = evt.clientX - resizing.startX;
      const deltaY = evt.clientY - resizing.startY;
      const nextWidth = Math.max(10, snapToGrid(resizing.startWidth + deltaX, gridSize));
      const nextHeight = Math.max(10, snapToGrid(resizing.startHeight + deltaY, gridSize));
      updateElement(resizing.floorIndex, resizing.elementId, {
        width: nextWidth,
        height: nextHeight,
      });
    };

    const stopResize = () => setResizing(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
    };
  }, [gridSize, resizing, updateElement]);

  const getElementsInsideRect = useCallback(
    (floorIndex: number, startX: number, startY: number, currentX: number, currentY: number) => {
      const floor = visibleFloors[floorIndex];
      if (!floor) return [];
      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);
      const top = Math.min(startY, currentY);
      const bottom = Math.max(startY, currentY);
      return (floor.elements ?? [])
        .filter((el) => {
          const { w, h } = getElementSize(el);
          const intersects = el.x < right && el.x + w > left && el.y < bottom && el.y + h > top;
          return intersects;
        })
        .map((el) => el.id);
    },
    [visibleFloors]
  );

  const duplicateElements = useCallback(
    (floorIndex: number, elementIds: string[]) => {
      if (!elementIds.length) return;
      const floor = visibleFloors[floorIndex];
      if (!floor) return;

      const idsSet = new Set(elementIds);
      const sourceElements = (floor.elements ?? []).filter((el) => idsSet.has(el.id));
      if (!sourceElements.length) return;

      const sortedByPosition = [...sourceElements].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      const createdIds: string[] = [];

      updateLayout((prev) => {
        const floors = prev.floors.map((f, fi) => {
          if (fi !== floorIndex) return f;
          const nextElements = [...(f.elements ?? [])];
          for (const src of sortedByPosition) {
            const duplicated: BusLayoutElement = {
              ...src,
              id: makeId(src.type),
              x: src.x + gridSize,
              y: src.y + gridSize,
            };
            const pos = findNearestFreePosition(nextElements, null, { x: duplicated.x, y: duplicated.y }, duplicated);
            if (!pos) continue;
            const finalEl = { ...duplicated, x: pos.x, y: pos.y };
            nextElements.push(finalEl);
            createdIds.push(finalEl.id);
          }
          return { elements: nextElements };
        });
        return { ...prev, floors };
      });

      if (!createdIds.length) {
        toast.error('No hay espacio para duplicar la selección.');
        return;
      }
      setSelectedElementIds(createdIds);
      setSelectedElementId(createdIds[0]);
      if (createdIds.length !== elementIds.length) {
        toast.message('Se duplicaron parcialmente los elementos por falta de espacio.');
      }
    },
    [findNearestFreePosition, gridSize, updateLayout, visibleFloors]
  );

  const PaletteItem = ({ type, label, Icon }: { type: BusLayoutElementType; label: string; Icon: typeof Armchair }) => {
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
  };

  const CanvasElement = ({ element, floorIndex }: { element: BusLayoutElement; floorIndex: number }) => {
    const isSelected = selectedElementIds.includes(element.id) || element.id === selectedElementId;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: element.id,
      data: { type: 'layout-element', elementId: element.id, floorIndex },
    });

    const dragTransform = transform ? `translate(${transform.x}px, ${transform.y}px)` : '';
    const rotationTransform = typeof element.rotation === 'number' && element.rotation !== 0 ? ` rotate(${element.rotation}deg)` : '';
    const { w, h } = getElementSize(element);

    const Icon = ELEMENT_TYPES.find((t) => t.type === element.type)?.Icon ?? Armchair;

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 bg-card shadow select-none z-10 box-border cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-80 shadow-lg z-20',
          element.type === 'seat' && 'bg-primary/10 border-primary/30',
          !isSelected && 'hover:ring-1 hover:ring-primary/20'
        )}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: w,
          height: h,
          transform: `${dragTransform}${rotationTransform}`.trim() || undefined,
          transformOrigin: 'center',
        }}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation();
          const isMultiKey = e.ctrlKey || e.metaKey;
          if (isMultiKey) {
            setSelectedElementIds((prev) => {
              if (prev.includes(element.id)) return prev.filter((id) => id !== element.id);
              return [...prev, element.id];
            });
            setSelectedElementId(element.id);
            return;
          }
          setSelectedElementIds([element.id]);
          setSelectedElementId(element.id);
        }}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-medium truncate max-w-[70px] px-1">
          {element.type === 'seat' ? element.label ?? '?' : elementShortLabel(element.type)}
        </span>
        {isSelected && (
          <>
            <button
              type="button"
              aria-label="Eliminar"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-100 hover:opacity-100 transition-opacity z-30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeElement(floorIndex, element.id);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
            {selectedElementIds.length <= 1 && (
              <button
                type="button"
                aria-label="Redimensionar"
                title="Arrastra para redimensionar"
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-sm bg-primary border border-background shadow z-30 cursor-se-resize"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizing({
                    floorIndex,
                    elementId: element.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    startWidth: w,
                    startHeight: h,
                  });
                }}
              />
            )}
          </>
        )}
      </div>
    );
  };

  const FloorCanvas = ({ floorIndex }: { floorIndex: number }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `canvas-floor-${floorIndex}`,
      data: { type: 'canvas', floorIndex },
    });

    const elements = visibleFloors[floorIndex]?.elements ?? [];

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'relative rounded-xl border-2 border-dashed bg-muted/20 min-w-[400px] min-h-[600px]',
          isOver && 'border-primary bg-primary/5'
        )}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundImage: `repeating-linear-gradient(to right, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent ${gridSize}px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent ${gridSize}px)`,
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          setSelectedElementId(null);
          setSelectedElementIds([]);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (e.target !== e.currentTarget) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setSelectionBox({
            floorIndex,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
            active: true,
          });
          setSelectedElementId(null);
          setSelectedElementIds([]);
        }}
        onPointerMove={(e) => {
          const target = e.currentTarget as HTMLDivElement | null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setSelectionBox((prev) => {
            if (!prev?.active || prev.floorIndex !== floorIndex) return prev;
            const ids = getElementsInsideRect(floorIndex, prev.startX, prev.startY, x, y);
            setSelectedElementIds(ids);
            setSelectedElementId(ids[0] ?? null);
            return { ...prev, currentX: x, currentY: y };
          });
        }}
        onPointerUp={() => {
          setSelectionBox((prev) => (prev?.active && prev.floorIndex === floorIndex ? { ...prev, active: false } : prev));
        }}
        onPointerLeave={() => {
          setSelectionBox((prev) => (prev?.active && prev.floorIndex === floorIndex ? { ...prev, active: false } : prev));
        }}
      >
        {elements.map((el) => (
          <CanvasElement key={el.id} element={el} floorIndex={floorIndex} />
        ))}
        {selectionBox?.active && selectionBox.floorIndex === floorIndex && (
          <div
            className="absolute border border-primary bg-primary/10 pointer-events-none z-40"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY),
            }}
          />
        )}
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4 flex-1 min-h-0">
        <div className="space-y-3 min-w-0">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Paleta</p>
          <div className="flex flex-col gap-2">
            {ELEMENT_TYPES.map(({ type, label, Icon }) => (
              <PaletteItem key={type} type={type} label={label} Icon={Icon} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Arrastra elementos al plano. Selecciona para editar. Snap-to-grid y evita colisiones exactas.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Lienzo</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ancho</Label>
              <Input
                type="number"
                value={canvasWidth}
                min={200}
                step={10}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  updateLayout(prev => ({
                    ...prev,
                    canvas: { ...(prev.canvas ?? { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, gridSize: DEFAULT_GRID_SIZE }), width: next },
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alto</Label>
              <Input
                type="number"
                value={canvasHeight}
                min={200}
                step={10}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  updateLayout(prev => ({
                    ...prev,
                    canvas: { ...(prev.canvas ?? { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, gridSize: DEFAULT_GRID_SIZE }), height: next },
                  }));
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Grid</Label>
            <Input
              type="number"
              value={gridSize}
              min={1}
              step={1}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                updateLayout(prev => ({
                  ...prev,
                  canvas: { ...(prev.canvas ?? { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, gridSize: DEFAULT_GRID_SIZE }), gridSize: next },
                }));
              }}
            />
          </div>
        </div>
        </div>

        <div className="flex flex-col min-h-0 overflow-hidden">
        {(normalizedValue.floors ?? []).length > maxFloors && (
          <div className="mb-2 rounded-lg border bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Este layout tiene más de 2 pisos.</p>
                <p className="text-xs text-muted-foreground">
                  El editor actual trabaja con máximo {maxFloors} pisos. Puedes limitar la vista a los primeros {maxFloors}.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      const ok = window.confirm(`Limitar a ${maxFloors} pisos? Se descartarán los pisos extra para este layout.`);
                      if (!ok) return;
                      onChange({ ...normalizedValue, floors: visibleFloors });
                      setSelectedElementId(null);
                      setActiveFloor(0);
                    }}
                  >
                    Limitar pisos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // keep as-is; extra floors won't be editable/visible
                      toast.message('Puedes seguir editando los primeros pisos. Los extra no se editan en este editor.');
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <Tabs value={String(activeFloor)} onValueChange={(v) => setActiveFloor(Number(v))}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${visibleFloors.length}, minmax(0, 1fr))` }}>
              {visibleFloors.map((_, i) => (
                <TabsTrigger key={i} value={String(i)}>
                  Piso {i + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={addFloor} disabled={visibleFloors.length >= maxFloors}>
            <Plus className="w-4 h-4" />
            Añadir
          </Button>
        </div>

          <ScrollArea className="flex-1 min-h-0 overflow-auto">
            <div className="flex flex-col gap-2">
              {visibleFloors.map((_, fi) => (
                <div key={fi} className={cn(fi === activeFloor ? 'block' : 'hidden')}>
                  <FloorCanvas floorIndex={fi} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="min-h-0 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium">Propiedades</p>
          {(selectedElementIds.length > 0 || selectedElementId) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                const idsToDuplicate = selectedElementIds.length ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
                duplicateElements(activeFloor, idsToDuplicate);
              }}
            >
              <Plus className="w-4 h-4" />
              {selectedElementIds.length > 1 ? `Duplicar (${selectedElementIds.length})` : 'Duplicar'}
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-lg p-3">
          {!selectedElement ? (
            <p className="text-sm text-muted-foreground">Selecciona un elemento en el plano para editar sus propiedades.</p>
          ) : selectedElementIds.length > 1 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Seleccion múltiple: {selectedElementIds.length} elementos</p>
              <p className="text-xs text-muted-foreground">
                Usa `Ctrl/Cmd + click` para agregar/quitar elementos, o arrastra una caja en el canvas para seleccionar varios.
              </p>
              <div className="pt-1 flex gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => duplicateElements(activeFloor, selectedElementIds)}>
                  <Plus className="w-4 h-4" />
                  Duplicar selección
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    const idsSet = new Set(selectedElementIds);
                    updateLayout((prev) => ({
                      ...prev,
                      floors: prev.floors.map((f, fi) =>
                        fi === activeFloor ? { elements: (f.elements ?? []).filter((el) => !idsSet.has(el.id)) } : f
                      ),
                    }));
                    setSelectedElementId(null);
                    setSelectedElementIds([]);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar selección
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Input value={selectedElementType ?? ''} disabled />
              </div>

              {selectedElement.element.type === 'seat' && (
                <div className="space-y-1">
                  <Label className="text-xs">Etiqueta del asiento</Label>
                  <Input
                    value={selectedLabelValue}
                    onChange={(e) => editSeatLabel(selectedElement.floorIndex, selectedElementId!, e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Ancho</Label>
                  <Input
                    type="number"
                    min={10}
                    step={1}
                    value={selectedWidthValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next) || next <= 0) return;
                      updateElement(selectedElement.floorIndex, selectedElementId!, { width: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Alto</Label>
                  <Input
                    type="number"
                    min={10}
                    step={1}
                    value={selectedHeightValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next) || next <= 0) return;
                      updateElement(selectedElement.floorIndex, selectedElementId!, { height: next });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Rotación (grados)</Label>
                <Input
                  type="number"
                  step={1}
                  value={selectedRotationValue}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    updateElement(selectedElement.floorIndex, selectedElementId!, { rotation: next });
                  }}
                />
              </div>

              <div className="pt-1 flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => removeElement(selectedElement.floorIndex, selectedElementId!)}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
        </div>
      </div>
    </DndContext>
  );
}

