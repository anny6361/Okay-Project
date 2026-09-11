/**
 * Central procurement domain contract.
 *
 * PROJECTS is the business context for every procurement document.
 * Documents should store PROJECT_ID; issued documents may also store a snapshot
 * so historical documents do not change when master data is later edited.
 */
export interface ProjectAllocation {
  id: string;
  project_id: string;
  budget_code_id: string;
  account_code_id?: string;
  allocated_amount: number;
  spent_amount?: number;
  committed_amount?: number;
  status?: 'active' | 'closed' | 'cancelled';
}

export interface ProjectMaster {
  project_id: string;
  project_code: string;
  project_name: string;
  fiscal_year?: string;
  department_id?: string;
  owner_employee_id?: string;
  description?: string;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  budget_total?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ProcurementDocumentContext {
  project_id: string;
  project?: ProjectMaster;
  allocation_id?: string;
  budget_code_id?: string;
  account_code_id?: string;
  snapshot?: Record<string, unknown>;
}

export type ProcurementDocumentType = 'TOR' | 'REQUEST' | 'ANNOUNCEMENT' | 'RESULT' | 'PO';

export interface ProcurementDocumentBase extends ProcurementDocumentContext {
  id: string;
  document_type: ProcurementDocumentType;
  document_no?: string;
  status: 'draft' | 'pending' | 'approved' | 'issued' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export function assertProjectId(projectId: string): string {
  const value = String(projectId || '').trim();
  if (!value) throw new Error('เอกสารจัดซื้อจัดจ้างต้องระบุ PROJECT_ID');
  return value;
}

export function createDocumentSnapshot(project: ProjectMaster): Record<string, unknown> {
  return {
    project_id: project.project_id,
    project_code: project.project_code,
    project_name: project.project_name,
    fiscal_year: project.fiscal_year,
    department_id: project.department_id,
    owner_employee_id: project.owner_employee_id,
    description: project.description,
    status: project.status,
    budget_total: project.budget_total
  };
}
