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

export const INITIAL_BUDGETS: DepartmentBudget[] = [];
export const INITIAL_REQUESTS: ExpenseRequest[] = [];
export const MOCK_RECEIPTS: any[] = []
