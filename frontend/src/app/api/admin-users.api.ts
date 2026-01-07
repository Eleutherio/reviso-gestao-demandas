import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDto, UserRole } from './user';

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApi {
  constructor(private readonly http: HttpClient) {}

  listUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>('/api/admin/users');
  }

  createUser(dto: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>('/api/admin/users', dto);
  }
}
