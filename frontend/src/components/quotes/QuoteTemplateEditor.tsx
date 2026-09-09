import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Save } from 'lucide-react';
import { SectionTitle } from '@/components/layout/SectionTitle';
import type { QuoteTemplate } from '@/types/quote';
import { QuotePdfPreview } from './QuotePdfPreview';

type QuoteTemplateEditorProps = {
  template: QuoteTemplate;
  canUpdate?: boolean;
  onSave: (draft: QuoteTemplate) => Promise<void>;
  onDownloadSample: () => Promise<void>;
};

export function QuoteTemplateEditor({ template, canUpdate = true, onSave, onDownloadSample }: QuoteTemplateEditorProps) {
  const [draft, setDraft] = useState<QuoteTemplate>(template);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(template);
  }, [template]);

  const set = (key: keyof QuoteTemplate, value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <SectionTitle title="Editar plantilla del PDF" />
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['company', 'Nombre de la empresa'],
              ['contact', 'Datos de contacto'],
              ['title', 'Título del documento'],
              ['footer', 'Pie de página'],
            ] as Array<[keyof QuoteTemplate, string]>
          ).map(([key, label]) => (
            <div key={key}>
              <Label className="mb-2 block text-xs font-medium">{label}</Label>
              <Input value={String(draft[key] ?? '')} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          {(
            [
              ['headerColor', 'Color del encabezado'],
              ['accentColor', 'Color de acento'],
            ] as Array<[keyof QuoteTemplate, string]>
          ).map(([key, label]) => (
            <div key={key}>
              <Label className="mb-2 block text-xs font-medium">{label}</Label>
              <Input type="color" value={String(draft[key] ?? '')} onChange={(e) => set(key, e.target.value)} className="h-10 px-2" />
            </div>
          ))}
          <label className="inline-flex items-center gap-2 text-xs font-medium md:col-span-2">
            <input
              type="checkbox"
              checked={draft.showLogo}
              onChange={(e) => set('showLogo', e.target.checked)}
              className="size-4 accent-primary"
            />
            Mostrar logotipo en el PDF
          </label>
          {(
            [
              ['includes', 'Incluye (una línea por concepto)'],
              ['excludes', 'No incluye (una línea por concepto)'],
              ['terms', 'Condiciones y políticas'],
            ] as Array<[keyof QuoteTemplate, string]>
          ).map(([key, label]) => (
            <div key={key} className="md:col-span-2">
              <Label className="mb-2 block text-xs font-medium">{label}</Label>
              <Textarea
                value={String(draft[key] ?? '')}
                onChange={(e) => set(key, e.target.value)}
                className="min-h-24"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={saving || !canUpdate}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save />
            Guardar plantilla
          </Button>
          <Button type="button" variant="outline" onClick={() => setDraft(template)}>
            Descartar cambios
          </Button>
          <Button type="button" variant="outline" onClick={() => void onDownloadSample()}>
            <Download />
            PDF de ejemplo
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        <SectionTitle title="Vista previa en vivo" />
        <QuotePdfPreview template={draft} />
      </div>
    </div>
  );
}
