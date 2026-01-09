import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, map, of, startWith, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AdminUsersApi } from '../../api/admin-users.api';
import { CreateUserDto } from '../../api/admin-users.api';
import { UserDto, UserRole } from '../../api/user';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <h2>Usuários</h2>
    <p>
      Role atual: <strong>{{ role }}</strong>
    </p>

    <div style="padding: 12px 0;">
      <h3>Criar usuário</h3>

      <form (submit)="onSubmit($event)" style="display: grid; gap: 8px; max-width: 720px;">
        <label style="display: grid; gap: 4px;">
          Nome completo
          <input
            name="fullName"
            required
            [value]="form.fullName"
            (input)="form.fullName = getValue($event)"
          />
        </label>

        <label style="display: grid; gap: 4px;">
          Email
          <input
            name="email"
            type="email"
            required
            [value]="form.email"
            (input)="form.email = getValue($event)"
          />
        </label>

        <label style="display: grid; gap: 4px;">
          Senha
          <input
            name="password"
            type="password"
            required
            [value]="form.password"
            (input)="form.password = getValue($event)"
          />
        </label>

        <label style="display: grid; gap: 4px;">
          Role
          <select
            name="role"
            required
            [value]="form.role"
            (change)="form.role = getUserRole($event)"
          >
            <option value="AGENCY_ADMIN">AGENCY_ADMIN</option>
            <option value="AGENCY_USER">AGENCY_USER</option>
            <option value="CLIENT_USER">CLIENT_USER</option>
          </select>
        </label>

        <label style="display: grid; gap: 4px;">
          CompanyId (obrigatório para CLIENT_USER)
          <input
            name="companyId"
            placeholder="UUID da empresa"
            [value]="form.companyIdText"
            (input)="form.companyIdText = getValue($event)"
          />
        </label>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button type="submit">Criar</button>
          @if (formError) {
          <span style="color: inherit;">{{ formError }}</span>
          }
        </div>
      </form>
    </div>

    @if (vm$ | async; as vm) { @if (vm.status === 'loading') {
    <p>Carregando...</p>
    } @else if (vm.status === 'error') {
    <p style="color: inherit;">Erro ao carregar usuários: {{ vm.message }}</p>
    } @else {
    <p>
      Total: <strong>{{ vm.users.length }}</strong>
    </p>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px;">Nome</th>
            <th style="text-align: left; padding: 8px;">Email</th>
            <th style="text-align: left; padding: 8px;">Role</th>
            <th style="text-align: left; padding: 8px;">Ativo</th>
            <th style="text-align: left; padding: 8px;">Company</th>
            <th style="text-align: left; padding: 8px;">Criado em</th>
          </tr>
        </thead>
        <tbody>
          @for (u of vm.users; track u.id) {
          <tr>
            <td style="padding: 8px;">{{ u.fullName }}</td>
            <td style="padding: 8px;">{{ u.email }}</td>
            <td style="padding: 8px;">{{ u.role }}</td>
            <td style="padding: 8px;">{{ u.active ? 'Sim' : 'Não' }}</td>
            <td style="padding: 8px;">{{ u.companyId ?? '-' }}</td>
            <td style="padding: 8px;">{{ u.createdAt | date : 'dd/MM/yyyy HH:mm' }}</td>
          </tr>
          }
        </tbody>
      </table>
    </div>
    } }
  `,
})
export class AdminUsersComponent {
  readonly role;
  readonly vm$;

  form: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    companyIdText: string;
  } = {
    fullName: '',
    email: '',
    password: '',
    role: 'AGENCY_USER',
    companyIdText: '',
  };

  formError: string | null = null;

  private readonly refresh$ = new Subject<void>();

  constructor(private readonly auth: AuthService, private readonly api: AdminUsersApi) {
    this.role = this.auth.getRole();

    this.vm$ = this.refresh$.pipe(
      startWith(undefined),
      switchMap(() => this.api.listUsers()),
      map((users: UserDto[]) => ({ status: 'ready' as const, users })),
      startWith({ status: 'loading' as const }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            return of({
              status: 'error' as const,
              message: 'Não autenticado (401). Faça login novamente.',
            });
          }
          if (err.status === 403) {
            return of({
              status: 'error' as const,
              message: 'Sem permissão (403). Este endpoint exige AGENCY_ADMIN.',
            });
          }
          return of({
            status: 'error' as const,
            message: `Erro HTTP ${err.status}: ${err.statusText || 'Falha ao carregar'}`,
          });
        }

        const message = err instanceof Error ? err.message : 'Falha inesperada';
        return of({ status: 'error' as const, message });
      })
    );
  }

  getValue(ev: Event): string {
    const target = ev.target as HTMLInputElement;
    return target.value;
  }

  getUserRole(ev: Event): UserRole {
    const target = ev.target as HTMLSelectElement;
    return target.value as UserRole;
  }

  private resetForm(): void {
    this.form = {
      fullName: '',
      email: '',
      password: '',
      role: 'AGENCY_USER',
      companyIdText: '',
    };
  }

  async onSubmit(ev: Event): Promise<void> {
    ev.preventDefault();
    this.formError = null;

    const companyId = this.form.companyIdText.trim() || null;
    if (this.form.role === 'CLIENT_USER' && !companyId) {
      this.formError = 'Para CLIENT_USER, informe o companyId.';
      return;
    }

    const dto: CreateUserDto = {
      fullName: this.form.fullName.trim(),
      email: this.form.email.trim(),
      password: this.form.password,
      role: this.form.role,
      companyId,
    };

    try {
      await firstValueFrom(this.api.createUser(dto));
      this.resetForm();
      this.refresh$.next();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.formError = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao criar'
        }`;
        return;
      }
      this.formError = err instanceof Error ? err.message : 'Falha inesperada ao criar usuário';
    }
  }
}
