export type ProposalBlockType = 'section' | 'itinerary' | 'hotel' | 'activities' | 'custom';

export type ProposalBlockSnapshot = {
  blockType: ProposalBlockType;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
};

const BLOCK_TYPES: ProposalBlockType[] = ['section', 'itinerary', 'hotel', 'activities', 'custom'];

export function normalizeProposalBlocks(input: unknown): ProposalBlockSnapshot[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, index) => {
      const row = (raw || {}) as Record<string, unknown>;
      const blockType = BLOCK_TYPES.includes(row.blockType as ProposalBlockType)
        ? (row.blockType as ProposalBlockType)
        : 'custom';
      const title = String(row.title ?? '').trim() || `Bloque ${index + 1}`;
      const body = String(row.body ?? '');
      const imageUrl =
        row.imageUrl == null || String(row.imageUrl).trim() === ''
          ? null
          : String(row.imageUrl).trim();
      const sortOrder = Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index;
      return { blockType, title, body, imageUrl, sortOrder };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b, i) => ({ ...b, sortOrder: i }));
}

export function blocksToSnapshot(
  blocks: Array<{
    blockType?: string;
    title?: string;
    body?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
  }>
): ProposalBlockSnapshot[] {
  return normalizeProposalBlocks(blocks);
}
