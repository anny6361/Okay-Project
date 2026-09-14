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
if not matches:
    raise SystemExit('OCR error handler not found')
if len(matches) > 1:
    raise SystemExit(f'Expected one OCR error handler, found {len(matches)}')

new_s = pattern.sub(replacement, s, count=1)
if new_s == s:
    raise SystemExit('No change made')

p.write_text(new_s, encoding='utf-8')
print('Patched MyRequestsView.tsx OCR response handling safely.')
