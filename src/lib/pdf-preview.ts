type PdfContent = {
  html: string;
  title: string;
};

let listeners: ((content: PdfContent | null) => void)[] = [];

export function openPdfPreview(html: string, title: string = 'Document Preview') {
  listeners.forEach(l => l({ html, title }));
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
