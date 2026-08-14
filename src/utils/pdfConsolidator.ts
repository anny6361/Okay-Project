import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cleanCssText } from './pdfGenerator';
import { getSafePreviewUrl } from '../data/db';

export interface AttachmentItem {
  url?: string;
  html?: string;
  title?: string;
  name?: string;
  type?: 'pdf' | 'image' | 'html';
}

/**
 * Converts a data URL, blob URL, or HTTP URL into a Uint8Array
 */
export async function fetchUrlAsBytes(url: string): Promise<Uint8Array> {
  const safeUrl = getSafePreviewUrl(url);

  if (safeUrl.startsWith('data:')) {
    const commaIdx = safeUrl.indexOf(',');
    if (commaIdx !== -1) {
      const base64Data = safeUrl.substring(commaIdx + 1);
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }

  const response = await fetch(safeUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Converts any image source into PNG/JPEG Uint8Array for pdf-lib embedding
 */
export async function imageSourceToBytes(src: string): Promise<{ bytes: Uint8Array; format: 'png' | 'jpg'; width: number; height: number }> {
  const safeUrl = getSafePreviewUrl(src);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 600;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Fill white background for transparency safety
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        resolve({ bytes, format: 'jpg', width, height });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image from ${safeUrl.substring(0, 100)}...`));
    };

    img.src = safeUrl;
  });
}

/**
 * Renders HTML string into a PDF ArrayBuffer via jsPDF & html2canvas
 */
export async function renderHtmlToPdfBytes(rawHtml: string): Promise<Uint8Array> {
  let cleanHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  cleanHtml = cleanCssText(cleanHtml);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = 'Sarabun, sans-serif';
  container.style.zIndex = '-1000';
  container.style.boxSizing = 'border-box';
  container.style.padding = '0';
  container.style.margin = '0';

  const fontStyle = document.createElement('style');
  fontStyle.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    * {
      color-scheme: light !important;
      box-sizing: border-box !important;
    }
    body, html, div, p, span, h1, h2, h3, h4, h5, h6, table, td, th {
      color: #000000 !important;
      font-family: 'Sarabun', Arial, sans-serif !important;
    }
    table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    th, td {
      border-color: #cbd5e1 !important;
    }
  `;
  container.appendChild(fontStyle);

  const contentWrapper = document.createElement('div');
  contentWrapper.innerHTML = cleanHtml;
  container.appendChild(contentWrapper);

  document.body.appendChild(container);

  // Wait for images inside HTML to load
  const imgs = container.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map(
      img =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2500);
          }
        })
    )
  );

  await new Promise(res => setTimeout(res, 300));

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 5) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const arrayBuffer = pdf.output('arraybuffer');
    return new Uint8Array(arrayBuffer);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Main Consolidation Function:
 * Creates a single PDF combining:
 * 1. Main Document (HTML Voucher/Report, or source PDF, or source Image)
 * 2. Followed by all attached PDFs (preserving all pages)
 * 3. Followed by all attached images (placed on high-resolution A4 pages)
 */
