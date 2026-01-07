import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OverdueDto {
  total: number;
}

export interface CycleTimeDto {
  avgDays: number;
  avgHours: number;
  avgSeconds: number;
}

export interface RequestsByStatusDto {
  status: string;
  total: number;
}

export interface ReworkMetricsDto {
  reworkCount: number;
  totalCount: number;
  reworkPercentage: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  constructor(private readonly http: HttpClient) {}

  overdue(atIso?: string): Observable<OverdueDto> {
    const url = atIso
      ? `/api/reports/overdue?at=${encodeURIComponent(atIso)}`
      : '/api/reports/overdue';
    return this.http.get<OverdueDto>(url);
  }

  avgCycleTime(fromIso: string, toIso: string): Observable<CycleTimeDto> {
    return this.http.get<CycleTimeDto>(
      `/api/reports/avg-cycle-time?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(
        toIso
      )}`
    );
  }

  reworkMetrics(fromIso: string, toIso: string): Observable<ReworkMetricsDto> {
    return this.http.get<ReworkMetricsDto>(
      `/api/reports/rework-metrics?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(
        toIso
      )}`
    );
  }

  requestsByStatus(fromIso: string, toIso: string): Observable<RequestsByStatusDto[]> {
    return this.http.get<RequestsByStatusDto[]>(
      `/api/reports/requests-by-status?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(
        toIso
      )}`
    );
  }
}
