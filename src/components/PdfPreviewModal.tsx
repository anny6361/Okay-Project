import React, { useEffect, useState, useRef } from 'react';
import { subscribePdfPreview, closePdfPreview } from '../lib/pdf-preview';
import { X, Printer, Download } from 'lucide-react';

export default function PdfPreviewModal() {
  const [content, setContent] = useState<{html: string, title: string} | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return subscribePdfPreview(setContent);
  }, []);

  useEffect(() => {
    if (content && iframeRef.current) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(content.html);
        doc.close();
      }
    }
  }, [content]);

  if (!content) return null;

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, attempting new window print:', e);
    }

    if (content) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(content.html);
        printWin.document.close();
        printWin.onload = () => {
          printWin.focus();
          printWin.print();
        };
      }
    }
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <h2 className="font-bold text-slate-800 dark:text-white truncate pr-4">{content.title}</h2>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              <Printer size={16} />
              <span>พิมพ์เอกสาร (Print A4)</span>
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={16} />
              <span className="hidden sm:inline">บันทึกไฟล์ (Save HTML/A4)</span>
            </button>
            <button 
              onClick={closePdfPreview}
              className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
              title="ปิด"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 md:p-4">
          <iframe 
            ref={iframeRef}
            className="w-full h-full bg-white rounded-xl shadow-sm"
            title="PDF Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

      </div>
    </div>
  );
}