export async function generateConsolidatedPdf(
  mainDoc: { html?: string; url?: string; type?: 'pdf' | 'image' | 'html'; title?: string },
  attachments: AttachmentItem[] = [],
  outputFileName: string = 'document_with_attachments.pdf'
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  // Helper to determine type
  const isUrlPdf = (url: string) => {
    const lower = (url || '').toLowerCase();
    return lower.startsWith('data:application/pdf') || lower.startsWith('blob:application/pdf') || lower.includes('.pdf');
  };

  const isUrlImage = (url: string) => {
    const lower = (url || '').toLowerCase();
    return lower.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lower);
  };

  // 1. Process Main Document
  try {
    if (mainDoc.type === 'pdf' || (mainDoc.url && isUrlPdf(mainDoc.url))) {
      const pdfBytes = await fetchUrlAsBytes(mainDoc.url!);
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      pages.forEach(p => mergedDoc.addPage(p));
    } else if (mainDoc.type === 'image' || (mainDoc.url && isUrlImage(mainDoc.url))) {
      const imgInfo = await imageSourceToBytes(mainDoc.url!);
      const embeddedImg = await mergedDoc.embedJpg(imgInfo.bytes);
      const page = mergedDoc.addPage([595.28, 841.89]); // A4 portrait points
      
      const margin = 36;
      const availW = 595.28 - margin * 2;
      const availH = 841.89 - margin * 2;

      const scale = Math.min(availW / imgInfo.width, availH / imgInfo.height, 1);
      const drawW = imgInfo.width * scale;
      const drawH = imgInfo.height * scale;
      const posX = (595.28 - drawW) / 2;
      const posY = (841.89 - drawH) / 2;

      page.drawImage(embeddedImg, {
        x: posX,
        y: posY,
        width: drawW,
        height: drawH
      });
    } else if (mainDoc.html) {
      const mainPdfBytes = await renderHtmlToPdfBytes(mainDoc.html);
      const srcDoc = await PDFDocument.load(mainPdfBytes, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      pages.forEach(p => mergedDoc.addPage(p));
    }
  } catch (err) {
    console.error('Error rendering main document for consolidated PDF:', err);
    // If main document failed, fall back to empty placeholder page so export doesn't die
    const fallbackPage = mergedDoc.addPage([595.28, 841.89]);
    // Draw placeholder
  }

  // 2. Append all attachments sequentially
  for (let idx = 0; idx < attachments.length; idx++) {
    const item = attachments[idx];
    const sourceUrl = item.url || '';
    if (!sourceUrl && !item.html) continue;

    try {
      if (item.type === 'pdf' || isUrlPdf(sourceUrl)) {
        const attachBytes = await fetchUrlAsBytes(sourceUrl);
        const attachDoc = await PDFDocument.load(attachBytes, { ignoreEncryption: true });
        const pages = await mergedDoc.copyPages(attachDoc, attachDoc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      } else if (item.type === 'image' || isUrlImage(sourceUrl) || sourceUrl.startsWith('data:image/') || sourceUrl.startsWith('http') || sourceUrl.startsWith('blob:')) {
        const imgInfo = await imageSourceToBytes(sourceUrl);
        const embeddedImg = await mergedDoc.embedJpg(imgInfo.bytes);
        const page = mergedDoc.addPage([595.28, 841.89]); // A4 portrait

        const margin = 36;
        const headerH = 40;
        const availW = 595.28 - margin * 2;
        const availH = 841.89 - margin * 2 - headerH;

        const scale = Math.min(availW / imgInfo.width, availH / imgInfo.height, 1);
        const drawW = imgInfo.width * scale;
        const drawH = imgInfo.height * scale;
        const posX = (595.28 - drawW) / 2;
        const posY = margin + (availH - drawH) / 2;

        page.drawImage(embeddedImg, {
          x: posX,
          y: posY,
          width: drawW,
          height: drawH
        });
      } else if (item.html) {
        const htmlPdfBytes = await renderHtmlToPdfBytes(item.html);
        const attachDoc = await PDFDocument.load(htmlPdfBytes, { ignoreEncryption: true });
        const pages = await mergedDoc.copyPages(attachDoc, attachDoc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      }
    } catch (attachErr) {
      console.warn(`Could not attach item #${idx + 1} (${item.title || item.name}):`, attachErr);
    }
  }

  // If no pages were added at all, add a default page
  if (mergedDoc.getPageCount() === 0) {
    mergedDoc.addPage([595.28, 841.89]);
  }

  const finalPdfBytes = await mergedDoc.save();
  return finalPdfBytes;
}

/**
 * Directly downloads the consolidated PDF to the user's device
 */
export async function downloadConsolidatedPdfFile(
  mainDoc: { html?: string; url?: string; type?: 'pdf' | 'image' | 'html'; title?: string },
  attachments: AttachmentItem[] = [],
  fileName: string = 'document_with_attachments.pdf'
): Promise<void> {
  const pdfBytes = await generateConsolidatedPdf(mainDoc, attachments, fileName);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const cleanName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Universal Print Function for Main Document + All Attachments
 */
export async function printConsolidatedDocument(
  mainDoc: { html?: string; url?: string; type?: 'pdf' | 'image' | 'html'; title?: string },
  attachments: AttachmentItem[] = []
): Promise<void> {
  // Build composite printable HTML
  let fullPrintHtml = '';

  const mainClean = mainDoc.html ? cleanCssText(mainDoc.html) : '';
  if (mainClean) {
    fullPrintHtml += `<div class="main-doc-print-section">${mainClean}</div>`;
  } else if (mainDoc.url) {
    const isPdf = mainDoc.type === 'pdf' || mainDoc.url.toLowerCase().includes('.pdf');
    if (!isPdf) {
      fullPrintHtml += `
        <div class="attachment-print-page" style="page-break-after: always; break-after: page; text-align: center; padding: 20px;">
          <h3 style="font-family: Sarabun, sans-serif; font-size: 14px; margin-bottom: 12px; color: #334155;">${mainDoc.title || 'เอกสารหลัก'}</h3>
          <img src="${getSafePreviewUrl(mainDoc.url)}" style="max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 6px;" />
        </div>
      `;
    }
  }

  // Add all attachments as print pages
  attachments.forEach((att, idx) => {
    const safeUrl = att.url ? getSafePreviewUrl(att.url) : '';
    const title = att.title || att.name || `เอกสารหลักฐานแนบ #${idx + 1}`;
    const isPdf = att.type === 'pdf' || (safeUrl && safeUrl.toLowerCase().includes('.pdf'));

    if (safeUrl && !isPdf) {
      fullPrintHtml += `
        <div class="attachment-print-page" style="page-break-before: always; break-before: page; text-align: center; padding: 20px;">
          <div style="font-family: Sarabun, sans-serif; font-size: 13px; font-weight: bold; margin-bottom: 12px; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            หลักฐานประกอบการเบิกจ่าย: ${title}
          </div>
          <img src="${safeUrl}" style="max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1;" />
        </div>
      `;
    } else if (att.html) {
      fullPrintHtml += `
        <div class="attachment-print-page" style="page-break-before: always; break-before: page; padding: 20px;">
          ${cleanCssText(att.html)}
        </div>
      `;
    }
  });

  const printDocumentHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${mainDoc.title || 'พิมพ์เอกสารพร้อมหลักฐาน'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            color-scheme: light !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Sarabun', Arial, sans-serif !important;
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
          .no-print, button, .hidden-print {
            display: none !important;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              padding: 0 !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        </style>
      </head>
      <body>
        ${fullPrintHtml}
      </body>
    </html>
  `;

  // Hidden print iframe method for guaranteed Print Dialog execution
  let printIframe = document.getElementById('global-print-iframe') as HTMLIFrameElement;
  if (printIframe && printIframe.parentNode) {
    printIframe.parentNode.removeChild(printIframe);
  }

  printIframe = document.createElement('iframe');
  printIframe.id = 'global-print-iframe';
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = 'none';
  printIframe.style.zIndex = '-9999';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(printDocumentHtml);
    doc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window print:', e);
        window.print();
      }
    }, 600);
  }
}
