import { ExpenseRequest, DepartmentBudget, ExpenseCategoryConfig } from '../types';

export const DEPARTMENTS = [
  'ไอที (IT)',
  'ฝ่ายขาย (Sales)',
  'การตลาด (Marketing)',
  'ทรัพยากรบุคคล (HR)',
  'บัญชีและการเงิน (Finance)'
];

export const CATEGORIES_CONFIG: Record<string, ExpenseCategoryConfig> = {
  travel: {
    id: 'travel',
    name: 'ค่าเดินทางและที่พัก',
    limitPerRequest: 15000,
    requiresReceipt: true,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  },
  meals: {
    id: 'meals',
    name: 'ค่ารับรองและอาหาร',
    limitPerRequest: 3000,
    requiresReceipt: true,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  },
  equipment: {
    id: 'equipment',
    name: 'อุปกรณ์สำนักงาน/เครื่องมือ',
    limitPerRequest: 50000,
    requiresReceipt: true,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  },
  software: {
    id: 'software',
    name: 'ค่าซอฟต์แวร์และคลาวด์',
    limitPerRequest: 20000,
    requiresReceipt: true,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  training: {
    id: 'training',
    name: 'ค่าฝึกอบรมและสัมมนา',
    limitPerRequest: 25000,
    requiresReceipt: true,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
  },
  marketing: {
    id: 'marketing',
    name: 'ค่าโฆษณาและการตลาด',
    limitPerRequest: 100000,
    requiresReceipt: true,
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
  },
  other: {
    id: 'other',
    name: 'ค่าใช้จ่ายอื่นๆ',
    limitPerRequest: 5000,
    requiresReceipt: false,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
};

export const INITIAL_BUDGETS: DepartmentBudget[] = [
  {
    department: 'ไอที (IT)',
    allocated: 500000,
    spent: 0,
    pending: 0,
    color: '#3B82F6' // Blue
  },
  {
    department: 'ฝ่ายขาย (Sales)',
    allocated: 350000,
    spent: 0,
    pending: 0,
    color: '#F59E0B' // Amber
  },
  {
    department: 'การตลาด (Marketing)',
    allocated: 600000,
    spent: 0,
    pending: 0,
    color: '#EC4899' // Pink
  },
  {
    department: 'ทรัพยากรบุคคล (HR)',
    allocated: 200000,
    spent: 0,
    pending: 0,
    color: '#8B5CF6' // Purple
  },
  {
    department: 'บัญชีและการเงิน (Finance)',
    allocated: 150000,
    spent: 0,
    pending: 0,
    color: '#10B981' // Emerald
  }
];

export const INITIAL_REQUESTS: ExpenseRequest[] = [
  {
    id: 'EXP-2026-001',
    title: 'ค่าสมาชิกคลาวด์ AWS รายเดือน (มิถุนายน)',
    amount: 18500,
    category: 'software',
    date: '2026-06-28',
    department: 'ไอที (IT)',
    employeeName: 'สมชาย รักดี',
    employeeRole: 'Lead Cloud Engineer',
    status: 'pending',
    receiptName: 'AWS_Invoice_June_2026.pdf',
    description: 'ค่าบริการรายเดือน AWS Cloud สำหรับระบบ Production ของบริษัท เพื่อรองรับปริมาณทราฟฟิกฝั่งลูกค้า',
    policyStatus: 'compliant',
    policyNotes: ['ผ่านเกณฑ์มาตรฐานของแผนกไอที', 'มีเอกสารใบกำกับภาษีครบถ้วน'],
    approvalHistory: [
      {
        id: 'step-1',
        approverName: 'อนันต์ ตั้งใจจิต',
        approverRole: 'IT Director',
        status: 'approved',
        date: '2026-06-29',
        comment: 'ผ่านการตรวจสอบความจำเป็นทางเทคนิคแล้ว อนุมัติผ่านขั้นตอนแรก'
      },
      {
        id: 'step-2',
        approverName: 'พิพม์ใจ เงินหนา',
        approverRole: 'Finance Director',
        status: 'pending',
        date: '2026-06-29'
      }
    ],
    comments: [
      {
        id: 'c-1',
        author: 'สมชาย รักดี',
        date: '2026-06-28 14:30',
        text: 'ยอดใช้งานเพิ่มขึ้นจากเดือนที่แล้ว 5% เนื่องจากมีโปรเจกต์ใหม่ย้ายเข้าระบบเรียบร้อยครับ'
      }
    ]
  },
  {
    id: 'EXP-2026-002',
    title: 'จัดเลี้ยงอาหารค่ำลูกค้า VIP จากญี่ปุ่น',
    amount: 5200,
    category: 'meals',
    date: '2026-06-27',
    department: 'ฝ่ายขาย (Sales)',
    employeeName: 'ณภัทร วงศ์ษา',
    employeeRole: 'Account Executive',
    status: 'pending',
    receiptName: 'Shakariki_Receipt_3910.png',
    description: 'ค่าอาหารและเครื่องดื่ม ณ ร้าน Shakariki เพื่อต้อนรับและกระชับความสัมพันธ์กับกลุ่มลูกค้า VIP จากบริษัท Marubeni Corporation คาดว่าจะปิดยอดขายไตรมาสนี้ได้',
    policyStatus: 'warning',
    policyNotes: ['เกินเกณฑ์งบประมาณรับรองอาหารค่ำปกติ (เกณฑ์กำหนดไว้ไม่เกิน 3,000 บาทต่อบิลสำหรับพนักงานรายบุคคล)', 'กรุณาแนบรายงานรายชื่อผู้เข้าร่วมประชุม'],
    approvalHistory: [
      {
        id: 'step-1',
        approverName: 'รุ่งโรจน์ สุวรรณรัตน์',
        approverRole: 'Sales VP',
        status: 'pending',
        date: '2026-06-27'
      }
    ],
    comments: [
      {
        id: 'c-2',
        author: 'ณภัทร วงศ์ษา',
        date: '2026-06-27 22:15',
        text: 'ลูกค้ารวมทั้งหมด 4 ท่าน และทีมงานเรา 2 ท่าน รวมเป็น 6 ท่าน เฉลี่ยท่านละไม่ถึง 900 บาท ซึ่งสมเหตุสมผลสำหรับระดับ VIP ครับ'
      }
    ]
  },
  {
    id: 'EXP-2026-003',
    title: 'ซื้อหน้าจอมอนิเตอร์ Dell 27 นิ้ว 2 เครื่อง',
    amount: 14900,
    category: 'equipment',
    date: '2026-06-25',
    department: 'ไอที (IT)',
    employeeName: 'ปวีณา สายดี',
    employeeRole: 'Senior UX Designer',
    status: 'approved',
    receiptName: 'JIB_Computer_Invoice_102.pdf',
    description: 'สั่งซื้อจอ Dell UltraSharp 27" 4K จำนวน 2 จอ สำหรับพนักงานออกแบบ UX/UI ที่เพิ่มเข้ามาใหม่เพื่อใช้ในการออกแบบ UI ความละเอียดสูง',
    policyStatus: 'compliant',
    policyNotes: ['อุปกรณ์มาตรฐานตามตำแหน่งงาน', 'งบประมาณอุปกรณ์คอมพิวเตอร์อยู่ในแผน'],
    approvalHistory: [
      {
        id: 'step-1',
        approverName: 'อนันต์ ตั้งใจจิต',
        approverRole: 'IT Director',
        status: 'approved',
        date: '2026-06-26',
        comment: 'พนักงานออกแบบต้องการความแม่นยำสูง จอนี้จำเป็นจริง'
      },
      {
        id: 'step-2',
        approverName: 'พิพม์ใจ เงินหนา',
        approverRole: 'Finance Director',
        status: 'approved',
        date: '2026-06-27',
        comment: 'มีใบเสนอราคาเปรียบเทียบและใบเสร็จถูกต้องเรียบร้อย โอนเงินเรียบร้อยแล้ว'
      }
    ],
    comments: []
  },
  {
    id: 'EXP-2026-004',
    title: 'ค่าโฆษณา Facebook Ads แคมเปญ Mid-Year Sale',
    amount: 45000,
    category: 'marketing',
    date: '2026-06-20',
    department: 'การตลาด (Marketing)',
    employeeName: 'วิลาสินี มีโชค',
    employeeRole: 'Digital Marketing Specialist',
    status: 'approved',
    receiptName: 'Facebook_Ad_Receipt_99218.pdf',
    description: 'งบประมาณโฆษณา Facebook เพื่อกระตุ้นยอดขายแคมเปญ Mid-Year Sale ประจำปี ผลตอบรับคุ้มค่า มียอดชมเว็บเพิ่มขึ้น 40%',
    policyStatus: 'compliant',
    policyNotes: ['ผ่านงบประมาณการตลาดไตรมาสที่ 2', 'ได้รับการอนุมัติแผนล่วงหน้าแล้ว'],
    approvalHistory: [
      {
        id: 'step-1',
        approverName: 'รพีพร สวยประดับ',
        approverRole: 'Marketing Director',
        status: 'approved',
        date: '2026-06-21',
        comment: 'แคมเปญสร้างยอดจองได้ทะลุเป้าหมาย แผนกการตลาดรับรองค่ะ'
      },
      {
        id: 'step-2',
        approverName: 'พิพม์ใจ เงินหนา',
        approverRole: 'Finance Director',
        status: 'approved',
        date: '2026-06-22',
        comment: 'อนุมัติจ่ายตามรอบบิลบัตรเครดิตบริษัท'
      }
    ],
    comments: []
  },
  {
    id: 'EXP-2026-005',
    title: 'ตั๋วเครื่องบินไปกลับ กทม.-เชียงใหม่ ประชุมสัญจร',
    amount: 6500,
    category: 'travel',
    date: '2026-06-15',
    department: 'ทรัพยากรบุคคล (HR)',
    employeeName: 'มานพ กล้าหาญ',
    employeeRole: 'HR Manager',
    status: 'rejected',
    receiptName: 'AirAsia_Booking_KTX881.pdf',
    description: 'เดินทางไปประชุมสัญจรกับสาขาเชียงใหม่ เพื่อทดลองระบบประเมินพนักงานใหม่แบบตัวต่อตัว',
    policyStatus: 'violation',
    policyNotes: ['เป็นการประชุมที่สามารถประชุมออนไลน์ได้ตามมาตรการควบคุมค่าใช้จ่ายการเดินทาง', 'ไม่ได้ขอความเห็นชอบล่วงหน้าอย่างน้อย 7 วันทำการ'],
    approvalHistory: [
      {
        id: 'step-1',
        approverName: 'พิมพ์ใจ เงินหนา',
        approverRole: 'Finance Director',
        status: 'rejected',
        date: '2026-06-16',
        comment: 'เนื่องจากนโยบายประหยัดค่าเดินทาง บริษัทรณรงค์ให้ใช้ระบบ Zoom/Teams สำหรับการประชุมภายในค่ะ แผนการเดินทางนี้ไม่ได้ประเมินความคุ้มค่าล่วงหน้า ขอปฏิเสธบิลนี้และให้ใช้การประชุมออนไลน์แทน'
      }
    ],
    comments: [
      {
        id: 'c-3',
        author: 'มานพ กล้าหาญ',
        date: '2026-06-15 11:00',
        text: 'การประชุมตัวต่อตัวกับหัวหน้าฝ่ายผลิตที่เชียงใหม่ช่วยให้คุยเรื่องความขัดแย้งได้ดีขึ้นครับ'
      },
      {
        id: 'c-4',
        author: 'พิมพ์ใจ เงินหนา',
        date: '2026-06-16 09:30',
        text: 'เข้าใจความจำเป็นค่ะ แต่บอร์ดผู้บริหารมีมติคุมงบเดินทางอย่างเคร่งครัด รบกวนปรับเปลี่ยนเป็นรูปแบบไฮบริดนะคะ'
      }
    ]
  },
  {
    id: 'EXP-2026-006',
    title: 'ค่าแท็กซี่ไปพบลูกค้าร้านกาแฟ Starbuck สาขาชิดลม',
    amount: 320,
    category: 'travel',
    date: '2026-06-29',
    department: 'ฝ่ายขาย (Sales)',
    employeeName: 'ณภัทร วงศ์ษา',
    employeeRole: 'Account Executive',
    status: 'draft',
    description: 'เดินทางไปเสนอขายสินค้าเสริมให้แก่ผู้จัดการร้านเพื่อพิจารณาใช้งานเพิ่มเติม ขากลับฝนตกหนักจึงเรียกใช้บริการ Grab Car',
    policyStatus: 'compliant',
    policyNotes: ['มีบิลอิเล็กทรอนิกส์จากแอปพลิเคชัน Grab', 'เป็นระยะทางและเวลาทำงานที่ถูกต้อง'],
    approvalHistory: [],
    comments: []
  }
];

export const MOCK_RECEIPTS = [
  {
    id: 'r-1',
    merchant: 'GrabTaxi Holdings',
    date: '2026-06-29',
    amount: 320.00,
    items: [{ name: 'ค่าเดินทาง (GrabCar) - ชิดลม', price: 320.00 }],
    taxId: '0105555021234'
  },
  {
    id: 'r-2',
    merchant: 'บริษัท แอดวานซ์ ไวร์เลส เน็ทเวิร์ค จำกัด',
    date: '2026-07-01',
    amount: 1284.00,
    items: [{ name: 'ค่าบริการอินเทอร์เน็ตสำนักงานและเบอร์พื้นฐาน', price: 1200.00 }, { name: 'VAT 7%', price: 84.00 }],
    taxId: '0105557000123'
  },
  {
    id: 'r-3',
    merchant: 'สตาบัคส์ คอฟฟี่ เซ็นทรัลเวิลด์',
    date: '2026-07-02',
    amount: 1450.00,
    items: [
      { name: 'Cold Brew Venti', price: 185.00 },
      { name: 'Ham & Double Cheese Sandwich', price: 145.00 },
      { name: 'ประชุมทีมงานและคู่ค้า (รวม 5 ท่าน)', price: 1120.00 }
    ],
    taxId: '0105541009876'
  }
];
