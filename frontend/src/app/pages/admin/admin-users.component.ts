import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';
import { AdminCompaniesApi } from '../../api/admin-companies.api';
import { AdminUsersApi, CreateUserDto, UpdateUserDto } from '../../api/admin-users.api';
import { CompanyDto } from '../../api/company';
import { UserDto, UserRole } from '../../api/user';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, DatePipe],
  styleUrls: ['./admin-users.component.scss'],
  template: `
    <section class="users-page">
      <header class="users-header">
        <div class="users-title-block">
          <p class="users-eyebrow">Administração</p>
          <h2 class="users-title">Usuários</h2>
          <p class="users-subtitle">
            Gestão simples de papéis do time criativo ou de acesso das empresas.
          </p>
        </div>
      </header>

      <div class="users-grid">
        <section class="users-card users-card--form">
          <div class="users-card__head">
            <h3 class="users-card__title">
              {{ editingId ? 'Editar usuário' : 'Criar novo usuário' }}
            </h3>
            <p class="users-muted">Preencha os dados para criar ou atualizar o cadastro.</p>
          </div>

          <form (submit)="onSubmit($event)" class="users-form">
            <label class="users-field">
              <span class="users-field__label">
                Papel do usuário <span class="users-required">*</span>
              </span>
              <select
                name="role"
                required
                [value]="form.role"
                class="users-select"
                (change)="onRoleChange($event)"
              >
                <option value="AGENCY_ADMIN">{{ roleLabels.AGENCY_ADMIN }}</option>
                <option value="AGENCY_USER">{{ roleLabels.AGENCY_USER }}</option>
                <option value="CLIENT_USER">{{ roleLabels.CLIENT_USER }}</option>
              </select>
            </label>

            <label class="users-field">
              <span class="users-field__label">
                Nome completo <span class="users-required">*</span>
              </span>
              <input
                name="fullName"
                required
                [value]="form.fullName"
                class="users-input"
                [class.users-input--error]="fieldErrors.fullName"
                (input)="onTextInput('fullName', $event)"
              />
              @if (fieldErrors.fullName) {
              <small class="users-error">{{ fieldErrors.fullName }}</small>
              }
            </label>

            <label class="users-field">
              <span class="users-field__label">Email <span class="users-required">*</span></span>
              <input
                name="email"
                type="email"
                required
                [value]="form.email"
                class="users-input"
                [class.users-input--error]="fieldErrors.email"
                (input)="onTextInput('email', $event)"
              />
              @if (fieldErrors.email) {
              <small class="users-error">{{ fieldErrors.email }}</small>
              }
            </label>

            @if (!editingId) {
            <label class="users-field">
              <span class="users-field__label">Senha <span class="users-required">*</span></span>
              <input
                name="password"
                [type]="showPassword ? 'text' : 'password'"
                minlength="8"
                autocomplete="new-password"
                required
                [value]="form.password"
                class="users-input"
                [class.users-input--error]="fieldErrors.password"
                (input)="onTextInput('password', $event)"
              />
              @if (fieldErrors.password) {
              <small class="users-error">{{ fieldErrors.password }}</small>
              }
            </label>
            <label class="users-field">
              <span class="users-field__label">
                Repetir senha <span class="users-required">*</span>
              </span>
              <input
                name="confirmPassword"
                [type]="showPassword ? 'text' : 'password'"
                minlength="8"
                autocomplete="new-password"
                required
                [value]="form.confirmPassword"
                class="users-input"
                [class.users-input--error]="fieldErrors.confirmPassword"
                (input)="onTextInput('confirmPassword', $event)"
              />
              @if (fieldErrors.confirmPassword) {
              <small class="users-error">{{ fieldErrors.confirmPassword }}</small>
              }
            </label>
            <div class="users-form__row">
              <label class="users-check">
                <input
                  type="checkbox"
                  [checked]="showPassword"
                  (change)="showPassword = getChecked($event)"
                />
                <span>Mostrar senha</span>
              </label>
              <small class="users-muted">Mínimo 8 caracteres.</small>
            </div>
            }

            @if (editingId) {
            <label class="users-field">
              <span class="users-field__label">Ativo</span>
              <select
                name="active"
                [value]="form.activeStr"
                class="users-select"
                (change)="form.activeStr = getBoolStr($event)"
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            }

            @if (form.role === 'CLIENT_USER') {
            <label class="users-field">
              <span class="users-field__label">
                Empresa (código ou UUID) <span class="users-required">*</span>
              </span>
              <input
                name="companyId"
                list="company-options"
                placeholder="CABC-CL-XXX"
                [value]="form.companyIdText"
                class="users-input"
                [class.users-input--error]="fieldErrors.companyId"
                (input)="onTextInput('companyId', $event)"
              />
              @if (fieldErrors.companyId) {
              <small class="users-error">{{ fieldErrors.companyId }}</small>
              } @else {
              <small class="users-muted">Ex.: CABC-CL-XXX ou UUID.</small>
              }
            </label>

            <datalist id="company-options">
              @for (c of clientCompanies; track c.id) {
              <option [value]="c.companyCode">{{ c.name }} ({{ c.companyCode }})</option>
              }
            </datalist>

            @if (clientCompanies.length === 0) {
            <small class="users-muted">
              Cadastre uma empresa cliente para usar o código.
            </small>
            }
            }

            <div class="users-form__actions">
              <button type="submit" class="btn btn--primary">
                Salvar
              </button>
              @if (editingId) {
              <button type="button" class="btn btn--ghost" (click)="cancelEdit()">
                Cancelar
              </button>
              }
            </div>
            @if (formError) {
            <div class="users-alert users-alert--error">{{ formError }}</div>
            }
          </form>
        </section>

        <section class="users-card users-card--list">
          <div class="users-card__head users-card__head--row">
            <div>
              <h3 class="users-card__title">Usuários cadastrados</h3>
              <p class="users-muted">Filtre e acompanhe os acessos do time.</p>
            </div>
          </div>

          @if (vm$ | async; as vm) {
          @if (vm.status === 'loading') {
          <div class="users-state">Carregando...</div>
          } @else if (vm.status === 'error') {
          <div class="users-alert users-alert--error">
            Erro ao carregar usuários: {{ vm.message }}
          </div>
          } @else {
          <div class="users-toolbar">
            <div class="users-total">
              <span>Total</span>
              <strong>{{ vm.users.length }}</strong>
            </div>
          </div>

          <div class="users-filters">
            <label class="users-field">
              <span class="users-field__label">Buscar usuários</span>
              <input
                name="search"
                placeholder="Nome, email, empresa ou código"
                [value]="searchTerm"
                class="users-input"
                (input)="searchTerm = getValue($event)"
              />
            </label>

            <label class="users-field">
              <span class="users-field__label">Papel do usuário</span>
              <select
                name="filterRole"
                [value]="filterRole"
                class="users-select"
                (change)="filterRole = getFilterRole($event)"
              >
                <option value="">Todas</option>
                <option value="AGENCY_ADMIN">{{ roleLabels.AGENCY_ADMIN }}</option>
                <option value="AGENCY_USER">{{ roleLabels.AGENCY_USER }}</option>
                <option value="CLIENT_USER">{{ roleLabels.CLIENT_USER }}</option>
              </select>
            </label>

            <label class="users-field">
              <span class="users-field__label">Ativo</span>
              <select
                name="filterActive"
                [value]="filterActive"
                class="users-select"
                (change)="filterActive = getFilterActive($event)"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </label>
          </div>

          @if (vm.users.length === 0) {
          <div class="users-empty">Nenhum usuário cadastrado.</div>
          } @else if (getFilteredUsers(vm.users).length === 0) {
          <div class="users-empty">Nenhum usuário encontrado com os filtros atuais.</div>
          } @else {
          <div class="users-table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Papel do usuário</th>
                  <th>Ativo</th>
                  <th>Empresa</th>
                  <th>Código</th>
                  <th>Criado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (u of getFilteredUsers(vm.users); track u.id) {
                <tr>
                  <td>{{ u.fullName }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <span
                      class="users-chip"
                      [class.users-chip--admin]="u.role === 'AGENCY_ADMIN'"
                      [class.users-chip--agency]="u.role === 'AGENCY_USER'"
                      [class.users-chip--client]="u.role === 'CLIENT_USER'"
                    >
                      {{ roleLabels[u.role] ?? u.role }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="users-chip"
                      [class.users-chip--active]="u.active"
                      [class.users-chip--inactive]="!u.active"
                    >
                      {{ u.active ? 'Sim' : 'Não' }}
                    </span>
                  </td>
                  <td>{{ getCompanyName(u) ?? '-' }}</td>
                  <td>
                    <div class="users-code">
                      <span class="users-code__value">{{ u.companyCode ?? '-' }}</span>
                      @if (u.companyCode) {
                      <button
                        type="button"
                        class="btn btn--ghost btn--sm users-copy-btn"
                        (click)="copyCompanyCode(u.companyCode, u.id)"
                      >
                        {{ isCopied(u.id) ? 'Copiado!' : 'Copiar' }}
                      </button>
                      }
                    </div>
                  </td>
                  <td>{{ u.createdAt | date : 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="users-actions">
                    <button
                      type="button"
                      class="btn btn--ghost btn--sm"
                      (click)="startEdit(u)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      (click)="openDeleteModal(u)"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          }
          }
          }
        </section>
      </div>
      @if (deleteTarget) {
      <div class="users-modal" (click)="closeDeleteModal()">
        <div class="users-modal__panel" (click)="$event.stopPropagation()">
          <div class="users-modal__head">
            <h4 class="users-modal__title">Confirmar exclusão</h4>
            <button
              type="button"
              class="users-modal__close"
              aria-label="Fechar"
              [disabled]="deletePending"
              (click)="closeDeleteModal()"
            >
              &times;
            </button>
          </div>
          <p class="users-modal__text">
            Tem certeza que deseja remover <strong>{{ deleteTarget.fullName }}</strong>?
          </p>
          <label class="users-modal__check">
            <input
              type="checkbox"
              [checked]="deleteConfirmed"
              (change)="deleteConfirmed = getChecked($event); deleteError = null"
            />
            <span>Estou ciente que essa ação não pode ser desfeita.</span>
          </label>
          @if (deleteError) {
          <div class="users-alert users-alert--error">{{ deleteError }}</div>
          }
          <div class="users-modal__actions">
            <button
              type="button"
              class="btn btn--ghost"
              [disabled]="deletePending"
              (click)="closeDeleteModal()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn--danger"
              [disabled]="!deleteConfirmed || deletePending"
              (click)="confirmDelete()"
            >
              Remover
            </button>
          </div>
        </div>
      </div>
      }
    </section>`,
})
export class AdminUsersComponent {
  readonly vm$;
  readonly roleLabels: Record<UserRole, string> = {
    AGENCY_ADMIN: 'Administrador',
    AGENCY_USER: 'Usuário',
    CLIENT_USER: 'Cliente',
  };

