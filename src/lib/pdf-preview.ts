import { normalizeAttachment, resolveAttachmentKind, getAttachmentUrl } from './attachment-resolver';

export type PdfPreviewItem = {
  url?: string;
  html?: string;
  title?: string;
  type?: 'pdf' | 'image' | 'html' | 'unknown';
  name?: string;
  mimeType?: string;
};

export type PdfContent = {
  html?: string;
  title?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'html' | 'unknown';
  items?: PdfPreviewItem[];
  attachments?: (string | PdfPreviewItem)[];
  initialIndex?: number;
};

let listeners: ((content: PdfContent | null) => void)[] = [];

function normalizeItem(item: PdfPreviewItem): PdfPreviewItem {
  const normalized = normalizeAttachment(item);
  return {
    ...item,
    url: getAttachmentUrl(item),
    name: item.name || item.title || 'เอกสารแนบ',
    title: item.title || item.name || 'เอกสารแนบ',
    type: normalized.type as PdfPreviewItem['type'],
    mimeType: normalized.mimeType
  };
}

export function openPdfPreview(htmlOrOptions: string | PdfContent, title = 'Document Preview') {
  let payload: PdfContent;

  if (typeof htmlOrOptions === 'string') {
    payload = { html: htmlOrOptions, title };
  } else {
    const items = (htmlOrOptions.items || []).map(normalizeItem);
    const attachments = (htmlOrOptions.attachments || []).map((item) =>
      typeof item === 'string'
        ? normalizeItem({ url: item, name: 'เอกสารแนบ' })
        : normalizeItem(item)
    );
    const base = normalizeAttachment({
      url: htmlOrOptions.fileUrl,
      name: htmlOrOptions.title,
      type: htmlOrOptions.fileType
    });

    payload = {
      ...htmlOrOptions,
      title: htmlOrOptions.title || title,
      fileType: resolveAttachmentKind(base) as PdfContent['fileType'],
      items,
      attachments
    };
  }

  listeners.forEach(l => l(payload));
}

export function closePdfPreview() {
  listeners.forEach(l => l(null));
}

export function subscribePdfPreview(listener: (content: PdfContent | null) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}
