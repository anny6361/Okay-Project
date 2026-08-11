import React, { useState, useEffect, useMemo } from 'react';
import { uploadToStorage } from '../lib/storage';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  Plus, 
  Trash2, 
  Eye, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Info,
  Loader2,
  FileCheck2,
  Save,
  Send,
  HelpCircle,
  Edit,
  FileSpreadsheet,
  FileText,
  RotateCw,
  ZoomIn,
  Download,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomOut
} from 'lucide-react';
import { ExpenseRequest, ExpenseCategory, UserProfile } from '../types';
import { MOCK_RECEIPTS, CATEGORIES_CONFIG } from '../data/masterData';
import { getDbDepartments, getDbCategories, saveDbCategories, getDbReplacementPolicy, getClearingStatusInfo, getRealWorkflowStepInfo, getSafePreviewUrl, getDbRequests, getDbCompanyData } from '../data/db';
import { getLetterheadHtml } from '../utils/letterheadHtml';


interface MyRequestsViewProps {
  requests: ExpenseRequest[];
  onCreateRequest: (req: Omit<ExpenseRequest, 'id' | 'status' | 'approvalHistory' | 'comments'> & { isDraft: boolean }) => void;
  onDeleteRequest: (id: string) => void;
  onUpdateRequest: (id: string, updatedFields: Partial<ExpenseRequest>) => void;
  onSelectRequest: (request: ExpenseRequest) => void;
  isCreateModalOpenDirectly: boolean;
  setIsCreateModalOpenDirectly: (isOpen: boolean) => void;
  currentUser: UserProfile;
  defaultAdvanceId?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function MyRequestsView({ 
  requests, 
  onCreateRequest, 
  onDeleteRequest, 
  onUpdateRequest,
  onSelectRequest,
  isCreateModalOpenDirectly,
  setIsCreateModalOpenDirectly,
  currentUser,
  defaultAdvanceId,
  onDirtyChange
}: MyRequestsViewProps) {
  
  // Filter claims by dynamic logged-in user_id
  const myRequests = useMemo(() => requests.filter(r => r.created_by === currentUser.user_id), [requests, currentUser.user_id]);
  
  const eligibleAdvances = useMemo(() => {
    return requests.filter(r => {
      if (r.expense_type !== 'advance') return false;
      if (r.created_by !== currentUser.user_id) return false;
      return (
        (r.status === 'approved' || r.status === 'Approved' || r.status === 'Paid' || r.status === 'cleared') &&
        (r.remaining_balance === undefined ? r.amount : r.remaining_balance) > 0 &&
        r.advance_status !== 'Fully Cleared'
      );
    });
  }, [requests, currentUser.user_id]);
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Refund Proof Upload States
  const [refundModalRequest, setRefundModalRequest] = useState<ExpenseRequest | null>(null);
  const [refundDate, setRefundDate] = useState('');
  const [refundFileUrl, setRefundFileUrl] = useState('');
  const [refundFileName, setRefundFileName] = useState('');
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ department_id: string; department_name: string }[]>([]);
  
  const [expenseType, setExpenseType] = useState<'advance' | 'reimbursement' | 'clearing'>('reimbursement');
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
  const [refundTransferredDate, setRefundTransferredDate] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('travel');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState(currentUser.department || '');
  const [description, setDescription] = useState('');

