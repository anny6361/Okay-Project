import { CompanyMasterData } from '../types';

export function getLetterheadHtml(
  companyData: CompanyMasterData | null | undefined,
  primaryColor: string = '#1e3a8a',
  rightContentHtml: string = ''
): string {
  const companyName = companyData?.companyName || 'บริษัท โอเค เอ็กซ์เพนส์ แมเนจเมนท์ จำกัด (OKAY EXPENSE MANAGEMENT CO., LTD.)';
  const logoUrl = companyData?.logoUrl || '';
  const address = companyData?.address || '99/9 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310 (99/9 Rama IX Road, Huai Khwang, Bangkok 10310)';
  const taxId = companyData?.taxId || '0-1055-66000-11-2';
  const phone = companyData?.phone || '02-123-4567';
  const email = companyData?.email || 'finance@okay.com';

  // Extract initials for logo placeholder (e.g., OK)
  let initials = 'OK';
  if (companyName) {
    const englishMatch = companyName.match(/\(([^)]+)\)/);
    if (englishMatch && englishMatch[1]) {
      const engName = englishMatch[1].replace(/CO\.|LTD\.|LIMITED/gi, '').trim();
      const words = engName.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        initials = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1) {
        initials = words[0].substring(0, 2).toUpperCase();
      }
    } else {
      const words = companyName.replace(/บริษัท|จำกัด/gi, '').trim().split(/\s+/).filter(Boolean);
      if (words.length > 0 && words[0].length > 0) {
        initials = words[0].substring(0, 2);
      }
    }
  }

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Company Logo" style="height: 55px; width: 55px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; background-color: #ffffff; padding: 2px; box-sizing: border-box;" />`
    : `<div style="height: 55px; width: 55px; border-radius: 8px; border: 2px solid ${primaryColor}; background-color: ${primaryColor}0d; color: ${primaryColor}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; font-family: sans-serif; box-sizing: border-box; line-height: 51px; text-align: center;">${initials}</div>`;

  const rightBoxHtml = rightContentHtml
    ? `<div style="text-align: right; box-sizing: border-box; font-size: 10px;">${rightContentHtml}</div>`
    : `<div style="height: 55px; width: 70px; box-sizing: border-box;"></div>`;

  return `
    <div class="company-letterhead" style="width: 100%; font-family: 'Sarabun', sans-serif; margin-bottom: 20px; box-sizing: border-box;">
      <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 5px; background: transparent;">
        <tr style="background: transparent; border: none;">
          <!-- Left Column: Logo -->
          <td style="width: 70px; vertical-align: middle; padding: 0; border: none; background: transparent; text-align: left;">
            ${logoHtml}
          </td>
          <!-- Middle Column: Centralized Company Info -->
          <td style="vertical-align: middle; padding: 0 10px; border: none; background: transparent; text-align: center;">
            <h1 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; line-height: 1.4; text-align: center; font-family: 'Sarabun', sans-serif;">
              ${companyName}
            </h1>
            <p style="margin: 3px 0 0 0; font-size: 10px; color: #475569; line-height: 1.5; text-align: center; font-family: 'Sarabun', sans-serif;">
              ${address}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b; text-align: center; font-weight: 600; font-family: 'Sarabun', sans-serif;">
              <span><strong>เลขประจำตัวผู้เสียภาษี (TAX ID):</strong> ${taxId}</span>
              <span style="color: #cbd5e1; margin: 0 4px;">|</span>
              <span><strong>โทร:</strong> ${phone}</span>
              <span style="color: #cbd5e1; margin: 0 4px;">|</span>
              <span><strong>อีเมล:</strong> ${email}</span>
              <span style="color: #cbd5e1; margin: 0 4px;">|</span>
              <span><strong>เว็บไซต์:</strong> www.okay.com</span>
            </p>
          </td>
          <!-- Right Column: Balanced empty space or custom content -->
          <td style="width: 70px; vertical-align: middle; padding: 0; border: none; background: transparent; text-align: right;">
            ${rightBoxHtml}
          </td>
        </tr>
      </table>
      <!-- Double line border divider in primary color -->
      <div class="double-divider" style="border-bottom: 4px double ${primaryColor}; width: 100%; margin-top: 5px; opacity: 0.95;"></div>
    </div>
  `;
}
