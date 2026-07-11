import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, FileText, Image as ImageIcon, ZoomIn, Download, File, X, ChevronLeft, ChevronRight, RotateCw, ZoomOut, Printer, Grid, List } from 'lucide-react';
import { getDbRequests, addEnterpriseAuditLog } from '../data/db';
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
      // Check role/access (simulate basic access)
      if (currentUser?.approval_level !== 'Administrator' && req.created_by !== currentUser?.user_id) {
        return; // skip if not admin and not owner
      }

      const attachments = [
        ...(req.receiptUrls || []),
        ...((req as any).attachment_list || []).map((a:any) => a.dataUrl)
      ];

      attachments.forEach((dataUrl: string, idx: number) => {
        if (!dataUrl || !dataUrl.startsWith('data:')) return;
        const parts = dataUrl.split(',');
        if (parts.length !== 2) return;
        
        let ext = 'unknown';
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) {
          const mime = mimeMatch[1];
          if (mime.includes('pdf')) ext = 'pdf';
          else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
          else if (mime.includes('png')) ext = 'png';
        }

        docs.push({
          id: `${req.id}-${idx}`,
          reqId: req.id,
          reqTitle: req.title,
          reqDate: req.date,
          reqMerchant: (req as any).merchant || 'ไม่ระบุร้านค้า',
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
                          String(d.reqMerchant || '').toLowerCase().includes(s);
      const matchType = filterType === 'all' ? true : d.ext === filterType || (filterType === 'image' && (d.ext === 'jpg' || d.ext === 'png'));
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
            <option value="all">ทุกประเภท</option>
            <option value="image">รูปภาพ (JPG, PNG)</option>
            <option value="pdf">เอกสาร PDF</option>
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
                  <FileText className="h-12 w-12 text-rose-400" />
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
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{doc.reqMerchant || doc.reqTitle}</p>
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
                        {doc.ext === 'pdf' ? <FileText className="h-5 w-5 text-rose-400" /> : <img src={doc.url} alt="thumb" className="w-full h-full object-cover" />}
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
                src={viewerItem.url} 
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
                  const w = window.open('', '_blank');
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
