import React, { useState, useMemo } from 'react';
import { openPdfPreview } from '../lib/pdf-preview';
import { Search, Filter, Calendar, FileText, Image as ImageIcon, ZoomIn, Download, File, X, ChevronLeft, ChevronRight, RotateCw, ZoomOut, Printer, Grid, List } from 'lucide-react';
import { getDbRequests, getRealReceiptImages, addEnterpriseAuditLog, getSafePreviewUrl } from '../data/db';
import { ExpenseRequest } from '../types';

export default function DocumentGalleryView({ currentUser }: { currentUser: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<{url: string, name: string, ext: string} | null>(null);

  const allRequests = useMemo(() => getDbRequests(), []);

  // Collect all documents
  const allDocs = useMemo(() => {
    const docs: any[] = [];
    allRequests.forEach(req => {
      // Access: Show if approved OR if user is admin/approver/manager OR if owner
      const isOwner = req.created_by === currentUser?.user_id || req.employeeName === currentUser?.name;
      const isApproved = req.status === 'approved' || req.status === 'cleared' || req.status === 'paid';
      const isElevatedUser = currentUser?.approval_level === 'Administrator' || 
                            currentUser?.role === 'Administrator' || 
                            currentUser?.user_id === 'user-admin' || 
                            currentUser?.user_id === 'user-superadmin' || 
                            currentUser?.username === 'Okay9999';

      if (!isApproved && !isOwner && !isElevatedUser) {
        return;
      }

      // Collect from attachment_list if present
      if (req.attachment_list && req.attachment_list.length > 0) {
        req.attachment_list.forEach((att, idx) => {
          if (!att.dataUrl) return;
          let ext = 'file';
          const nameLower = (att.name || '').toLowerCase();
          const urlLower = (att.dataUrl || '').toLowerCase();

          if (nameLower.endsWith('.pdf') || urlLower.includes('pdf')) ext = 'pdf';
          else if (nameLower.endsWith('.doc') || nameLower.endsWith('.docx') || urlLower.includes('word') || urlLower.includes('msword')) ext = 'docx';
          else if (nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx') || nameLower.endsWith('.csv') || urlLower.includes('excel') || urlLower.includes('spreadsheet')) ext = 'xlsx';
          else if (nameLower.endsWith('.png') || urlLower.includes('png')) ext = 'png';
          else if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || urlLower.includes('jpg') || urlLower.includes('jpeg')) ext = 'jpg';
          else if (nameLower.endsWith('.zip') || nameLower.endsWith('.rar')) ext = 'zip';

          docs.push({
            id: `${req.id}-att-${idx}`,
            reqId: req.id,
            reqTitle: req.title,
            reqDate: req.date,
            reqStatus: req.status,
            reqDepartment: req.department,
            reqMerchant: (req as any).merchant || (req as any).replacement_merchant || req.title || 'ไม่ระบุร้านค้า',
            url: att.dataUrl,
            ext: ext,
            name: att.name || `REQ_${req.id}_Doc_${idx+1}.${ext}`,
            amount: req.amount
          });
        });
      }

      // Also collect from receiptImages
      const receiptImages = getRealReceiptImages(req);
      receiptImages.forEach((dataUrl: string, idx: number) => {
        if (!dataUrl) return;
        // Avoid duplicate if already collected from attachment_list
        if (req.attachment_list?.some(a => a.dataUrl === dataUrl)) return;

        let ext = 'jpg';
        const urlLower = dataUrl.toLowerCase();
        if (urlLower.includes('pdf') || urlLower.startsWith('data:application/pdf')) {
          ext = 'pdf';
        } else if (urlLower.includes('png') || urlLower.startsWith('data:image/png')) {
          ext = 'png';
        } else if (urlLower.includes('word') || urlLower.includes('msword')) {
          ext = 'docx';
        } else if (urlLower.includes('excel') || urlLower.includes('spreadsheet')) {
          ext = 'xlsx';
        }

        docs.push({
          id: `${req.id}-receipt-${idx}`,
          reqId: req.id,
          reqTitle: req.title,
          reqDate: req.date,
          reqStatus: req.status,
          reqDepartment: req.department,
          reqMerchant: (req as any).merchant || (req as any).replacement_merchant || 'ไม่ระบุร้านค้า',
          url: dataUrl,
          ext: ext,
          name: `REQ_${req.id}_Evidence_${idx+1}.${ext}`,
          amount: req.amount
        });
      });
    });
    return docs;
  }, [allRequests, currentUser]);

  const filteredDocs = useMemo(() => {
    return allDocs.filter(d => {
      const s = (searchTerm || '').toLowerCase();
      const matchSearch = String(d.reqId || '').toLowerCase().includes(s) || 
                          String(d.reqTitle || '').toLowerCase().includes(s) || 
                          String(d.reqMerchant || '').toLowerCase().includes(s) ||
                          String(d.name || '').toLowerCase().includes(s);
      const matchType = filterType === 'all' ? true :
                        filterType === 'image' ? (d.ext === 'jpg' || d.ext === 'png') :
                        filterType === 'pdf' ? (d.ext === 'pdf') :
                        filterType === 'office' ? (d.ext === 'docx' || d.ext === 'xlsx') :
                        d.ext === filterType;
      return matchSearch && matchType;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.reqDate).getTime() - new Date(a.reqDate).getTime();
      if (sortBy === 'date-asc') return new Date(a.reqDate).getTime() - new Date(b.reqDate).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      return 0;
    });
  }, [allDocs, searchTerm, filterType, sortBy]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">คลังเอกสารแนบ (Document Gallery)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">รวบรวมหลักฐานและใบเสร็จทั้งหมดในระบบ</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="ค้นหาเลขที่, หัวข้อ หรือร้านค้า..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">ทุกประเภทเอกสาร</option>
            <option value="image">รูปภาพ (JPG, PNG)</option>
            <option value="pdf">เอกสาร PDF</option>
            <option value="office">ไฟล์ Office (Word, Excel)</option>
          </select>

          <select 
            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date-desc">ใหม่ล่าสุด</option>
            <option value="date-asc">เก่าที่สุด</option>
            <option value="amount-desc">ยอดเงินสูงสุด</option>
          </select>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              className={`p-1.5 rounded-lg ${viewMode === 'gallery' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
              onClick={() => setViewMode('gallery')}
            ><Grid className="h-4 w-4" /></button>
            <button 
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
              onClick={() => setViewMode('list')}
            ><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'gallery' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                {doc.ext === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center text-rose-500 p-2 text-center">
                    <FileText className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-bold uppercase">PDF Document</span>
                  </div>
                ) : doc.ext === 'docx' ? (
                  <div className="flex flex-col items-center justify-center text-blue-500 p-2 text-center">
                    <FileText className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Word Document</span>
                  </div>
                ) : doc.ext === 'xlsx' ? (
                  <div className="flex flex-col items-center justify-center text-emerald-500 p-2 text-center">
                    <FileText className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Excel Sheet</span>
                  </div>
                ) : doc.ext === 'zip' ? (
                  <div className="flex flex-col items-center justify-center text-amber-500 p-2 text-center">
                    <File className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Archive</span>
                  </div>
                ) : (
                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                )}
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => { 
                    setViewerItem(doc); 
                    setViewerOpen(true); 
                    addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Preview', `Previewed document ${doc.name} for ${doc.reqId}`);
                  }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm">
                    <ZoomIn className="h-5 w-5" />
                  </button>
                  <a href={doc.url} download={doc.name} onClick={() => {
                    addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Download', `Downloaded document ${doc.name} for ${doc.reqId}`);
                  }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm">
                    <Download className="h-5 w-5" />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <p className="text-[10px] font-bold text-primary-600 truncate">{doc.reqId}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{doc.name || doc.reqMerchant || doc.reqTitle}</p>
                <p className="text-[10px] text-slate-400 mt-1">{doc.reqDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">เอกสาร</th>
                <th className="px-4 py-3">อ้างอิงคำขอ</th>
                <th className="px-4 py-3">ร้านค้า/รายการ</th>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3 text-right">ยอดเงิน</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {doc.ext === 'pdf' ? <FileText className="h-5 w-5 text-rose-400" /> :
                         doc.ext === 'docx' ? <FileText className="h-5 w-5 text-blue-500" /> :
                         doc.ext === 'xlsx' ? <FileText className="h-5 w-5 text-emerald-500" /> :
                         doc.ext === 'zip' ? <File className="h-5 w-5 text-amber-500" /> :
                         <img src={doc.url} alt="thumb" className="w-full h-full object-cover" />}
                      </div>
                      <div className="max-w-[120px] truncate">
                        <span className="text-xs font-semibold">{doc.name}</span>
                        <span className="block text-[10px] text-slate-400 uppercase">{doc.ext}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{doc.reqId}</td>
                  <td className="px-4 py-3 text-xs">{doc.reqMerchant || doc.reqTitle}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{doc.reqDate}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right">฿{doc.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { 
                        setViewerItem(doc); 
                        setViewerOpen(true); 
                        addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Preview', `Previewed document ${doc.name} for ${doc.reqId}`);
                      }} className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <a href={doc.url} download={doc.name} onClick={() => {
                        addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Download', `Downloaded document ${doc.name} for ${doc.reqId}`);
                      }} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Viewer Modal */}
      {viewerOpen && viewerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50"
            onClick={() => { setViewerOpen(false); setViewerItem(null); }}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center">
            {viewerItem.ext !== 'pdf' ? (
              <img 
                src={viewerItem.url} 
                alt="evidence preview" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-300"
                id="gallery-viewer-img"
              />
            ) : (
              <iframe 
                src={getSafePreviewUrl(viewerItem.url)} 
                className="w-full h-full border-0 rounded-xl bg-white"
                title="pdf preview"
              />
            )}
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/20 text-white z-50">
              <span className="text-xs font-bold mr-2">{viewerItem.reqId}</span>
              <div className="h-4 w-px bg-white/20"></div>
              
              <button 
                onClick={() => {
                  const img = document.getElementById('gallery-viewer-img');
                  if (img) {
                    const currentScale = parseFloat(img.style.transform.replace('scale(', '').replace(')', '') || '1');
                    img.style.transform = `scale(${currentScale + 0.25})`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                onClick={() => {
                  const img = document.getElementById('gallery-viewer-img');
                  if (img) {
                    const currentScale = parseFloat(img.style.transform.replace('scale(', '').replace(')', '') || '1');
                    img.style.transform = `scale(${Math.max(0.5, currentScale - 0.25)})`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button 
                onClick={() => {
                  const img = document.getElementById('gallery-viewer-img');
                  if (img) {
                    const currentRot = parseInt(img.dataset.rot || '0') + 90;
                    img.dataset.rot = currentRot.toString();
                    const currentScale = parseFloat(img.style.transform.replace(/.*scale\\(([^)]+)\\).*/, '$1') || '1');
                    img.style.transform = `scale(${currentScale}) rotate(${currentRot}deg)`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              
              <div className="h-4 w-px bg-white/20"></div>
              <a href={viewerItem.url} download={viewerItem.name} onClick={() => {
                addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Download', `Downloaded document ${viewerItem.name} for ${viewerItem.reqId}`);
              }} className="hover:text-emerald-400 transition-colors">
                <Download className="h-5 w-5" />
              </a>
              <button 
                onClick={() => {
                  addEnterpriseAuditLog(currentUser.user_id, currentUser.name, currentUser.approval_level || 'Staff', 'Print', `Printed document ${viewerItem.name} for ${viewerItem.reqId}`);
                  const w: any = {
      document: {
        write: (html: string) => { w._html = (w._html || '') + html; },
        close: () => { openPdfPreview(w._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
                  if (w) {
                    w.document.write(`
                      <html>
                        <body style="margin:0;display:flex;justify-content:center;background:#ccc;" onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                          ${viewerItem.ext !== 'pdf' 
                            ? `<img src="${viewerItem.url}" style="max-width:100%;max-height:100vh;object-fit:contain;" />` 
                            : `<iframe src="${viewerItem.url}" style="width:100vw;height:100vh;border:0;"></iframe>`}
                        </body>
                      </html>
                    `);
                    w.document.close();
                  }
                }}
                className="hover:text-amber-400 transition-colors"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
