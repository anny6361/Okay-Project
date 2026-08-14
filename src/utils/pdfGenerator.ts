// Utility to generate, print, and save PDF files reliably across browsers and iframe environments
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const oklab_a = c * Math.cos(hRad);
  const oklab_b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

  const lms_l = l_ * l_ * l_;
  const lms_m = m_ * m_ * m_;
  const lms_s = s_ * s_ * s_;

  const r_l = +4.0767416621 * lms_l - 3.3077115913 * lms_m + 0.2309699292 * lms_s;
  const g_l = -1.2684380046 * lms_l + 2.6097574011 * lms_m - 0.3413193965 * lms_s;
  const b_l = -0.0041960863 * lms_l - 0.7034186147 * lms_m + 1.7076147010 * lms_s;

  const f = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(f(r_l) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(f(g_l) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(f(b_l) * 255)));

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function parseAndConvertOklch(colorStr: string): string {
  if (!colorStr || !colorStr.includes('oklch')) return colorStr;
  const match = colorStr.match(/oklch\(([^)]+)\)/i);
  if (!match) return colorStr;

  const content = match[1].trim();
  let lStr = '0', cStr = '0', hStr = '0', aStr = '1';

  if (content.includes('/')) {
    const slashParts = content.split('/');
    if (slashParts.length === 2) {
      const mainColorParts = slashParts[0].trim().split(/[\s,]+/);
      lStr = mainColorParts[0] || '0';
      cStr = mainColorParts[1] || '0';
      hStr = mainColorParts[2] || '0';
      aStr = slashParts[1].trim();
    }
  } else {
    const parts = content.split(/[\s,]+/);
    lStr = parts[0] || '0';
    cStr = parts[1] || '0';
    hStr = parts[2] || '0';
  }

  let l = parseFloat(lStr);
  if (lStr.includes('%')) l = parseFloat(lStr) / 100;
  let c = parseFloat(cStr);
  let h = parseFloat(hStr);
  if (isNaN(h)) h = 0;

  let a = parseFloat(aStr);
  if (aStr.includes('%')) a = parseFloat(aStr) / 100;
  if (isNaN(a)) a = 1;

  if (isNaN(l)) l = 0;
  if (isNaN(c)) c = 0;

  return oklchToRgb(l, c, h, a);
}

export function cleanCssText(cssText: string): string {
  if (!cssText) return '';
  let resolved = cssText;

  // Replace oklch(...) expressions safely even if nested
  let idx = resolved.indexOf('oklch(');
  while (idx !== -1) {
    let openBrackets = 1;
    let j = idx + 6;
    while (j < resolved.length && openBrackets > 0) {
      if (resolved[j] === '(') openBrackets++;
      else if (resolved[j] === ')') openBrackets--;
      j++;
    }
    if (openBrackets === 0) {
      const oklchExpr = resolved.substring(idx, j);
      const converted = parseAndConvertOklch(oklchExpr);
      resolved = resolved.substring(0, idx) + converted + resolved.substring(j);
    } else {
      break;
    }
    idx = resolved.indexOf('oklch(');
  }

  // Replace oklab(...)
  resolved = resolved.replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');

  // Replace color-mix(in srgb, ...)
  const colorMixRegex = /color-mix\(\s*in\s+srgb\s*,\s*([^,]+)\s*,\s*([^)]+)\)/gi;
  resolved = resolved.replace(colorMixRegex, (_match, p1) => {
    const c1 = p1.trim().split(/\s+/)[0];
    return c1 !== 'transparent' ? c1 : 'rgba(120, 120, 120, 0.5)';
  });

  // Catch any remaining generic color-mix(...)
  resolved = resolved.replace(/color-mix\([^)]+\)/gi, 'rgba(120, 120, 120, 0.5)');

  return resolved;
}

