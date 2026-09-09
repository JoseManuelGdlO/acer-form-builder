import { useState, useEffect, useMemo } from 'react';
import { Trip, Client, StaffMember, TripChangeLogEntry, TripIncome, TripExpense, TripFinanceSummary } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabBar, type TabBarItem } from '@/components/layout/TabBar';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { tripOccupancy, tripSchedulePhase } from '@/lib/tripSchedulePhase';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Mail,
  Phone,
  Armchair,
  RotateCcw,
  History,
  Building2,
  DollarSign,
  Download,
  UserCircle,
  MapPinned,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { AddParticipantsToTripModal } from './AddParticipantsToTripModal';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { isParticipantChildInTrip, sortTripParticipantsByFamily } from '@/lib/tripParticipantsOrder';
import { buildTripCompanyColorMap } from '@/lib/tripCompanyColors';
import type { Hotel } from '@/types/hotel';
import { TripHotelsSection } from '@/components/trips/TripHotelsSection';

const ACTION_LABELS: Record<string, string> = {
  trip_created: 'Viaje creado',
  trip_updated: 'Viaje actualizado',
  participant_added: 'Participante(s) agregado(s)',
  participant_removed: 'Participante quitado',
  participant_pickup_updated: 'Lugar de recogida actualizado',
  seat_assigned: 'Asiento asignado',
  seat_cleared: 'Asiento liberado',
  seat_assignments_reset: 'Asignaciones reiniciadas',
  invitation_sent: 'Invitación enviada',
  invitation_accepted: 'Invitación aceptada',
  invitation_rejected: 'Invitación rechazada',
};

interface TripDetailViewProps {
  trip: Trip;
  availableClients: Client[];
  availableStaffMembers: StaffMember[];
  companiesForInvite: { id: string; name: string }[];
  changeLog: TripChangeLogEntry[];
  onBack: () => void;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => Promise<void>;
  onAddParticipants: (data: { clientIds?: string[]; staffMemberIds?: string[]; companions?: { name: string; phone?: string }[] }) => Promise<void>;
  onRemoveParticipant: (participantId: string) => Promise<void>;
  onUpdateParticipantPickup?: (participantId: string, pickupLocation: string | null) => Promise<void>;
  onOpenSeatPicker: () => void;
  onResetSeatAssignments: () => Promise<void>;
  onLoadChangeLog: () => void;
  onLoadTripFinance: () => void;
  onDeleteTripIncome: (incomeId: string) => Promise<void>;
  onCreateTripExpense: (data: { amount: number; expenseDate: string; category?: string; referenceNumber?: string; note?: string }) => Promise<void>;
  onDeleteTripExpense: (expenseId: string) => Promise<void>;
  financeSummary: TripFinanceSummary | null;
  tripIncomes: TripIncome[];
  tripExpenses: TripExpense[];
  onInviteCompanies: (invitedCompanyIds: string[]) => Promise<void>;
  /** Revisor: solo ver, participantes y asientos; sin finanzas, invitaciones, edición */
  reviewerMode?: boolean;
  /** Catálogo de hoteles (permiso hotels.view); vacío si no aplica */
  catalogHotels?: Hotel[];
  onRefreshHotelCatalog?: () => Promise<void>;
  /** trips.participants_manage y callbacks definidos */
  canManageTripHotels?: boolean;
  onAttachTripHotel?: (data: {
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    reservedSingles: number;
    reservedDoubles: number;
    reservedTriples: number;
    notes?: string | null;
  }) => Promise<void>;
  onUpdateTripHotel?: (
    tripHotelId: string,
    data: {
      checkInDate?: string;
      checkOutDate?: string;
      reservedSingles?: number;
      reservedDoubles?: number;
      reservedTriples?: number;
      notes?: string | null;
    }
  ) => Promise<void>;
  onDetachTripHotel?: (tripHotelId: string) => Promise<void>;
  onAssignTripHotelRoom?: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  onClearTripHotelRoomAssignment?: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
}

