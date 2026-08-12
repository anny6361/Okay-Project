// Utility to generate, print, and save PDF files reliably across browsers and iframe environments

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

export async function downloadHtmlAsPdf(htmlContent: string, fileName: string = 'document.pdf') {
  // Dynamically import html2pdf.js on demand
  // @ts-ignore
  const html2pdfModule = await import('html2pdf.js');

  // Create an on-viewport container placed behind other elements (not at -9999px) so html2canvas renders correctly
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.zIndex = '-99999';
  container.style.width = '800px'; // Standard A4 width
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = 'Sarabun, Arial, sans-serif';
  container.style.pointerEvents = 'none';
  container.style.opacity = '1';
  container.style.overflow = 'visible';
  container.className = 'pdf-render-container';
  
  // Clean up scripts, auto-close snippets, and convert oklch/color-mix
  let cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload="[^"]*"/gi, '');

  // Strip iframe tags if any remain
  cleanHtml = cleanHtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '<div style="padding:20px;text-align:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;">[เอกสารแนบ PDF]</div>');

  cleanHtml = cleanCssText(cleanHtml);

  // Wrap inside print container with forced light mode colors so dark mode doesn't turn text white or background black
  const styledHtml = `
    <div style="background-color: #ffffff !important; color: #000000 !important; padding: 16px; font-family: Sarabun, Arial, sans-serif; min-height: 100%;">
      <style>
        * { color-scheme: light !important; }
        body, table, td, th, p, span, div, h1, h2, h3, h4, h5, h6 {
          color: #000000 !important;
        }
        .bg-slate-900, .bg-slate-800, .bg-slate-950, .dark\\:bg-slate-900 {
          background-color: #f8fafc !important;
          color: #000000 !important;
        }
        .text-white, .text-slate-100, .text-slate-200, .dark\\:text-white {
          color: #000000 !important;
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
      </style>
      ${cleanHtml}
    </div>
  `;

  container.innerHTML = styledHtml;
  document.body.appendChild(container);

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number], // 8mm margins
    filename: cleanFileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      letterRendering: true,
      backgroundColor: '#ffffff',
      windowWidth: 800,
      onclone: (clonedDoc: Document) => {
        const clonedContainer = clonedDoc.querySelector('.pdf-render-container') as HTMLElement;
        if (clonedContainer) {
          clonedContainer.style.position = 'static';
          clonedContainer.style.zIndex = 'auto';
        }
        // Sanitize any style elements or elements with inline style in cloned document
        const styles = Array.from(clonedDoc.querySelectorAll('style'));
        styles.forEach((s) => {
          if (s.textContent) {
            s.textContent = cleanCssText(s.textContent);
          }
        });
        const elementsWithStyle = Array.from(clonedDoc.querySelectorAll('[style]'));
        elementsWithStyle.forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('color-mix') || styleAttr.includes('oklab'))) {
            el.setAttribute('style', cleanCssText(styleAttr));
          }
        });
      }
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  let restoreStyles: (() => void) | null = null;

  try {
    // Temporarily sanitize main document styles so html2canvas doesn't fail on global Tailwind oklch
    restoreStyles = sanitizeDocumentStylesForHtml2Canvas();

    // Wait for all images inside container to finish loading
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // @ts-ignore
    const html2pdfFunc = (html2pdfModule.default || html2pdfModule) as any;

    await html2pdfFunc().set(opt).from(container).save();
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  } finally {
    if (restoreStyles) {
      try {
        restoreStyles();
      } catch (e) {
        console.error('Error restoring main document styles:', e);
      }
    }
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function printHtmlDirectly(htmlContent: string) {
  // Clean scripts and window.close and oklch
  let cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload="[^"]*"/gi, '');

  cleanHtml = cleanCssText(cleanHtml);

  // Remove existing overlay/styles if present
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
        * { color-scheme: light !important; }
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

