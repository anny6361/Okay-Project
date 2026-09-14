from pathlib import Path
import re

p = Path('src/components/MyRequestsView.tsx')
s = p.read_text(encoding='utf-8')

# Keep the previously fixed Response-body handling intact.
pattern = re.compile(r"(?P<indent>\s*)let errMessage = `Server returned \$\{response\.status\}`;[\s\S]*?(?P=indent)throw new Error\(errMessage\);")
replacement = '''    let errMessage = `Server returned ${response.status}`;

    try {
      const responseBody = await response.text();
      if (responseBody) {
        try {
          const errJson = JSON.parse(responseBody);
          if (errJson && errJson.error) {
            errMessage = String(errJson.error);
          } else {
            errMessage = responseBody;
          }
        } catch {
          errMessage = responseBody;
        }
      }
    } catch {
      // Keep HTTP status message if the response body cannot be read.
    }
    throw new Error(errMessage);'''

matches = list(pattern.finditer(s))
if len(matches) > 1:
    raise SystemExit(f'Expected at most one OCR error handler, found {len(matches)}')
if matches:
    s = pattern.sub(replacement, s, count=1)

old_file_obj = '''      const fileObj = {
        name: file.name,
        type: file.type || 'image/jpeg',
        size: file.size,
        dataUrl: localDataUrl,
        rawBase64: localDataUrl
      };'''
new_file_obj = '''      // Browser MIME can be empty/incorrect for PDFs. Resolve the type from
      // both MIME and filename before handing the file to OCR.
      const fileNameLower = (file.name || '').toLowerCase();
      const rawFileType = (file.type || '').toLowerCase().trim();
      const isPdfFile = rawFileType === 'application/pdf' || fileNameLower.endsWith('.pdf');
      const effectiveFileType = isPdfFile ? 'application/pdf' : (rawFileType || 'image/jpeg');

      const fileObj = {
        name: file.name,
        type: effectiveFileType,
        size: file.size,
        dataUrl: localDataUrl,
        rawBase64: localDataUrl
      };'''

if old_file_obj not in s:
    raise SystemExit('PDF file object block not found')
s = s.replace(old_file_obj, new_file_obj, 1)

old_check = '''      const fileTypeLower = (file.type || '').toLowerCase();
      const fileNameLower = (file.name || '').toLowerCase();
      if (!firstAddedFileObj && (fileTypeLower.startsWith('image/') || fileTypeLower === 'application/pdf' || fileNameLower.endsWith('.pdf'))) {
        firstAddedFileObj = fileObj;
      }'''
new_check = '''      // PDF detection must use the normalized type so OCR starts even when
      // the browser reports an empty/non-standard MIME type.
      if (!firstAddedFileObj && (effectiveFileType.startsWith('image/') || effectiveFileType === 'application/pdf')) {
        firstAddedFileObj = fileObj;
      }'''

if old_check not in s:
    raise SystemExit('PDF OCR eligibility block not found')
s = s.replace(old_check, new_check, 1)

p.write_text(s, encoding='utf-8')
print('Patched PDF MIME detection and OCR eligibility at source.')