export const TripDetailView = ({
  trip,
  availableClients,
  availableStaffMembers,
  companiesForInvite,
  changeLog,
  onBack,
  onEdit,
  onDelete,
  onAddParticipants,
  onRemoveParticipant,
  onUpdateParticipantPickup,
  onOpenSeatPicker,
  onResetSeatAssignments,
  onLoadChangeLog,
  onLoadTripFinance,
  onDeleteTripIncome,
  onCreateTripExpense,
  onDeleteTripExpense,
  financeSummary,
  tripIncomes,
  tripExpenses,
  onInviteCompanies,
  reviewerMode = false,
  catalogHotels = [],
  onRefreshHotelCatalog,
  canManageTripHotels = false,
  onAttachTripHotel,
  onUpdateTripHotel,
  onDetachTripHotel,
  onAssignTripHotelRoom,
  onClearTripHotelRoomAssignment,
}: TripDetailViewProps) => {
  type TripTabId = 'participantes' | 'asientos' | 'hoteles' | 'finanzas' | 'historial';
  const [tab, setTab] = useState<TripTabId>('participantes');
  const [memberSearch, setMemberSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteCompanyModalOpen, setInviteCompanyModalOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: '',
    referenceNumber: '',
    note: '',
  });
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [pickupDrafts, setPickupDrafts] = useState<Record<string, string>>({});
  const [pickupSavingId, setPickupSavingId] = useState<string | null>(null);

  const sharedIds = (trip.sharedCompanies ?? []).map(c => c.id);
  const companiesAvailableToInvite = companiesForInvite.filter(c => !sharedIds.includes(c.id));

  // Cargar historial y finanzas al entrar (solo administradores)
  useEffect(() => {
    if (reviewerMode) return;
    onLoadChangeLog();
    onLoadTripFinance();
  }, [trip.id, reviewerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPickupDrafts({});
    setTab('participantes');
  }, [trip.id]);

  useEffect(() => {
    if (reviewerMode && (tab === 'finanzas' || tab === 'historial')) {
      setTab('participantes');
    }
  }, [reviewerMode, tab]);

  useEffect(() => {
    if (reviewerMode) return;
    const interval = setInterval(() => {
      onLoadChangeLog();
      onLoadTripFinance();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trip.id, reviewerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = useMemo(
    () => sortTripParticipantsByFamily(trip.participants ?? []),
    [trip.participants]
  );
  const participantIdSet = useMemo(
    () => new Set(participants.map((p) => p.client?.id).filter(Boolean) as string[]),
    [participants]
  );
  const participantCompanyIds = useMemo(
    () => participants.map((p) => p.client?.company?.id).filter(Boolean) as string[],
    [participants]
  );
  const companyColorById = useMemo(
    () => buildTripCompanyColorMap(participantCompanyIds),
    [participantCompanyIds]
  );
  const companiesFromParticipants = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) {
      const co = p.client?.company;
      if (co?.id) m.set(co.id, co.name);
    }
    return [...m.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([id, name]) => ({ id, name }));
  }, [participants]);
  const occupancy = tripOccupancy(trip);
  const phase = tripSchedulePhase(trip.departureDate, trip.returnDate);
  const hotelLabel = trip.tripHotels?.[0]?.hotel?.name ?? 'Sin hotel';
  const assignedSeatCount = trip.seatAssignments?.length ?? 0;
  const seatLabelByParticipantId = useMemo(() => {
    const map = new Map<string, string>();
    const floors = trip.busTemplate?.layout?.floors ?? [];
    const labelForSeatId = (seatId: string) => {
      for (const floor of floors) {
        const el = (floor.elements ?? []).find((e) => e.type === 'seat' && e.id === seatId);
        if (el) return el.label ?? seatId;
      }
      return seatId;
    };
    for (const a of trip.seatAssignments ?? []) {
      const label = a.seatId
        ? labelForSeatId(a.seatId)
        : a.seatNumber != null
          ? String(a.seatNumber)
          : '—';
      if (a.participantId) map.set(a.participantId, label);
    }
    return map;
  }, [trip.seatAssignments, trip.busTemplate]);
  const tripTabs: TabBarItem[] = [
    { id: 'participantes', label: 'Participantes' },
    { id: 'asientos', label: 'Asientos' },
    { id: 'hoteles', label: 'Hoteles' },
    ...(!reviewerMode
      ? [
          { id: 'finanzas', label: 'Finanzas' },
          { id: 'historial', label: 'Historial' },
        ]
      : []),
  ];
  const headerKpis: Array<[string, string]> = [
    ['Participantes', `${occupancy.count}/${occupancy.total}`],
    ['Hotel', hotelLabel],
    ['Asientos', `${assignedSeatCount}`],
    reviewerMode
      ? ['Camión', trip.busTemplate?.name ?? 'Sin plantilla']
      : ['Ingresos', `$${Number(financeSummary?.totalIncome ?? 0).toLocaleString()}`],
  ];
  const filteredParticipants = memberSearch.trim()
    ? participants.filter(p => {
        const c = p.client;
        const q = memberSearch.toLowerCase();
        const companionName = p.companion?.name ?? '';
        const companionPhone = p.companion?.phone ?? '';
        const staffName = p.staffMember?.name ?? '';
        const staffPhone = p.staffMember?.phone ?? '';
        const staffRole = p.staffMember?.role ?? '';
        if (!c && p.participantType !== 'staff') {
          return (
            companionName.toLowerCase().includes(q) ||
            companionPhone.includes(memberSearch)
          );
        }
        if (!c && p.participantType === 'staff') {
          return (
            staffName.toLowerCase().includes(q) ||
            staffPhone.includes(memberSearch) ||
            staffRole.toLowerCase().includes(q)
          );
        }
        const branchName = c.assignedUser?.branch?.name ?? '';
        const advisorName = c.assignedUser?.name ?? '';
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(memberSearch)) ||
          (c.company?.name && c.company.name.toLowerCase().includes(q)) ||
          branchName.toLowerCase().includes(q) ||
          advisorName.toLowerCase().includes(q) ||
          (p.pickupLocation && p.pickupLocation.toLowerCase().includes(q))
        );
      })
    : participants;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(trip.id);
      toast.success('Viaje eliminado');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleResetSeats = async () => {
    setIsResetting(true);
    try {
      await onResetSeatAssignments();
      toast.success('Asignaciones de asientos reiniciadas');
    } catch (err: any) {
      toast.error(err.message || 'Error al reiniciar');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleInviteCompany = (id: string) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInviteCompanies = async () => {
    if (selectedCompanyIds.size === 0) {
      toast.error('Selecciona al menos una empresa');
      return;
    }
    setIsInviting(true);
    try {
      const fullList = [...sharedIds, ...Array.from(selectedCompanyIds)];
      await onInviteCompanies(fullList);
      toast.success('Invitación enviada a la(s) empresa(s)');
      setInviteCompanyModalOpen(false);
      setSelectedCompanyIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Error al invitar');
    } finally {
      setIsInviting(false);
    }
  };

  const openInviteModal = () => {
    setSelectedCompanyIds(new Set());
    setInviteCompanyModalOpen(true);
  };

  const fmtLong = (d: string | null | undefined) =>
    d ? format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }) : '';
  const departureStr = fmtLong(trip.departureDate);
  const returnStr = fmtLong(trip.returnDate);

  const handleCreateExpense = async () => {
    if (!expenseForm.amount || !expenseForm.expenseDate) {
      toast.error('Monto y fecha son obligatorios');
      return;
    }
    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    setIsCreatingExpense(true);
    try {
      await onCreateTripExpense({
        amount,
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category || undefined,
        referenceNumber: expenseForm.referenceNumber || undefined,
        note: expenseForm.note || undefined,
      });
      setExpenseForm((prev) => ({ ...prev, amount: '', category: '', referenceNumber: '', note: '' }));
      toast.success('Gasto agregado');
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar gasto');
    } finally {
      setIsCreatingExpense(false);
    }
  };

  const handleDownloadTripDetails = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 18;

      const ensureSpace = (min = 12) => {
        if (y + min <= pageHeight - 12) return;
        doc.addPage();
        y = 18;
      };

      const writeLine = (text: string, opts?: { bold?: boolean; size?: number; indent?: number; gap?: number }) => {
        ensureSpace(10);
        doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
        doc.setFontSize(opts?.size ?? 10);
        const indent = opts?.indent ?? 14;
        const lines = doc.splitTextToSize(text, pageWidth - indent - 14);
        doc.text(lines, indent, y);
        y += (lines.length * ((opts?.size ?? 10) * 0.45)) + (opts?.gap ?? 3);
      };

      const getSeatLabelById = (seatId: string) => {
        const floors = trip.busTemplate?.layout?.floors ?? [];
        for (const floor of floors) {
          const el = (floor.elements ?? []).find((e) => e.type === 'seat' && e.id === seatId);
          if (el) return el.label ?? seatId;
        }
        return seatId;
      };

      // Render a snapshot image of each floor layout, including assigned seats.
      const drawLayoutFloorCanvas = (floorIndex: number): string | null => {
        const layout = trip.busTemplate?.layout;
        const floor = layout?.floors?.[floorIndex];
        if (!layout || !floor) return null;

        const logicalWidth = layout.canvas?.width ?? 400;
        const logicalHeight = layout.canvas?.height ?? 600;
        const padding = 16;
        const scale = 1.6;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(logicalWidth * scale + padding * 2));
        canvas.height = Math.max(1, Math.round(logicalHeight * scale + padding * 2));
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const assignmentBySeatId = new Map(
          (trip.seatAssignments ?? [])
            .filter((a) => a.seatId)
            .map((a) => [a.seatId!, a] as const)
        );

        // Background and border.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#d8dde8';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

        // Light grid for readability.
        const grid = layout.canvas?.gridSize ?? 10;
        ctx.strokeStyle = '#f0f2f7';
        for (let x = padding; x <= canvas.width - padding; x += Math.max(6, grid * scale)) {
          ctx.beginPath();
          ctx.moveTo(x, padding);
          ctx.lineTo(x, canvas.height - padding);
          ctx.stroke();
        }
        for (let yGrid = padding; yGrid <= canvas.height - padding; yGrid += Math.max(6, grid * scale)) {
          ctx.beginPath();
          ctx.moveTo(padding, yGrid);
          ctx.lineTo(canvas.width - padding, yGrid);
          ctx.stroke();
        }

        const labelForType = (type: string) => {
          if (type === 'bathroom') return 'Baño';
          if (type === 'stairs') return 'Esc.';
          if (type === 'door') return 'Puerta';
          if (type === 'driver') return 'Conductor';
          if (type === 'aisle') return 'Pasillo';
          if (type === 'blocked') return 'Bloq.';
          return '';
        };

        for (const el of floor.elements ?? []) {
          const x = padding + (Number((el as any).x) || 0) * scale;
          const yEl = padding + (Number((el as any).y) || 0) * scale;
          const w = (Number((el as any).width) || 44) * scale;
          const h = (Number((el as any).height) || 44) * scale;
          const rotation = Number((el as any).rotation) || 0;
          const isSeat = (el as any).type === 'seat';
          const assignment = isSeat ? assignmentBySeatId.get((el as any).id) : null;

          ctx.save();
          if (rotation) {
            ctx.translate(x + w / 2, yEl + h / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-(x + w / 2), -(yEl + h / 2));
          }

          ctx.fillStyle = isSeat ? (assignment ? '#dbe7ff' : '#f7f8fb') : '#eef1f6';
          ctx.strokeStyle = isSeat ? (assignment ? '#2a49c8' : '#b8bfd0') : '#c6ccda';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(x, yEl, w, h, 6);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#1f2430';
          ctx.font = '12px Helvetica';
          const label = isSeat
            ? ((el as any).label ?? (el as any).id ?? '?')
            : labelForType((el as any).type);
          ctx.fillText(String(label), x + w / 2, yEl + h / 2 - (assignment ? 6 : 0), Math.max(30, w - 4));

          if (assignment) {
            const name = assignment.client?.name ?? assignment.clientId;
            const firstName = String(name || '').split(' ')[0];
            ctx.fillStyle = '#2a49c8';
            ctx.font = '10px Helvetica';
            ctx.fillText(firstName, x + w / 2, yEl + h / 2 + 10, Math.max(30, w - 4));
          }
          ctx.restore();
        }

        return canvas.toDataURL('image/png');
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Detalle de viaje y asignación de asientos', pageWidth / 2, y, { align: 'center' });
      y += 10;

      writeLine(`Viaje: ${trip.title}`, { bold: true, size: 12, indent: 14 });
      writeLine(`Destino: ${trip.destination ?? '—'}`);
      writeLine(`Fechas: ${departureStr} - ${returnStr}`);
      writeLine(`Plazas: ${trip.participants?.length ?? 0}/${trip.totalSeats}`);
      writeLine(`Plantilla de camión: ${trip.busTemplate?.name ?? 'No asignada'}`);
      if (trip.notes) writeLine(`Notas: ${trip.notes}`);

      y += 2;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      writeLine('Participantes', { bold: true, size: 12 });
      if (!participants.length) {
        writeLine('Sin participantes registrados.');
      } else {
        participants.forEach((p, index) => {
          const c = p.client;
          const isCompanion = p.participantType === 'companion';
          const isStaff = p.participantType === 'staff';
          const name = isCompanion
            ? (p.companion?.name ?? 'Acompañante')
            : isStaff
              ? (p.staffMember?.name ?? p.companion?.name ?? 'Staff')
              : (c?.name ?? p.clientId);
          const company = c?.company?.name ? ` · ${c.company.name}` : '';
          const staffRole = isStaff && p.staffMember?.role ? ` · Rol: ${p.staffMember.role}` : '';
          const office = c?.assignedUser?.branch?.name
            ? ` · Oficina: ${c.assignedUser.branch.name}`
            : '';
          const advisor = c?.assignedUser?.name ? ` · Asesor: ${c.assignedUser.name}` : '';
          writeLine(`${index + 1}. ${name}${company}${staffRole}${office}${advisor}`, { indent: 18 });
          const email = c?.email?.trim();
          if (email) {
            writeLine(`Correo: ${email}`, { indent: 24 });
          }
          const phone = c?.phone?.trim();
          const companionPhone = p.companion?.phone?.trim();
          const staffPhone = p.staffMember?.phone?.trim();
          if (phone || companionPhone || staffPhone) {
            writeLine(`Tel.: ${phone ?? companionPhone ?? staffPhone}`, { indent: 24 });
          }
          if (!isCompanion && !isStaff && p.pickupLocation?.trim()) {
            writeLine(`Recogida: ${p.pickupLocation.trim()}`, { indent: 24 });
          }
        });
      }

      y += 2;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      writeLine('Selección de asientos / asignaciones actuales', { bold: true, size: 12 });
      const assignments = [...(trip.seatAssignments ?? [])];
      if (!assignments.length) {
        writeLine('Sin asignaciones de asientos.');
      } else {
        assignments.sort((a, b) => {
          const aKey = a.seatNumber ?? Number.MAX_SAFE_INTEGER;
          const bKey = b.seatNumber ?? Number.MAX_SAFE_INTEGER;
          if (aKey !== bKey) return aKey - bKey;
          return (a.seatId ?? '').localeCompare(b.seatId ?? '');
        });
        assignments.forEach((a, index) => {
          const label = a.seatId ? getSeatLabelById(a.seatId) : String(a.seatNumber ?? '—');
          const clientName = a.client?.name ?? a.participant?.name ?? a.clientId ?? a.participantId ?? '—';
          writeLine(`${index + 1}. Asiento ${label} -> ${clientName}`, { indent: 18 });
        });
      }

      // Add one layout snapshot page per floor, with assigned seats highlighted.
      const layout = trip.busTemplate?.layout;
      if (layout?.floors?.length) {
        for (let fi = 0; fi < layout.floors.length; fi++) {
          const imageData = drawLayoutFloorCanvas(fi);
          if (!imageData) continue;
          doc.addPage();
          y = 18;
          writeLine(`Plano de asientos - Piso ${fi + 1}`, { bold: true, size: 12, indent: 14, gap: 6 });

          const imgMaxWidth = pageWidth - 28;
          const imgMaxHeight = pageHeight - y - 20;
          const logicalWidth = layout.canvas?.width ?? 400;
          const logicalHeight = layout.canvas?.height ?? 600;
          const ratio = logicalWidth / logicalHeight;

          let drawWidth = imgMaxWidth;
          let drawHeight = drawWidth / ratio;
          if (drawHeight > imgMaxHeight) {
            drawHeight = imgMaxHeight;
            drawWidth = drawHeight * ratio;
          }
          const xImg = (pageWidth - drawWidth) / 2;
          doc.addImage(imageData, 'PNG', xImg, y, drawWidth, drawHeight, undefined, 'FAST');
        }
      }

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      const safeName = trip.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      doc.save(`viaje-${safeName || trip.id}-detalles.pdf`);
      toast.success('Detalle del viaje descargado');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo descargar el detalle del viaje');
    }
  };

  const assignmentDisplayName = (a: NonNullable<Trip['seatAssignments']>[number]) =>
    a.displayName || a.client?.name || a.participant?.name || a.clientId || a.participantId || '—';

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="ghost" onClick={onBack} className="-ml-2 gap-2">
        <ArrowLeft className="size-4" />
        Volver a viajes
      </Button>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {departureStr} – {returnStr}
              {trip.destination ? ` · ${trip.destination}` : ''}
            </p>
            <h2 className="font-display text-2xl font-semibold">{trip.title}</h2>
            {trip.notes ? (
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{trip.notes}</p>
            ) : null}
          </div>
          <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadTripDetails}>
              <Download />
              Descargar detalles
            </Button>
            {!reviewerMode ? (
              <Button type="button" variant="outline" onClick={() => onEdit(trip)}>
                <Pencil />
                Editar viaje
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {headerKpis.map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 truncate text-sm font-semibold" title={value}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {companiesFromParticipants.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Compañías (participantes):</span>
            {companiesFromParticipants.map(({ id, name }) => {
              const col = companyColorById.get(id);
              return (
                <Badge
                  key={id}
                  variant="outline"
                  className="text-xs font-medium"
                  style={
                    col
                      ? { borderColor: col.main, backgroundColor: col.soft, color: 'inherit' }
                      : undefined
                  }
                >
                  {name}
                </Badge>
              );
            })}
          </div>
        ) : null}
        {(trip.sharedCompanies ?? []).length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">También colaboran:</span>
            {(trip.sharedCompanies ?? []).map((c) => {
              const col = companyColorById.get(c.id);
              return (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-xs"
                  style={col ? { borderColor: col.main, backgroundColor: col.soft } : undefined}
                >
                  {c.name}
                </Badge>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setAddModalOpen(true)}>
            <UserPlus />
            Agregar participantes
          </Button>
          {!reviewerMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={openInviteModal}
                disabled={companiesAvailableToInvite.length === 0}
                title={
                  companiesAvailableToInvite.length === 0
                    ? 'No hay más empresas disponibles para invitar'
                    : 'Invitar a otra empresa a colaborar en el viaje'
                }
              >
                <Building2 />
                Invitar empresa
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 />
                Eliminar viaje
              </Button>
            </>
          ) : null}
        </div>
      </Card>

      <div className="mt-4">
        <TabBar tabs={tripTabs} value={tab} onChange={(id) => setTab(id as TripTabId)} />

        <div hidden={tab !== 'participantes'}>
          <Card className="p-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, compañía, oficina o asesor..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filteredParticipants.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {participants.length === 0
                  ? 'Aún no hay participantes. Agrega clientes.'
                  : 'No hay resultados para la búsqueda.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="p-3 font-medium">Pasajero</th>
                      <th className="font-medium">Punto de salida</th>
                      <th className="font-medium">Asiento</th>
                      <th className="font-medium">Pago</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => {
                      const c = p.client;
                      const isCompanion = p.participantType === 'companion';
                      const isStaff = p.participantType === 'staff';
                      if (!c && !isCompanion && !isStaff) return null;
                      const childInGroup = c ? isParticipantChildInTrip(c, participantIdSet) : false;
                      const coId = c?.company?.id;
                      const coColors = coId ? companyColorById.get(coId) : undefined;
                      const displayName = isCompanion
                        ? p.companion?.name
                        : isStaff
                          ? p.staffMember?.name ?? p.companion?.name ?? p.id
                          : c.name;
                      const phone = isCompanion
                        ? p.companion?.phone?.trim()
                        : isStaff
                          ? p.staffMember?.phone?.trim()
                          : c.phone?.trim();
                      const balance = c?.tripBalanceDue;
                      return (
                        <tr
                          key={p.id ?? c?.id}
                          className={cn('border-t', childInGroup && 'bg-muted/20')}
                          style={
                            coColors
                              ? {
                                  borderLeftWidth: childInGroup ? 2 : 4,
                                  borderLeftStyle: 'solid',
                                  borderLeftColor: coColors.main,
                                  backgroundColor: coColors.soft,
                                }
                              : childInGroup
                                ? {
                                    borderLeftWidth: 2,
                                    borderLeftStyle: 'solid',
                                    borderLeftColor: 'hsl(var(--primary) / 0.25)',
                                  }
                                : undefined
                          }
                        >
                          <td className={cn('p-3 align-top', childInGroup && 'pl-8')}>
                            <div className="flex flex-wrap items-center gap-2">
                              {childInGroup ? (
                                <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground" title="Integrante del grupo familiar">
                                  F
                                </span>
                              ) : null}
                              <p className="font-medium">{displayName}</p>
                              {isCompanion ? <Badge variant="secondary" className="text-xs">Acompañante</Badge> : null}
                              {isStaff ? <Badge variant="secondary" className="text-xs">Staff</Badge> : null}
                              {!isCompanion && !isStaff && c?.company ? (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-xs font-medium"
                                  style={
                                    coColors
                                      ? { borderColor: coColors.main, backgroundColor: coColors.soft }
                                      : undefined
                                  }
                                >
                                  <Building2 className="mr-0.5 size-3" />
                                  {c.company.name}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {!isStaff && c?.assignedUser?.branch?.name ? (
                                <span className="flex items-center gap-1">
                                  <MapPinned className="size-3.5" />
                                  Oficina: {c.assignedUser.branch.name}
                                </span>
                              ) : null}
                              {!isStaff && c?.assignedUser?.name ? (
                                <span className="flex items-center gap-1">
                                  <UserCircle className="size-3.5" />
                                  Asesor: {c.assignedUser.name}
                                </span>
                              ) : null}
                              {!isStaff && c?.email ? (
                                <span className="flex items-center gap-1">
                                  <Mail className="size-3.5" />
                                  {c.email}
                                </span>
                              ) : null}
                              {phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3.5" />
                                  {phone}
                                </span>
                              ) : null}
                              {isStaff && p.staffMember?.role?.trim() ? (
                                <span>Rol: {p.staffMember.role.trim()}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="align-top py-3 pr-3">
                            {!isCompanion && !isStaff && c ? (
                              reviewerMode || !onUpdateParticipantPickup ? (
                                <span className="text-sm text-muted-foreground">
                                  {p.pickupLocation?.trim() ? p.pickupLocation.trim() : 'Sin indicar'}
                                </span>
                              ) : (
                                <div className="flex min-w-[220px] flex-col gap-2 sm:flex-row sm:items-center">
                                  <Input
                                    placeholder="Ej. Esquina Juárez y Reforma, 7:00"
                                    maxLength={500}
                                    value={
                                      pickupDrafts[p.id] !== undefined
                                        ? pickupDrafts[p.id]
                                        : (p.pickupLocation ?? '')
                                    }
                                    onChange={(e) =>
                                      setPickupDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={(() => {
                                      const server = (p.pickupLocation ?? '').trim();
                                      const cur = (
                                        pickupDrafts[p.id] !== undefined
                                          ? pickupDrafts[p.id]
                                          : (p.pickupLocation ?? '')
                                      ).trim();
                                      return cur === server || pickupSavingId === p.id;
                                    })()}
                                    onClick={async () => {
                                      const raw =
                                        pickupDrafts[p.id] !== undefined
                                          ? pickupDrafts[p.id]
                                          : (p.pickupLocation ?? '');
                                      const normalized = raw.trim() === '' ? null : raw.trim();
                                      setPickupSavingId(p.id);
                                      try {
                                        await onUpdateParticipantPickup(p.id, normalized);
                                        setPickupDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[p.id];
                                          return next;
                                        });
                                        toast.success('Lugar de recogida guardado');
                                      } catch (err: any) {
                                        toast.error(err.message || 'No se pudo guardar');
                                      } finally {
                                        setPickupSavingId(null);
                                      }
                                    }}
                                  >
                                    {pickupSavingId === p.id ? 'Guardando…' : 'Guardar'}
                                  </Button>
                                </div>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="align-top py-3 pr-3 font-medium">
                            {seatLabelByParticipantId.get(p.id) ?? '—'}
                          </td>
                          <td className="align-top py-3 pr-3">
                            {isCompanion || isStaff || balance == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : Number(balance) > 0 ? (
                              <StatusBadge tone="warning">
                                Pendiente ${Number(balance).toLocaleString()}
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="success">Al día</StatusBadge>
                            )}
                          </td>
                          <td className="align-top py-3 pr-3 text-right">
                            {!reviewerMode ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onRemoveParticipant(p.id)}
                              >
                                Quitar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div hidden={tab !== 'asientos'}>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  onOpenSeatPicker();
                }}
              >
                <Armchair />
                Seleccionar asientos
              </Button>
              {!reviewerMode ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSeats}
                  disabled={isResetting || assignedSeatCount === 0}
                >
                  <RotateCcw />
                  Reiniciar asignaciones
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Plantilla: {trip.busTemplate?.name ?? 'Sin plantilla (cupo numérico)'}. El mapa se abre en el selector y se dibuja desde el JSON de la plantilla.
            </p>
            <div className="mt-4 space-y-2">
              {(trip.seatAssignments ?? []).length === 0 ? (
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Sin asignaciones de asientos.</p>
              ) : (
                (trip.seatAssignments ?? []).map((a) => (
                  <div
                    key={(a as { id?: string }).id ?? `${a.participantId ?? a.clientId}-${a.seatId ?? a.seatNumber}`}
                    className="rounded-md bg-muted p-3 text-sm"
                  >
                    Asiento {a.participantId ? seatLabelByParticipantId.get(a.participantId) ?? '—' : a.seatNumber ?? a.seatId} · {assignmentDisplayName(a)}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div hidden={tab !== 'hoteles'}>
          <Card className="p-5">
            <TripHotelsSection
              trip={trip}
              catalogHotels={catalogHotels}
              canManage={!!canManageTripHotels}
              onRefreshCatalog={onRefreshHotelCatalog}
              onAttach={onAttachTripHotel}
              onUpdate={onUpdateTripHotel}
              onDetach={onDetachTripHotel}
              onAssignRoom={onAssignTripHotelRoom}
              onClearRoom={onClearTripHotelRoomAssignment}
              embedded
            />
          </Card>
        </div>

        {!reviewerMode ? (
          <div hidden={tab !== 'finanzas'}>
            <Card className="space-y-4 p-5">
              <SectionTitle title="Finanzas del viaje" />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="mt-2 font-display text-xl font-semibold text-success">
                    ${Number(financeSummary?.totalIncome ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Egresos</p>
                  <p className="mt-2 font-display text-xl font-semibold text-destructive">
                    ${Number(financeSummary?.totalExpense ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Utilidad</p>
                  <p className="mt-2 font-display text-xl font-semibold">
                    ${Number(financeSummary?.net ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-md bg-muted/40 p-4">
                  <h3 className="font-display text-sm font-semibold">Ingresos de clientes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Los cobros a clientes se registran solo desde el detalle del cliente, no desde el viaje.
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <h3 className="font-display text-sm font-semibold">Agregar gasto</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Monto"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                    <Input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
                    />
                    <Input
                      placeholder="Categoría (opcional)"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                    <Input
                      placeholder="Referencia (opcional)"
                      value={expenseForm.referenceNumber}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Nota (opcional)"
                      value={expenseForm.note}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, note: e.target.value }))}
                    />
                  </div>
                  <Button className="mt-3" type="button" onClick={handleCreateExpense} disabled={isCreatingExpense}>
                    <DollarSign />
                    {isCreatingExpense ? 'Guardando...' : 'Agregar gasto'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-display text-sm font-semibold">Ingresos</h3>
                  {tripIncomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin ingresos registrados.</p>
                  ) : (
                    <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                      {tripIncomes.map((income) => (
                        <div key={income.id} className="flex items-start justify-between gap-3 rounded-md bg-muted p-3">
                          <div className="min-w-0">
                            <p className="font-medium">
                              ${Number(income.amount).toLocaleString()} - {income.client?.name ?? income.clientId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {income.paymentDate} - {income.paymentType}
                            </p>
                            {income.referenceNumber ? (
                              <p className="text-xs text-muted-foreground">Ref: {income.referenceNumber}</p>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDeleteTripIncome(income.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 font-display text-sm font-semibold">Gastos</h3>
                  {tripExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin gastos registrados.</p>
                  ) : (
                    <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                      {tripExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-start justify-between gap-3 rounded-md bg-muted p-3">
                          <div className="min-w-0">
                            <p className="font-medium">
                              ${Number(expense.amount).toLocaleString()}
                              {expense.category ? ` - ${expense.category}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{expense.expenseDate}</p>
                            {expense.referenceNumber ? (
                              <p className="text-xs text-muted-foreground">Ref: {expense.referenceNumber}</p>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDeleteTripExpense(expense.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {!reviewerMode ? (
          <div hidden={tab !== 'historial'}>
            <Card className="p-5">
              <SectionTitle title="Historial de cambios" />
              {changeLog.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Aún no hay cambios registrados.</p>
              ) : (
                <div className="space-y-3">
                  {changeLog.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <History className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.user?.name ?? '—'} · {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.fieldName && entry.oldValue != null && entry.newValue != null
                            ? `${entry.fieldName}: ${entry.oldValue} → ${entry.newValue}`
                            : entry.newValue ?? entry.oldValue ?? ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </div>

      <AddParticipantsToTripModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          tripTitle={trip.title}
          currentParticipantIds={
            participants
              .map((p) => (p.participantType === 'staff' ? p.staffMemberId : p.client?.id))
              .filter(Boolean) as string[]
          }
          availableClients={availableClients}
          availableStaffMembers={availableStaffMembers}
          totalSeats={trip.totalSeats}
          currentCount={participants.length}
          onAdd={onAddParticipants}
        />

        <Dialog open={inviteCompanyModalOpen} onOpenChange={setInviteCompanyModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Invitar empresa a colaborar
              </DialogTitle>
              <DialogDescription>
                Selecciona una o más empresas para invitarlas a ver y gestionar este viaje.
              </DialogDescription>
            </DialogHeader>
            {companiesAvailableToInvite.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay más empresas disponibles para invitar. Las que ya colaboran aparecen en el detalle del viaje.
              </p>
            ) : (
              <div className="grid gap-3 py-2 max-h-[240px] overflow-y-auto">
                {companiesAvailableToInvite.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`invite-company-${c.id}`}
                      checked={selectedCompanyIds.has(c.id)}
                      onCheckedChange={() => handleToggleInviteCompany(c.id)}
                    />
                    <Label
                      htmlFor={`invite-company-${c.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {c.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteCompanyModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleInviteCompanies}
                disabled={isInviting || selectedCompanyIds.size === 0}
              >
                {isInviting ? 'Enviando...' : 'Invitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar viaje?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el viaje &quot;{trip.title}&quot; y todas sus asignaciones. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
