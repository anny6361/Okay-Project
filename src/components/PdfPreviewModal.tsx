import React, { useEffect, useState, useRef } from 'react';
import { subscribePdfPreview, closePdfPreview } from '../lib/pdf-preview';
import { X, Printer, Download, ExternalLink, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { downloadHtmlAsPdf, printHtmlDirectly } from '../utils/pdfGenerator';

function getSanitizedPrintHtml(rawHtml: string) {
  // Strip out any automatic window.close() calls and onload attributes that interfere with printing
  let clean = rawHtml
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  // Add optimal print styles for A4 paper and exact color rendering
  const printStyles = `
    <style>
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          background: #ffffff !important;
        }
        .no-print, button, .hidden-print {
          display: none !important;
        }
      }
    </style>
  `;

  if (clean.includes('</head>')) {
    clean = clean.replace('</head>', `${printStyles}</head>`);
  } else {
    clean = `${printStyles}${clean}`;
  }

  return clean;
}

export default function PdfPreviewModal() {
  const [content, setContent] = useState<{html: string, title: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return subscribePdfPreview(setContent);
  }, []);

  useEffect(() => {
    if (content && iframeRef.current) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        const sanitized = getSanitizedPrintHtml(content.html);
        doc.open();
        doc.write(sanitized);
        doc.close();
      }
    }
  }, [content]);

  if (!content) return null;

  const handleOpenNewWindowPrint = () => {
    if (!content) return;
    printHtmlDirectly(content.html);
  };

  const handlePrint = () => {
    if (!content) return;
    const cleanHtml = getSanitizedPrintHtml(content.html);

    // 1. Try iframe print directly
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch (e) {
      console.warn('Iframe modal print error:', e);
    }

    // 2. Fallback to direct top document print
    printHtmlDirectly(cleanHtml);
  };

  const handleDownloadPdf = async () => {
    if (!content || isGenerating) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const cleanHtml = getSanitizedPrintHtml(content.html);
      await downloadHtmlAsPdf(cleanHtml, content.title || 'document');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PDF Download failed, falling back to HTML download:', err);
      // Fallback to HTML file if PDF compilation failed
      handleDownloadHtml();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!content) return;
    const cleanHtml = getSanitizedPrintHtml(content.html);
    const blob = new Blob([cleanHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 gap-3">
          <div className="flex items-center gap-2 max-w-xs md:max-w-md truncate">
            <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
            <h2 className="font-bold text-slate-800 dark:text-white truncate">{content.title}</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              title="พิมพ์เอกสารออกทางเครื่องพิมพ์"
            >
              <Printer size={16} />
              <span>พิมพ์เอกสาร (Print A4)</span>
            </button>

            <button 
              onClick={handleDownloadPdf}
              type="button"
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-60"
              title="สร้างและดาวน์โหลดไฟล์ PDF คุณภาพสูง"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  <span>ดาวน์โหลด PDF สำเร็จ!</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>ดาวน์โหลด PDF (.pdf)</span>
                </>
              )}
            </button>

            <button 
              onClick={handleOpenNewWindowPrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="เปิดดูในหน้าต่างใหม่แบบเต็มหน้าจอ"
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">เปิดหน้าต่างใหม่</span>
            </button>

            <button 
              onClick={handleDownloadHtml}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="สำรองไฟล์เป็น HTML"
            >
              <FileText size={15} />
              <span className="hidden lg:inline">สำรอง HTML</span>
            </button>

            <button 
              onClick={closePdfPreview}
              type="button"
              className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 md:p-4">
          <iframe 
            ref={iframeRef}
            className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200"
            title="PDF Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        </div>

      </div>
    </div>
  );
}
