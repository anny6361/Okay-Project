import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Info, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export default function PolicyConfigView() {
  const [policies, setPolicies] = useState([
    {
      id: 'p-1',
      title: 'ตรวจสอบใบเสร็จดิจิทัลแบบบังคับ',
      description: 'ระบบจะปฏิเสธหรือขึ้นแจ้งเตือนทันทีหากรายการในกลุ่ม ค่าเดินทาง, ค่ารับรองอาหาร, ค่าอุปกรณ์ และค่าซอฟต์แวร์ ไม่มีเอกสารหลักฐานใบเสร็จแนบในระบบอย่างน้อย 1 ไฟล์',
      enabled: true,
      severity: 'high',
    },
    {
      id: 'p-2',
      title: 'ระบุขีดจำกัดงบรายอาหารและค่ารับรอง (Meals Threshold)',
      description: 'ห้ามพนักงานเบิกจ่ายค่าอาหารรายวันเกิน 3,000 บาทต่อรายการ หากมียอดเกินนี้จะถูกทำเครื่องหมายตรวจสอบนโยบาย (Policy Auditing Flag) และกำหนดให้ต้องแนบรายชื่อผู้เข้าร่วมด้วย',
      enabled: true,
      severity: 'medium',
    },
    {
      id: 'p-3',
      title: 'แจ้งเตือนการเคลมในวันหยุดและนอกเวลาทำการ (Weekend Claim Block)',
      description: 'แจ้งเตือนอัตโนมัติแก่ผู้อนุมัติเมื่อรายการใบเสร็จมีวันที่ทำธุรกรรมตรงกับวันเสาร์หรือวันอาทิตย์ เพื่อควบคุมการเบิกค่าใช้จ่ายที่ไม่เกี่ยวข้องกับการทำงาน',
      enabled: true,
      severity: 'low',
    },
    {
      id: 'p-4',
      title: 'ระบบสแกนใบเสร็จซ้ำซ้อนระดับองค์กร (Anti-Duplication Engine)',
      description: 'ป้องกันความผิดพลาดหรือทุจริต โดยสแกนประวัติการเคลมที่มีจำนวนเงิน ร้านค้า และวันที่ทำรายการซ้ำซ้อนกันในขอบเขต 48 ชั่วโมง และขึ้นสถานะระงับชั่วคราว',
      enabled: true,
      severity: 'high',
    }
  ]);

  const handleToggle = (id: string) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">นโยบายและการควบคุมหลัก (Expense Policy)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">กำหนดกฎระเบียบและเงื่อนไขการเคลม เพื่อให้สอดคล้องกับระเบียบบริษัทและมาตรฐานสรรพากร</p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-2xl flex gap-3">
        <Info className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="text-xs text-primary-800 dark:text-primary-300 space-y-1">
          <p className="font-bold">ระบบควบคุมนโยบายอัตโนมัติ (Policy Engine)</p>
          <p className="leading-relaxed">
            กฎทุกข้อด้านล่างจะถูกนำไปใช้ตรวจสอบคำขอเบิกเงินของพนักงานทุกคนโดยอัตโนมัติเมื่อทำรายการแบบเรียลไทม์ โดยจะวิเคราะห์หาคำวิจารณ์ แจ้งเตือน หรือผิดข้อตกลง เพื่อรายงานตรงต่อผู้อนุมัติ
          </p>
        </div>
      </div>

      {/* Policy Card List */}
      <div className="grid grid-cols-1 gap-4">
        {policies.map((p) => (
          <div 
            key={p.id} 
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  p.severity === 'high' ? 'bg-rose-500' : p.severity === 'medium' ? 'bg-amber-500' : 'bg-primary-500'
                }`} />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{p.title}</h3>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  p.severity === 'high' ? 'bg-rose-50 text-rose-700' :
                  p.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary-700 dark:text-primary-400'
                }`}>
                  ระดับความเข้มงวด: {p.severity === 'high' ? 'สูงสุด (Block)' : p.severity === 'medium' ? 'ปานกลาง (Alert)' : 'คำเตือน (Warn)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                {p.description}
              </p>
            </div>

            <button 
              id={`policy-toggle-${p.id}`}
              onClick={() => handleToggle(p.id)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-all focus:outline-none shrink-0"
            >
              {p.enabled ? (
                <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                  <span className="text-xs font-semibold">เปิดใช้งานกฎ</span>
                  <ToggleRight className="h-9 w-9 text-primary-600 dark:text-primary-400" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ระงับกฎชั่วคราว</span>
                  <ToggleLeft className="h-9 w-9 text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Internal Compliance Rate metric */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400 h-4 w-4" />
              <span>ดัชนีวินัยทางการเงินระดับบริษัท (Enterprise Compliance Score)</span>
            </h3>
            <p className="text-xs text-slate-400">
              วัดสัดส่วนคำขอเบิกเงินที่ทำตามนโยบายอย่างสมบูรณ์แบบโดยไม่ต้องขอเอกสารเพิ่มหรือขึ้นแจ้งเตือนใดๆ
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-emerald-400">92.4%</p>
            <p className="text-[10px] text-slate-400">เกณฑ์มาตรฐานสากล: &gt; 90%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
