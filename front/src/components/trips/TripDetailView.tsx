import { useState, useEffect } from 'react';
import { Trip, Client, TripChangeLogEntry, TripIncome, TripExpense, TripFinanceSummary } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Armchair,
  RotateCcw,
  History,
  Building2,
  DollarSign,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

const ACTION_LABELS: Record<string, string> = {
  trip_created: 'Viaje creado',
  trip_updated: 'Viaje actualizado',
  participant_added: 'Participante(s) agregado(s)',
  participant_removed: 'Participante quitado',
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
  companiesForInvite: { id: string; name: string }[];
  changeLog: TripChangeLogEntry[];
  onBack: () => void;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => Promise<void>;
  onAddParticipants: (data: { clientIds?: string[] }) => Promise<void>;
  onRemoveParticipant: (clientId: string) => Promise<void>;
  onOpenSeatPicker: () => void;
  onResetSeatAssignments: () => Promise<void>;
  onLoadChangeLog: () => void;
  onLoadTripFinance: () => void;
  onCreateTripIncome: (data: { clientId: string; amount: number; paymentDate: string; paymentType?: 'tarjeta' | 'transferencia' | 'efectivo'; referenceNumber?: string; note?: string }) => Promise<void>;
  onDeleteTripIncome: (incomeId: string) => Promise<void>;
  onCreateTripExpense: (data: { amount: number; expenseDate: string; category?: string; referenceNumber?: string; note?: string }) => Promise<void>;
  onDeleteTripExpense: (expenseId: string) => Promise<void>;
  financeSummary: TripFinanceSummary | null;
  tripIncomes: TripIncome[];
  tripExpenses: TripExpense[];
  onInviteCompanies: (invitedCompanyIds: string[]) => Promise<void>;
  /** Revisor: solo ver, participantes y asientos; sin finanzas, invitaciones, edición */
  reviewerMode?: boolean;
}

