import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Sliders, 
  HelpCircle,
  PieChart,
  UserCheck
} from 'lucide-react';
import { DepartmentBudget, ExpenseRequest } from '../types';
import { CATEGORIES_CONFIG } from '../data/masterData';

interface BudgetAnalyticsViewProps {
  budgets: DepartmentBudget[];
  requests: ExpenseRequest[];
  onUpdateBudgetLimit: (department: string, newAllocated: number) => void;
}

export default function BudgetAnalyticsView({ budgets, requests, onUpdateBudgetLimit }: BudgetAnalyticsViewProps) {
  const [selectedDept, setSelectedDept] = useState<string>(budgets[0]?.department || '');
  const [tempLimit, setTempLimit] = useState<number>(budgets[0]?.allocated || 100000);

  // Sync tempLimit when selecting different department
  const handleDeptSelect = (dept: string) => {
    setSelectedDept(dept);
    const target = budgets.find(b => b.department === dept);
    if (target) {
      setTempLimit(target.allocated);
    }
  };

  const handleLimitSave = () => {
    onUpdateBudgetLimit(selectedDept, tempLimit);
    alert(`ปรับเปลี่ยนงบประมาณของแผนก ${selectedDept} เป็น ฿${(tempLimit || 0).toLocaleString()} สำเร็จ!`);
  };

  // Category Totals
  const categoryTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    requests.forEach(r => {
      if (r.status === 'approved') {
        totals[r.category] = (totals[r.category] || 0) + r.amount;
      }
    });
    return totals;
  }, [requests]);

  // Top spenders
  const topSpenders = React.useMemo(() => {
    const spenders: Record<string, { amount: number, dept: string }> = {};
    requests.forEach(r => {
      if (r.status === 'approved') {
        if (!spenders[r.employeeName]) {
          spenders[r.employeeName] = { amount: 0, dept: r.department };
        }
        spenders[r.employeeName].amount += r.amount;
      }
    });
    return Object.entries(spenders)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">วิเคราะห์การจัดสรรงบประมาณ (Budget Analytics)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">รายงานข้อมูลเชิงลึกของการใช้งบประมาณเปรียบเทียบระหว่างแผนก และปรับเปลี่ยนพารามิเตอร์แบบเรียลไทม์</p>
      </div>

      {/* Grid of Visuals and Tuning Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Spending breakdown list with progress metrics */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span>สัดส่วนงบประมาณแยกตามหน่วยงาน</span>
              </h3>
              <p className="text-xs text-slate-400">เปรียบเทียบแผนจัดสรรงบประมาณ (ขีดจำกัด) และการใช้จริง</p>
            </div>
          </div>

          <div className="space-y-5">
            {budgets.map((b) => {
              const usageRatio = Math.min((b.spent / b.allocated) * 100, 100);
              const warningState = usageRatio >= 90 ? 'critical' : usageRatio >= 80 ? 'warning' : 'safe';
              
              return (
                <div key={b.department} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{b.department}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      อัตราใช้จริง: <span className="font-bold text-slate-900 dark:text-white">{Math.round((b.spent / b.allocated) * 100)}%</span>
                    </span>
                  </div>

                  {/* Dual Bar Graphic representation */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      {/* Allocated background */}
                      <div 
                        className="h-full rounded-full opacity-30 absolute top-0 left-0 w-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {/* Spent overlay */}
                      <div 
                        className="h-full rounded-full transition-all duration-300 absolute top-0 left-0"
                        style={{ 
                          width: `${usageRatio}%`, 
                          backgroundColor: warningState === 'critical' ? '#EF4444' : warningState === 'warning' ? '#F59E0B' : b.color 
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>ยอดจ่ายแล้ว: ฿{(b.spent || 0).toLocaleString()}</span>
                      <span>ขีดจำกัดแผนก: ฿{(b.allocated || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Budget Tuning Tool (ปรับแต่งงบประมาณ - Sliders) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span>เครื่องมือจำลองขีดจำกัดงบประมาณ</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              สำหรับผู้บริหารเพื่อขยายหรือลดความจำกัดงบรายแผนก โดยจะส่งผลต่อการประเมิน Policy Auditing ทันที
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">เลือกแผนกที่ต้องการตั้งค่า</label>
              <select 
                value={selectedDept}
                onChange={(e) => handleDeptSelect(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
              >
                {budgets.map(b => (
                  <option key={b.department} value={b.department}>{b.department}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-300">งบประมาณสูงสุดที่ตั้งไว้</span>
                <span className="text-primary-600 dark:text-primary-400 font-bold">฿{(tempLimit || 0).toLocaleString()}</span>
              </div>
              <input 
                type="range"
                min={100000}
                max={1000000}
                step={25000}
                value={tempLimit}
                onChange={(e) => setTempLimit(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>100k ฿</span>
                <span>1M ฿</span>
              </div>
            </div>

            {/* Quick Math Preview */}
            {(() => {
              const selectedObj = budgets.find(b => b.department === selectedDept);
              if (!selectedObj) return null;
              
              const currentSpent = selectedObj.spent;
              const nextRatio = Math.round((currentSpent / tempLimit) * 100);
              const isViolated = nextRatio >= 100;
              const isWarn = nextRatio >= 85 && nextRatio < 100;

              return (
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  isViolated ? 'bg-rose-50 border-rose-200 text-rose-800' :
                  isWarn ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <p className="font-bold">จำลองอัตรากำลังใช้จ่ายใหม่:</p>
                  <p className="text-[10px]">
                    หากปรับงบประมาณ อัตราใช้จริงจะเป็น <span className="font-bold">{nextRatio}%</span> ของงบใหม่
                  </p>
                  <p className="text-[9px] font-medium opacity-85">
                    {isViolated ? '⚠️ การปรับลดมากเกินไปจะทำให้รายการปัจจุบันที่ผ่านแล้วขึ้นสถานะเกินกฎงบ' :
                     isWarn ? '⚠️ ขีดจำกัดงบประมาณอยู่ในขอบเขตเฝ้าระวัง' : '✅ ปลอดภัย งบประมาณอยู่ในสถานะสอดคล้องนโยบาย'}
                  </p>
                </div>
              );
            })()}
          </div>

          <button 
            id="analytics-save-budget-btn"
            onClick={handleLimitSave}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/10"
          >
            อัปเดตและบันทึกข้อจำกัดงบประมาณ
          </button>
        </div>

      </div>

      {/* Spenders and Category spending breakdown details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approved Expenses by Category */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span>การจ่ายเงินตามหมวดหมู่ค่าใช้จ่าย</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">สัดส่วนค่าใช้จ่ายที่ได้รับการอนุมัติเสร็จสิ้นแบ่งตามประเภทหลัก</p>
          </div>

          <div className="space-y-3">
            {Object.values(CATEGORIES_CONFIG).map((cat) => {
              const spent = categoryTotals[cat.id] || 0;
              const limit = cat.limitPerRequest;
              return (
                <div key={cat.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] ${cat.color}`}>
                      {cat.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">฿{(spent || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">เกณฑ์งบประมาณต่อรายการ ฿{(limit || 0).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top claimers list */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span>พนักงานผู้เบิกจ่ายหลัก (Top Claimers)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">พนักงานที่มีมูลค่ายอดขอเบิกสะสมที่ได้รับการอนุมัติสูงที่สุด</p>
          </div>

          <div className="space-y-4">
            {topSpenders.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">ยังไม่พบข้อมูลผู้เบิกเงินที่ได้รับการอนุมัติสะสม</p>
            ) : (
              topSpenders.map((user, idx) => (
                <div key={user.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 dark:text-primary-400 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-950 dark:text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.dept}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-950 dark:text-white">฿{(user.amount || 0).toLocaleString()}</span>
                    <p className="text-[9px] text-emerald-600 font-semibold">ชำระจ่ายเรียบร้อย</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
