import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QUOTE_SERVICE_TYPES, QUOTE_TYPE_LABEL } from '@/lib/quoteFormat';
import type {
  ProposalBlockType,
  QuoteProposalBlock,
  QuoteProposalTemplate,
  QuoteServiceType,
} from '@/types/quote';

const BLOCK_TYPES: ProposalBlockType[] = ['section', 'itinerary', 'hotel', 'activities', 'custom'];
const BLOCK_LABEL: Record<ProposalBlockType, string> = {
  section: 'Sección',
  itinerary: 'Itinerario',
  hotel: 'Hotel',
  activities: 'Actividades',
  custom: 'Personalizado',
};

type Draft = {
  name: string;
  description: string;
  serviceType: QuoteServiceType | '';
  blocks: QuoteProposalBlock[];
};

export type PendingBlockImage = {
  sortOrder: number;
  file: File;
};

type ProposalTemplateEditorProps = {
  template?: QuoteProposalTemplate | null;
  canSave?: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: (
    draft: {
      name: string;
      description: string;
      serviceType: QuoteServiceType | null;
      blocks: QuoteProposalBlock[];
    },
    pendingImages: PendingBlockImage[]
  ) => Promise<QuoteProposalTemplate | void>;
  onDownloadPdf?: () => void;
};

function emptyBlock(sortOrder: number): QuoteProposalBlock {
  return {
    blockType: 'custom',
    title: `Bloque ${sortOrder + 1}`,
    body: '',
    imageUrl: null,
    sortOrder,
  };
}

export function ProposalTemplateEditor({
  template,
  canSave = true,
  saving = false,
  onCancel,
  onSave,
  onDownloadPdf,
}: ProposalTemplateEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => ({
    name: template?.name || '',
    description: template?.description || '',
    serviceType: template?.serviceType || '',
    blocks: template?.blocks?.length ? template.blocks : [emptyBlock(0)],
  }));
  const [pendingByIndex, setPendingByIndex] = useState<Record<number, File>>({});
  const [previewByIndex, setPreviewByIndex] = useState<Record<number, string>>({});

  useEffect(() => {
    setDraft({
      name: template?.name || '',
      description: template?.description || '',
      serviceType: template?.serviceType || '',
      blocks: template?.blocks?.length ? template.blocks : [emptyBlock(0)],
    });
    setPendingByIndex({});
    setPreviewByIndex((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
  }, [template]);

  useEffect(() => {
    return () => {
      Object.values(previewByIndex).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewByIndex]);

  const updateBlock = (index: number, patch: Partial<QuoteProposalBlock>) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    }));
  };

  const clearBlockImage = (index: number) => {
    setPreviewByIndex((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setPendingByIndex((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateBlock(index, { imageUrl: null });
  };

  const pickBlockImage = (index: number, file: File | undefined) => {
    if (!file) return;
    setPreviewByIndex((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return { ...prev, [index]: URL.createObjectURL(file) };
    });
    setPendingByIndex((prev) => ({ ...prev, [index]: file }));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    setDraft((prev) => {
      if (target < 0 || target >= prev.blocks.length) return prev;
      const next = [...prev.blocks];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return { ...prev, blocks: next.map((b, i) => ({ ...b, sortOrder: i })) };
    });
    setPendingByIndex((prev) => {
      const next: Record<number, File> = { ...prev };
      const a = next[index];
      const b = next[target];
      if (a) next[target] = a;
      else delete next[target];
      if (b) next[index] = b;
      else delete next[index];
      return next;
    });
    setPreviewByIndex((prev) => {
      const next: Record<number, string> = { ...prev };
      const a = next[index];
      const b = next[target];
      if (a) next[target] = a;
      else delete next[target];
      if (b) next[index] = b;
      else delete next[index];
      return next;
    });
  };

  const removeBlock = (index: number) => {
    clearBlockImage(index);
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, sortOrder: i })),
    }));
    setPendingByIndex((prev) => {
      const next: Record<number, File> = {};
      Object.entries(prev).forEach(([key, file]) => {
        const i = Number(key);
        if (i < index) next[i] = file;
        if (i > index) next[i - 1] = file;
      });
      return next;
    });
    setPreviewByIndex((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, url]) => {
        const i = Number(key);
        if (i === index) {
          URL.revokeObjectURL(url);
          return;
        }
        if (i < index) next[i] = url;
        if (i > index) next[i - 1] = url;
      });
      return next;
    });
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    const blocks = draft.blocks.map((b, i) => ({ ...b, sortOrder: i }));
    const pendingImages: PendingBlockImage[] = Object.entries(pendingByIndex).map(([key, file]) => ({
      sortOrder: Number(key),
      file,
    }));
    await onSave(
      {
        name: draft.name.trim(),
        description: draft.description.trim(),
        serviceType: draft.serviceType || null,
        blocks,
      },
      pendingImages
    );
  };

  return (
    <Card className="space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs font-medium">Nombre</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Propuesta Cancún all inclusive"
            disabled={!canSave}
          />
        </div>
        <div>
          <Label className="mb-2 block text-xs font-medium">Tipo de servicio</Label>
          <select
            value={draft.serviceType}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                serviceType: e.target.value as QuoteServiceType | '',
              }))
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={!canSave}
          >
            <option value="">Sin tipo</option>
            {QUOTE_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUOTE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-medium">Descripción</Label>
          <Textarea
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-20"
            disabled={!canSave}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold">Bloques</p>
          {canSave ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  blocks: [...prev.blocks, emptyBlock(prev.blocks.length)],
                }))
              }
            >
              <Plus />
              Agregar bloque
            </Button>
          ) : null}
        </div>
        {draft.blocks.map((block, index) => {
          const preview = previewByIndex[index] || block.imageUrl;
          return (
            <div key={block.id || `new-${index}`} className="rounded-md border border-border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  value={block.blockType}
                  onChange={(e) => updateBlock(index, { blockType: e.target.value as ProposalBlockType })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  disabled={!canSave}
                >
                  {BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_LABEL[type]}
                    </option>
                  ))}
                </select>
                {canSave ? (
                  <>
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveBlock(index, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveBlock(index, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeBlock(index)}>
                      <Trash2 />
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="grid gap-3">
                <Input
                  value={block.title}
                  onChange={(e) => updateBlock(index, { title: e.target.value })}
                  placeholder="Título del bloque"
                  disabled={!canSave}
                />
                <Textarea
                  value={block.body}
                  onChange={(e) => updateBlock(index, { body: e.target.value })}
                  className="min-h-24"
                  placeholder="Texto del bloque"
                  disabled={!canSave}
                />
                {preview ? (
                  <div className="relative w-fit">
                    <img src={preview} alt="" className="max-h-40 rounded-md object-cover" />
                    {canSave ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="absolute right-2 top-2"
                        onClick={() => clearBlockImage(index)}
                      >
                        <X />
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {canSave ? (
                  <div>
                    <Label className="mb-2 block text-xs font-medium">Foto del bloque</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        pickBlockImage(index, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Puedes elegir la foto ahora; se sube al guardar la plantilla.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {canSave ? (
          <Button type="button" onClick={() => void save()} disabled={saving || !draft.name.trim()}>
            Guardar plantilla
          </Button>
        ) : null}
        {onDownloadPdf && template?.id ? (
          <Button type="button" variant="outline" onClick={onDownloadPdf} disabled={saving}>
            <Download />
            Descargar PDF
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cerrar
        </Button>
      </div>
    </Card>
  );
}
