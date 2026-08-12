import React, { useEffect, useState, useRef, useMemo } from 'react';
import { subscribePdfPreview, closePdfPreview } from '../lib/pdf-preview';
import { X, Printer, Download, ExternalLink, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { downloadHtmlAsPdf, printHtmlDirectly, cleanCssText } from '../utils/pdfGenerator';
import { getSafePreviewUrl } from '../data/db';

function getSanitizedPrintHtml(rawHtml: string) {
  // Strip out any automatic window.close() calls and onload attributes that interfere with printing
  let clean = rawHtml
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  clean = cleanCssText(clean);

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

function extractPreviewTarget(htmlContent: string) {
  if (!htmlContent) return { isPdfUrl: false, isImgUrl: false, targetUrl: '', cleanHtml: '' };

  let clean = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  clean = cleanCssText(clean);

  // Check 1: Does the HTML contain an iframe with src (e.g. PDF wrapper or document wrapper)?
  const iframeSrcMatch = htmlContent.match(/<iframe\s+[^>]*src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    const rawUrl = iframeSrcMatch[1];
    return {
      isPdfUrl: true,
      isImgUrl: false,
      targetUrl: rawUrl,
      cleanHtml: clean
    };
  }

  // Check 2: Is the HTML a simple wrapper around an img?
  const imgSrcMatch = htmlContent.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
  if (imgSrcMatch && imgSrcMatch[1] && htmlContent.length < 3500 && !htmlContent.includes('<table')) {
    return {
      isPdfUrl: false,
      isImgUrl: true,
      targetUrl: imgSrcMatch[1],
      cleanHtml: clean
    };
  }

  return {
    isPdfUrl: false,
    isImgUrl: false,
    targetUrl: '',
    cleanHtml: clean
  };
}

export default function PdfPreviewModal() {
  const [content, setContent] = useState<{html: string, title: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return subscribePdfPreview(setContent);
  }, []);

  useEffect(() => {
    setDownloadSuccess(false);
  }, [content]);

  const parsed = useMemo(() => {
    if (!content?.html) return null;
    return extractPreviewTarget(content.html);
  }, [content?.html]);

  useEffect(() => {
    if (!parsed || parsed.isPdfUrl || parsed.isImgUrl) {
      setHtmlBlobUrl('');
      return;
    }

    const sanitizedHtml = getSanitizedPrintHtml(parsed.cleanHtml);
    const blob = new Blob([sanitizedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setHtmlBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [parsed]);

  if (!content) return null;

  const handleOpenNewWindowPrint = () => {
    if (!content || !parsed) return;

    if (parsed.isPdfUrl && parsed.targetUrl) {
      const safeUrl = getSafePreviewUrl(parsed.targetUrl);
      window.open(safeUrl, '_blank');
      return;
    }

    if (parsed.isImgUrl && parsed.targetUrl) {
      window.open(parsed.targetUrl, '_blank');
      return;
    }

    if (htmlBlobUrl) {
      window.open(htmlBlobUrl, '_blank');
      return;
    }

    const sanitized = getSanitizedPrintHtml(parsed.cleanHtml || content.html);
    const blob = new Blob([sanitized], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    if (!content || !parsed) return;

    if (parsed.isPdfUrl && parsed.targetUrl) {
      const safeUrl = getSafePreviewUrl(parsed.targetUrl);
      printHtmlDirectly(`
        <div style="width:100%;height:100vh;">
          <iframe src="${safeUrl}" style="width:100%;height:100vh;border:none;"></iframe>
        </div>
      `);
    } else if (parsed.isImgUrl && parsed.targetUrl) {
      printHtmlDirectly(`
        <div style="text-align:center;padding:20px;">
          <img src="${parsed.targetUrl}" style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:8px;" />
        </div>
      `);
    } else {
      printHtmlDirectly(parsed.cleanHtml || content.html);
    }
  };

  const handleDownloadPdf = async () => {
    if (!content || !parsed || isGenerating) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const title = content.title || 'document';

      // Case 1: Embedded PDF file (dataUrl / blob / http)
      if (parsed.isPdfUrl && parsed.targetUrl) {
        const safeUrl = getSafePreviewUrl(parsed.targetUrl);
        const a = document.createElement('a');
        a.href = safeUrl;
        a.download = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
        return;
      }

      // Case 2: Embedded Image file
      if (parsed.isImgUrl && parsed.targetUrl) {
        const imgHtml = `
          <div style="width:100%;text-align:center;padding:10px;">
            <img src="${parsed.targetUrl}" style="max-width:100%;max-height:270mm;object-fit:contain;border-radius:8px;" />
          </div>
        `;
        await downloadHtmlAsPdf(imgHtml, title);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
        return;
      }

      // Case 3: Rich HTML Document
      const sanitizedHtml = getSanitizedPrintHtml(parsed.cleanHtml || content.html);
      await downloadHtmlAsPdf(sanitizedHtml, title);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);

    } catch (err) {
      console.error('PDF Download failed, falling back to HTML download:', err);
      handleDownloadHtml();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!content || !parsed) return;
    const sanitized = getSanitizedPrintHtml(parsed.cleanHtml || content.html);
    const blob = new Blob([sanitized], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 md:p-4 relative flex items-center justify-center">
          {parsed?.isPdfUrl && parsed.targetUrl ? (
            <iframe 
              ref={iframeRef}
              src={getSafePreviewUrl(parsed.targetUrl)}
              className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"
              title={content.title || "PDF Preview"}
            />
          ) : parsed?.isImgUrl && parsed.targetUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-slate-200/50 dark:bg-slate-900 rounded-xl">
              <img 
                src={parsed.targetUrl} 
                alt={content.title || "Image Preview"}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              />
            </div>
          ) : htmlBlobUrl ? (
            <iframe 
              ref={iframeRef}
              src={htmlBlobUrl}
              className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"
              title={content.title || "Document Preview"}
            />
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="animate-spin h-5 w-5" />
              <span>กำลังโหลดเอกสาร...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

