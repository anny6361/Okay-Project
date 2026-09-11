import { dataGateway } from '../lib/data-gateway';
import {
  assertProjectId,
  createDocumentSnapshot,
  ProjectMaster,
  ProjectAllocation,
  ProcurementDocumentType,
  ProcurementDocumentBase
} from '../domain/procurement';

const PROJECTS_KEY = 'okey_projects';
const PROJECT_ALLOCATIONS_KEY = 'okey_project_allocations';
const PROCUREMENT_DOCUMENTS_KEY = 'okey_procurement_documents';

function readArray<T>(key: string): T[] {
  return dataGateway.read<T[]>(key, []);
}

function writeArray<T>(key: string, value: T[]): void {
  dataGateway.write(key, value);
}

export function listProjects(): ProjectMaster[] {
  return readArray<ProjectMaster>(PROJECTS_KEY);
}

export function getProject(projectId: string): ProjectMaster | null {
  const id = assertProjectId(projectId);
  return listProjects().find(project => project.project_id === id) || null;
}

export function listProjectAllocations(projectId: string): ProjectAllocation[] {
  const id = assertProjectId(projectId);
  return readArray<ProjectAllocation>(PROJECT_ALLOCATIONS_KEY)
    .filter(item => item.project_id === id);
}

export function buildDocumentContext(
  projectId: string,
  type: ProcurementDocumentType,
  existing?: Partial<ProcurementDocumentBase>
): ProcurementDocumentBase {
  const project = getProject(projectId);
  if (!project) throw new Error(`ไม่พบโครงการ ${projectId}`);

  const now = new Date().toISOString();
  return {
    id: existing?.id || `${type}-${Date.now()}`,
    document_type: type,
    project_id: project.project_id,
    project,
    allocation_id: existing?.allocation_id,
    budget_code_id: existing?.budget_code_id,
    account_code_id: existing?.account_code_id,
    snapshot: existing?.snapshot || createDocumentSnapshot(project),
    document_no: existing?.document_no,
    status: existing?.status || 'draft',
    created_at: existing?.created_at || now,
    updated_at: now,
    created_by: existing?.created_by,
    updated_by: existing?.updated_by
  };
}

export function saveProcurementDocument(document: ProcurementDocumentBase): ProcurementDocumentBase {
  assertProjectId(document.project_id);
  const documents = readArray<ProcurementDocumentBase>(PROCUREMENT_DOCUMENTS_KEY);
  const index = documents.findIndex(item => item.id === document.id);
  const next = { ...document, updated_at: new Date().toISOString() };
  if (index >= 0) documents[index] = next;
  else documents.push(next);
  writeArray(PROCUREMENT_DOCUMENTS_KEY, documents);
  return next;
}

export function listProcurementDocuments(projectId?: string): ProcurementDocumentBase[] {
  const documents = readArray<ProcurementDocumentBase>(PROCUREMENT_DOCUMENTS_KEY);
  if (!projectId) return documents;
  const id = assertProjectId(projectId);
  return documents.filter(item => item.project_id === id);
}
