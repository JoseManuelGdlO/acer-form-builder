import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FinanceOverviewResponse } from '@/types/finance';

const MARGIN = 16;
const PAGE_BOTTOM = 280;
const LINE = 6;

function ensureSpace(doc: jsPDF, y: number, blockHeight: number): number {
  if (y + blockHeight > PAGE_BOTTOM) {
    doc.addPage();
    return MARGIN + 8;
  }
  return y;
}

export type FinancePdfFilterLabels = {
  granularityLabel: string;
  fromLabel: string;
  toLabel: string;
  paymentLabel: string;
  productLabel: string;
  advisorLabel: string;
  branchLabel: string;
};

export function exportFinanceOverviewPdf(
  data: FinanceOverviewResponse,
  labels: FinancePdfFilterLabels,
  currencyFormat: Intl.NumberFormat
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const addHeading = (text: string, size = 12) => {
    y = ensureSpace(doc, y, LINE + 4);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, MARGIN, y);
    y += LINE + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const addParagraph = (lines: string[]) => {
    for (const line of lines) {
      const split = doc.splitTextToSize(line, textWidth);
      const h = split.length * LINE + 2;
      y = ensureSpace(doc, y, h);
      doc.text(split, MARGIN, y);
      y += split.length * LINE + 2;
    }
  };

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Finanzas 360 — Reporte', MARGIN, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(
    `Generado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`,
    MARGIN,
    y
  );
  y += 8;
  doc.setTextColor(0);

  addHeading('Filtros aplicados', 11);
  addParagraph([
    `Periodicidad: ${labels.granularityLabel}`,
    `Periodo: ${labels.fromLabel} — ${labels.toLabel}`,
    `Tipo de pago: ${labels.paymentLabel}`,
    `Producto: ${labels.productLabel}`,
    `Asesor: ${labels.advisorLabel}`,
    `Sucursal: ${labels.branchLabel}`,
  ]);
  y += 4;

  const { kpis, meta } = data;
  addHeading('Indicadores', 11);
  addParagraph([
    `Ganancia neta: ${currencyFormat.format(kpis.netProfit)}`,
    `Ingresos: ${currencyFormat.format(kpis.totalIncome)}`,
    `Egresos (manuales): ${currencyFormat.format(kpis.totalExpense)}`,
    `Margen neto: ${kpis.netMarginPct}%`,
    `Ticket promedio: ${currencyFormat.format(kpis.averageTicket)}`,
    `Crecimiento vs periodo anterior: ${kpis.growthVsPreviousPct}%`,
  ]);
  y += 4;

  addHeading('Tendencia por periodo', 11);
  const tsHeader = 'Periodo | Ingresos | Egresos | Neto';
  y = ensureSpace(doc, y, LINE * 3);
  doc.setFont('helvetica', 'bold');
  doc.text(tsHeader, MARGIN, y);
  y += LINE;
  doc.setFont('helvetica', 'normal');
  for (const row of data.timeseries) {
    const line = `${row.label} | ${currencyFormat.format(row.income)} | ${currencyFormat.format(row.expense)} | ${currencyFormat.format(row.net)}`;
    const split = doc.splitTextToSize(line, textWidth);
    y = ensureSpace(doc, y, split.length * LINE + 2);
    doc.text(split, MARGIN, y);
    y += split.length * LINE + 1;
  }
  y += 4;

  addHeading('Métodos de pago', 11);
  for (const pt of data.breakdowns.paymentTypes) {
    addParagraph([
      `${pt.label}: ${currencyFormat.format(pt.amount)} (${pt.count} pago${pt.count !== 1 ? 's' : ''})`,
    ]);
  }
  if (data.breakdowns.paymentTypes.length === 0) {
    addParagraph(['Sin datos en este periodo.']);
  }
  y += 2;

  addHeading('Ingresos por producto', 11);
  for (const pr of data.breakdowns.products) {
    addParagraph([
      `${pr.label}: ${currencyFormat.format(pr.amount)} (${pr.count} pago${pr.count !== 1 ? 's' : ''})`,
    ]);
  }
  if (data.breakdowns.products.length === 0) {
    addParagraph(['Sin datos en este periodo.']);
  }
  y += 2;

  addHeading('Top clientes por ingresos', 11);
  if (data.rankings.topClients.length === 0) {
    addParagraph(['Sin datos.']);
  } else {
    for (const c of data.rankings.topClients) {
      addParagraph([`${c.name}: ${currencyFormat.format(c.amount)} (${c.paymentsCount} pago${c.paymentsCount !== 1 ? 's' : ''})`]);
    }
  }
  y += 2;

  addHeading('Top viajes por ingresos', 11);
  if (data.rankings.topTrips.length === 0) {
    addParagraph(['Sin datos.']);
  } else {
    for (const t of data.rankings.topTrips) {
      addParagraph([`${t.title}: ${currencyFormat.format(t.income)}`]);
    }
  }
  y += 2;

  addHeading('Egresos manuales', 11);
  const expenses = [...data.manualExpenses].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  if (expenses.length === 0) {
    addParagraph(['No hay egresos manuales en el periodo seleccionado.']);
  } else {
    for (const e of expenses) {
      addParagraph([
        `${e.expenseDate} — ${e.concept}: ${currencyFormat.format(e.amount)}${e.note ? ` (${e.note})` : ''}`,
      ]);
    }
  }

  y += 6;
  y = ensureSpace(doc, y, LINE * 2);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Rango efectivo en servidor: ${meta.from} — ${meta.to} (${meta.granularity})`,
    MARGIN,
    y
  );
  doc.setTextColor(0);

  const safeName = `finanzas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(safeName);
}

export function formatDateRangeLabel(iso: string | undefined | null): string {
  if (!iso || !iso.trim()) return '(predeterminado)';
  try {
    return format(new Date(iso + 'T12:00:00'), 'd MMM yyyy', { locale: es });
  } catch {
    return iso;
  }
}
