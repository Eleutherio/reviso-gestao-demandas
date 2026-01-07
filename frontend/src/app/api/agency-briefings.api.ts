import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { BriefingDto } from './briefing';
import type { ConvertBriefingDto, RequestDto } from './request';

@Injectable({ providedIn: 'root' })
export class AgencyBriefingsApi {
  constructor(private readonly http: HttpClient) {}

  listBriefings(status?: string): Observable<BriefingDto[]> {
    const url = status
      ? `/api/agency/briefings?status=${encodeURIComponent(status)}`
      : '/api/agency/briefings';
    return this.http.get<BriefingDto[]>(url);
  }

  convertBriefing(id: string, dto: ConvertBriefingDto): Observable<RequestDto> {
    return this.http.post<RequestDto>(`/api/agency/briefings/${id}/convert`, dto);
  }

  rejectBriefing(id: string): Observable<void> {
    return this.http.patch<void>(`/api/agency/briefings/${id}/reject`, {});
  }
}
