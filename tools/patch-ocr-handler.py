from pathlib import Path
import re

p = Path('src/components/MyRequestsView.tsx')
s = p.read_text(encoding='utf-8')
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
    new_s = pattern.sub(replacement, s, count=1)
    if new_s != s:
        p.write_text(new_s, encoding='utf-8')
        s = new_s

# Diagnostic: show every call site that starts OCR and every file-input handler.
for needle in ('scanSingleFileWithAI(', 'onChange=', 'type="file"', "type='file'", 'accept='):
    print(f'===== {needle} =====')
    for m in re.finditer(re.escape(needle), s):
        start = max(0, s.rfind('\n', 0, max(0, m.start()-700)))
        end = min(len(s), s.find('\n', min(len(s), m.end()+1200)))
        print(s[start:end])
