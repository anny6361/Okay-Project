import React from 'react';
import { CompanyMasterData } from '../types';

interface CompanyLetterheadProps {
  companyData: CompanyMasterData | null | undefined;
  primaryColor?: string;
  className?: string;
  rightContent?: React.ReactNode;
}

export const CompanyLetterhead: React.FC<CompanyLetterheadProps> = ({
  companyData,
  primaryColor = '#1e3a8a', // Default to enterprise navy
  className = '',
  rightContent
}) => {
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

  return (
    <div className={`w-full font-sans select-none ${className}`} style={{ contentVisibility: 'auto' }}>
      {/* 3-Column Balanced Layout */}
      <div className="grid grid-cols-[70px_1fr_70px] items-center gap-4 w-full">
        {/* Left Column: Logo */}
        <div className="flex items-center justify-start shrink-0">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              className="h-[55px] w-[55px] object-contain rounded-lg border border-slate-150 bg-white p-1" 
              style={{ maxHeight: '55px', maxWidth: '55px', objectFit: 'contain' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div 
              className="h-[55px] w-[55px] rounded-lg border-2 flex items-center justify-center font-bold text-sm"
              style={{ 
                borderColor: primaryColor, 
                backgroundColor: `${primaryColor}0d`, 
                color: primaryColor 
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Middle Column: Centralized Company Info */}
        <div className="text-center flex flex-col justify-center min-w-0">
          <h1 className="text-xs sm:text-[14px] md:text-[15px] font-bold text-slate-900 tracking-tight leading-snug">
            {companyName}
          </h1>
          <p className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 leading-normal">
            {address}
          </p>
          <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold mt-0.5 leading-none flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
            <span><strong>เลขประจำตัวผู้เสียภาษี (TAX ID):</strong> {taxId}</span>
            <span className="text-slate-300">|</span>
            <span><strong>โทร:</strong> {phone}</span>
            <span className="text-slate-300">|</span>
            <span><strong>อีเมล:</strong> {email}</span>
            <span className="text-slate-300">|</span>
            <span><strong>เว็บไซต์:</strong> www.okay.com</span>
          </p>
        </div>

        {/* Right Column: Balanced empty space or custom content */}
        <div className="flex items-center justify-end shrink-0">
          {rightContent ? (
            <div className="text-right">
              {rightContent}
            </div>
          ) : (
            /* Empty placeholder of exact logo size to maintain perfect balance */
            <div className="h-[55px] w-[55px] shrink-0" />
          )}
        </div>
      </div>

      {/* Double line border divider in primary color */}
      <div 
        className="w-full mt-2 mb-3" 
        style={{ 
          borderBottom: `4px double ${primaryColor}`,
          opacity: 0.95
        }} 
      />
    </div>
  );
};
