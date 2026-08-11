// Utility to generate, print, and save PDF files reliably across browsers and iframe environments

export async function downloadHtmlAsPdf(htmlContent: string, fileName: string = 'document.pdf') {
  // Dynamically import html2pdf.js on demand
  // @ts-ignore
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  // Create an off-screen container for rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; // Standard A4 width
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Sarabun, sans-serif';
  container.className = 'pdf-render-container';
  
  // Clean up scripts or auto-close snippets from htmlContent
  const cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload="[^"]*"/gi, '');

  container.innerHTML = cleanHtml;
  document.body.appendChild(container);

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number], // 8mm margins
    filename: cleanFileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  try {
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
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function printHtmlDirectly(htmlContent: string) {
  // Clean scripts and window.close
  const cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/window\.close\(\);?/gi, '')
    .replace(/onload="[^"]*"/gi, '');

  // 1. Try to open print in a new tab if supported
  try {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>พิมพ์เอกสาร (Print Document)</title>
            <style>
              @media print {
                @page { size: A4 portrait; margin: 10mm; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .no-print, button { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${cleanHtml}
            <script>
              window.addEventListener('load', () => {
                setTimeout(() => {
                  window.print();
                }, 500);
              });
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      return true;
    }
  } catch (e) {
    console.warn('New window print failed or blocked:', e);
  }

  // 2. Fallback: Print using overlay in current document body
  const printOverlay = document.createElement('div');
  printOverlay.id = 'active-print-overlay';
  printOverlay.style.position = 'fixed';
  printOverlay.style.inset = '0';
  printOverlay.style.zIndex = '999999';
  printOverlay.style.backgroundColor = '#ffffff';
  printOverlay.style.overflow = 'auto';
  printOverlay.style.padding = '20px';
  printOverlay.innerHTML = cleanHtml;

  const styleEl = document.createElement('style');
  styleEl.id = 'active-print-style';
  styleEl.innerHTML = `
    @media print {
      body > *:not(#active-print-overlay) {
        display: none !important;
      }
      #active-print-overlay {
        position: absolute !important;
        inset: 0 !important;
        padding: 0 !important;
        background: white !important;
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
  }, 300);

  return true;
}