export function sanitizeDocumentStylesForHtml2Canvas(): () => void {
  const backups: {
    type: 'style' | 'link';
    element: HTMLElement;
    originalValue: string | boolean;
    tempStyleEl?: HTMLStyleElement;
  }[] = [];

  // 1. Process inline <style> elements
  const styleElements = Array.from(document.querySelectorAll('style'));
  styleElements.forEach(styleEl => {
    try {
      const originalText = styleEl.textContent || '';
      if (originalText.includes('oklch') || originalText.includes('color-mix') || originalText.includes('oklab')) {
        backups.push({ type: 'style', element: styleEl, originalValue: originalText });
        styleEl.textContent = cleanCssText(originalText);
      }
    } catch (e) {
      console.error('Error handling style element:', e);
    }
  });

  // 2. Process <link rel="stylesheet"> elements
  const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  linkElements.forEach(linkEl => {
    try {
      const sheet = linkEl.sheet;
      if (!sheet) return;

      if (!linkEl.href || linkEl.href.startsWith(window.location.origin)) {
        let combinedCss = '';
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let i = 0; i < rules.length; i++) {
              combinedCss += rules[i].cssText + '\n';
            }
          }
        } catch (err) {
          // Ignore cross-origin rules
        }

        if (combinedCss && (combinedCss.includes('oklch') || combinedCss.includes('color-mix') || combinedCss.includes('oklab'))) {
          const sanitizedCss = cleanCssText(combinedCss);
          const tempStyle = document.createElement('style');
          tempStyle.textContent = sanitizedCss;
          document.head.appendChild(tempStyle);

          backups.push({
            type: 'link',
            element: linkEl,
            originalValue: linkEl.disabled,
            tempStyleEl: tempStyle
          });

          linkEl.disabled = true;
        }
      }
    } catch (e) {
      console.error('Error handling link element:', e);
    }
  });

  return () => {
    backups.forEach(backup => {
      try {
        if (backup.type === 'style') {
          backup.element.textContent = backup.originalValue as string;
        } else if (backup.type === 'link') {
          (backup.element as HTMLLinkElement).disabled = backup.originalValue as boolean;
          if (backup.tempStyleEl && backup.tempStyleEl.parentNode) {
            backup.tempStyleEl.parentNode.removeChild(backup.tempStyleEl);
          }
        }
      } catch (e) {
        console.error('Error restoring style element:', e);
      }
    });
  };
}

export function extractHtmlParts(rawHtml: string) {
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload=\s*(['"])(.*?)\1|onload=\s*([^\s>]+)/gi, '');

  clean = cleanCssText(clean);

  // Extract <style> blocks
  const styles: string[] = [];
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(clean)) !== null) {
    if (match[1]) {
      styles.push(match[1]);
    }
  }

  // Extract body content
  let bodyContent = clean;
  const bodyMatch = clean.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    bodyContent = bodyMatch[1];
  } else {
    bodyContent = bodyContent.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
    bodyContent = bodyContent.replace(/<!DOCTYPE[^>]*>/gi, '');
    bodyContent = bodyContent.replace(/<\/?html[^>]*>/gi, '');
  }

  return { styles: styles.join('\n'), bodyContent };
}

export async function downloadOriginalFile(fileUrl: string, fileName: string = 'document.pdf') {
  if (!fileUrl) return false;
  const cleanFileName = fileName.replace(/[\/\\?%*:|"<>]/g, '_').trim();
  
  try {
    if (fileUrl.startsWith('data:')) {
      const parts = fileUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    } else if (fileUrl.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } else {
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cleanFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return true;
      } catch (fetchErr) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = cleanFileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      }
    }
  } catch (err) {
    console.error('Error downloading original file:', err);
    return false;
  }
}

