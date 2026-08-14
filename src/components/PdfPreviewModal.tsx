import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { subscribePdfPreview, closePdfPreview, PdfContent, PdfPreviewItem } from '../lib/pdf-preview';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  ImageIcon,
  RefreshCw,
  Layers
} from 'lucide-react';
import { downloadOriginalFile, cleanCssText } from '../utils/pdfGenerator';
import { 
  downloadConsolidatedPdfFile, 
  printConsolidatedDocument, 
  AttachmentItem 
} from '../utils/pdfConsolidator';
import { getSafePreviewUrl } from '../data/db';

function getSanitizedPrintHtml(rawHtml: string) {
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  clean = cleanCssText(clean);

  const printStyles = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>
      * {
        box-sizing: border-box;
        color-scheme: light !important;
      }
      html, body {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        margin: 0;
        padding: 16px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      th, td {
        border-color: #cbd5e1 !important;
      }
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          padding: 0 !important;
        }
        .no-print, button, .hidden-print {
          display: none !important;
        }
      }
    </style>
  `;

  if (clean.includes('</head>')) {
    clean = clean.replace('</head>', `${printStyles}</head>`);
  } else if (clean.includes('<html>')) {
    clean = clean.replace('<html>', `<html><head>${printStyles}</head>`);
  } else {
    clean = `<!DOCTYPE html><html><head><meta charset="utf-8">${printStyles}</head><body>${clean}</body></html>`;
  }

  return clean;
}

function parseItemType(urlOrHtml: string, hintType?: 'pdf' | 'image' | 'html') {
  if (!urlOrHtml) return { isPdf: false, isImg: false, isHtml: false, targetUrl: '', cleanHtml: '' };

  const str = urlOrHtml.trim();
  const lower = str.toLowerCase();

  if (hintType === 'pdf' || lower.startsWith('data:application/pdf') || lower.startsWith('blob:application/pdf') || (lower.startsWith('http') && lower.includes('.pdf'))) {
    return { isPdf: true, isImg: false, isHtml: false, targetUrl: str, cleanHtml: '' };
  }

  if (hintType === 'image' || lower.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lower)) {
    return { isPdf: false, isImg: true, isHtml: false, targetUrl: str, cleanHtml: '' };
  }

  // Check if string contains an iframe with PDF or image
  const iframeSrcMatch = str.match(/<iframe\s+[^>]*src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    const rawUrl = iframeSrcMatch[1];
    const rawLower = rawUrl.toLowerCase();
    if (rawLower.startsWith('data:application/pdf') || rawLower.includes('.pdf') || rawLower.startsWith('blob:')) {
      return { isPdf: true, isImg: false, isHtml: false, targetUrl: rawUrl, cleanHtml: cleanCssText(str) };
    }
  }

  // Check if string is a simple wrapper around an img
  const imgSrcMatch = str.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
  if (imgSrcMatch && imgSrcMatch[1] && str.length < 3500 && !str.includes('<table') && !str.includes('<tr')) {
    return { isPdf: false, isImg: true, isHtml: false, targetUrl: imgSrcMatch[1], cleanHtml: cleanCssText(str) };
  }

  return { isPdf: false, isImg: false, isHtml: true, targetUrl: '', cleanHtml: cleanCssText(str) };
}

export default function PdfPreviewModal() {
  const [content, setContent] = useState<PdfContent | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return subscribePdfPreview((newContent) => {
      setContent(newContent);
      setCurrentIndex(newContent?.initialIndex || 0);
      setZoomScale(100);
      setRotation(0);
      setDownloadSuccess(false);
    });
  }, []);

  // Compile active list of items to preview
  const activeItems: PdfPreviewItem[] = useMemo(() => {
    if (!content) return [];
    if (content.items && content.items.length > 0) {
      return content.items;
    }
    if (content.fileUrl) {
      return [{
        url: content.fileUrl,
        html: content.html,
        title: content.title,
        type: content.fileType,
        name: content.title
      }];
    }
    return [{
      html: content.html,
      title: content.title,
      type: content.fileType,
      name: content.title
    }];
  }, [content]);

  const activeItem = activeItems[currentIndex] || activeItems[0] || null;

  const currentParsed = useMemo(() => {
    if (!activeItem) return null;
    const source = activeItem.url || activeItem.html || content?.html || '';
    return parseItemType(source, activeItem.type || content?.fileType);
  }, [activeItem, content]);

  // Normalized list of all attachments to bundle into the single PDF & Print job
  const normalizedAttachments: AttachmentItem[] = useMemo(() => {
    if (!content) return [];
    const list: AttachmentItem[] = [];

    // If explicit attachments passed in content
    if (content.attachments && content.attachments.length > 0) {
      content.attachments.forEach((att, idx) => {
        if (typeof att === 'string') {
          const parsed = parseItemType(att);
          list.push({
            url: att,
            name: `เอกสารแนบ #${idx + 1}`,
            title: `เอกสารแนบ #${idx + 1}`,
            type: parsed.isPdf ? 'pdf' : parsed.isImg ? 'image' : 'html'
          });
        } else if (att) {
          list.push(att);
        }
      });
      return list;
    }

    // If items list has multiple items (e.g. Main doc at index 0, attachments at index 1..N)
    if (activeItems.length > 1) {
      return activeItems.slice(1).map((it, i) => ({
        url: it.url,
        html: it.html,
        name: it.name || `เอกสารแนบ #${i + 1}`,
        title: it.title || `เอกสารแนบ #${i + 1}`,
        type: it.type
      }));
    }

    return list;
  }, [content, activeItems]);

  // Sync iframe blob for HTML items
  useEffect(() => {
    if (!currentParsed || !currentParsed.isHtml) {
      setHtmlBlobUrl('');
      return;
    }

    const sanitizedHtml = getSanitizedPrintHtml(currentParsed.cleanHtml || activeItem?.html || content?.html || '');
    const blob = new Blob([sanitizedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setHtmlBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentParsed, activeItem, content]);

  // Reset zoom & rotation when switching items
  const handleNext = useCallback(() => {
    if (currentIndex < activeItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoomScale(100);
      setRotation(0);
    }
  }, [currentIndex, activeItems.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoomScale(100);
      setRotation(0);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!content) return;
      if (e.key === 'Escape') {
        closePdfPreview();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, handleNext, handlePrev]);

  if (!content || !activeItem || !currentParsed) return null;

  const currentTitle = activeItem.title || activeItem.name || content.title || 'Document Preview';
  const cleanTitle = currentTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim();
  const pdfFileName = cleanTitle.toLowerCase().endsWith('.pdf') ? cleanTitle : `${cleanTitle}.pdf`;

  // Action: Open in new tab/window
  const handleOpenNewWindow = () => {
    if (currentParsed.isPdf || currentParsed.isImg) {
      const target = currentParsed.targetUrl;
      const safeUrl = getSafePreviewUrl(target);
      const win = window.open(safeUrl, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = safeUrl;
        a.target = '_blank';
        a.rel = 'noopener,noreferrer';
        a.click();
      }
      return;
    }

    const sanitized = getSanitizedPrintHtml(currentParsed.cleanHtml || activeItem.html || content.html);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(sanitized);
      win.document.close();
      win.focus();
    } else {
      const blob = new Blob([sanitized], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener,noreferrer';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  // Action: Native Consolidated Print (Main Document + All Attachments)
  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const mainDoc = {
        html: (currentIndex === 0 ? content.html : activeItem.html) || activeItems[0]?.html,
        url: activeItem.url || content.fileUrl,
        type: activeItem.type || content.fileType,
        title: currentTitle
      };

      await printConsolidatedDocument(mainDoc, normalizedAttachments);
    } catch (err) {
      console.error('Print Error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Action: Consolidated Download PDF (Single file with Main Document + all attachments)
  const handleDownloadPdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const mainDoc = {
        html: (currentIndex === 0 ? content.html : activeItem.html) || activeItems[0]?.html,
        url: activeItems[0]?.url || content.fileUrl || activeItem.url,
        type: activeItems[0]?.type || content.fileType || activeItem.type,
        title: content.title || currentTitle
      };

      await downloadConsolidatedPdfFile(mainDoc, normalizedAttachments, pdfFileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Consolidated PDF Download failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Action: Download Original Single File
  const handleDownloadOriginal = async () => {
    if (currentParsed.targetUrl) {
      const safeUrl = getSafePreviewUrl(currentParsed.targetUrl);
      const ext = currentParsed.isPdf ? '.pdf' : currentParsed.isImg ? '.png' : '.html';
      const fName = cleanTitle.endsWith(ext) ? cleanTitle : `${cleanTitle}${ext}`;
      await downloadOriginalFile(safeUrl, fName);
    } else {
      const sanitized = getSanitizedPrintHtml(currentParsed.cleanHtml || activeItem.html || content.html);
      const blob = new Blob([sanitized], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  const isMultiItem = activeItems.length > 1;
  const totalAttachmentCount = normalizedAttachments.length;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[95vh] max-h-[920px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 gap-3">
          
          {/* Document Title & Badge */}
          <div className="flex items-center gap-2.5 max-w-xs sm:max-w-sm md:max-w-md truncate">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              currentParsed.isPdf 
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' 
                : currentParsed.isImg 
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
            }`}>
              {currentParsed.isPdf ? <FileText size={18} /> : currentParsed.isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
            </div>
            <div className="truncate">
              <h2 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={currentTitle}>
                {currentTitle}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider">
                  {currentParsed.isPdf ? 'เอกสาร PDF ต้นฉบับ' : currentParsed.isImg ? 'รูปภาพหลักฐาน' : 'ใบสำคัญสรุปเบิกจ่าย A4'}
                </span>
                {totalAttachmentCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.2 rounded font-bold">
                    + แนบหลักฐาน {totalAttachmentCount} รายการ
                  </span>
                )}
                {isMultiItem && (
                  <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono font-bold">
                    {currentIndex + 1} / {activeItems.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Multi-item Navigation Controls */}
            {isMultiItem && (
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
                  title="เอกสารก่อนหน้า (Previous)"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 min-w-[50px] text-center">
                  {currentIndex + 1} / {activeItems.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === activeItems.length - 1}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
                  title="เอกสารถัดไป (Next)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(prev - 25, 50))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                title="ย่อลง (Zoom Out)"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(100)}
                className="px-2 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 min-w-[44px] text-center"
                title="รีเซ็ตขนาด 100%"
              >
                {zoomScale}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(prev + 25, 250))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                title="ขยายขึ้น (Zoom In)"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Rotate Controls */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                title="หมุนทวนเข็ม 90° (Rotate Left)"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                title="หมุนตามเข็ม 90° (Rotate Right)"
              >
                <RotateCw size={15} />
              </button>
            </div>

            {/* Print Button */}
            <button 
              onClick={handlePrint}
              type="button"
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
              title="พิมพ์เอกสาร A4 ออกทางเครื่องพิมพ์พร้อมเอกสารแนบครบถ้วน"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>กำลังสั่งพิมพ์...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>พิมพ์ (Print A4)</span>
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button 
              onClick={handleDownloadPdf}
              type="button"
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
              title="ดาวน์โหลด PDF รวมเอกสารหลักและหลักฐานแนบทั้งหมดในไฟล์เดียว"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>กำลังรวม PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-300" />
                  <span>ดาวน์โหลดแล้ว!</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>ดาวน์โหลด PDF รวมหลักฐาน</span>
                </>
              )}
            </button>

            {/* Open in New Window */}
            <button 
              onClick={handleOpenNewWindow}
              type="button"
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="เปิดในหน้าต่างใหม่ (Open in new tab)"
            >
              <ExternalLink size={16} />
            </button>

            {/* Download Original / Backup */}
            {(currentParsed.isPdf || currentParsed.isImg) && (
              <button
                onClick={handleDownloadOriginal}
                type="button"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                title="ดาวน์โหลดเฉพาะไฟล์ที่กำลังดูอยู่"
              >
                <Download size={13} />
                <span>ไฟล์นี้</span>
              </button>
            )}

            {/* Close Button */}
            <button 
              onClick={closePdfPreview}
              type="button"
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer ml-1"
              title="ปิดหน้าต่าง (Close)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Content Viewport */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 relative flex items-center justify-center select-none">
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-200 origin-center"
            style={{
              transform: `scale(${zoomScale / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {currentParsed.isPdf && currentParsed.targetUrl ? (
              <div className="w-full h-full max-w-5xl rounded-xl overflow-hidden shadow-lg border border-slate-300 dark:border-slate-800 bg-white">
                <iframe 
                  ref={iframeRef}
                  src={getSafePreviewUrl(currentParsed.targetUrl)}
                  className="w-full h-full bg-white border-0"
                  title={currentTitle}
                />
              </div>
            ) : currentParsed.isImg && currentParsed.targetUrl ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={getSafePreviewUrl(currentParsed.targetUrl)} 
                  alt={currentTitle}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : htmlBlobUrl ? (
              <div className="w-full h-full max-w-5xl rounded-xl overflow-hidden shadow-lg border border-slate-300 dark:border-slate-800 bg-white">
                <iframe 
                  ref={iframeRef}
                  src={htmlBlobUrl}
                  className="w-full h-full bg-white border-0"
                  title={currentTitle}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin h-7 w-7 text-indigo-500" />
                <span className="text-sm font-medium">กำลังเตรียมเอกสารแสดงผล...</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom thumbnail strip if multi-item */}
        {isMultiItem && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Layers size={13} />
              <span>รายการ ({activeItems.length}):</span>
            </span>
            {activeItems.map((item, idx) => {
              const parsed = parseItemType(item.url || item.html || '', item.type);
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoomScale(100);
                    setRotation(0);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {parsed.isPdf ? <FileText size={12} className={isActive ? 'text-white' : 'text-rose-500'} /> : parsed.isImg ? <ImageIcon size={12} className={isActive ? 'text-white' : 'text-indigo-500'} /> : <FileText size={12} />}
                  <span className="max-w-[140px] truncate">{item.name || item.title || `เอกสาร ${idx + 1}`}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
