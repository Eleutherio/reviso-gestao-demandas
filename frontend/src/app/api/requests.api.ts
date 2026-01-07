import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, RequestDto } from './request';
import type { RequestEventDto } from './request-event';

export type RequestStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'DELIVERED'
  | 'DONE'
  | 'CANCELED'
  | 'CLOSED';

export interface ChangeStatusDto {
  toStatus: RequestStatus;
  message?: string | null;
  actorId?: string | null;
}

export interface AssignRequestDto {
  assigneeId: string;
  actorId?: string | null;
}

export interface CommentDto {
  message: string;
  actorId?: string | null;
  visibleToClient?: boolean | null;
}

export interface RevisionDto {
  message?: string | null;
  actorId?: string | null;
}

export type SortDirection = 'asc' | 'desc';

export interface ListRequestsParams {
  status?: RequestStatus;
  priority?: string;
  type?: string;
  companyId?: string;
  dueBefore?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: SortDirection;
}

export interface CreateRequestDto {
  companyId: string;
  briefingId?: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
  department: string;
  dueDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RequestsApi {
  constructor(private readonly http: HttpClient) {}

  list(params: ListRequestsParams = {}): Observable<Page<RequestDto>> {
    const qp: Record<string, string> = {};

    if (params.status) qp['status'] = params.status;
    if (params.priority) qp['priority'] = params.priority;
    if (params.type) qp['type'] = params.type;
    if (params.companyId) qp['companyId'] = params.companyId;
    if (params.dueBefore) qp['dueBefore'] = params.dueBefore;
    if (params.createdFrom) qp['createdFrom'] = params.createdFrom;
    if (params.createdTo) qp['createdTo'] = params.createdTo;

    qp['page'] = String(params.page ?? 0);
    qp['size'] = String(params.size ?? 20);
    qp['sortBy'] = params.sortBy ?? 'createdAt';
    qp['direction'] = params.direction ?? 'desc';

    const query = Object.entries(qp)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    return this.http.get<Page<RequestDto>>(`/api/requests?${query}`);
  }

  create(dto: CreateRequestDto): Observable<RequestDto> {
    return this.http.post<RequestDto>('/api/requests', dto);
  }

  getById(id: string): Observable<RequestDto> {
    return this.http.get<RequestDto>(`/api/requests/${id}`);
  }

  listEvents(id: string, onlyVisibleToClient = false): Observable<RequestEventDto[]> {
    const url = `/api/requests/${id}/events?onlyVisibleToClient=${
      onlyVisibleToClient ? 'true' : 'false'
    }`;
    return this.http.get<RequestEventDto[]>(url);
  }

  changeStatus(id: string, dto: ChangeStatusDto): Observable<RequestEventDto> {
    return this.http.post<RequestEventDto>(`/api/requests/${id}/status`, dto);
  }

  assign(id: string, dto: AssignRequestDto): Observable<RequestEventDto> {
    return this.http.post<RequestEventDto>(`/api/requests/${id}/assign`, dto);
  }

  addComment(id: string, dto: CommentDto): Observable<RequestEventDto> {
    return this.http.post<RequestEventDto>(`/api/requests/${id}/comments`, dto);
  }

  addRevision(id: string, dto: RevisionDto): Observable<RequestEventDto> {
    return this.http.post<RequestEventDto>(`/api/requests/${id}/revisions`, dto);
  }
}
