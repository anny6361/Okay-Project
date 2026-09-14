export type PdfPreviewItem = {
  url?: string;
  html?: string;
  title?: string;
  type?: 'pdf' | 'image' | 'html';
  name?: string;
};

export type PdfContent = {
  html?: string;
  title?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'html';
  items?: PdfPreviewItem[];
  attachments?: (string | PdfPreviewItem)[];
  initialIndex?: number;
};

let listeners: ((content: PdfContent | null) => void)[] = [];

function normalizePreviewItem(item: PdfPreviewItem): PdfPreviewItem {
  const url = String(item.url || '').trim();
  const name = String(item.name || item.title || '').trim();
  const lowerUrl = url.toLowerCase();
  const lowerName = name.toLowerCase();

  const isPdf = item.type === 'pdf' ||
    lowerName.endsWith('.pdf') ||
    lowerUrl.startsWith('data:application/pdf') ||
    lowerUrl.startsWith('blob:application/pdf') ||
    lowerUrl.startsWith('jvberi') ||
    lowerUrl.includes('.pdf');

  const isImage = item.type === 'image' ||
    lowerUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lowerUrl) ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lowerName);

  return {
    ...item,
    name: name || item.name,
    title: item.title || name || 'เอกสารแนบ',
    type: isPdf ? 'pdf' : isImage ? 'image' : (item.type || 'html')
  };
}

export function openPdfPreview(
  htmlOrOptions: string | PdfContent,
  title: string = 'Document Preview'
) {
  let payload: PdfContent;
  if (typeof htmlOrOptions === 'string') {
    payload = { html: htmlOrOptions, title };
  } else {
    const items = (htmlOrOptions.items || []).map(normalizePreviewItem);
    const fileName = String(htmlOrOptions.title || title).trim();
    const fileUrl = String(htmlOrOptions.fileUrl || '').trim();
    const lowerName = fileName.toLowerCase();
    const lowerUrl = fileUrl.toLowerCase();
    const inferredPdf = htmlOrOptions.fileType === 'pdf' ||
      lowerName.endsWith('.pdf') ||
      lowerUrl.startsWith('data:application/pdf') ||
      lowerUrl.startsWith('blob:application/pdf') ||
      lowerUrl.includes('.pdf');

    payload = {
      title: htmlOrOptions.title || title,
      ...htmlOrOptions,
      fileType: inferredPdf ? 'pdf' : htmlOrOptions.fileType,
      items
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
