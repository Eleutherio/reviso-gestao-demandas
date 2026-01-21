import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import type { UserRole } from './roles';

type LoginResponse = {
  token: string;
  fullName?: string | null;
  email?: string | null;
  role?: UserRole | string | null;
  companyId?: string | null;
};

type JwtPayload = {
  role?: UserRole | string;
  email?: string;
  cid?: string;
  companyId?: string;
  exp?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'reviso_token';
  private readonly userNameKey = 'reviso_user_name';
  private readonly userEmailKey = 'reviso_user_email';

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string, agencyCode: string): Observable<void> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password, agencyCode }).pipe(
      tap((res) => this.persistLogin(res)),
      map(() => void 0)
    );
  }

  loginClient(companyCode: string, email: string, password: string): Observable<void> {
    return this.http
      .post<LoginResponse>('/api/auth/login-client', { companyCode, email, password })
      .pipe(
        tap((res) => this.persistLogin(res)),
        map(() => void 0)
      );
  }

  recoverCompanyCode(email: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>('/api/auth/recover-company-code', { email });
  }

  recoverAgencyCode(email: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>('/api/auth/recover-agency-code', { email });
  }

  recoverAgencyPassword(email: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>('/api/auth/recover-agency-password', { email });
  }

  confirmAgencyPassword(
    email: string,
    token: string,
    newPassword: string
  ): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>('/api/auth/recover-agency-password/confirm', {
      email,
      token,
      newPassword,
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userNameKey);
    localStorage.removeItem(this.userEmailKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = this.decodeJwt(token);
    const exp = payload?.exp;
    if (typeof exp !== 'number') return true;
    const nowSec = Math.floor(Date.now() / 1000);
    if (exp <= nowSec) {
      this.logout();
      return false;
    }
    return true;
  }

  decodeJwt(token?: string | null): JwtPayload | null {
    const raw = token ?? this.getToken();
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length < 2) return null;

    try {
      const payloadBase64Url = parts[1];
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadBase64.padEnd(
        payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
        '='
      );
      const json = atob(padded);
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  getRole(): UserRole | null {
    const role = this.decodeJwt()?.role;
    if (role === 'AGENCY_ADMIN' || role === 'AGENCY_USER' || role === 'CLIENT_USER') return role;
    return null;
  }

  getCompanyId(): string | null {
    const payload = this.decodeJwt();
    const companyId = payload?.companyId ?? payload?.cid;
    return typeof companyId === 'string' && companyId.length > 0 ? companyId : null;
  }

  getDisplayName(): string | null {
    const storedName = localStorage.getItem(this.userNameKey);
    if (storedName && storedName.trim()) return storedName;

    const storedEmail = localStorage.getItem(this.userEmailKey);
    if (storedEmail && storedEmail.trim()) return storedEmail;

    const tokenEmail = this.decodeJwt()?.email;
    return typeof tokenEmail === 'string' && tokenEmail.trim() ? tokenEmail : null;
  }

  private persistLogin(res: LoginResponse | null | undefined): void {
    const token = res?.token;
    if (!token) throw new Error('Token ausente no login');
    localStorage.setItem(this.tokenKey, token);

    const fullName = res?.fullName?.trim() ?? '';
    if (fullName) {
      localStorage.setItem(this.userNameKey, fullName);
    } else {
      localStorage.removeItem(this.userNameKey);
    }

    const email = res?.email?.trim() ?? this.decodeJwt(token)?.email ?? '';
    if (email) {
      localStorage.setItem(this.userEmailKey, email);
    } else {
      localStorage.removeItem(this.userEmailKey);
    }
  }
}