export const TripDetailView = ({
  trip,
  availableClients,
  companiesForInvite,
  changeLog,
  onBack,
  onEdit,
  onDelete,
  onAddParticipants,
  onRemoveParticipant,
  onOpenSeatPicker,
  onResetSeatAssignments,
  onLoadChangeLog,
  onLoadTripFinance,
  onCreateTripIncome,
  onDeleteTripIncome,
  onCreateTripExpense,
  onDeleteTripExpense,
  financeSummary,
  tripIncomes,
  tripExpenses,
  onInviteCompanies,
  reviewerMode = false,
}: TripDetailViewProps) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteCompanyModalOpen, setInviteCompanyModalOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    clientId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentType: 'efectivo' as 'tarjeta' | 'transferencia' | 'efectivo',
    referenceNumber: '',
    note: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: '',
    referenceNumber: '',
    note: '',
  });
  const [isCreatingIncome, setIsCreatingIncome] = useState(false);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);

  const sharedIds = (trip.sharedCompanies ?? []).map(c => c.id);
  const companiesAvailableToInvite = companiesForInvite.filter(c => !sharedIds.includes(c.id));

  // Cargar historial y finanzas al entrar (solo administradores)
  useEffect(() => {
    if (reviewerMode) return;
    onLoadChangeLog();
    onLoadTripFinance();
  }, [trip.id, reviewerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reviewerMode) return;
    const interval = setInterval(() => {
      onLoadChangeLog();
      onLoadTripFinance();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trip.id, reviewerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = trip.participants ?? [];
  const filteredParticipants = memberSearch.trim()
    ? participants.filter(p => {
        const c = p.client;
        if (!c) return false;
        const q = memberSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(memberSearch)) ||
          (c.company?.name && c.company.name.toLowerCase().includes(q))
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

  const departureStr = trip.departureDate ? format(new Date(trip.departureDate), "d 'de' MMMM yyyy", { locale: es }) : '';
  const returnStr = trip.returnDate ? format(new Date(trip.returnDate), "d 'de' MMMM yyyy", { locale: es }) : '';

  const handleCreateIncome = async () => {
    if (!incomeForm.clientId || !incomeForm.amount || !incomeForm.paymentDate) {
      toast.error('Cliente, monto y fecha son obligatorios');
      return;
    }
    const amount = Number(incomeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    setIsCreatingIncome(true);
    try {
      await onCreateTripIncome({
        clientId: incomeForm.clientId,
        amount,
        paymentDate: incomeForm.paymentDate,
        paymentType: incomeForm.paymentType,
        referenceNumber: incomeForm.referenceNumber || undefined,
        note: incomeForm.note || undefined,
      });
      setIncomeForm((prev) => ({ ...prev, amount: '', referenceNumber: '', note: '' }));
      toast.success('Ingreso agregado');
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar ingreso');
    } finally {
      setIsCreatingIncome(false);
    }
  };

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
      const participants = trip.participants ?? [];
      if (!participants.length) {
        writeLine('Sin participantes registrados.');
      } else {
        participants.forEach((p, index) => {
          const name = p.client?.name ?? p.clientId;
          const company = p.client?.company?.name ? ` (${p.client?.company?.name})` : '';
          writeLine(`${index + 1}. ${name}${company}`, { indent: 18 });
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
          const clientName = a.client?.name ?? a.clientId;
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

  const financeCard = (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Finanzas del viaje
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              ${Number(financeSummary?.totalIncome ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-xl font-semibold text-rose-600 dark:text-rose-400">
              ${Number(financeSummary?.totalExpense ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p className="text-xl font-semibold">
              ${Number(financeSummary?.net ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2 border rounded-lg p-3">
            <h3 className="font-medium">Agregar ingreso</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={incomeForm.clientId}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, clientId: e.target.value }))}
              >
                <option value="">Seleccionar cliente</option>
                {participants.map((p) => (
                  p.client ? <option key={p.client.id} value={p.client.id}>{p.client.name}</option> : null
                ))}
              </select>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Monto"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
              <Input
                type="date"
                value={incomeForm.paymentDate}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={incomeForm.paymentType}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, paymentType: e.target.value as 'tarjeta' | 'transferencia' | 'efectivo' }))}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
              <Input
                placeholder="Referencia (opcional)"
                value={incomeForm.referenceNumber}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
              />
              <Input
                placeholder="Nota (opcional)"
                value={incomeForm.note}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
            <Button onClick={handleCreateIncome} disabled={isCreatingIncome}>
              {isCreatingIncome ? 'Guardando...' : 'Agregar ingreso'}
            </Button>
          </div>

          <div className="space-y-2 border rounded-lg p-3">
            <h3 className="font-medium">Agregar gasto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <Button onClick={handleCreateExpense} disabled={isCreatingExpense}>
              {isCreatingExpense ? 'Guardando...' : 'Agregar gasto'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Ingresos</h3>
            {tripIncomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ingresos registrados.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {tripIncomes.map((income) => (
                  <div key={income.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">${Number(income.amount).toLocaleString()} - {income.client?.name ?? income.clientId}</p>
                      <p className="text-xs text-muted-foreground">{income.paymentDate} - {income.paymentType}</p>
                      {income.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {income.referenceNumber}</p>}
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
            <h3 className="font-medium mb-2">Gastos</h3>
            {tripExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos registrados.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {tripExpenses.map((expense) => (
                  <div key={expense.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">${Number(expense.amount).toLocaleString()} {expense.category ? `- ${expense.category}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{expense.expenseDate}</p>
                      {expense.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {expense.referenceNumber}</p>}
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
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al listado
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-8 h-8 text-primary" />
              {trip.title}
            </h1>
            {trip.destination && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {trip.destination}
              </p>
            )}
            <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-4 h-4" />
              {departureStr} – {returnStr}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {participants.length}/{trip.totalSeats} plazas
            </p>
            {trip.notes && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">{trip.notes}</p>
            )}
            {(trip.sharedCompanies ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-sm text-muted-foreground">Compañías:</span>
                {(trip.sharedCompanies ?? []).map(c => (
                  <Badge key={c.id} variant="secondary" className="text-xs">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {!reviewerMode && (
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(trip)} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  Editar viaje
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  onOpenSeatPicker();
                }}
                className="gap-2"
              >
                <Armchair className="w-4 h-4" />
                Seleccionar asientos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownloadTripDetails}
              >
                <Download className="w-4 h-4" />
                Descargar detalles
              </Button>
              {!reviewerMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetSeats}
                  disabled={isResetting || (trip.seatAssignments?.length ?? 0) === 0}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar asignaciones
                </Button>
              )}
              {!reviewerMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar viaje
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar participantes
          </Button>
          {!reviewerMode && (
            <Button
              variant="outline"
              onClick={openInviteModal}
              className="gap-2"
              disabled={companiesAvailableToInvite.length === 0}
              title={companiesAvailableToInvite.length === 0 ? 'No hay más empresas disponibles para invitar' : 'Invitar a otra empresa a colaborar en el viaje'}
            >
              <Building2 className="w-4 h-4" />
              Invitar empresa
            </Button>
          )}
        </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Participantes
            </h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, compañía..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filteredParticipants.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">
                {participants.length === 0
                  ? 'Aún no hay participantes. Agrega clientes.'
                  : 'No hay resultados para la búsqueda.'}
              </p>
            ) : (
              <ScrollArea className="h-[280px]">
                <ul className="divide-y">
                  {filteredParticipants.map(p => {
                    const c = p.client;
                    if (!c) return null;
                    return (
                      <li
                        key={p.id ?? c.id}
                        className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{c.name}</p>
                            {c.company && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                <Building2 className="w-3 h-3 mr-0.5" />
                                {c.company.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {c.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                {c.email}
                              </span>
                            )}
                            {c.totalAmountDue != null && c.totalAmountDue !== undefined && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <DollarSign className="w-3.5 h-3.5" />
                                Debe: ${Number(c.totalAmountDue).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {!reviewerMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => onRemoveParticipant(c.id)}
                          >
                            Quitar
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {!reviewerMode && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de cambios
              </h2>
              {changeLog.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">Aún no hay cambios registrados.</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-2">Fecha</th>
                        <th className="pb-2 pr-2">Usuario</th>
                        <th className="pb-2 pr-2">Acción</th>
                        <th className="pb-2">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeLog.map(entry => (
                        <tr key={entry.id} className="border-b border-border/50">
                          <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">
                            {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </td>
                          <td className="py-2 pr-2">{entry.user?.name ?? '—'}</td>
                          <td className="py-2 pr-2">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                          <td className="py-2 text-muted-foreground">
                            {entry.fieldName && entry.oldValue != null && entry.newValue != null
                              ? `${entry.fieldName}: ${entry.oldValue} → ${entry.newValue}`
                              : entry.newValue ?? entry.oldValue ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {!reviewerMode && financeCard}

        <AddParticipantsToTripModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          tripTitle={trip.title}
          currentParticipantIds={participants.map(p => p.client?.id).filter(Boolean) as string[]}
          availableClients={availableClients}
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
    </div>
  );
};