export async function downloadHtmlAsPdf(htmlContent: string, fileName: string = 'document.pdf') {
  if (!htmlContent) return false;

  const rawClean = htmlContent.trim();
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // 1. Direct PDF Check: if the input is directly a PDF dataUrl or PDF link, NEVER use canvas
  if (
    rawClean.startsWith('data:application/pdf') ||
    rawClean.startsWith('blob:application/pdf') ||
    (rawClean.startsWith('http') && rawClean.toLowerCase().includes('.pdf'))
  ) {
    return downloadOriginalFile(rawClean, cleanFileName);
  }

  // 2. Direct Image Check: if the input is directly an image
  if (
    rawClean.startsWith('data:image/') ||
    (/\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(rawClean) && rawClean.startsWith('http'))
  ) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = rawClean;
      await new Promise((resolve, reject) => {
        if (img.complete && img.naturalWidth !== 0) return resolve(true);
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Image failed to load'));
        setTimeout(() => resolve(true), 3000);
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10;
      const maxW = pdfWidth - margin * 2;
      const maxH = pdfHeight - margin * 2;

      let renderW = img.naturalWidth || maxW;
      let renderH = img.naturalHeight || maxH;

      const scale = Math.min(maxW / renderW, maxH / renderH, 1);
      renderW = renderW * scale;
      renderH = renderH * scale;

      const posX = margin + (maxW - renderW) / 2;
      const posY = margin + (maxH - renderH) / 2;

      pdf.addImage(img, 'JPEG', posX, posY, renderW, renderH);
      pdf.save(cleanFileName);
      return true;
    } catch (imgErr) {
      console.warn('Image to PDF conversion fallback to direct download:', imgErr);
      return downloadOriginalFile(rawClean, cleanFileName.replace('.pdf', '.png'));
    }
  }

  // 3. HTML Document Conversion
  const { styles, bodyContent } = extractHtmlParts(htmlContent);
  const restoreStyles = sanitizeDocumentStylesForHtml2Canvas();

  const container = document.createElement('div');
  container.className = 'pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '0px';
  container.style.left = '0px';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.padding = '36px';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.zIndex = '999999';
  container.style.visibility = 'visible';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
      * {
        box-sizing: border-box !important;
        color-scheme: light !important;
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, button, .hidden-print {
        display: none !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      th, td {
        border-color: #cbd5e1 !important;
      }
      .bg-slate-900, .bg-slate-800, .bg-slate-950, .dark\\:bg-slate-900 {
        background-color: #f8fafc !important;
        color: #000000 !important;
      }
      .text-white, .text-slate-100, .text-slate-200, .dark\\:text-white {
        color: #000000 !important;
      }
      ${styles}
    </style>
    <div style="background:#ffffff; color:#000000; width:100%;">
      ${bodyContent}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for all images inside container to load
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve(true);
        return new Promise(resolve => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
          setTimeout(() => resolve(true), 2000);
        });
      })
    );

    // Wait for fonts if available
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (e) {}

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      scrollY: 0,
      scrollX: 0,
      x: 0,
      y: 0
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas rendering produced empty image');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 8) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    pdf.save(cleanFileName);
    return true;
  } catch (err) {
    console.error('downloadHtmlAsPdf error, falling back to direct print:', err);
    printHtmlDirectly(htmlContent);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    restoreStyles();
  }
}


export function printHtmlDirectly(htmlContent: string) {
  let cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload="[^"]*"/gi, '');

  cleanHtml = cleanCssText(cleanHtml);

  const oldOverlay = document.getElementById('active-print-overlay');
  if (oldOverlay && oldOverlay.parentNode) {
    oldOverlay.parentNode.removeChild(oldOverlay);
  }
  const oldStyle = document.getElementById('active-print-style');
  if (oldStyle && oldStyle.parentNode) {
    oldStyle.parentNode.removeChild(oldStyle);
  }

  const printOverlay = document.createElement('div');
  printOverlay.id = 'active-print-overlay';
  printOverlay.innerHTML = `
    <div style="background-color:#ffffff; color:#000000; padding:20px; font-family:Sarabun, Arial, sans-serif;">
      <style>
        * { color-scheme: light !important; box-sizing: border-box !important; }
        .no-print, button, .hidden-print { display: none !important; }
        body, table, td, th, p, span, div, h1, h2, h3, h4, h5, h6 { color: #000000 !important; }
        table { border-collapse: collapse !important; width: 100% !important; }
        th, td { border-color: #cbd5e1 !important; }
      </style>
      ${cleanHtml}
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'active-print-style';
  styleEl.innerHTML = `
    @media screen {
      #active-print-overlay {
        display: none !important;
      }
    }
    @media print {
      body > *:not(#active-print-overlay) {
        display: none !important;
      }
      #active-print-overlay {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  `;

  document.body.appendChild(printOverlay);
  document.head.appendChild(styleEl);

  setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('window.print error:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(printOverlay)) {
          document.body.removeChild(printOverlay);
        }
        if (document.head.contains(styleEl)) {
          document.head.removeChild(styleEl);
        }
      }, 1000);
    }
  }, 250);

  return true;
}
