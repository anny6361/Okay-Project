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

export function openPdfPreview(
  htmlOrOptions: string | PdfContent,
  title: string = 'Document Preview'
) {
  let payload: PdfContent;
  if (typeof htmlOrOptions === 'string') {
    payload = { html: htmlOrOptions, title };
  } else {
    payload = {
      title: htmlOrOptions.title || title,
      ...htmlOrOptions
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

