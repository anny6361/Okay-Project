const fs = require('fs');

// 1. Add to App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('PdfPreviewModal')) {
  appContent = appContent.replace("import Sidebar from './components/Sidebar';", "import Sidebar from './components/Sidebar';\nimport PdfPreviewModal from './components/PdfPreviewModal';");
  // Add <PdfPreviewModal /> at the end of the root div
  appContent = appContent.replace(/(\s*)(<\/div>\s*)$/, "$1  <PdfPreviewModal />$1$2");
  fs.writeFileSync('src/App.tsx', appContent);
}

// 2. Replace window.open in components
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
    content = "import { openPdfPreview } from '../lib/pdf-preview';\n" + content;
  }

  // Find pattern: const w = window.open('', '_blank'); if (!w) { ... } w.document.write(HTML);
  // We can just regex replace `const [name] = window.open...` and replace calls.
  // Actually, there are many variations. We will write a smart regex or manually replace using multi_edit.
  // Wait, I can just replace `window.open` and patch the object.
  // I will intercept window.open in the files.
  
  // Actually, replacing `window.open('', '_blank')` is easy.
  // It returns an object that they call `.document.write()` on.
  // Let's create a wrapper that mocks `window.open` in these files.
}
