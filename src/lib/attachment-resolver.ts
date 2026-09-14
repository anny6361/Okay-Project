export type AttachmentKind = 'pdf' | 'image' | 'html' | 'unknown';

export type AttachmentLike = {
  url?: string;
  dataUrl?: string;
  name?: string;
  title?: string;
  type?: string;
  mimeType?: string;
};

const PDF_MIME = 'application/pdf';
const PDF_RE = /\.pdf(?:[?#].*)?$/i;
const IMAGE_RE = /\.(?:jpe?g|png|webp|gif|svg|bmp|tiff?|avif)(?:[?#].*)?$/i;

const clean = (value: unknown) => String(value ?? '').trim();

function dataMime(value: string) {
  const match = value.match(/^data:([^;,]+)[;,]/i);
  return match?.[1]?.toLowerCase() || '';
}

function base64Mime(value: string) {
  const v = value.replace(/^data:[^,]*,?/i, '').trim();
  if (v.startsWith('JVBER')) return PDF_MIME;
  if (v.startsWith('/9j/')) return 'image/jpeg';
  if (v.startsWith('iVBORw')) return 'image/png';
  if (v.startsWith('R0lGOD')) return 'image/gif';
  if (v.startsWith('UklGR')) return 'image/webp';
  return '';
}

export function resolveAttachmentMime(item: AttachmentLike = {}) {
  const explicit = clean(item.mimeType || item.type).toLowerCase();
  const url = clean(item.url || item.dataUrl);
  const name = clean(item.name || item.title);
  const fromData = dataMime(url);

  if (explicit === PDF_MIME || explicit === 'pdf' || explicit.includes('/pdf')) return PDF_MIME;
  if (explicit.startsWith('image/')) return explicit;
  if (fromData) return fromData;
  if (PDF_RE.test(name) || PDF_RE.test(url) || url.toLowerCase().startsWith('jvberi')) return PDF_MIME;
  if (IMAGE_RE.test(name) || IMAGE_RE.test(url)) {
    const ext = (name || url).split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    return ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }
  return base64Mime(url) || explicit;
}

export function resolveAttachmentKind(item: AttachmentLike = {}): AttachmentKind {
  const mime = resolveAttachmentMime(item);
  if (mime === PDF_MIME || mime.includes('/pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  const url = clean(item.url || item.dataUrl).toLowerCase();
  const name = clean(item.name || item.title).toLowerCase();
  if (PDF_RE.test(name) || PDF_RE.test(url)) return 'pdf';
  if (IMAGE_RE.test(name) || IMAGE_RE.test(url)) return 'image';
  if (clean(item.type).toLowerCase() === 'html' || url.startsWith('data:text/html')) return 'html';
  return 'unknown';
}

export function normalizeAttachment<T extends AttachmentLike>(item: T) {
  const kind = resolveAttachmentKind(item);
  const mimeType = resolveAttachmentMime(item) || (kind === 'pdf' ? PDF_MIME : kind === 'image' ? 'image/*' : '');
  return { ...item, type: kind, mimeType };
}

export function getAttachmentUrl(item: AttachmentLike = {}) {
  return clean(item.url || item.dataUrl);
}
