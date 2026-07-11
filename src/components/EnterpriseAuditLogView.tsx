import React, { useState, useMemo } from 'react';
import { ShieldAlert, Search, Filter, Calendar, FileText, User, Monitor, Clock, ShieldCheck, Download } from 'lucide-react';
import { getDbEnterpriseAuditLogs } from '../data/db';

export default function EnterpriseAuditLogView({ currentUser }: { currentUser: any }) {
  const logs = useMemo(() => getDbEnterpriseAuditLogs(), []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const s = (searchTerm || '').toLowerCase();
      const matchSearch = String(log.user_name || '').toLowerCase().includes(s) || 
                          String(log.action_type || '').toLowerCase().includes(s) || 
                          String(log.ref_id || '').toLowerCase().includes(s) || 
                          String(log.details || '').toLowerCase().includes(s);
      
      const matchAction = filterAction === 'All' ? true : log.event === filterAction;
      
      return matchSearch && matchAction;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchTerm, filterAction]);

  if (currentUser?.approval_level !== 'Administrator' && currentUser?.approval_level !== 'Level 3') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <ShieldAlert className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h2>
        <p className="text-slate-500 max-w-md mt-2">หน้านี้สำหรับผู้ดูแลระบบหรือผู้บริหารระดับสูงเพื่อตรวจสอบบันทึกกิจกรรมในระบบเท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            ตรวจสอบบันทึกกิจกรรม (Enterprise Audit Log)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            บันทึกการใช้งานและเข้าถึงเอกสารทั้งหมดในระบบ (ISO 27001 Compliance)
          </p>
        </div>
        <button 
          onClick={() => {
             const headers = ['Log ID', 'Date', 'Time', 'User ID', 'Name', 'Role', 'Event', 'Ref ID', 'Details', 'IP Address', 'Browser'];
             const csvData = filteredLogs.map(l => [
               l.log_id, l.date, l.time, l.user_id, l.user_name, l.role, l.event, l.ref_id, `"${l.details.replace(/"/g, '""')}"`, l.ip_address, `"${l.browser}"`
             ].join(','));
             const csv = [headers.join(','), ...csvData].join('\n');
             const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = `Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
             link.click();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, รหัสพนักงาน, กิจกรรม, หรืออ้างอิง..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
        >
          <option value="All">ทุกกิจกรรม</option>
          <option value="Login">Login</option>
          <option value="Preview">Preview (ดูเอกสาร)</option>
          <option value="Print">Print (พิมพ์เอกสาร)</option>
          <option value="Download">Download (ดาวน์โหลดเอกสาร)</option>
          <option value="Approve">Approve (อนุมัติ)</option>
          <option value="Delete">Delete (ลบ)</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">วัน/เวลา</th>
                <th className="px-4 py-3">ผู้ดำเนินการ</th>
                <th className="px-4 py-3">กิจกรรม (Action)</th>
                <th className="px-4 py-3">รหัสอ้างอิง</th>
                <th className="px-4 py-3">รายละเอียด (Details)</th>
                <th className="px-4 py-3 text-right">อุปกรณ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs">{log.date}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {log.time}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{log.user_name}</span>
                        <span className="text-[10px] text-slate-400">{log.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                      ${log.event === 'Approve' ? 'bg-emerald-100 text-emerald-700' : 
                        log.event === 'Delete' || log.event === 'Reject' ? 'bg-rose-100 text-rose-700' :
                        log.event === 'Preview' || log.event === 'Download' || log.event === 'Print' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'}`}
                    >
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{log.ref_id}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 text-right">
                    <div className="flex items-center justify-end gap-1" title={`${log.browser} on ${log.os}`}>
                      <Monitor className="h-3.5 w-3.5" /> IP: {log.ip_address}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    ไม่พบข้อมูล Audit Log
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
