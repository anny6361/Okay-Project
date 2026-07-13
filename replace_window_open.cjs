const fs = require('fs');

const files = [
  'src/components/AccountingLedgerView.tsx',
  'src/components/DashboardView.tsx',
  'src/components/DocumentGalleryView.tsx',
  'src/components/DocumentPdfManagerView.tsx',
  'src/components/HistoryAndReportsView.tsx',
  'src/components/MyRequestsView.tsx',
  'src/components/RequestDetailModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('../lib/pdf-preview')) {
    content = content.replace(/(import React.*?;\n)/, "$1import { openPdfPreview } from '../lib/pdf-preview';\n");
  }

  // Find pattern: const printWindow = window.open('', '_blank');
  // ... printWindow.document.write(htmlContent);
  // We can just replace window.open('', '_blank') with a mock object
  content = content.replace(/const (\w+) = window\.open\(''\s*,\s*'_blank'\);/g, 
`const $1: any = {
      document: {
        write: (html: string) => { $1._html = ($1._html || '') + html; },
        close: () => { openPdfPreview($1._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };`);

  // Remove the popup block check
  content = content.replace(/if \(!\w+\) \{\s*alert\(['"`].*?['"`]\);\s*return;\s*\}/g, "");

  // Also DocumentGalleryView uses window.open(url, '_blank') for images
  content = content.replace(/window\.open\(([^,]+),\s*'_blank'\)/g, "(typeof $1 === 'string' && $1.startsWith('http') ? window.open($1, '_blank') : null)"); // Keep valid urls, but wait, the PDF preview is only for HTML.
  
  fs.writeFileSync(file, content);
}
