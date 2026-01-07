export type AgencyDepartment = 'DESIGN' | 'COPY' | 'DEV' | 'PLANNING' | 'PRODUCTION' | 'MEDIA';

export type RequestType = string;
export type RequestPriority = string;
export type RequestStatus = string;

export interface RequestDto {
  id: string;
  companyId: string;
  companyName: string;
  briefingId: string | null;
  title: string;
  description: string | null;
  type: RequestType;
  priority: RequestPriority;
  department: AgencyDepartment;
  status: RequestStatus;
  assigneeId: string | null;
  dueDate: string | null;
  revisionCount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ConvertBriefingDto {
  department: AgencyDepartment;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
