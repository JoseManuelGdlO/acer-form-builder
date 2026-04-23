import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Form, FormSubmission, PdfTemplate } from '../models';

type PlacementMode = 'text' | 'checkbox' | 'image' | 'attachment_link' | 'attachment_embed';

interface Placement {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  mode: PlacementMode;
}

interface QuestionLike {
  id: string;
  title: string;
  type: string;
  options?: Array<{ id: string; label: string }>;
  pdfMapping?: {
    templateId: string;
    placements?: Placement[];
  };
}

const getStringValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getAnswerValue = (raw: unknown): unknown => {
  if (!raw) return '';
  if (typeof raw === 'object' && !Array.isArray(raw) && 'answer' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).answer;
  }
  return raw;
};

const buildDummyValue = (question: QuestionLike): unknown => {
  switch (question.type) {
    case 'date':
      return '2026-04-23';
    case 'checkbox':
      return question.options?.slice(0, 2).map((o) => o.label) ?? ['Opcion A', 'Opcion B'];
    case 'multiple_choice':
    case 'dropdown':
      return question.options?.[0]?.label ?? 'Opcion 1';
    case 'rating':
      return '4';
    case 'file_upload':
      return 'archivo_dummy.pdf';
    default:
      return `Dummy ${question.title || 'campo'}`;
  }
};

const decodeDataUrl = (value: string): { mime: string; bytes: Buffer } | null => {
  const match = value.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
};

const drawTextBox = (
  page: any,
  text: string,
  placement: Placement,
  pageHeight: number,
  fontSize: number
) => {
  const y = pageHeight - placement.y - placement.height + Math.max(placement.height - fontSize, 0);
  let x = placement.x;
  const width = Math.max(placement.width, 30);
  if (placement.align === 'center') {
    x = placement.x + width / 2 - (text.length * fontSize * 0.28);
  } else if (placement.align === 'right') {
    x = placement.x + width - (text.length * fontSize * 0.56);
  }
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    color: rgb(0.1, 0.1, 0.1),
    maxWidth: width,
    lineHeight: fontSize + 2,
  });
};

export const renderMappedPdf = async (params: {
  form: Form;
  template: PdfTemplate;
  answers?: Record<string, unknown>;
  useDummyData?: boolean;
}): Promise<Uint8Array> => {
  const { form, template, answers = {}, useDummyData = false } = params;
  const fs = await import('fs/promises');
  let inputBytes: Buffer;
  try {
    inputBytes = await fs.readFile(template.filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown file read error';
    throw new Error(`Template file missing/unreadable at ${template.filePath}. ${message}`);
  }
  const pdf = await PDFDocument.load(inputBytes);
  await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  const questions = ((form.sections ?? []) as any[]).flatMap((s) => (s.questions ?? []) as QuestionLike[]);
  for (const question of questions) {
    const mapping = question.pdfMapping;
    if (!mapping || mapping.templateId !== template.id || !Array.isArray(mapping.placements)) continue;
    const sourceValue = useDummyData ? buildDummyValue(question) : getAnswerValue((answers as any)[question.id]);
    for (const placement of mapping.placements) {
      const page = pages[placement.page - 1];
      if (!page) continue;
      const { height } = page.getSize();
      const fontSize = placement.fontSize || 10;
      const textValue = getStringValue(sourceValue);

      if (placement.mode === 'checkbox') {
        const checked = Array.isArray(sourceValue) ? sourceValue.length > 0 : Boolean(textValue);
        if (checked) {
          drawTextBox(page, 'X', placement, height, Math.max(fontSize, 12));
        }
        continue;
      }

      if (placement.mode === 'image' || placement.mode === 'attachment_embed') {
        if (typeof sourceValue === 'string') {
          const data = decodeDataUrl(sourceValue);
          if (data) {
            try {
              const image =
                data.mime.includes('png') ? await pdf.embedPng(data.bytes) : await pdf.embedJpg(data.bytes);
              page.drawImage(image, {
                x: placement.x,
                y: height - placement.y - placement.height,
                width: placement.width,
                height: placement.height,
              });
              continue;
            } catch {
              // fallback to text below
            }
          }
        }
      }

      if (placement.mode === 'attachment_link' || placement.mode === 'attachment_embed') {
        drawTextBox(page, textValue || 'Adjunto', placement, height, fontSize);
        continue;
      }

      drawTextBox(page, textValue, placement, height, fontSize);
    }
  }

  return pdf.save();
};

export const resolveSubmissionAnswers = async (submissionId: string, companyId: string) => {
  const submission = await FormSubmission.findOne({ where: { id: submissionId, companyId } });
  if (!submission) return null;
  return submission.answers as Record<string, unknown>;
};
