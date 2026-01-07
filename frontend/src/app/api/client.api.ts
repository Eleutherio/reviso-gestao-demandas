import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { BriefingDto, CreateBriefingDto } from './briefing';
import type { RequestDto } from './request';
import type { RequestEventDto } from './request-event';

@Injectable({ providedIn: 'root' })
export class ClientApi {
  constructor(private readonly http: HttpClient) {}

  createBriefing(dto: CreateBriefingDto): Observable<BriefingDto> {
    return this.http.post<BriefingDto>('/api/briefings', dto);
  }

  listMyBriefings(): Observable<BriefingDto[]> {
    return this.http.get<BriefingDto[]>('/api/briefings/mine');
  }

  listMyRequests(): Observable<RequestDto[]> {
    return this.http.get<RequestDto[]>('/api/requests/mine');
  }

  listRequestEventsVisibleToClient(requestId: string): Observable<RequestEventDto[]> {
    return this.http.get<RequestEventDto[]>(
      `/api/requests/${requestId}/events?onlyVisibleToClient=true`
    );
  }
}