  companies: CompanyDto[] = [];
  clientCompanies: CompanyDto[] = [];

  private companyById = new Map<string, CompanyDto>();
  private companyByCode = new Map<string, CompanyDto>();

  editingId: string | null = null;

  form: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    companyIdText: string;
    activeStr: 'true' | 'false';
  } = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'AGENCY_USER',
    companyIdText: '',
    activeStr: 'true',
  };

  formError: string | null = null;
  deleteTarget: UserDto | null = null;
  deleteConfirmed = false;
  deletePending = false;
  deleteError: string | null = null;
  copiedUserId: string | null = null;
  private copyResetId: number | null = null;
  fieldErrors: Partial<
    Record<'fullName' | 'email' | 'password' | 'confirmPassword' | 'companyId', string>
  > = {};
  searchTerm = '';
  filterRole: '' | UserRole = '';
  filterActive: 'all' | 'active' | 'inactive' = 'all';
  showPassword = false;

  private readonly refresh$ = new Subject<void>();

  constructor(
    private readonly api: AdminUsersApi,
    private readonly companiesApi: AdminCompaniesApi
  ) {
    this.vm$ = this.refresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        forkJoin({
          users: this.api.listUsers(),
          companies: this.companiesApi.listCompanies(),
        })
      ),
      map(({ users, companies }) => {
        this.setCompanies(companies);
        return { status: 'ready' as const, users };
      }),
      startWith({ status: 'loading' as const }),
      catchError((err: unknown) => {
        this.setCompanies([]);
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

  private setCompanies(companies: CompanyDto[]): void {
    this.companies = companies;
    this.clientCompanies = companies.filter((company) =>
      company.type === 'CLIENT' && company.active
    );
    this.companyById = new Map(companies.map((company) => [company.id, company]));
    this.companyByCode = new Map(
      companies
        .filter((company) => company.companyCode)
        .map((company) => [company.companyCode.toLowerCase(), company])
    );
  }

  getValue(ev: Event): string {
    const target = ev.target as HTMLInputElement;
    return target.value;
  }

  getChecked(ev: Event): boolean {
    const target = ev.target as HTMLInputElement;
    return target.checked;
  }

  getUserRole(ev: Event): UserRole {
    const target = ev.target as HTMLSelectElement;
    return target.value as UserRole;
  }

  getFilterRole(ev: Event): '' | UserRole {
    const target = ev.target as HTMLSelectElement;
    return target.value as '' | UserRole;
  }

  getFilterActive(ev: Event): 'all' | 'active' | 'inactive' {
    const target = ev.target as HTMLSelectElement;
    return target.value as 'all' | 'active' | 'inactive';
  }

  getBoolStr(ev: Event): 'true' | 'false' {
    const target = ev.target as HTMLSelectElement;
    return target.value === 'true' ? 'true' : 'false';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  private isCompanyCode(value: string): boolean {
    return /^[A-Z0-9]{4}-(CL|AG)-[A-Z0-9]{3}(?:-\d{2})?$/i.test(value);
  }

  private normalizeCompanyCode(value: string): string {
    return value.trim().toUpperCase();
  }

  getCompanyName(user: UserDto): string | null {
    if (user.companyId) {
      const company = this.companyById.get(user.companyId);
      if (company?.name) return company.name;
    }

    if (user.companyCode) {
      const company = this.companyByCode.get(user.companyCode.toLowerCase());
      if (company?.name) return company.name;
    }

    return null;
  }

  getFilteredUsers(users: UserDto[]): UserDto[] {
    const term = this.searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (this.filterRole && user.role !== this.filterRole) return false;
      if (this.filterActive === 'active' && !user.active) return false;
      if (this.filterActive === 'inactive' && user.active) return false;

      if (!term) return true;

      const companyId = user.companyId ?? '';
      const companyCode = user.companyCode ?? '';
      const companyName = this.getCompanyName(user) ?? '';
      const roleLabel = this.roleLabels[user.role] ?? user.role;
      const matchesSearch =
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        roleLabel.toLowerCase().includes(term) ||
        companyName.toLowerCase().includes(term) ||
        companyCode.toLowerCase().includes(term) ||
        companyId.toLowerCase().includes(term);

      return matchesSearch;
    });
  }

  startEdit(u: UserDto): void {
    this.formError = null;
    this.fieldErrors = {};
    this.editingId = u.id;
    this.form.fullName = u.fullName;
    this.form.email = u.email;
    this.form.password = '';
    this.form.confirmPassword = '';
    this.form.role = u.role;
    this.form.companyIdText = u.companyCode ?? u.companyId ?? '';
    this.form.activeStr = u.active ? 'true' : 'false';
  }

  cancelEdit(): void {
    this.formError = null;
    this.fieldErrors = {};
    this.editingId = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.form = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'AGENCY_USER',
      companyIdText: '',
      activeStr: 'true',
    };
    this.showPassword = false;
    this.fieldErrors = {};
  }

  onTextInput(
    field: 'fullName' | 'email' | 'password' | 'confirmPassword' | 'companyId',
    ev: Event
  ): void {
    const value = this.getValue(ev);
    if (field === 'fullName') {
      this.form.fullName = value;
    } else if (field === 'email') {
      this.form.email = value;
    } else if (field === 'password') {
      this.form.password = value;
    } else if (field === 'confirmPassword') {
      this.form.confirmPassword = value;
    } else {
      this.form.companyIdText = value;
    }

    if (this.fieldErrors[field] && value.trim()) {
      delete this.fieldErrors[field];
    }
  }

  onRoleChange(ev: Event): void {
    this.form.role = this.getUserRole(ev);
    if (this.form.role !== 'CLIENT_USER') {
      this.form.companyIdText = '';
      delete this.fieldErrors.companyId;
    }
  }

  private validateForm(): boolean {
    const errors: typeof this.fieldErrors = {};

    if (!this.form.fullName.trim()) {
      errors.fullName = 'Informe o nome completo.';
    }

    if (!this.form.email.trim()) {
      errors.email = 'Informe o email.';
    }

    if (!this.editingId) {
      const password = this.form.password.trim();
      const confirmPassword = this.form.confirmPassword.trim();
      if (!password) {
        errors.password = 'Informe a senha.';
      } else if (password.length < 8) {
        errors.password = 'Senha deve ter ao menos 8 caracteres.';
      }
      if (!confirmPassword) {
        errors.confirmPassword = 'Repita a senha.';
      } else if (password && confirmPassword !== password) {
        errors.confirmPassword = 'As senhas não conferem.';
      }
    }

    if (this.form.role === 'CLIENT_USER') {
      const companyRef = this.form.companyIdText.trim();
      if (!companyRef) {
        errors.companyId = 'Informe o código da empresa.';
      } else {
        const isUuid = this.isUuid(companyRef);
        const normalizedCode = this.normalizeCompanyCode(companyRef);
        const isCode = this.isCompanyCode(normalizedCode);

        if (!isUuid && !isCode) {
          errors.companyId = 'Informe um UUID válido ou código no formato AAAA-CL-XXX.';
        } else if (
          isUuid &&
          this.companyById.size > 0 &&
          !this.companyById.has(companyRef)
        ) {
          errors.companyId = 'Empresa não encontrada para este UUID.';
        } else if (
          !isUuid &&
          this.companyByCode.size > 0 &&
          !this.companyByCode.has(normalizedCode.toLowerCase())
        ) {
          errors.companyId = 'Código de empresa não encontrado.';
        }
      }
    }

    this.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async onSubmit(ev: Event): Promise<void> {
    ev.preventDefault();
    this.formError = null;
    this.fieldErrors = {};

    if (!this.validateForm()) {
      return;
    }

    const companyRef = this.form.companyIdText.trim();
    const hasCompanyRef = companyRef.length > 0;
    const isUuid = hasCompanyRef && this.isUuid(companyRef);
    const companyId = isUuid ? companyRef : null;
    const companyCode = hasCompanyRef && !isUuid ? this.normalizeCompanyCode(companyRef) : null;

    const base = {
      fullName: this.form.fullName.trim(),
      email: this.form.email.trim(),
      role: this.form.role,
      companyId,
      companyCode,
    };

    try {
      if (this.editingId) {
        const dto: UpdateUserDto = {
          ...base,
          active: this.form.activeStr === 'true',
        };
        await firstValueFrom(this.api.updateUser(this.editingId, dto));
        this.cancelEdit();
        this.refresh$.next();
        return;
      }

      const dto: CreateUserDto = {
        ...base,
        password: this.form.password,
      };
      await firstValueFrom(this.api.createUser(dto));
      this.resetForm();
      this.refresh$.next();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.formError = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao salvar'
        }`;
        return;
      }
      this.formError = err instanceof Error ? err.message : 'Falha inesperada ao salvar usuário';
    }
  }

  openDeleteModal(u: UserDto): void {
    this.deleteTarget = u;
    this.deleteConfirmed = false;
    this.deletePending = false;
    this.deleteError = null;
  }

  closeDeleteModal(): void {
    if (this.deletePending) return;
    this.deleteTarget = null;
    this.deleteConfirmed = false;
    this.deletePending = false;
    this.deleteError = null;
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget;
    if (!target || this.deletePending) return;
    if (!this.deleteConfirmed) {
      this.deleteError = 'Confirme que está ciente para continuar.';
      return;
    }

    this.deletePending = true;
    this.deleteError = null;

    try {
      await firstValueFrom(this.api.deleteUser(target.id));
      if (this.editingId === target.id) {
        this.cancelEdit();
      }
      this.refresh$.next();
      this.closeDeleteModal();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.deleteError = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao remover'
        }`;
        return;
      }
      this.deleteError = err instanceof Error ? err.message : 'Falha inesperada ao remover usuário';
    } finally {
      this.deletePending = false;
    }
  }

  copyCompanyCode(companyCode: string | null, userId: string): void {
    if (!companyCode) return;

    const markCopied = (): void => {
      this.copiedUserId = userId;
      if (this.copyResetId !== null) {
        clearTimeout(this.copyResetId);
      }
      this.copyResetId = window.setTimeout(() => {
        this.copiedUserId = null;
        this.copyResetId = null;
      }, 5000);
    };

    if (this.fallbackCopy(companyCode)) {
      markCopied();
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(companyCode).then(() => markCopied()).catch(() => undefined);
    }
  }

  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  isCopied(userId: string): boolean {
    return userId === this.copiedUserId;
  }
}
