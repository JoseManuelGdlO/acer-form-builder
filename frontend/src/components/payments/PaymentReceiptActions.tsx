import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, ImagePlus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { compressImageFileToDataUrl } from '@/lib/imageDataUrl';
import { toast } from 'sonner';

interface PaymentReceiptActionsProps {
  paymentId: string;
  hasReceipt: boolean;
  canManage?: boolean;
  canView?: boolean;
  onHasReceiptChange?: (hasReceipt: boolean) => void;
  dialogSubtitle?: string;
}

export function PaymentReceiptActions({
  paymentId,
  hasReceipt,
  canManage = false,
  canView = true,
  onHasReceiptChange,
  dialogSubtitle,
}: PaymentReceiptActionsProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  if (!canManage && !(canView && hasReceipt)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !token) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, { maxWidth: 1600, quality: 0.82 });
      await api.uploadPaymentReceipt(paymentId, dataUrl, token);
      onHasReceiptChange?.(true);
      toast.success('Comprobante guardado');
    } catch (error: unknown) {
      console.error('Error uploading receipt:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el comprobante');
    } finally {
      setUploading(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!token) return;
    setViewOpen(true);
    setReceiptPreview(null);
    setLoadingReceipt(true);
    try {
      const data = await api.getPaymentReceipt(paymentId, token);
      setReceiptPreview(data.receiptImage);
    } catch (error: unknown) {
      console.error('Error loading receipt:', error);
      toast.error('No se pudo cargar el comprobante');
      setViewOpen(false);
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <div className="flex items-center justify-center gap-1">
        {hasReceipt && canView && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Ver comprobante"
            onClick={() => void handleViewReceipt()}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={hasReceipt ? 'Reemplazar comprobante' : 'Subir comprobante'}
            disabled={uploading}
            onClick={handleUploadClick}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setReceiptPreview(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Comprobante de pago
              {dialogSubtitle ? ` · ${dialogSubtitle}` : ''}
            </DialogTitle>
          </DialogHeader>
          {loadingReceipt ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : receiptPreview ? (
            <img
              src={receiptPreview}
              alt="Comprobante de pago"
              className="w-full max-h-[70vh] object-contain rounded-md border border-border/50 bg-muted/20"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin comprobante</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