  // Replacement Receipt States
  const [supportingDocType, setSupportingDocType] = useState<'receipt' | 'replacement' | 'other'>('receipt');
  const [otherEvidenceType, setOtherEvidenceType] = useState('');
  const [otherEvidenceDetail, setOtherEvidenceDetail] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementReceiptNumber, setReplacementReceiptNumber] = useState('');
  const [replacementMerchant, setReplacementMerchant] = useState('');
  const [replacementLocation, setReplacementLocation] = useState('');
  const [replacementInvolved, setReplacementInvolved] = useState('');
  const [replacementPaymentMethod, setReplacementPaymentMethod] = useState('');
  const [replacementRemarks, setReplacementRemarks] = useState('');
  const [attachmentList, setAttachmentList] = useState<Array<{ name: string; dataUrl: string; type: string }>>([]);

  // Enterprise Form Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // VAT (ภาษีมูลค่าเพิ่ม) and Tax States
  const [hasVat, setHasVat] = useState<boolean>(false);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [taxId, setTaxId] = useState<string>('');

  // Auto-Save Draft
  useEffect(() => {
    if (isOpen && !editingId) {
      const draftData = {
        expenseType,
        selectedAdvanceId,
        title,
        amount,
        category,
        date,
        department,
        description,
        supportingDocType,
        replacementReason,
        replacementReceiptNumber,
        replacementMerchant,
        replacementLocation,
        replacementInvolved,
        replacementPaymentMethod,
        replacementRemarks,
        attachmentList,
        hasVat,
        vatAmount,
        taxId
      };
      localStorage.setItem(`okey_expense_request_draft_${currentUser.user_id}`, JSON.stringify(draftData));
    }
  }, [
    isOpen,
    editingId,
    expenseType,
    selectedAdvanceId,
    title,
    amount,
    category,
    date,
    department,
    description,
    supportingDocType,
    replacementReason,
    replacementReceiptNumber,
    replacementMerchant,
    replacementLocation,
    replacementInvolved,
    replacementPaymentMethod,
    replacementRemarks,
    attachmentList,
    hasVat,
    vatAmount,
    taxId,
    currentUser.user_id
  ]);

  // Restore Draft when dialog is opened
  useEffect(() => {
    if (isOpen && !editingId) {
      const saved = localStorage.getItem(`okey_expense_request_draft_${currentUser.user_id}`);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          const hasContent = draft.title || draft.amount > 0 || draft.description || draft.replacementMerchant || draft.hasVat;
          if (hasContent) {
            setExpenseType(draft.expenseType || 'reimbursement');
            setSelectedAdvanceId(draft.selectedAdvanceId || '');
            setTitle(draft.title || '');
            setAmount(draft.amount || 0);
            setCategory(draft.category || 'travel');
            setDate(draft.date || new Date().toISOString().split('T')[0]);
            setDepartment(draft.department || currentUser.department || '');
            setDescription(draft.description || '');
            setSupportingDocType(draft.supportingDocType || 'receipt');
            setReplacementReason(draft.replacementReason || '');
            setReplacementReceiptNumber(draft.replacementReceiptNumber || '');
            setReplacementMerchant(draft.replacementMerchant || '');
            setReplacementLocation(draft.replacementLocation || '');
            setReplacementInvolved(draft.replacementInvolved || '');
            setReplacementPaymentMethod(draft.replacementPaymentMethod || '');
            setReplacementRemarks(draft.replacementRemarks || '');
            setAttachmentList(draft.attachmentList || []);
            setHasVat(draft.hasVat || false);
            setVatAmount(draft.vatAmount || 0);
            setTaxId(draft.taxId || '');
          }
        } catch (e) {
          console.error('Error loading draft', e);
        }
      }
    }
  }, [isOpen, editingId, currentUser.user_id]);

  // Unsaved Changes Protection on Browser Tab Close/Refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isFormDirty = isOpen && (
        title.trim() !== '' ||
        amount > 0 ||
        description.trim() !== '' ||
        replacementMerchant.trim() !== '' ||
        replacementReason.trim() !== ''
      );
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = 'คุณมีงานที่ยังไม่เสร็จสิ้นในการกรอกข้อมูลเบิกเงิน ต้องการออกจากหน้าเว็บใช่หรือไม่?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, title, amount, description, replacementMerchant, replacementReason]);

  // Track and propagate Dirty State to parent Layout
  const isFormDirty = useMemo(() => {
    if (!isOpen) return false;
    // Check if we have modified anything
    return (
      title.trim() !== '' ||
      amount > 0 ||
      description.trim() !== '' ||
      replacementMerchant.trim() !== '' ||
      replacementReason.trim() !== '' ||
      attachmentList.length > 0
    );
  }, [isOpen, title, amount, description, replacementMerchant, replacementReason, attachmentList]);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  const generateReplacementNumber = () => {
    const d = new Date();
    const dateStr = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REP-${dateStr}-${rand}`;
  };

  const handleEvidenceUpload = (files: File[], category?: string) => {
    files.forEach(file => {
      uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then(async (dataUrl) => {
      
        
        setAttachmentList(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: dataUrl,
          category: (category as any) || 'เอกสารอื่น ๆ'
        }]);
      
    });
    });
  };

  const handleDeleteAttachment = (index: number) => {
    setAttachmentList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleReplaceAttachment = (index: number, file: File, category?: string) => {
    uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then(async (dataUrl) => {
      
      
      setAttachmentList(prev => prev.map((item, idx) => idx === index ? {
        name: file.name,
        type: file.type,
        dataUrl: dataUrl,
        category: (category as any) || item.category
      } : item));
    
    });
  };
  
  // Load categories and departments from local database
  useEffect(() => {
    setCategoriesList(getDbCategories());
    setDepartmentsList(getDbDepartments());
  }, []);

  // Sync department when currentUser changes
  useEffect(() => {
    setDepartment(currentUser.department);
  }, [currentUser]);
  
  // OCR & Receipt simulation states
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [receiptAttached, setReceiptAttached] = useState<string | null>(null);
  const [receiptAttachedList, setReceiptAttachedList] = useState<string[]>([]);

  // New File Upload and Searchable/Creatable Category states
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; dataUrl: string } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; type: string; size: number; dataUrl: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Sync category search string when category changes
  useEffect(() => {
    const matched = categoriesList.find(c => c.id === category);
    if (matched) {
      setCategorySearch(matched.name);
    } else if (category) {
      setCategorySearch(category);
    } else {
      setCategorySearch('');
    }
  }, [category, categoriesList]);

  // Scan single attached file with AI OCR
  const scanSingleFileWithAI = async (fileObj: { name: string; type: string; size: number; dataUrl: string }) => {
    setIsScanning(true);
    setOcrError(null);

    try {
      let base64Data = fileObj.dataUrl;
      
      // If dataUrl is a remote HTTP/HTTPS URL, fetch blob and convert to data URL
      if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
        try {
          const fetched = await fetch(base64Data);
          const blob = await fetched.blob();
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.warn('Could not pre-convert remote image, sending URL to server:', fetchErr);
        }
      }

      const commaIdx = base64Data.indexOf(',');
      if (commaIdx !== -1) {
        base64Data = base64Data.substring(commaIdx + 1);
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: fileObj.type || 'image/jpeg'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const ocr = result.data;
        setOcrConfidence(ocr.confidence || 95);
        setDuplicateWarning(null);

        // Duplicate Check
        if (ocr.invoiceId) {
          const allReqs = getDbRequests();
          const isDup = allReqs.some(r => r.id !== editingId && (r as any).receiptNumber === ocr.invoiceId);
          if (isDup) {
            setDuplicateWarning(`ตรวจพบใบเสร็จเลขที่ ${ocr.invoiceId} ถูกเบิกไปแล้วในระบบ!`);
          }
        }

        setTitle(ocr.merchant ? `เบิกจ่าย: ${ocr.merchant}` : '');
        setAmount(ocr.amount || 0);
        if (ocr.date) {
          setDate(ocr.date);
        }

        if (ocr.vat && ocr.vat > 0) {
          setHasVat(true);
          setVatAmount(ocr.vat);
        } else {
          setHasVat(false);
          setVatAmount(0);
        }
        if (ocr.taxId) {
          setTaxId(ocr.taxId);
        } else {
          setTaxId('');
        }

        let desc = `นำเข้าข้อมูลอัตโนมัติผ่าน AI OCR\nร้านค้า: ${ocr.merchant}\n`;
        if (ocr.invoiceId) {
          desc += `เลขใบเสร็จ: ${ocr.invoiceId}\n`;
        }
        if (ocr.vat) {
          desc += `ภาษีมูลค่าเพิ่ม (VAT): ฿${(ocr.vat || 0).toLocaleString()}\n`;
        }
        if (ocr.items && ocr.items.length > 0) {
          desc += `รายการสินค้า:\n`;
          ocr.items.forEach((item: any) => {
            const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            desc += `- ${item.name} (฿${itemPrice.toLocaleString()})\n`;
          });
        }
        setDescription(desc);

        // Suggest category
        const mLower = ocr.merchant ? ocr.merchant.toLowerCase() : '';
        if (mLower.includes('grab') || mLower.includes('taxi') || mLower.includes('bts') || mLower.includes('mrt') || mLower.includes('ค่าเดินทาง')) {
          setCategory('travel');
        } else if (mLower.includes('starbucks') || mLower.includes('อาหาร') || mLower.includes('mk') || mLower.includes('สตาบัคส์') || mLower.includes('food')) {
          setCategory('meals');
        } else if (mLower.includes('aws') || mLower.includes('cloud') || mLower.includes('adobe') || mLower.includes('software')) {
          setCategory('software');
        } else if (mLower.includes('it') || mLower.includes('jib') || mLower.includes('office') || mLower.includes('อุปกรณ์')) {
          setCategory('equipment');
        }
      } else {
        throw new Error(result.error || "ไม่สามารถอ่านข้อมูลใบเสร็จได้");
      }
    } catch (err: any) {
      console.error('OCR sub-file failure:', err);
      setOcrError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsScanning(false);
    }
  };

  // Real File OCR processing function using Gemini backend proxy
  const processFileForOCR = async (fileInput: File | FileList) => {
    const isFileList = fileInput instanceof FileList;
    const files: File[] = isFileList ? Array.from(fileInput) : [fileInput];

    if (files.length === 0) return;

    setOcrError(null);

    const newUploadedFiles = [...uploadedFiles];
    const newReceiptUrls = [...receiptAttachedList];
    let firstAddedFileObj: { name: string; type: string; size: number; dataUrl: string } | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      await new Promise<void>((resolve) => {
        uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
          const fileObj = {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: dataUrl
          };

          newUploadedFiles.push(fileObj);
          newReceiptUrls.push(dataUrl);

          // Check if this file can be scanned by OCR (image or PDF)
          const fileTypeLower = (file.type || '').toLowerCase();
          const fileNameLower = (file.name || '').toLowerCase();
          if (!firstAddedFileObj && (fileTypeLower.startsWith('image/') || fileTypeLower === 'application/pdf' || fileNameLower.endsWith('.pdf'))) {
            firstAddedFileObj = fileObj;
          }
          resolve();
        }).catch(err => {
          console.error("Upload failed in processFileForOCR", err);
          resolve(); // Resolve to prevent hanging
        });
      });
    }

    setUploadedFiles(newUploadedFiles);
    setReceiptAttachedList(newReceiptUrls);
    setReceiptAttached(newUploadedFiles[0]?.name || null);
    setUploadedFile(newUploadedFiles[0] || null);

    // Run AI OCR if an image or PDF was attached
    if (firstAddedFileObj) {
      await scanSingleFileWithAI(firstAddedFileObj);
    }
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
    setUploadedFiles([]);
    setOcrError(null);
    setReceiptAttached(null);
    setReceiptAttachedList([]);
  };
 
  // Helper to resolve config dynamically
  const getCategoryConfig = (catId: string) => {
    const defaults: Record<string, { name: string; limitPerRequest: number; requiresReceipt: boolean; color: string }> = {
      travel: { name: 'ค่าเดินทางและที่พัก (Travel)', limitPerRequest: 15000, requiresReceipt: true, color: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300' },
      fuel: { name: 'ค่าน้ำมัน (Fuel)', limitPerRequest: 5000, requiresReceipt: true, color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
      meals: { name: 'ค่ารับรองและอาหาร (Meals)', limitPerRequest: 3000, requiresReceipt: true, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      equipment: { name: 'อุปกรณ์สำนักงาน/เครื่องมือ (Equipment)', limitPerRequest: 50000, requiresReceipt: true, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      accommodation: { name: 'ค่าที่พัก (Accommodation)', limitPerRequest: 10000, requiresReceipt: true, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
      software: { name: 'ค่าซอฟต์แวร์และคลาวด์ (Software)', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      training: { name: 'ค่าฝึกอบรมและสัมมนา (Training)', limitPerRequest: 25000, requiresReceipt: true, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
      marketing: { name: 'ค่าโฆษณาและการตลาด (Marketing)', limitPerRequest: 100000, requiresReceipt: true, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
      other: { name: 'อื่นๆ (Other)', limitPerRequest: 5000, requiresReceipt: false, color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' }
    };

    if (defaults[catId]) return defaults[catId];
    const matched = categoriesList.find(c => c.id === catId);
    return {
      name: matched ? matched.name : catId,
      limitPerRequest: 10000,
      requiresReceipt: true,
      color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    };
  };

  // Live Policy Auditing states
  const [policyNotes, setPolicyNotes] = useState<string[]>([]);
  const [policyStatus, setPolicyStatus] = useState<'compliant' | 'warning' | 'violation'>('compliant');

  // Open modal if triggered from dashboard
  useEffect(() => {
    if (isCreateModalOpenDirectly) {
      setIsOpen(true);
      setIsCreateModalOpenDirectly(false);
      if (defaultAdvanceId) {
        setExpenseType('clearing');
        setSelectedAdvanceId(defaultAdvanceId);
        const adv = requests.find(r => r.id === defaultAdvanceId);
        if (adv) {
          setTitle(`เคลียร์เงินทดรองจ่ายสำหรับ: ${adv.title}`);
          setCategory(adv.category);
          setAmount(adv.amount); // Prefill amount with advance amount
        }
      }
    }
  }, [isCreateModalOpenDirectly, setIsCreateModalOpenDirectly, defaultAdvanceId, requests]);

  // Live Policy Auditing effect
  useEffect(() => {
    const notes: string[] = [];
    let status: 'compliant' | 'warning' | 'violation' = 'compliant';

    const config = getCategoryConfig(category);

    if (supportingDocType === 'replacement') {
      const rPolicy = getDbReplacementPolicy();
      
      // Amount limit check
      if (amount > (rPolicy?.maxAmount || 0)) {
        notes.push(`[นโยบายใบแทน] วงเงินเบิกจ่าย (฿${(amount || 0).toLocaleString()}) เกินกำหนดสูงสุด (สูงสุดไม่เกิน ฿${(rPolicy?.maxAmount || 0).toLocaleString()})`);
        status = 'violation';
      }

      // Monthly usage frequency limit check
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const userReplacementsInMonth = myRequests.filter(r => {
        if (!r.created_at) return false;
        const rDate = new Date(r.created_at);
        return r.supporting_document_type === 'replacement' && 
               rDate.getMonth() === currentMonth && 
               rDate.getFullYear() === currentYear &&
               r.id !== editingId;
      });
      if (userReplacementsInMonth.length >= rPolicy.maxTimesPerMonth) {
        notes.push(`[นโยบายใบแทน] คุณยื่นใบแทนใบเสร็จเกินจำนวนครั้งสูงสุดประจำเดือนแล้ว (ใช้ไป ${userReplacementsInMonth.length} ครั้ง, จำกัดไม่เกิน ${rPolicy.maxTimesPerMonth} ครั้ง)`);
        status = 'violation';
      }

      // Allowed / Forbidden Category checks
      if (rPolicy.forbiddenCategories && rPolicy.forbiddenCategories.includes(category)) {
        notes.push(`[นโยบายใบแทน] หมวดหมู่ ${config?.name || category} เป็นหมวดหมู่ความเสี่ยงสูงและ "ไม่อนุญาต" ให้ใช้ใบแทนใบเสร็จ`);
        status = 'violation';
      } else if (rPolicy.allowedCategories && !rPolicy.allowedCategories.includes(category)) {
        notes.push(`[นโยบายใบแทน] หมวดหมู่ ${config?.name || category} ไม่ได้ระบุเป็น "อนุญาต" ในระเบียบบริษัท`);
        if (status === 'compliant') status = 'warning';
      }

      // Mandatory fields check
      if (!replacementReason.trim()) {
        notes.push('[นโยบายใบแทน] ต้องระบุ "เหตุผลความจำเป็นที่ไม่มีใบเสร็จ"');
        status = 'violation';
      }
      if (!replacementMerchant.trim()) {
        notes.push('[นโยบายใบแทน] ต้องระบุ "ชื่อร้านค้า/ผู้รับเงิน"');
        status = 'violation';
      }
      if (!replacementLocation.trim()) {
        notes.push('[นโยบายใบแทน] ต้องระบุ "สถานที่/พิกัด"');
        status = 'violation';
      }
      if (attachmentList.length === 0) {
        notes.push('[นโยบายใบแทน] ควรแนบหลักฐานประกอบอื่นเพิ่มเติมอย่างน้อย 1 รายการ (เช่น ภาพถ่ายสินค้า สลิป แชต)');
        if (status !== 'violation') status = 'warning';
      }
    } else {
      if (config) {
        // Limit check
        if (amount > (config?.limitPerRequest || 0)) {
          notes.push(`เกินงบประมาณต่อรายการสำหรับ ${config?.name || ''} (เกณฑ์สูงสุดไม่เกิน ฿${(config?.limitPerRequest || 0).toLocaleString()})`);
          status = 'violation';
        } else if (category === 'meals' && amount > 2500) {
          notes.push('ค่ารับรองอาหารที่สูงกว่าปกติ (มากกว่า 2,500 บาท) ควรระบุรายชื่อลูกค้าในคำอธิบาย');
          status = 'warning';
        }

        // Receipt requirement check
        if (config.requiresReceipt && receiptAttachedList.length === 0) {
          notes.push(`นโยบายบริษัทกำหนดให้แนบหลักฐานใบเสร็จสำหรับ ${config.name}`);
          if (status !== 'violation') {
            status = 'warning';
          }
        }
      }
    }

    // Weekend date warning
    if (date) {
      const day = new Date(date).getDay();
      if (day === 0 || day === 6) {
        notes.push('ทำรายการในวันหยุดราชการ (เสาร์-อาทิตย์) กรุณาชี้แจงความจำเป็นทางการค้า');
        if (status === 'compliant') status = 'warning';
      }
    }

    if (notes.length === 0) {
      notes.push('ข้อมูลสอดคล้องกับระเบียบการเบิกจ่ายของบริษัท');
    }

    setPolicyNotes(notes);
    setPolicyStatus(status);
  }, [amount, category, date, receiptAttachedList, supportingDocType, replacementReason, replacementMerchant, replacementLocation, attachmentList, myRequests, editingId]);

  // Handle OCR selection simulation
  const handleReceiptSelection = (receiptId: string) => {
    if (!receiptId) return;
    
    setSelectedReceiptId(receiptId);
    setIsScanning(true);

    setTimeout(() => {
      const receipt = MOCK_RECEIPTS.find(r => r.id === receiptId);
      if (receipt) {
        setTitle(`เบิกจ่ายอัตโนมัติ: ${receipt.merchant}`);
        setAmount(receipt.amount);
        setDate(receipt.date);
        setDescription(`นำเข้าข้อมูลอัตโนมัติผ่าน AI OCR\nร้านค้า: ${receipt.merchant}\nเลขอัตลักษณ์ผู้เสียภาษี: ${receipt.taxId || 'ไม่ระบุ'}\nรายการย่อย:\n${receipt.items.map(i => `- ${i.name} (฿${i.price})`).join('\n')}`);
        setReceiptAttached(receipt.merchant + '_Receipt.pdf');
        setReceiptAttachedList([receipt.merchant + '_Receipt.pdf']);
        
        // Auto match category based on merchant or keywords
        if (receipt.merchant.includes('Grab')) {
          setCategory('travel');
        } else if (receipt.merchant.includes('สตาบัคส์')) {
          setCategory('meals');
        } else if (receipt.merchant.includes('แอดวานซ์')) {
          setCategory('software');
        }
      }
      setIsScanning(false);
    }, 1800);
  };

  const startEditing = (req: ExpenseRequest) => {
    setEditingId(req.id);
    setExpenseType(req.expense_type || 'reimbursement');
    setSelectedAdvanceId(req.advance_id || '');
    setRefundTransferredDate(req.refund_transferred_date || '');
    setTitle(req.title || '');
    setAmount(req.amount || 0);
    setCategory(req.category || 'travel');
    setDate(req.date || '');
    setDepartment(req.department || currentUser.department || '');
    setDescription(req.description || '');
    setReceiptAttached(req.receiptName || null);
    if (req.receiptUrls) {
      setReceiptAttachedList(req.receiptUrls);
      setUploadedFiles(req.receiptUrls.map((url, i) => ({
        name: req.receiptNames?.[i] || `หลักฐานแนบ_${i + 1}`,
        type: (url || '').startsWith('data:application/pdf') || (url || '').toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
        size: 102400,
        dataUrl: url
      })));
    } else if (req.receiptName) {
      setReceiptAttachedList([req.receiptName]);
      const isPdf = String(req.receiptName || '').toLowerCase().endsWith('.pdf') || String(req.receiptName || '').startsWith('data:application/pdf');
      setUploadedFiles([{
        name: req.receiptName,
        type: isPdf ? 'application/pdf' : 'image/jpeg',
        size: 102400,
        dataUrl: req.receiptName
      }]);
    } else {
      setReceiptAttachedList([]);
      setUploadedFiles([]);
    }

    // Replacement receipt properties
    setSupportingDocType(req.supporting_document_type || 'receipt');
    setOtherEvidenceType(req.other_evidence_type || '');
    setOtherEvidenceDetail(req.other_evidence_detail || '');
    setReplacementReason(req.replacement_reason || '');
    setReplacementReceiptNumber(req.replacement_receipt_number || '');
    setReplacementMerchant(req.replacement_merchant || '');
    setReplacementLocation(req.replacement_location || '');
    setReplacementInvolved(req.replacement_involved || '');
    setReplacementPaymentMethod(req.replacement_payment_method || '');
    setReplacementRemarks(req.replacement_remarks || '');
    setAttachmentList(req.attachment_list || []);

    // Load VAT / Tax properties
    setHasVat(!!req.has_vat);
    setVatAmount(req.vat_amount || 0);
    setTaxId(req.tax_id || '');

    setIsOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setExpenseType('reimbursement');
    setSelectedAdvanceId('');
    setRefundTransferredDate('');
    setTitle('');
    setAmount(0);
    setCategory('travel');
    setDate(new Date().toISOString().split('T')[0]);
    setDepartment(currentUser.department || '');
    setDescription('');
    setSelectedReceiptId('');
    setUploadedFile(null);
    setUploadedFiles([]);
    setReceiptAttached(null);
    setReceiptAttachedList([]);

    // Reset replacement states
    setSupportingDocType('receipt');
    setOtherEvidenceType('');
    setOtherEvidenceDetail('');
    setReplacementReason('');
    setReplacementReceiptNumber('');
    setReplacementMerchant('');
    setReplacementLocation('');
    setReplacementInvolved('');
    setReplacementPaymentMethod('');
    setReplacementRemarks('');
    setAttachmentList([]);
    
    // Reset VAT/Tax states
    setHasVat(false);
    setVatAmount(0);
    setTaxId('');
    
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = 'กรุณาระบุหัวข้อขออนุมัติค่าใช้จ่าย';
    }
    if (amount <= 0) {
      errors.amount = 'จำนวนเงินต้องมากกว่า 0 บาท';
    }
    if (!categorySearch.trim()) {
      errors.category = 'กรุณาเลือกหรือค้นหาหมวดหมู่ค่าใช้จ่าย';
    }
    if (!date) {
      errors.date = 'กรุณาระบุวันที่ทำรายการ';
    }
    if (!department) {
      errors.department = 'กรุณาเลือกแผนกที่รับภาระ';
    }
    
    if (expenseType === 'clearing' && !selectedAdvanceId) {
      errors.selectedAdvanceId = 'กรุณาเลือกใบเบิกล่วงหน้าที่ต้องการเคลียร์';
    }

    if (expenseType === 'clearing' && selectedAdvanceId) {
      const match = requests.find(r => r.id === selectedAdvanceId);
      const advAmount = match ? match.amount : 0;
      if (amount < advAmount) {
        const hasAttachment = !!uploadedFile || receiptAttachedList.length > 0 || attachmentList.length > 0 || !!selectedReceiptId;
        if (!hasAttachment) {
          errors.uploadedFile = 'เนื่องจากยอดใช้จ่ายจริงน้อยกว่าวงเงินยืมทดรอง คุณต้องแนบสลิปหลักฐานการโอนเงินคืนเข้าบัญชีบริษัทก่อนส่งคำขอเคลียร์';
        }
        if (!refundTransferredDate) {
          errors.refundTransferredDate = 'กรุณาระบุวันที่โอนเงินคืนบริษัท';
        }
      }
    }
    
    if (supportingDocType === 'replacement') {
      if (!replacementMerchant.trim()) {
        errors.replacementMerchant = 'กรุณากรอกชื่อร้านค้าหรือผู้รับเงิน';
      }
      if (!replacementLocation.trim()) {
        errors.replacementLocation = 'กรุณากรอกสถานที่หรือพิกัด';
      }
      if (!replacementPaymentMethod) {
        errors.replacementPaymentMethod = 'กรุณาเลือกวิธีการชำระเงิน';
      }
      if (!replacementReason.trim()) {
        errors.replacementReason = 'กรุณากรอกเหตุผลความจำเป็นที่ไม่มีใบเสร็จ';
      }
    }

    // Conditional VAT and Tax validation
    if (hasVat) {
      if (vatAmount <= 0) {
        errors.vatAmount = 'กรุณาระบุจำนวนภาษีมูลค่าเพิ่ม (VAT Amount) ที่ถูกต้อง';
      }
      if (vatAmount >= amount) {
        errors.vatAmount = 'จำนวนภาษีมูลค่าเพิ่มต้องน้อยกว่ายอดเงินรวม';
      }
      if (!taxId.trim()) {
        errors.taxId = 'กรุณาระบุเลขประจำตัวผู้เสียภาษีร้านค้า';
      } else if (taxId.trim().length !== 13) {
        errors.taxId = 'เลขผู้เสียภาษีร้านค้าต้องมีความยาว 13 หลัก';
      }
    }
    
    setFormErrors(errors);
    
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const keyToId: Record<string, string> = {
        title: 'form-title',
        amount: 'form-amount',
        category: 'form-category-search',
        date: 'form-date',
        department: 'form-department',
        selectedAdvanceId: 'form-selected-advance-id',
        refundTransferredDate: 'form-refund-transferred-date',
        uploadedFile: 'receipt-file-input',
        replacementMerchant: 'form-replacement-merchant',
        replacementLocation: 'form-replacement-location',
        replacementPaymentMethod: 'form-replacement-payment-method',
        replacementReason: 'form-replacement-reason',
        vatAmount: 'form-vat-amount',
        taxId: 'form-tax-id'
      };
      
      const firstInvalidId = keyToId[errorKeys[0]];
      if (firstInvalidId) {
        const element = document.getElementById(firstInvalidId);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }
    
    return true;
  };

  const handleSubmit = (isDraft: boolean) => {
    // If it is a draft, we don't strictly require everything, but for a real submission, we require validation
    // Let's do enterprise validation for non-drafts. For drafts, we can save whatever they have as long as they have a title.
    if (isDraft) {
      if (!title.trim()) {
        setFormErrors({ title: 'กรุณากรอกหัวข้อเบื้องต้นสำหรับบันทึกแบบร่าง' });
        const element = document.getElementById('form-title');
        if (element) element.focus();
        return;
      }
    } else {
      if (!validateForm()) {
        return;
      }
    }

    let advanceAmt = 0;
    if (expenseType === 'clearing') {
      const match = requests.find(r => r.id === selectedAdvanceId);
      advanceAmt = match ? match.amount : 0;
    }

    const compiledAttachments = supportingDocType === 'replacement'
      ? attachmentList
      : [
          ...attachmentList,
          ...uploadedFiles.map(f => ({
            name: f.name,
            dataUrl: f.dataUrl,
            type: f.type || 'application/octet-stream',
            category: (otherEvidenceType || 'ใบเสร็จรับเงิน') as any
          }))
        ];

    const docFields = {
      title,
      amount,
      category,
      date,
      department,
      employeeName: currentUser.name,
      employeeRole: currentUser.approval_level || 'General Employee',
      description,
      receiptName: supportingDocType === 'replacement' ? undefined : (uploadedFiles[0] ? uploadedFiles[0].name : (uploadedFile ? uploadedFile.name : undefined)),
      receiptUrls: supportingDocType === 'replacement' ? attachmentList.map(a => a.dataUrl) : (uploadedFiles.length > 0 ? uploadedFiles.map(f => f.dataUrl) : receiptAttachedList),
      receiptNames: supportingDocType === 'replacement' ? attachmentList.map(a => a.name) : (uploadedFiles.length > 0 ? uploadedFiles.map(f => f.name) : (uploadedFile ? [uploadedFile.name] : [])),
      policyStatus,
      policyNotes,
      status: isDraft ? ('draft' as const) : ('pending' as const),
      expense_type: expenseType,
      advance_id: expenseType === 'clearing' ? selectedAdvanceId : undefined,
      cleared_amount: expenseType === 'clearing' ? amount : undefined,
      settlement_type: expenseType === 'clearing' ? (amount < advanceAmt ? ('refund' as const) : amount > advanceAmt ? ('reimbursement' as const) : ('perfect' as const)) : undefined,
      settlement_amount: expenseType === 'clearing' ? Math.abs(amount - advanceAmt) : undefined,
      advance_paid_date: expenseType === 'clearing' ? (requests.find(r => r.id === selectedAdvanceId)?.date || requests.find(r => r.id === selectedAdvanceId)?.created_at?.split('T')[0]) : undefined,
      clearing_submitted_date: expenseType === 'clearing' ? new Date().toISOString().split('T')[0] : undefined,
      refund_transferred_date: (expenseType === 'clearing' && amount < advanceAmt) ? refundTransferredDate : undefined,

      // Replacement Receipt extensions
      supporting_document_type: supportingDocType,
      other_evidence_type: supportingDocType === 'other' ? otherEvidenceType : undefined,
      other_evidence_detail: supportingDocType === 'other' ? otherEvidenceDetail : undefined,
      replacement_reason: supportingDocType === 'replacement' ? replacementReason : undefined,
      replacement_receipt_number: supportingDocType === 'replacement' ? (replacementReceiptNumber || generateReplacementNumber()) : undefined,
      replacement_merchant: supportingDocType === 'replacement' ? replacementMerchant : undefined,
      replacement_location: supportingDocType === 'replacement' ? replacementLocation : undefined,
      replacement_involved: supportingDocType === 'replacement' ? replacementInvolved : undefined,
      replacement_payment_method: supportingDocType === 'replacement' ? replacementPaymentMethod : undefined,
      replacement_remarks: supportingDocType === 'replacement' ? replacementRemarks : undefined,
      attachment_list: compiledAttachments,

      // VAT/Tax details
      has_vat: hasVat,
      vat_amount: hasVat ? vatAmount : undefined,
      tax_id: hasVat ? taxId : undefined
    };

    if (editingId) {
      onUpdateRequest(editingId, docFields);
    } else {
      onCreateRequest({
        ...docFields,
        isDraft
      });
    }

    // Clear Draft from localStorage on successful save
    localStorage.removeItem(`okey_expense_request_draft_${currentUser.user_id}`);

    resetForm();
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">รายการเบิกเงินของฉัน</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">จัดการคำขอเบิกเงินส่วนตัว บันทึกแบบร่าง และตรวจสอบสถานะแบบเรียลไทม์</p>
        </div>
        <button 
          id="my-req-add-btn"
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 text-black stroke-[3]" />
          <span>เบิกค่าใช้จ่ายใหม่</span>
        </button>
      </div>

      {/* Grid containing Lists of My Claims */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 dark:text-white">ประวัติคำขอและแบบร่างทั้งหมด</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                try {
                  const headers = ['ID', 'Date', 'Title', 'Amount', 'Status'];
                  const csvData = myRequests.map(r => [
                    r.id, 
                    r.date, 
                    `"${r.title.replace(/"/g, '""')}"`, 
                    r.amount, 
                    r.status
                  ].join(','));
                  const csv = [headers.join(','), ...csvData].join('\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Export_${currentUser.name}_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                } catch (err) {
                  console.error('CSV Export Error:', err);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => {
                const companyData = getDbCompanyData();
                const w: any = {
      document: {
        write: (html: string) => { w._html = (w._html || '') + html; },
        close: () => { openPdfPreview(w._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
                if (w) {
                  const logoHtml = companyData.logoUrl 
                    ? `<img src="${companyData.logoUrl}" style="height: 50px; max-width: 150px; object-fit: contain;" />` 
                    : '';
                  
                  const rowsHtml = myRequests.map(r => {
                    // Build timeline html
                    const timelineHtml = r.approvalHistory && r.approvalHistory.length > 0
                      ? r.approvalHistory.map(step => `
                          <div style="font-size: 10px; margin-top: 4px; padding-left: 8px; border-left: 2px solid #3b82f6; margin-bottom: 4px;">
                            <strong style="color: #1e293b;">${step.approverName}</strong> <span style="color: #64748b;">(${step.approverRole})</span><br/>
                            <span style="color: ${step.status === 'approved' ? '#10b981' : step.status === 'rejected' ? '#ef4444' : '#f59e0b'}; font-weight: bold; font-size: 9px;">
                              ${step.status === 'approved' ? '✓ อนุมัติแล้ว' : step.status === 'rejected' ? '✗ ปฏิเสธแล้ว' : '⏳ รอพิจารณา'}
                            </span> 
                            <span style="color: #94a3b8; font-size: 9px;">(${step.date})</span>
                            ${step.comment ? `<p style="margin: 2px 0 0 0; font-style: italic; color: #475569; font-size: 9px;">บันทึก: ${step.comment}</p>` : ''}
                          </div>
                        `).join('')
                      : '<span style="color: #94a3b8; font-size: 10px; font-style: italic;">ไม่มีข้อมูลประวัติ / อยู่ในขั้นตอนเสนอแบบร่าง</span>';

                    return `
                      <tr style="page-break-inside: avoid; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px; font-family: monospace; font-weight: bold; font-size: 11px; color: #0f172a; vertical-align: top;">
                          ${r.id}
                        </td>
                        <td style="padding: 12px 8px; font-size: 11px; color: #1e293b; vertical-align: top;">
                          <strong style="font-size: 12px; color: #0f172a;">${r.title}</strong>
                          <p style="margin: 4px 0 0 0; color: #475569; font-size: 10px; line-height: 1.4;">${r.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
                          <div style="margin-top: 6px; font-size: 9px; color: #64748b; font-weight: 500;">หมวดหมู่: ${CATEGORIES_CONFIG[r.category]?.name || r.category}</div>
                        </td>
                        <td style="padding: 12px 8px; font-size: 11px; text-align: center; color: #334155; vertical-align: top;">
                          ${r.date}
                        </td>
                        <td style="padding: 12px 8px; font-size: 11px; font-weight: bold; text-align: right; color: #0f172a; vertical-align: top;">
                          ฿${(r.amount || 0).toLocaleString()}
                        </td>
                        <td style="padding: 12px 8px; font-size: 11px; text-align: center; vertical-align: top;">
                          <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; background-color: #f8fafc; color: #334155;">
                            ${getClearingStatusInfo(r).label}
                          </span>
                        </td>
                        <td style="padding: 12px 8px; font-size: 11px; vertical-align: top;">
                          ${timelineHtml}
                        </td>
                      </tr>
                    `;
                  }).join('');

                  const totalSum = myRequests.reduce((sum, r) => sum + r.amount, 0);

                  w.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <title>Audit Report - ${currentUser.name}</title>
                      <style>
                        body {
                          font-family: system-ui, -apple-system, sans-serif;
                          color: #1e293b;
                          margin: 0;
                          padding: 25px;
                          background-color: #fff;
                          line-height: 1.5;
                        }
                        @media print {
                          @page { size: A4; margin: 15mm; }
                          body { padding: 0; }
                        }
                        .header {
                          display: flex;
                          justify-content: space-between;
                          align-items: flex-start;
                          border-bottom: 2px solid #0f172a;
                          padding-bottom: 15px;
                          margin-bottom: 25px;
                        }
                        .header-left h1 {
                          margin: 0;
                          font-size: 20px;
                          color: #0f172a;
                          font-weight: 800;
                        }
                        .header-left p {
                          margin: 4px 0 0 0;
                          font-size: 11px;
                          color: #475569;
                        }
                        .report-title {
                          text-align: center;
                          margin-bottom: 25px;
                        }
                        .report-title h2 {
                          margin: 0;
                          font-size: 16px;
                          color: #0f172a;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                          font-weight: 700;
                        }
                        .report-title p {
                          margin: 6px 0 0 0;
                          font-size: 11px;
                          color: #64748b;
                        }
                        .meta-box {
                          border: 1px solid #e2e8f0;
                          border-radius: 12px;
                          padding: 16px;
                          margin-bottom: 25px;
                          font-size: 11px;
                          background-color: #f8fafc;
                          display: grid;
                          grid-template-columns: 1fr 1fr;
                          gap: 16px;
                        }
                        table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-bottom: 30px;
                        }
                        th {
                          background-color: #f1f5f9;
                          font-size: 11px;
                          font-weight: bold;
                          text-transform: uppercase;
                          border-bottom: 2px solid #cbd5e1;
                          border-top: 1px solid #e2e8f0;
                          border-left: 1px solid #e2e8f0;
                          border-right: 1px solid #e2e8f0;
                          padding: 10px 8px;
                          color: #475569;
                          text-align: left;
                        }
                        .watermark {
                          margin-top: 40px;
                          border-top: 1px solid #e2e8f0;
                          padding-top: 12px;
                          font-size: 9px;
                          color: #94a3b8;
                          display: flex;
                          justify-content: space-between;
                        }
                      </style>
                    </head>
                    <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                      ${getLetterheadHtml(companyData, '#1e3a8a')}

                      <div class="report-title">
                        <h2>รายงานตรวจสอบข้อมูลคำขอเบิกเงินและประวัติตรวจสอบ (Audit & Claims History Report)</h2>
                        <p>ข้อมูลรายงานแสดงประวัติการทำธุรกรรม แบบร่าง และสิทธิการอนุมัติรายบุคคล</p>
                      </div>

                      <div class="meta-box">
                        <div>
                          <strong style="color: #0f172a; font-size: 12px;">ข้อมูลผู้จัดทำและร้องขอเบิก:</strong><br/>
                          <span style="display:inline-block; margin-top:4px;">
                            <strong>ชื่อ-นามสกุล:</strong> ${currentUser.name}<br/>
                            <strong>แผนก/สังกัด:</strong> ${currentUser.department || 'บัญชีและการเงิน'}<br/>
                            <strong>ตำแหน่ง:</strong> ${currentUser.position || 'เจ้าหน้าที่'}<br/>
                            <strong>ระดับสิทธิ์การอนุมัติ:</strong> ${currentUser.approval_level || 'Level 1'}
                          </span>
                        </div>
                        <div style="text-align: right;">
                          <strong style="color: #0f172a; font-size: 12px;">ข้อมูลสรุปธุรกรรมในระบบ:</strong><br/>
                          <span style="display:inline-block; margin-top:4px;">
                            <strong>วันที่พิมพ์รายงาน:</strong> ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}<br/>
                            <strong>จำนวนรายการตรวจสอบ:</strong> ${myRequests.length} รายการคำขอ<br/>
                            <strong>ยอดเงินรวมที่ขอเบิก:</strong> <span style="font-size:13px; font-weight:bold; color:#0f172a;">฿${totalSum.toLocaleString()}</span><br/>
                            <strong>สถานะของความถูกต้อง:</strong> ผ่านการประมวลผล Timeline เรียบร้อย
                          </span>
                        </div>
                      </div>

                      <table>
                        <thead>
                          <tr>
                            <th style="width: 12%;">รหัสบิล</th>
                            <th style="width: 32%;">ชื่อเรื่อง / รายละเอียดคำขอ</th>
                            <th style="width: 12%; text-align: center;">วันที่ทำรายการ</th>
                            <th style="width: 14%; text-align: right;">ยอดเงินสุทธิ</th>
                            <th style="width: 12%; text-align: center;">สถานะล่าสุด</th>
                            <th style="width: 18%;">ลำดับประวัติ Timeline ผู้อนุมัติ</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rowsHtml}
                        </tbody>
                      </table>

                      <div class="watermark">
                        <span>พิมพ์จากระบบควบคุมค่าใช้จ่ายพนักงาน Okay Expense Management Suite</span>
                        <span>รายงานการตรวจสอบความโปร่งใสทางการเงินของพนักงาน | หน้า 1 จาก 1</span>
                      </div>
                    </body>
                    </html>
                  `);
                  w.document.close();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const JSZip = (await import('jszip')).default;
                  const zip = new JSZip();
                  const folder = zip.folder("Evidence_Documents");
                  if (!folder) return;

                  // Create info file
                  folder.file("export_info.txt", `Exported by: ${currentUser.name}\nDate: ${new Date().toLocaleString('th-TH')}`);

                  // Collect files
                  myRequests.forEach(req => {
                    const attachments = [
                      ...(req as any).receiptUrls || [],
                      ...((req as any).attachment_list || []).map((a:any) => a.dataUrl)
                    ];
                    
                    attachments.forEach((dataUrl: string, idx: number) => {
                      if (!dataUrl || !dataUrl.startsWith('data:')) return;
                      const parts = dataUrl.split(',');
                      if (parts.length !== 2) return;
                      
                      const mimeMatch = parts[0].match(/:(.*?);/);
                      let ext = 'bin';
                      if (mimeMatch) {
                        const mime = mimeMatch[1];
                        if (mime.includes('pdf')) ext = 'pdf';
                        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
                        else if (mime.includes('png')) ext = 'png';
                      }

                      folder.file(`REQ_${req.id}_Evidence_${idx+1}.${ext}`, parts[1], {base64: true});
                    });
                  });

                  const content = await zip.generateAsync({type:"blob"});
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(content);
                  link.download = `Evidence_${currentUser.name}_${new Date().toISOString().split('T')[0]}.zip`;
                  link.click();
                } catch (err) {
                  console.error('ZIP Export Error:', err);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ZIP</span>
            </button>
            <button
              id="my-req-export-btn"
              onClick={async () => {
                try {
                  const { exportExpenseRequestsToExcel } = await import('../utils/excelExport');
                  await exportExpenseRequestsToExcel(
                    myRequests,
                    `รายงานสรุปค่าใช้จ่ายพนักงาน: คุณ${currentUser.name}`,
                    currentUser.name,
                    true
                  );
                } catch (err) {
                  console.error('Error exporting requests:', err);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">ไม่พบรายการเบิกเงินของคุณ</p>
            <button 
              id="my-req-empty-create-btn"
              onClick={() => setIsOpen(true)}
              className="mt-3 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
            >
              เริ่มต้นเขียนคำขอแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/20">
                  <th className="p-4">รหัส / วันที่</th>
                  <th className="p-4">ชื่อเรื่อง</th>
                  <th className="p-4">หมวดหมู่</th>
                  <th className="p-4">จำนวนเงิน</th>
                  <th className="p-4">กฎนโยบาย</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {myRequests.map((req) => {
                  const catConfig = getCategoryConfig(req.category);
                  return (
                    <tr 
                      key={req.id} 
                      id={`my-req-row-${req.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-all"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-950 dark:text-slate-200">{req.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider border uppercase leading-none ${
                            req.expense_type === 'advance' ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400' :
                            req.expense_type === 'clearing' ? 'bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400' :
                            'bg-sky-50/50 border-sky-200 text-sky-700 dark:bg-sky-950/20 dark:border-sky-900 dark:text-sky-400'
                          }`}>
                            {req.expense_type === 'advance' ? 'Advance' :
                             req.expense_type === 'clearing' ? 'Clearing' :
                             'Reimburse'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{req.date}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{req.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">แผนก: {req.department}</p>
                        {req.expense_type === 'advance' && req.status === 'approved' && (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                              คงเหลือเคลียร์: ฿{((req.remaining_balance !== undefined ? req.remaining_balance : req.amount) || 0).toLocaleString()} / ฿{(req.amount || 0).toLocaleString()}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              req.advance_status === 'Fully Cleared' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                              req.advance_status === 'Partially Cleared' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                              'bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400'
                            }`}>
                              {req.advance_status === 'Fully Cleared' ? 'เคลียร์เรียบร้อย' :
                               req.advance_status === 'Partially Cleared' ? 'เคลียร์บางส่วน' : 'ยังไม่เคลียร์'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${catConfig?.color}`}>
                          {catConfig?.name || 'อื่นๆ'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        ฿{(req.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {req.policyStatus === 'compliant' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ผ่านเกณฑ์
                            </span>
                          ) : req.policyStatus === 'warning' ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium" title={req.policyNotes.join('\n')}>
                              <AlertTriangle className="h-3.5 w-3.5" /> ตรวจสอบ
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-rose-600 font-bold" title={req.policyNotes.join('\n')}>
                              <AlertTriangle className="h-3.5 w-3.5" /> ผิดนโยบาย
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const stepInfo = getRealWorkflowStepInfo(req);
                          return (
                            <div className="space-y-1">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border inline-block ${stepInfo.color}`}>
                                {stepInfo.label}
                              </span>
                              {stepInfo.currentApproverName !== '-' && stepInfo.currentApproverName !== 'อนุมัติแล้ว' && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span>รออนุมัติ: </span>
                                  <span className="font-bold text-slate-700 dark:text-slate-200">{stepInfo.currentApproverName}</span>
                                  <span className="text-[10px] text-slate-400"> ({stepInfo.currentApproverRole})</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.expense_type === 'clearing' && req.settlement_type === 'refund' && req.status !== 'cleared' && (
                            <button
                              id={`upload-refund-${req.id}`}
                              onClick={() => {
                                setRefundModalRequest(req);
                                setRefundDate(new Date().toISOString().split('T')[0]);
                                setRefundFileUrl(req.refund_proof_url || '');
                                setRefundFileName(req.refund_proof_name || '');
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 transition-all"
                              title="โอนเงินคืนบริษัท & แนบสลิป"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>{req.refund_proof_url ? 'แก้ไขสลิปคืน' : 'แนบสลิปคืน'}</span>
                            </button>
                          )}
                          <button 
                            id={`view-my-req-${req.id}`}
                            onClick={() => onSelectRequest(req)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:text-primary-400 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-all"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(req.status === 'draft' || req.status === 'pending') && (
                            <button 
                              id={`edit-my-req-${req.id}`}
                              onClick={() => startEditing(req)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="แก้ไขคำขอ"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {req.status === 'draft' && (
                            <button 
                              id={`delete-my-req-${req.id}`}
                              onClick={() => onDeleteRequest(req.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="ลบคำขอร่าง"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal create/edit request with live OCR */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">สร้างคำเสนอขออนุมัติค่าใช้จ่าย</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">คุณสามารถกรอกแบบฟอร์ม หรือใช้ระบบสแกนเอกสารด้วย AI แนบใบเสร็จเพื่อวิเคราะห์ดึงข้อมูลอัตโนมัติ</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Receipt OCR Area */}
              {supportingDocType === 'receipt' && (
                <div className="p-5 bg-primary-50/40 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-900/20 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400 animate-pulse" />
                      <span className="text-xs font-bold text-primary-900 dark:text-primary-300">ระบบสแกนเอกสารด้วย AI (Smart AI OCR Scanner)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full font-semibold">แนะนำ</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    
                    {/* Left Column: Drag & Drop Real File Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        อัปโหลดใบเสร็จจริง (เครื่องอ่าน AI รองรับ PDF, PNG, JPG, JPEG)
                      </label>

                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            processFileForOCR(files);
                              e.target.value = '';
                          }
                        }}
                        className={`relative flex flex-col justify-center items-center border-2 border-dashed rounded-2xl p-4 text-center transition-all min-h-[140px] cursor-pointer ${
                          isDragging 
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20' 
                            : uploadedFiles.length > 0 
                              ? 'border-emerald-300 bg-emerald-50/10 dark:bg-emerald-950/10' 
                              : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 bg-white dark:bg-slate-900'
                        }`}
                        onClick={() => {
                          if (uploadedFiles.length === 0 && !isScanning) {
                            document.getElementById('receipt-file-input')?.click();
                          }
                        }}
                      >
                        <input 
                          type="file" 
                          id="receipt-file-input"
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              processFileForOCR(files);
                              e.target.value = '';
                            }
                          }}
                        />

                        {isScanning ? (
                          <div className="flex flex-col items-center gap-3 py-4">
                            <Loader2 className="h-7 w-7 text-primary-600 dark:text-primary-400 animate-spin" />
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 animate-pulse block">
                                AI กำลังสแกนและดึงข้อมูลจากเอกสารแนบ...
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-1 leading-normal">
                                ประมวลผลภาพใบเสร็จด้วย AI OCR (Gemini 3.6 Flash)
                              </span>
                            </div>
                          </div>
                        ) : uploadedFiles.length > 0 ? (
                          <div className="flex flex-col gap-2.5 w-full">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                📌 เอกสารแนบการเบิก ({uploadedFiles.length} ไฟล์)
                              </span>
                            </div>
                            {uploadedFiles.map((fileObj, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full relative">
                                {fileObj.type === 'application/pdf' ? (
                                  <div className="h-12 w-12 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                                    PDF
                                  </div>
                                ) : (
                                  <img 
                                    src={fileObj.dataUrl} 
                                    alt="Preview" 
                                    className="h-12 w-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="min-w-0 text-left flex-1 space-y-1">
                                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{fileObj.name}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      ✓ แนบไฟล์เป็นหลักฐานการเบิกแล้ว
                                    </span>
                                    <span className="text-[9px] text-slate-400">{(fileObj.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scanSingleFileWithAI(fileObj);
                                    }}
                                    className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="ให้ AI อ่านและสกัดข้อมูลจากภาพนี้"
                                  >
                                    <Sparkles className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                                    <span>ให้ AI อ่านรูปนี้</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = uploadedFiles.filter((_, i) => i !== idx);
                                      setUploadedFiles(updated);
                                      const updatedUrls = receiptAttachedList.filter((_, i) => i !== idx);
                                      setReceiptAttachedList(updatedUrls);
                                      if (idx === 0) {
                                        setUploadedFile(updated[0] || null);
                                        setReceiptAttached(updated[0]?.name || null);
                                      }
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                    title="ลบไฟล์นี้"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('receipt-file-input')?.click();
                              }}
                              className="text-[11px] font-bold text-primary-600 hover:underline flex items-center justify-center gap-1 mt-1 cursor-pointer"
                            >
                              + เพิ่มไฟล์ภาพ/PDF แนบเพิ่มเติม
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 gap-2">
                            <UploadCloud className="h-8 w-8 text-slate-400" />
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                คลิกเพื่อเลือกไฟล์ หรือ ลากวางที่นี่
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                JPG, JPEG, PNG, PDF (สูงสุด 10MB | อัปโหลดได้หลายไฟล์)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Simulated/Mock Fallback */}
                    <div className="flex flex-col justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          หรือเลือกจากข้อมูลจำลองเพื่อสแกนด่วน (Simulation Option)
                        </span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          สามารถเลือกใบเสร็จตัวอย่างที่ติดตั้งล่วงหน้าในระบบ เพื่อทดสอบกระบวนการจำลอง AI OCR ได้ทันทีโดยไม่ต้องใช้เอกสารจริง
                        </p>
                      </div>
                      
                      <div className="mt-3">
                        <select 
                          id="ocr-receipt-selector"
                          value={selectedReceiptId}
                          onChange={(e) => {
                            // Clear uploaded file if we use mock simulation
                            setUploadedFile(null);
                            setOcrError(null);
                            handleReceiptSelection(e.target.value);
                          }}
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500 font-bold text-slate-700 dark:text-slate-300"
                        >
                          <option value="">-- เลือกใบเสร็จสำรองเพื่อวิเคราะห์ --</option>
                          {MOCK_RECEIPTS.map(r => (
                            <option key={r.id} value={r.id}>{r.merchant} (฿{r.amount})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* OCR Error Notification */}
                  {ocrError && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/30 rounded-xl text-amber-850 dark:text-amber-400 text-xs flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">เครื่องสแกน AI แจ้งเตือนข้อผิดพลาด:</p>
                        <p className="text-[10px] mt-0.5 text-amber-700/90 dark:text-amber-400/90 leading-relaxed">{ocrError}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                          💡 ท่านยังสามารถกรอกข้อมูลแบบฟอร์มด้านล่างนี้ด้วยตนเองได้ทันที
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OCR Confidence Warning */}
                  {ocrConfidence !== null && (
                    <div className={`p-3 border rounded-xl text-xs flex items-start gap-2 mt-2 ${ocrConfidence < 80 ? 'bg-rose-50/80 border-rose-100 text-rose-800' : 'bg-emerald-50/80 border-emerald-100 text-emerald-800'}`}>
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${ocrConfidence < 80 ? 'text-rose-600' : 'text-emerald-600'}`} />
                      <div>
                        <p className="font-bold">OCR Confidence Score: {ocrConfidence}%</p>
                        {ocrConfidence < 80 ? (
                          <p className="text-[10px] mt-0.5">⚠️ ความมั่นใจของ AI ต่ำกว่า 80% กรุณาตรวจสอบข้อมูลอีกครั้ง</p>
                        ) : (
                          <p className="text-[10px] mt-0.5">✅ สกัดข้อมูลสำเร็จด้วยความแม่นยำสูง</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Invoice Warning */}
                  {duplicateWarning && (
                    <div className="p-3 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 rounded-xl text-rose-850 dark:text-rose-400 text-xs flex items-start gap-2 mt-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <p className="font-bold">แจ้งเตือนใบเสร็จซ้ำซ้อน:</p>
                        <p className="text-[10px] mt-0.5 leading-relaxed">{duplicateWarning}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {supportingDocType === 'other' && (
                <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📁</span>
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">อัปโหลดหลักฐานอื่นๆ (ไม่มีระบบ AI สแกน)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        อัปโหลดไฟล์ (รองรับ PDF, PNG, JPG, JPEG)
                      </label>
                      <div 
                        onClick={() => {
                          if (uploadedFiles.length === 0) {
                            document.getElementById('other-file-input')?.click();
                          }
                        }}
                        className={`relative flex flex-col justify-center items-center border-2 border-dashed rounded-2xl p-4 text-center transition-all min-h-[140px] cursor-pointer ${
                          uploadedFiles.length > 0 
                            ? 'border-emerald-300 bg-emerald-50/10 dark:bg-emerald-950/10' 
                            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="other-file-input"
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              processFileForOCR(files);
                              e.target.value = '';
                            }
                          }}
                        />

                        {uploadedFiles.length > 0 ? (
                          <div className="flex flex-col gap-2.5 w-full">
                            {uploadedFiles.map((fileObj, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-750 w-full relative">
                                {fileObj.type === 'application/pdf' ? (
                                  <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    PDF
                                  </div>
                                ) : (
                                  <img 
                                    src={fileObj.dataUrl} 
                                    alt="Preview" 
                                    className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="min-w-0 text-left flex-1">
                                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{fileObj.name}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">{(fileObj.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated = uploadedFiles.filter((_, i) => i !== idx);
                                    setUploadedFiles(updated);
                                    const updatedUrls = receiptAttachedList.filter((_, i) => i !== idx);
                                    setReceiptAttachedList(updatedUrls);
                                    if (idx === 0) {
                                      setUploadedFile(updated[0] || null);
                                      setReceiptAttached(updated[0]?.name || null);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  title="ลบไฟล์"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('other-file-input')?.click();
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center justify-center gap-1 mt-1 cursor-pointer"
                            >
                              + เพิ่มไฟล์อื่น
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 gap-2">
                            <UploadCloud className="h-8 w-8 text-slate-400" />
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                คลิกเพื่อเลือกไฟล์
                              </span>
                              <span className="text-[9px] block mt-1">ไฟล์สูงสุด 10MB | อัปโหลดได้หลายไฟล์</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          ประเภทหลักฐาน <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={otherEvidenceType}
                          onChange={(e) => setOtherEvidenceType(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-hidden font-bold"
                        >
                          <option value="">-- เลือกประเภทหลักฐาน --</option>
                          <option value="ใบเสร็จ">ใบเสร็จ (ไม่สามารถสแกนได้)</option>
                          <option value="ใบกำกับภาษี">ใบกำกับภาษี (ไม่สามารถสแกนได้)</option>
                          <option value="สลิปโอนเงิน">สลิปโอนเงิน</option>
                          <option value="รูปถ่าย">รูปถ่ายสินค้า/สถานที่</option>
                          <option value="เอกสารราชการ">เอกสารราชการ</option>
                          <option value="สัญญา">สัญญา/ข้อตกลง</option>
                          <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                      </div>
                      
                      {otherEvidenceType === 'อื่นๆ' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            รายละเอียดเพิ่มเติม <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={otherEvidenceDetail}
                            onChange={(e) => setOtherEvidenceDetail(e.target.value)}
                            placeholder="ระบุประเภทหลักฐานเพิ่มเติม..."
                            className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-hidden font-medium"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {supportingDocType === 'replacement' && (
                <div className="p-5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-150/40 dark:border-amber-900/20 rounded-3xl space-y-2 text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <span className="text-xs font-bold">เข้าสู่โหมด "ยื่นใบแทนใบเสร็จรับเงิน (Replacement Receipt)"</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    เนื่องจากไม่มีหลักฐานใบเสร็จอย่างเป็นทางการ ระบบปิดการทำงานของ AI OCR สแกนเนอร์ และเปิดแบบฟอร์มยื่นขอใบแทนตามมาตรฐานการกำกับดูแลภายใน
                    โปรดระบุเหตุผลความจำเป็นและข้อมูลประกอบในฟอร์มด้านล่างเพื่อส่งข้อมูลให้คณะกรรมการตรวจสอบพิจารณา
                  </p>
                </div>
              )}

              {/* Input Fields Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Expense Request Type Selector */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ประเภทรายการขอเบิกจ่ายเงิน (Expense Request Type) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => { setExpenseType('reimbursement'); setSelectedAdvanceId(''); }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        expenseType === 'reimbursement'
                          ? 'bg-primary-50/80 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-900/40'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">💵</span>
                      <span>Reimbursement (เบิกคืน)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setExpenseType('advance'); setSelectedAdvanceId(''); }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        expenseType === 'advance'
                          ? 'bg-primary-50/80 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-900/40'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">🏦</span>
                      <span>Advance (เบิกล่วงหน้า)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setExpenseType('clearing'); }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        expenseType === 'clearing'
                          ? 'bg-primary-50/80 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-900/40'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">🔄</span>
                      <span>Clearing (เคลียร์ทดรอง)</span>
                    </button>
                  </div>
                </div>

                {/* Supporting Document Type Selector */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ประเภทการแนบเอกสารหลักฐาน (Supporting Document Type) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSupportingDocType('receipt')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        supportingDocType === 'receipt'
                          ? 'bg-emerald-50/85 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-900/40 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">🤖✨</span>
                      <span>เลือกแบบสแกน AI</span>
                      <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">(สแกนใบเสร็จอัตโนมัติ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportingDocType('other')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        supportingDocType === 'other'
                          ? 'bg-indigo-50/85 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-900/40 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">📁</span>
                      <span>เลือกแบบอื่นๆ ที่สแกนไม่ได้</span>
                      <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">(สลิปโอน / เอกสารอื่น)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSupportingDocType('replacement');
                        if (!replacementReceiptNumber) {
                          setReplacementReceiptNumber(generateReplacementNumber());
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        supportingDocType === 'replacement'
                          ? 'bg-amber-50/85 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900/40 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">📋</span>
                      <span>ใบแทนใบเสร็จ (Replacement)</span>
                      <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">(กรณีไม่มีใบเสร็จรับเงิน)</span>
                    </button>
                  </div>
                </div>

                {/* Clearing Advance Matcher panel */}
                {expenseType === 'clearing' && (
                  <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                        <span>ผูกใบเบิกล่วงหน้าที่อนุมัติแล้ว (Approved Advance Ref)</span>
                        <span className="text-[10px] text-primary-600 dark:text-primary-400">Advance Records Table Link</span>
                      </label>
                      
                      {eligibleAdvances.length === 0 ? (
                        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-400 text-[11px] font-semibold">
                          ⚠️ ไม่พบประวัติเงินล่วงหน้าที่ได้รับการอนุมัติของพนักงานคนนี้! กรุณาสร้างคำขอเบิก "Advance" อนุมัติให้เสร็จสิ้นก่อนเคลียร์
                        </div>
                      ) : (
                        <select
                          id="form-selected-advance-id"
                          value={selectedAdvanceId || ''}
                          required
                          onChange={(e) => setSelectedAdvanceId(e.target.value)}
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl outline-hidden font-bold ${
                            formErrors.selectedAdvanceId ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <option value="">-- กรุณาคลิกเลือกใบเบิกล่วงหน้า --</option>
                          {eligibleAdvances.map(r => (
                              <option key={r.id} value={r.id}>{r.title} (วงเงินที่ได้: ฿{(r.amount || 0).toLocaleString()}) - {r.id}</option>
                            ))
                          }
                        </select>
                      )}
                      {formErrors.selectedAdvanceId && (
                        <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.selectedAdvanceId}</p>
                      )}
                    </div>

                    {selectedAdvanceId && (() => {
                      const matchedAdvance = requests.find(r => r.id === selectedAdvanceId);
                      const advAmount = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
                      const diff = amount - advAmount;
                      return (
                        <div className="space-y-3 w-full border-t border-slate-200/60 dark:border-slate-800 pt-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">ยอดที่รับไป (Advance)</span>
                              <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400">฿{(advAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">ค่าใช้จ่ายจริง (Spent)</span>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">฿{(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">สถานะเคลียร์ (Cleared)</span>
                              {diff < 0 ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5" title=" spent < advance = Waiting for Refund ">
                                  🟠 รอคืนเงินบริษัท ฿{(Math.abs(diff) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 block mt-0.5" title=" spent > advance = Additional Reimbursement ">
                                  🔵 บริษัทต้องจ่ายเพิ่ม ฿{(diff || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                  🟢 เคลียร์เรียบร้อย
                                </span>
                              )}
                            </div>
                          </div>

                          {diff < 0 && (
                            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-extrabold text-amber-850 dark:text-amber-300 block uppercase">
                                  📌 แนบหลักฐานการโอนเงินคืนบริษัท (จำนวน ฿{Math.abs(diff).toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                  กรุณาโอนเงินคืนและแนบภาพหลักฐานสลิปการโอนเงิน (แนบด้านล่างที่ช่อง "อัปโหลดใบเสร็จจริง") พร้อมระบุวันที่โอนเงินคืน:
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 mt-1">
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400" htmlFor="form-refund-transferred-date">
                                  วันที่โอนเงินคืนบริษัท <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  id="form-refund-transferred-date"
                                  value={refundTransferredDate}
                                  onChange={(e) => setRefundTransferredDate(e.target.value)}
                                  className={`p-2 bg-white dark:bg-slate-900 border text-xs font-bold rounded-lg outline-hidden ${
                                    formErrors.refundTransferredDate ? 'border-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                  }`}
                                />
                                {formErrors.refundTransferredDate && (
                                  <span className="text-rose-500 text-[10px] font-bold">⚠️ {formErrors.refundTransferredDate}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หัวข้อขออนุมัติค่าใช้จ่าย <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="form-title"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ค่าเดินทางประชุมสัญจรลูกค้า, สมาชิกซอฟต์แวร์..."
                    className={`w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white outline-hidden ${
                      formErrors.title ? 'border-rose-500 ring-rose-300 text-rose-950 dark:text-rose-200 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    id="form-amount"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="ระบุยอดเงินรวม"
                    className={`w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white outline-hidden font-bold ${
                      formErrors.amount ? 'border-rose-500 ring-rose-300 text-rose-950 dark:text-rose-200 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  />
                  {formErrors.amount && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.amount}</p>
                  )}
                </div>

                {/* VAT Toggle & Inputs */}
                <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">ภาษีมูลค่าเพิ่ม (VAT Option)</span>
                      <span className="text-[10px] text-slate-400 block">เลือกว่าใบเสร็จมีภาษีมูลค่าเพิ่มหรือไม่ (หากไม่มี จะไม่มีการบังคับกรอกเลขผู้เสียภาษี)</span>
                    </div>
                    
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setHasVat(true);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          hasVat
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-750 dark:hover:text-slate-200'
                        }`}
                      >
                        With VAT (7%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasVat(false);
                          setVatAmount(0);
                          setTaxId('');
                          // Clear VAT/Tax validation errors if they existed
                          const nextErrors = { ...formErrors };
                          delete nextErrors.vatAmount;
                          delete nextErrors.taxId;
                          setFormErrors(nextErrors);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          !hasVat
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-750 dark:hover:text-slate-200'
                        }`}
                      >
                        Without VAT
                      </button>
                    </div>
                  </div>

                  {hasVat && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-750">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1" htmlFor="form-vat-amount">
                          จำนวนภาษีมูลค่าเพิ่ม (VAT Amount) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="form-vat-amount"
                          value={vatAmount || ''}
                          onChange={(e) => setVatAmount(Number(e.target.value))}
                          placeholder="ระบุยอด VAT (ปกติ 7% ของยอดซื้อ)"
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold outline-hidden ${
                            formErrors.vatAmount ? 'border-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary-500'
                          }`}
                        />
                        {formErrors.vatAmount && (
                          <span className="text-rose-500 text-[10px] font-bold mt-1 block">⚠️ {formErrors.vatAmount}</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1" htmlFor="form-tax-id">
                          เลขประจำตัวผู้เสียภาษีร้านค้า (Merchant Tax ID) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="form-tax-id"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="เลขผู้เสียภาษี 13 หลัก"
                          maxLength={13}
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-mono outline-hidden ${
                            formErrors.taxId ? 'border-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary-500'
                          }`}
                        />
                        {formErrors.taxId && (
                          <span className="text-rose-500 text-[10px] font-bold mt-1 block">⚠️ {formErrors.taxId}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่ค่าใช้จ่าย <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      id="form-category-search"
                      value={categorySearch || ''}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setIsCategoryDropdownOpen(true);
                      }}
                      onFocus={() => setIsCategoryDropdownOpen(true)}
                      placeholder="🔍 พิมพ์เพื่อค้นหา หรือเพิ่มหมวดหมู่..."
                      className={`w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white outline-hidden font-medium ${
                        formErrors.category ? 'border-rose-500 ring-rose-300 text-rose-950 dark:text-rose-200 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategorySearch('');
                          setCategory('');
                          setIsCategoryDropdownOpen(true);
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-300 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {formErrors.category && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.category}</p>
                  )}

                  {isCategoryDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Filtered list of categories */}
                      {categoriesList.filter(cat => {
                        const s = (categorySearch || '').toLowerCase();
                        return (cat.name || '').toLowerCase().includes(s) || (cat.id || '').toLowerCase().includes(s);
                      }).map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategory(cat.id);
                            setCategorySearch(cat.name);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between"
                        >
                          <span>{cat.name}</span>
                          {category === cat.id && <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">✓</span>}
                        </button>
                      ))}

                      {/* Add new option */}
                      {categorySearch.trim() !== '' && !categoriesList.some(cat => (cat.name || '').toLowerCase() === categorySearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            const trimmedName = categorySearch.trim();
                            const newId = trimmedName.toLowerCase().replace(/\s+/g, '-');
                            const alreadyExists = categoriesList.find(c => c.id === newId);
                            
                            if (alreadyExists) {
                              setCategory(alreadyExists.id);
                              setCategorySearch(alreadyExists.name);
                              setIsCategoryDropdownOpen(false);
                              return;
                            }

                            const newCategoryObj = { id: newId, name: trimmedName };
                            const updatedList = [...categoriesList, newCategoryObj];
                            setCategoriesList(updatedList);
                            
                            // Check if current user is Admin / Administrator
                            const isAdmin = currentUser.approval_level === 'Administrator' || currentUser.user_id === 'user-admin';
                            
                            if (isAdmin) {
                              saveDbCategories(updatedList);
                              alert(`[สิทธิ์ผู้ดูแลระบบ] บันทึกหมวดหมู่ใหม่ "${trimmedName}" เข้าสู่ฐานข้อมูลระบบส่วนกลางเรียบร้อยแล้ว`);
                            } else {
                              saveDbCategories(updatedList);
                              alert(`เพิ่มหมวดหมู่ใหม่ "${trimmedName}" และพร้อมใช้งานทันที`);
                            }
                            
                            setCategory(newId);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs bg-primary-50/50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 font-bold hover:bg-primary-100/50 dark:hover:bg-primary-900/30 flex items-center gap-1.5"
                        >
                          <span>➕ สร้างหมวดหมู่ใหม่:</span>
                          <span className="underline font-extrabold text-primary-900 dark:text-primary-200">"{categorySearch}"</span>
                        </button>
                      )}

                      {categoriesList.filter(cat => {
                        const s = (categorySearch || '').toLowerCase();
                        return (cat.name || '').toLowerCase().includes(s) || (cat.id || '').toLowerCase().includes(s);
                      }).length === 0 && categorySearch.trim() === '' && (
                        <div className="p-3 text-center text-xs text-slate-400">
                          พิมพ์เพื่อค้นหาหมวดหมู่...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dropdown Backdrop to close dropdown on click outside */}
                  {isCategoryDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsCategoryDropdownOpen(false)}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ทำรายการ <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    id="form-date"
                    value={date || ''}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden ${
                      formErrors.date ? 'border-rose-500 ring-rose-300 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หน่วยงาน / แผนกรับภาระ <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    id="form-department"
                    value={department || ''}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden ${
                      formErrors.department ? 'border-rose-500 ring-rose-300 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    <option value="">-- เลือกแผนกรับภาระ --</option>
                    {Array.from(new Set([
                      ...(currentUser.department ? [currentUser.department] : []),
                      ...departmentsList.map(d => d.department_name),
                      'สำนักผู้บริหาร (Executive)',
                      'ฝ่ายบัญชีและการเงิน (Accounting & Finance)',
                      'ฝ่ายการตลาดและขาย (Marketing & Sales)',
                      'ฝ่ายเทคโนโลยีและระบบ (IT & Software)',
                      'ฝ่ายทรัพยากรบุคคล (Human Resources)',
                      'ฝ่ายจัดซื้อและคลังสินค้า (Procurement)',
                      'ฝ่ายปฏิบัติการและบริการ (Operations)'
                    ])).map((deptName) => (
                      <option key={deptName} value={deptName}>{deptName}</option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.department}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    คำอธิบาย / วัตถุประสงค์
                  </label>
                  <textarea 
                    id="form-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ระบุจุดประสงค์การเบิกจ่าย รายชื่อผู้ร่วมประชุม หรือความจำเป็นทางการค้า..."
                    className="w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white outline-hidden"
                  />
                </div>

                {/* Conditional Replacement Receipt Form Block */}
                {supportingDocType === 'replacement' && (
                  <div className="sm:col-span-2 p-5 bg-amber-50/25 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/40 dark:border-amber-900/20">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📋</span>
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                          ใบแทนใบเสร็จรับเงิน (Replacement Receipt Form)
                        </h4>
                      </div>
                      <div className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-200/30">
                        เลขที่เอกสาร: {replacementReceiptNumber}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Merchant/Payee */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          ชื่อร้านค้า / ผู้รับเงิน (Merchant / Payee) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="form-replacement-merchant"
                          value={replacementMerchant || ''}
                          onChange={(e) => setReplacementMerchant(e.target.value)}
                          placeholder="ระบุชื่อผู้รับเงิน เช่น Grab Driver, ร้านค้าทั่วไป"
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-medium ${
                            formErrors.replacementMerchant ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                          }`}
                        />
                        {formErrors.replacementMerchant && (
                          <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.replacementMerchant}</p>
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          สถานที่ / พิกัด (Location) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="form-replacement-location"
                          value={replacementLocation || ''}
                          onChange={(e) => setReplacementLocation(e.target.value)}
                          placeholder="ระบุสถานที่ เช่น ตึก T-One ชั้น 12, ปากซอยสุขุมวิท 21"
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-medium ${
                            formErrors.replacementLocation ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                          }`}
                        />
                        {formErrors.replacementLocation && (
                          <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.replacementLocation}</p>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          วิธีการชำระเงิน (Payment Method) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="form-replacement-payment-method"
                          value={replacementPaymentMethod || ''}
                          onChange={(e) => setReplacementPaymentMethod(e.target.value)}
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-semibold ${
                            formErrors.replacementPaymentMethod ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200'
                          }`}
                        >
                          <option value="">-- เลือกวิธีการชำระเงิน --</option>
                          <option value="cash">💵 เงินสด (Cash)</option>
                          <option value="transfer">🏦 โอนผ่านธนาคาร (Bank Transfer)</option>
                          <option value="credit_card">💳 บัตรเครดิต (Credit Card)</option>
                          <option value="promptpay">📱 พร้อมเพย์ (PromptPay)</option>
                          <option value="other">⚙️ อื่นๆ (Other)</option>
                        </select>
                        {formErrors.replacementPaymentMethod && (
                          <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.replacementPaymentMethod}</p>
                        )}
                      </div>

                      {/* Related Parties */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          บุคคลที่เกี่ยวข้อง / พยาน (Related Parties)
                        </label>
                        <input
                          type="text"
                          id="form-replacement-involved"
                          value={replacementInvolved || ''}
                          onChange={(e) => setReplacementInvolved(e.target.value)}
                          placeholder="ระบุชื่อพยานหรือผู้ร่วมเดินทาง (ถ้ามี)"
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-medium text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Reason for No Receipt */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          เหตุผลความจำเป็นที่ไม่มีใบเสร็จรับเงิน (Reason for No Receipt) <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          id="form-replacement-reason"
                          value={replacementReason || ''}
                          onChange={(e) => setReplacementReason(e.target.value)}
                          placeholder="กรุณาอธิบายเหตุผลหลัก เช่น ผู้รับเงินไม่มีใบเสร็จ หรือสูญหายด้วยเหตุสุดวิสัย..."
                          className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-medium ${
                            formErrors.replacementReason ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                          }`}
                        />
                        {formErrors.replacementReason && (
                          <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.replacementReason}</p>
                        )}
                      </div>

                      {/* Expense Details */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          รายละเอียดรายจ่ายรายย่อย (Expense Details)
                        </label>
                        <textarea
                          rows={2}
                          id="form-replacement-remarks"
                          value={replacementRemarks || ''}
                          onChange={(e) => setReplacementRemarks(e.target.value)}
                          placeholder="ระบุรายละเอียดสินค้า/บริการย่อยเพื่อความโปร่งใสแก่ผู้ตรวจสอบ..."
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary-500 outline-hidden font-medium text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Multiple Evidence Attachments Section */}
                      <div className="sm:col-span-2 space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          สารบบไฟล์เอกสารแนบประกอบแยกประเภท (Categorized Evidence Attachments) <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          กรุณาแนบไฟล์และเลือกหมวดหมู่ให้เหมาะสม (ใบเสร็จหลัก, ใบเสร็จเพิ่มเติม, สลิปโอนเงิน, รูปหน้าร้าน/สินค้า, อื่นๆ) เพื่อตรวจสอบความสอดคล้องตามระเบียบ
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                          {[
                            { id: 'ใบเสร็จรับเงิน', label: 'ใบเสร็จรับเงิน', desc: 'Receipt' },
                            { id: 'ใบกำกับภาษี', label: 'ใบกำกับภาษี', desc: 'Tax Invoice' },
                            { id: 'Slip โอนเงิน', label: 'Slip โอนเงิน', desc: 'Bank Slip' },
                            { id: 'หลักฐานคืนเงินบริษัท', label: 'คืนเงินบริษัท', desc: 'Refund Proof' },
                            { id: 'ใบเสนอราคา', label: 'ใบเสนอราคา', desc: 'Quotation' },
                            { id: 'ใบแจ้งหนี้ (Invoice)', label: 'ใบแจ้งหนี้', desc: 'Invoice' },
                            { id: 'ใบส่งของ', label: 'ใบส่งของ', desc: 'Delivery Note' },
                            { id: 'หนังสือรับรอง', label: 'หนังสือรับรอง', desc: 'Certificate' },
                            { id: 'หนังสืออนุมัติ', label: 'หนังสืออนุมัติ', desc: 'Approval Letter' },
                            { id: 'เอกสารอื่น ๆ', label: 'เอกสารอื่น ๆ', desc: 'Others' }
                          ].map((cat) => (
                            <div 
                              key={cat.id}
                              onClick={() => document.getElementById(`file-input-${cat.id}`)?.click()}
                              className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-500/5 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-2.5 text-center transition-all cursor-pointer group"
                            >
                              <input 
                                type="file"
                                id={`file-input-${cat.id}`}
                                className="hidden"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files) {
                                    handleEvidenceUpload(Array.from(files), cat.id);
                                  }
                                }}
                              />
                              <UploadCloud className="h-4 w-4 text-slate-400 group-hover:text-amber-500 mb-1 transition-colors" />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                {cat.label}
                              </span>
                              <span className="text-[8px] text-slate-400 font-medium">
                                {cat.desc}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Categorized Thumbnails Grid (Thumbnails only, no names or URLs) */}
                        {attachmentList.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              หลักฐานที่อัปโหลดแล้ว ({attachmentList.length} รายการ)
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                              {attachmentList.map((file, idx) => {
                                const label = file.category || 'เอกสารอื่น ๆ';
                                return (
                                  <div 
                                    key={idx}
                                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 group shadow-sm hover:shadow-md transition-all duration-200"
                                  >
                                    {/* Thumbnail image or PDF preview icon */}
                                    {file.type && String(file.type || '').startsWith('image/') ? (
                                      <img 
                                        src={file.dataUrl} 
                                        alt="thumbnail"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                                        <FileText className="h-8 w-8 mb-1" />
                                        <span className="text-[9px] font-black tracking-widest">PDF</span>
                                      </div>
                                    )}

                                    {/* Category label badge overlaid on bottom */}
                                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1 text-center">
                                      <span className="text-[8px] font-black text-white uppercase tracking-wider block truncate">
                                        {label}
                                      </span>
                                    </div>

                                    {/* Action Buttons overlay on hover */}
                                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-wrap items-center justify-center gap-1.5 p-2 transition-all duration-200">
                                      {/* Preview / View trigger */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewerIndex(idx);
                                          setViewerOpen(true);
                                        }}
                                        className="p-1.5 bg-white/15 hover:bg-white/35 text-white rounded-lg transition-colors shadow-xs hover:scale-105"
                                        title="แสดงไฟล์ (Preview)"
                                      >
                                        <ZoomIn className="h-3 w-3" />
                                      </button>
                                      {/* Download trigger */}
                                      <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        className="p-1.5 bg-white/15 hover:bg-white/35 text-white rounded-lg transition-colors shadow-xs hover:scale-105 inline-flex items-center justify-center"
                                        title="ดาวน์โหลดไฟล์ (Download)"
                                      >
                                        <Download className="h-3 w-3" />
                                      </a>
                                      {/* Print trigger */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const printWindow: any = {
      document: {
        open: () => { printWindow._html = ''; },
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
                                          if (printWindow) {
                                            printWindow.document.write(`
                                              <html>
                                                <head>
                                                  <title>พิมพ์เอกสาร</title>
                                                  <style>
                                                    body { margin: 0; padding: 20px; display: flex; justify-content: center; background-color: #f0f0f0; }
                                                    @media print {
                                                      body { padding: 0; background-color: white; }
                                                      .print-content { width: 100%; max-width: 100%; object-fit: contain; }
                                                      @page { margin: 0; }
                                                    }
                                                    .print-content { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                                  </style>
                                                </head>
                                                <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                                                  ${file.type.startsWith('image/') 
                                                    ? `<img src="${file.dataUrl}" class="print-content" />` 
                                                    : `<iframe src="${file.dataUrl}" style="width:100vw; height:100vh; border:none;"></iframe>`}
                                                </body>
                                              </html>
                                            `);
                                            printWindow.document.close();
                                          }
                                        }}
                                        className="p-1.5 bg-white/15 hover:bg-white/35 text-white rounded-lg transition-colors shadow-xs hover:scale-105"
                                        title="พิมพ์ไฟล์ (Print)"
                                      >
                                        <Printer className="h-3 w-3" />
                                      </button>
                                      {/* Replace trigger */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*,application/pdf';
                                          input.onchange = (ev) => {
                                            const replacementFile = (ev.target as HTMLInputElement).files?.[0];
                                            if (replacementFile) {
                                              handleReplaceAttachment(idx, replacementFile, file.category);
                                            }
                                          };
                                          input.click();
                                        }}
                                        className="p-1.5 bg-white/15 hover:bg-white/35 text-white rounded-lg transition-colors shadow-xs hover:scale-105"
                                        title="เปลี่ยนรูปภาพ"
                                      >
                                        <RotateCw className="h-3 w-3" />
                                      </button>
                                      {/* Delete button */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAttachment(idx)}
                                        className="p-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-xs hover:scale-105"
                                        title="ลบไฟล์"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Policy Live Auditing Banner */}
              <div className={`p-4 rounded-2xl border ${
                policyStatus === 'compliant' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                  : policyStatus === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex gap-2">
                  <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      การตรวจสอบนโยบายล่วงหน้า (Live Policy Audit)
                    </h4>
                    <ul className="list-disc pl-4 text-xs mt-1.5 space-y-1">
                      {policyNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold rounded-xl transition-all"
              >
                ยกเลิก
              </button>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  id="form-draft-btn"
                  onClick={() => handleSubmit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>บันทึกแบบร่าง</span>
                </button>
                <button 
                  type="button" 
                  id="form-submit-btn"
                  onClick={() => handleSubmit(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-sm font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  <span>ส่งขออนุมัติ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Proof Upload Modal */}
      {refundModalRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UploadCloud className="text-amber-600 h-5 w-5" />
                <span>บันทึกการโอนเงินคืนบริษัท (Record Refund)</span>
              </h3>
              <button 
                onClick={() => setRefundModalRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/50 text-[11px] text-amber-850 dark:text-amber-300">
              <p className="font-bold">สรุปยอดที่ต้องโอนคืนบริษัท:</p>
              <p className="mt-1 text-sm font-black text-amber-700 dark:text-amber-400">
                ฿{refundModalRequest.settlement_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                อ้างอิงใบคำขอเคลียร์เงินทดรอง: {refundModalRequest.id}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Refund Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">วันที่โอนคืนเงิน (Refund Date) <span className="text-rose-500">*</span></label>
                <input 
                  type="date"
                  value={refundDate}
                  onChange={e => setRefundDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Refund Proof (File Upload) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">แนบหลักฐานการโอนเงิน (รูปสลิป / ไฟล์ภาพประกอบ) <span className="text-rose-500">*</span></label>
                
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950/40 transition-all relative">
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRefundFileName(file.name);
                        const input = e.target;
                        uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then(async (dataUrl) => {
      
                          setRefundFileUrl(dataUrl);
                                input.value = '';
                        
    });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-1">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">คลิกเพื่ออัปโหลดไฟล์หลักฐาน</p>
                    <p className="text-[9px] text-slate-400">รองรับสลิปธนาคาร (JPG, PNG, PDF)</p>
                  </div>
                </div>

                {refundFileName && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate font-semibold">{refundFileName}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { setRefundFileName(''); setRefundFileUrl(''); }}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      ลบสลิป
                    </button>
                  </div>
                )}

                {refundFileUrl && refundFileUrl.startsWith('data:image') && (
                  <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={refundFileUrl} className="h-full w-full object-cover" alt="Refund proof preview" />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRefundModalRequest(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  
                  
                  
                  // Add a comment to request
                  const newComment = {
                    id: `comment-refund-${Date.now()}`,
                    author: currentUser.name,
                    date: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
                    text: `[พนักงานโอนเงินคืนบริษัท] จำนวนเงิน ฿${refundModalRequest.settlement_amount?.toLocaleString()} วันที่โอนคืน: ${refundDate} แนบไฟล์หลักฐาน: ${refundFileName}`
                  };

                  const existingComments = refundModalRequest.comments || [];

                  onUpdateRequest(refundModalRequest.id, {
                    status: 'pending_refund',
                    refund_transferred_date: refundDate,
                    refund_proof_url: refundFileUrl,
                    refund_proof_name: refundFileName,
                    comments: [...existingComments, newComment]
                  });

                  setRefundModalRequest(null);
                }}
                className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold shadow-md shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                ยืนยันและนำส่งสลิปคืนเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Viewer Fullscreen Modal */}
      {viewerOpen && attachmentList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50"
            onClick={() => setViewerOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {attachmentList.length > 1 && (
            <>
              <button 
                className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50"
                onClick={() => setViewerIndex(prev => prev === 0 ? attachmentList.length - 1 : prev - 1)}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button 
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50"
                onClick={() => setViewerIndex(prev => prev === attachmentList.length - 1 ? 0 : prev + 1)}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Viewer Content */}
          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center">
            {String(attachmentList[viewerIndex]?.type || '').startsWith('image/') ? (
              <img 
                src={attachmentList[viewerIndex].dataUrl} 
                alt="evidence preview" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-300"
                id="evidence-viewer-img"
              />
            ) : (
              <iframe 
                src={attachmentList[viewerIndex].dataUrl} 
                className="w-full h-full border-0 rounded-xl bg-white"
                title="pdf preview"
              />
            )}
            
            {/* Viewer Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/20 text-white z-50">
              <span className="text-xs font-bold mr-2">
                {viewerIndex + 1} / {attachmentList.length}
              </span>
              <div className="h-4 w-px bg-white/20"></div>
              
              <button 
                onClick={() => {
                  const img = document.getElementById('evidence-viewer-img');
                  if (img) {
                    const currentScale = parseFloat(img.style.transform.replace('scale(', '').replace(')', '') || '1');
                    img.style.transform = `scale(${currentScale + 0.25})`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                onClick={() => {
                  const img = document.getElementById('evidence-viewer-img');
                  if (img) {
                    const currentScale = parseFloat(img.style.transform.replace('scale(', '').replace(')', '') || '1');
                    img.style.transform = `scale(${Math.max(0.5, currentScale - 0.25)})`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button 
                onClick={() => {
                  const img = document.getElementById('evidence-viewer-img');
                  if (img) {
                    const currentRot = parseInt(img.dataset.rot || '0') + 90;
                    img.dataset.rot = currentRot.toString();
                    const currentScale = parseFloat(img.style.transform.replace(/.*scale\(([^)]+)\).*/, '$1') || '1');
                    img.style.transform = `scale(${currentScale}) rotate(${currentRot}deg)`;
                  }
                }}
                className="hover:text-primary-400 transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              
              <div className="h-4 w-px bg-white/20"></div>
              
              <a 
                href={attachmentList[viewerIndex].dataUrl} 
                download={attachmentList[viewerIndex].name}
                className="hover:text-emerald-400 transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </a>
              <button 
                onClick={() => {
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
                        <head><title>พิมพ์เอกสาร</title></head>
                        <body style="margin:0;display:flex;justify-content:center;background:#ccc;" onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                          ${String(attachmentList[viewerIndex]?.type || '').startsWith('image/') 
                            ? `<img src="${attachmentList[viewerIndex].dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" />` 
                            : `<iframe src="${attachmentList[viewerIndex].dataUrl}" style="width:100vw;height:100vh;border:0;"></iframe>`}
                        </body>
                      </html>
                    `);
                    w.document.close();
                  }
                }}
                className="hover:text-amber-400 transition-colors"
                title="Print"
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
