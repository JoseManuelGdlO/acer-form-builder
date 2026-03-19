import { Armchair, Ban, Droplets, DoorOpen, Minus, User, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusLayout, BusLayoutElement, BusLayoutElementType, TripSeatAssignmentEntry } from '@/types/form';

const DEFAULT_CANVAS_WIDTH = 400;
const DEFAULT_CANVAS_HEIGHT = 600;
const DEFAULT_ELEMENT_SIZE = 44;

const ELEMENT_ICONS: Record<BusLayoutElementType, typeof Armchair> = {
  seat: Armchair,
  bathroom: Droplets,
  stairs: ArrowUpDown,
  door: DoorOpen,
  driver: User,
  aisle: Minus,
  blocked: Ban,
};

const elementShortLabel = (type: BusLayoutElementType) => {
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
};

function getElementSize(el: BusLayoutElement) {
  const w = typeof el.width === 'number' ? el.width : DEFAULT_ELEMENT_SIZE;
  const h = typeof el.height === 'number' ? el.height : DEFAULT_ELEMENT_SIZE;
  return { w, h };
}

function clientFirstName(clientName?: string | null) {
  if (!clientName) return undefined;
  return clientName.split(' ')[0] || clientName;
}

export interface BusLayoutRendererProps {
  layout: BusLayout;
  floorIndex: number;
  pendingSeatId?: string | null;
  assignmentBySeatId?: Record<string, TripSeatAssignmentEntry>;
  onSeatClick?: (seatId: string) => void;
}

/**
 * Renderer reusable for the “seat assignment” view.
 * Only seats are interactive; non-seat elements have `pointer-events: none`.
 */
export function BusLayoutRenderer({
  layout,
  floorIndex,
  pendingSeatId = null,
  assignmentBySeatId = {},
  onSeatClick,
}: BusLayoutRendererProps) {
  const floors = layout.floors ?? [];
  const floor = floors[floorIndex];

  const canvasWidth = layout.canvas?.width ?? DEFAULT_CANVAS_WIDTH;
  const canvasHeight = layout.canvas?.height ?? DEFAULT_CANVAS_HEIGHT;

  if (!floor) return null;

  return (
    <div
      className="relative rounded-xl border-2 border-dashed bg-muted/20 mx-auto"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {(floor.elements ?? []).map((el) => {
        const isSeat = el.type === 'seat';
        const assigned = isSeat ? assignmentBySeatId[el.id] : undefined;
        const isPending = isSeat && pendingSeatId === el.id;
        const Icon = ELEMENT_ICONS[el.type] ?? Armchair;
        const { w, h } = getElementSize(el);

        return (
          <div
            key={el.id}
            className={cn(
              'absolute flex flex-col items-center justify-center rounded-lg border-2 box-border transition-colors',
              isSeat
                ? assigned
                  ? 'bg-muted border-muted-foreground/40 cursor-default'
                  : isPending
                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/50'
                    : 'bg-background border-border hover:border-primary hover:bg-primary/10 cursor-pointer'
                : 'bg-muted/50 border-muted-foreground/30 pointer-events-none cursor-default'
            )}
            style={{
              left: el.x,
              top: el.y,
              width: w,
              height: h,
              transform: typeof el.rotation === 'number' && el.rotation !== 0 ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: 'center',
            }}
            onClick={() => {
              if (!isSeat) return;
              if (!assigned && onSeatClick) onSeatClick(el.id);
            }}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-medium truncate max-w-full">
              {isSeat ? el.label ?? el.id : elementShortLabel(el.type)}
            </span>
            {isSeat && assigned && (
              <span className="text-[9px] truncate max-w-full text-muted-foreground">
                {clientFirstName((assigned as any)?.client?.name) ?? '—'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

