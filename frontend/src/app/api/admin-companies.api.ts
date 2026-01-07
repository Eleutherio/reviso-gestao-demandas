import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyDto, CompanyType } from './company';

export interface CreateCompanyDto {
  name: string;
  type: CompanyType;
  segment: string;
  contactEmail: string;
  site?: string | null;
  usefulLinks?: string[] | null;
}

export interface UpdateCompanyDto {
  name: string;
  type: CompanyType;
  active?: boolean | null;
  segment: string;
  contactEmail: string;
  site?: string | null;
  usefulLinks?: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class AdminCompaniesApi {
  constructor(private readonly http: HttpClient) {}

  listCompanies(): Observable<CompanyDto[]> {
    return this.http.get<CompanyDto[]>('/api/admin/companies');
  }

  createCompany(dto: CreateCompanyDto): Observable<CompanyDto> {
    return this.http.post<CompanyDto>('/api/admin/companies', dto);
  }

  updateCompany(id: string, dto: UpdateCompanyDto): Observable<CompanyDto> {
    return this.http.patch<CompanyDto>(`/api/admin/companies/${id}`, dto);
  }
}
