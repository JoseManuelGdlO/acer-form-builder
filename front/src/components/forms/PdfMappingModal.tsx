import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Question, QuestionPdfMapping, QuestionPdfPlacement, PdfTemplate } from '@/types/form';

interface PdfMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question;
  template: PdfTemplate;
  value?: QuestionPdfMapping;
  onSave: (value: QuestionPdfMapping) => void;
}

const createPlacement = (page: number): QuestionPdfPlacement => ({
  id: Math.random().toString(36).slice(2),
  page,
  x: 40,
  y: 40,
  width: 180,
  height: 22,
  fontSize: 10,
  align: 'left',
  mode: questionTypeToDefaultMode('short_text'),
});

function questionTypeToDefaultMode(type: Question['type']): QuestionPdfPlacement['mode'] {
  if (type === 'checkbox') return 'checkbox';
  if (type === 'file_upload') return 'attachment_link';
  return 'text';
}

export const PdfMappingModal = ({ open, onOpenChange, question, template, value, onSave }: PdfMappingModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [placements, setPlacements] = useState<QuestionPdfPlacement[]>([]);

  useEffect(() => {
    if (!open) return;
    setCurrentPage(1);
    if (value?.placements?.length) {
      setPlacements(value.placements);
    } else {
      setPlacements([{ ...createPlacement(1), mode: questionTypeToDefaultMode(question.type) }]);
    }
  }, [open, value, question.type]);

  useEffect(() => {
    if (!open || !canvasRef.current || !template?.fileUrl) return;
    let cancelled = false;
    const render = async () => {
      setIsRendering(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
        const loadingTask = (pdfjsLib as any).getDocument(template.fileUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.2 });
        if (cancelled) return;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [open, currentPage, template?.fileUrl]);

  const activePlacement = useMemo(
    () => placements.find((p) => p.page === currentPage) ?? placements[0],
    [placements, currentPage]
  );

  const updatePlacement = (updates: Partial<QuestionPdfPlacement>) => {
    if (!activePlacement) return;
    setPlacements((prev) => prev.map((p) => (p.id === activePlacement.id ? { ...p, ...updates } : p)));
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activePlacement) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.round(event.clientX - rect.left));
    const y = Math.max(0, Math.round(event.clientY - rect.top));
    updatePlacement({ x, y, page: currentPage });
  };

  const save = () => {
    onSave({
      templateId: template.id,
      placements: placements.map((p) => ({ ...p, page: Math.min(Math.max(1, p.page), template.pageCount) })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Setear campo PDF: {question.title}</DialogTitle>
          <DialogDescription>
            Clickea el PDF para colocar coordenadas. Usa la página actual ({currentPage}/{template.pageCount}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="rounded-md border p-3 bg-muted/20 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">{isRendering ? 'Renderizando...' : template.fileName}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= template.pageCount}
                  onClick={() => setCurrentPage((p) => Math.min(template.pageCount, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
            <canvas ref={canvasRef} className="max-w-full border rounded cursor-crosshair" onClick={handleCanvasClick} />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>X</Label>
              <Input value={activePlacement?.x ?? 0} onChange={(e) => updatePlacement({ x: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Y</Label>
              <Input value={activePlacement?.y ?? 0} onChange={(e) => updatePlacement({ y: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Width</Label>
              <Input value={activePlacement?.width ?? 0} onChange={(e) => updatePlacement({ width: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Height</Label>
              <Input value={activePlacement?.height ?? 0} onChange={(e) => updatePlacement({ height: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Font Size</Label>
              <Input
                value={activePlacement?.fontSize ?? 10}
                onChange={(e) => updatePlacement({ fontSize: Number(e.target.value) || 10 })}
              />
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={save}>
                Guardar mapeo
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setPlacements((prev) => [
                    ...prev,
                    { ...createPlacement(currentPage), mode: questionTypeToDefaultMode(question.type), page: currentPage },
                  ])
                }
              >
                Agregar campo en esta página
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
