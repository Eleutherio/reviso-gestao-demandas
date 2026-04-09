import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';
import { AdminCompaniesApi, CreateCompanyDto, UpdateCompanyDto } from '../../api/admin-companies.api';
import { AdminInvitesApi, CreateClientUserInviteDto } from '../../api/admin-invites.api';
import { AdminUsersApi, CreateUserDto } from '../../api/admin-users.api';
import { CompanyDto } from '../../api/company';
import { UserDto } from '../../api/user';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./admin-companies.component.scss'],
  template: `
    <section class="clients-page">
      <header class="clients-header">
        <div class="clients-title-block">
          <p class="clients-eyebrow">Administração</p>
          <h2 class="clients-title">Administrar Clientes</h2>
          <p class="clients-subtitle">
            Cadastre clientes, acompanhe códigos e gerencie acessos em um só lugar.
          </p>
        </div>
      </header>

      <div class="clients-grid">
        <section class="clients-card clients-card--form">
          <div class="clients-card__head">
            <h3 class="clients-card__title">
              {{ editingId ? 'Editar cliente' : 'Adicionar cliente' }}
            </h3>
            <p class="clients-muted">Use o cadastro manual ou envie um convite inicial.</p>
          </div>

          <form (submit)="onSubmitCompany($event)" class="clients-form">
            @if (!editingId) {
            <label class="clients-field">
              <span class="clients-field__label">Modo de cadastro</span>
              <div class="clients-mode">
                <label class="clients-check">
                  <input
                    type="radio"
                    name="createMode"
                    value="manual"
                    [checked]="createMode === 'manual'"
                    (change)="setCreateMode('manual')"
                  />
                  <span>Cadastro manual</span>
                </label>
                <label class="clients-check">
                  <input
                    type="radio"
                    name="createMode"
                    value="invite"
                    [checked]="createMode === 'invite'"
                    (change)="setCreateMode('invite')"
                  />
                  <span>Cadastro por convite</span>
                </label>
              </div>
            </label>
            }

            <label class="clients-field">
              <span class="clients-field__label"
                >Nome do cliente <span class="clients-required">*</span></span
              >
              <input
                name="name"
                required
                [value]="form.name"
                class="clients-input"
                [class.clients-input--error]="fieldErrors.name"
                (input)="onTextInput('name', $event)"
              />
              @if (fieldErrors.name) {
              <small class="clients-error">{{ fieldErrors.name }}</small>
              }
            </label>

            <label class="clients-field">
              <span class="clients-field__label"
                >Segmento <span class="clients-required">*</span></span
              >
              <input
                name="segment"
                required
                [value]="form.segment"
                class="clients-input"
                [class.clients-input--error]="fieldErrors.segment"
                (input)="onTextInput('segment', $event)"
              />
              @if (fieldErrors.segment) {
              <small class="clients-error">{{ fieldErrors.segment }}</small>
              }
            </label>

            <label class="clients-field">
              <span class="clients-field__label"
                >E-mail de contato <span class="clients-required">*</span></span
              >
              <input
                name="contactEmail"
                type="email"
                required
                [value]="form.contactEmail"
                class="clients-input"
                [class.clients-input--error]="fieldErrors.contactEmail"
                (input)="onTextInput('contactEmail', $event)"
              />
              @if (fieldErrors.contactEmail) {
              <small class="clients-error">{{ fieldErrors.contactEmail }}</small>
              }
            </label>

            <label class="clients-field">
              <span class="clients-field__label">Site</span>
              <input
                name="site"
                [value]="form.site"
                class="clients-input"
                (input)="onTextInput('site', $event)"
              />
            </label>

            @if (editingId) {
            <label class="clients-field">
              <span class="clients-field__label">Ativo</span>
              <select
                name="active"
                [value]="form.activeStr"
                class="clients-select"
                (change)="form.activeStr = getBoolStr($event)"
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            }

            @if (!editingId && createMode === 'invite') {
            <div class="clients-divider"></div>
            <p class="clients-muted">Convide o primeiro usuário do cliente.</p>

            <label class="clients-field">
              <span class="clients-field__label"
                >Nome do usuário <span class="clients-required">*</span></span
              >
              <input
                name="inviteFullName"
                [value]="form.inviteFullName"
                class="clients-input"
                [class.clients-input--error]="fieldErrors.inviteFullName"
                (input)="onTextInput('inviteFullName', $event)"
              />
              @if (fieldErrors.inviteFullName) {
              <small class="clients-error">{{ fieldErrors.inviteFullName }}</small>
              }
            </label>

            <label class="clients-field">
              <span class="clients-field__label"
                >E-mail do usuário <span class="clients-required">*</span></span
              >
              <input
                name="inviteEmail"
                type="email"
                [value]="form.inviteEmail"
                class="clients-input"
                [class.clients-input--error]="fieldErrors.inviteEmail"
                (input)="onTextInput('inviteEmail', $event)"
              />
              @if (fieldErrors.inviteEmail) {
              <small class="clients-error">{{ fieldErrors.inviteEmail }}</small>
              }
            </label>
            }

            <div class="clients-form__actions">
              <button type="submit" class="btn btn--primary">
                {{
                  editingId
                    ? 'Salvar'
                    : createMode === 'invite'
                      ? 'Criar e enviar convite'
                      : 'Criar cliente'
                }}
              </button>
              @if (editingId) {
              <button type="button" class="btn btn--ghost" (click)="cancelEdit()">
                Cancelar
              </button>
              }
            </div>

            @if (formSuccess) {
            <div class="clients-alert">{{ formSuccess }}</div>
            }
            @if (formError) {
            <div class="clients-alert clients-alert--error">{{ formError }}</div>
            }
          </form>
        </section>

        <section class="clients-card clients-card--list">
          <div class="clients-card__head clients-card__head--row">
            <div>
              <h3 class="clients-card__title">Clientes cadastrados</h3>
              <p class="clients-muted">Acompanhe status e acessos dos clientes.</p>
            </div>
          </div>
          @if (vm$ | async; as vm) {
          @if (vm.status === 'loading') {
          <div class="clients-state">Carregando...</div>
          } @else if (vm.status === 'error') {
          <div class="clients-alert clients-alert--error">
            Erro ao carregar clientes: {{ vm.message }}
          </div>
          } @else {
          <div class="clients-toolbar">
            <div class="clients-total">
              <span>Total</span>
              <strong>{{ vm.companies.length }}</strong>
            </div>
          </div>

          <div class="clients-filters">
            <label class="clients-field">
              <span class="clients-field__label">Buscar clientes</span>
              <input
                name="search"
                placeholder="Nome, código ou e-mail"
                [value]="searchTerm"
                class="clients-input"
                (input)="searchTerm = getValue($event)"
              />
            </label>
          </div>

          @if (vm.companies.length === 0) {
          <div class="clients-empty">Nenhum cliente cadastrado.</div>
          } @else if (getFilteredCompanies(vm.companies).length === 0) {
          <div class="clients-empty">Nenhum cliente encontrado com os filtros atuais.</div>
          } @else {
          <div class="clients-table-wrap">
            <table class="clients-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Código do cliente</th>
                  <th>Status</th>
                  <th>Usuários cadastrados</th>
                  <th>Última atividade</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of getFilteredCompanies(vm.companies); track c.id) {
                <tr>
                  <td>{{ c.name }}</td>
                  <td>{{ c.companyCode ?? '-' }}</td>
                  <td>
                    <span
                      class="clients-chip"
                      [class.clients-chip--active]="c.active"
                      [class.clients-chip--inactive]="!c.active"
                    >
                      {{ c.active ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td>
                    <span class="clients-count">{{ getCompanyUserCount(c.id) }}</span>
                  </td>
                  <td>
                    <span
                      class="clients-chip clients-chip--status"
                      [class.clients-chip--online]="getCompanyActivityTone(c.id) === 'online'"
                      [class.clients-chip--recent]="getCompanyActivityTone(c.id) === 'recent'"
                      [class.clients-chip--stale]="getCompanyActivityTone(c.id) === 'stale'"
                      [class.clients-chip--unknown]="getCompanyActivityTone(c.id) === 'unknown'"
                    >
                      {{ getCompanyActivityLabel(c.id) }}
                    </span>
                  </td>
                  <td class="clients-actions">
                    <button
                      type="button"
                      class="btn btn--ghost btn--sm"
                      (click)="openDrawer(c)"
                    >
                      Gerenciar acessos
                    </button>
                    <button
                      type="button"
                      class="btn btn--ghost btn--sm"
                      (click)="startEdit(c)"
                    >
                      Editar
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

      @if (drawerCompany) {
      <div class="clients-drawer" (click)="closeDrawer()">
        <aside class="clients-drawer__panel" (click)="$event.stopPropagation()">
          <div class="clients-drawer__head">
            <div>
              <h4 class="clients-drawer__title">Acessos do Cliente</h4>
              <p class="clients-muted">
                {{ drawerCompany.name }} · {{ drawerCompany.companyCode }}
              </p>
            </div>
            <button
              type="button"
              class="clients-drawer__close"
              aria-label="Fechar"
              (click)="closeDrawer()"
            >
              &times;
            </button>
          </div>

          <div class="clients-drawer__summary">
            <div class="clients-summary__item">
              <span class="clients-muted">Usuários cadastrados</span>
              <strong>{{ getCompanyUserCount(drawerCompany.id) }}</strong>
            </div>
            <div class="clients-summary__item">
              <span class="clients-muted">Última atividade</span>
              <span
                class="clients-chip clients-chip--status"
                [class.clients-chip--online]="getCompanyActivityTone(drawerCompany.id) === 'online'"
                [class.clients-chip--recent]="getCompanyActivityTone(drawerCompany.id) === 'recent'"
                [class.clients-chip--stale]="getCompanyActivityTone(drawerCompany.id) === 'stale'"
                [class.clients-chip--unknown]="getCompanyActivityTone(drawerCompany.id) === 'unknown'"
              >
                {{ getCompanyActivityLabel(drawerCompany.id) }}
              </span>
            </div>
          </div>

          <div class="clients-drawer__section">
            <h5 class="clients-drawer__subtitle">Usuários do cliente</h5>

            @if (getCompanyUsers(drawerCompany.id).length === 0) {
            <div class="clients-empty">Nenhum usuário vinculado a este cliente.</div>
            } @else {
            <div class="clients-table-wrap">
              <table class="clients-table clients-table--compact">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Último login</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of getCompanyUsers(drawerCompany.id); track u.id) {
                  <tr>
                    <td>{{ u.fullName }}</td>
                    <td>{{ u.email }}</td>
                    <td>
                      <span
                        class="clients-chip"
                        [class.clients-chip--active]="u.active"
                        [class.clients-chip--inactive]="!u.active"
                      >
                        {{ u.active ? 'Ativo' : 'Inativo' }}
                      </span>
                    </td>
                    <td>
                      <span
                        class="clients-chip clients-chip--status"
                        [class.clients-chip--online]="getActivityTone(getUserActivityAt(u)) === 'online'"
                        [class.clients-chip--recent]="getActivityTone(getUserActivityAt(u)) === 'recent'"
                        [class.clients-chip--stale]="getActivityTone(getUserActivityAt(u)) === 'stale'"
                        [class.clients-chip--unknown]="getActivityTone(getUserActivityAt(u)) === 'unknown'"
                      >
                        {{ getActivityLabel(getUserActivityAt(u)) }}
                      </span>
                    </td>
                  </tr>
                  }
                </tbody>
              </table>
            </div>
            }
          </div>

          <div class="clients-drawer__section">
            <h5 class="clients-drawer__subtitle">Adicionar usuário</h5>
            <form (submit)="onSubmitDrawerUser($event)" class="clients-form">
              <label class="clients-field">
                <span class="clients-field__label">Modo de cadastro</span>
                <div class="clients-mode">
                  <label class="clients-check">
                    <input
                      type="radio"
                      name="drawerCreateMode"
                      value="invite"
                      [checked]="drawerCreateMode === 'invite'"
                      (change)="setDrawerCreateMode('invite')"
                    />
                    <span>Convite por e-mail</span>
                  </label>
                  <label class="clients-check">
                    <input
                      type="radio"
                      name="drawerCreateMode"
                      value="manual"
                      [checked]="drawerCreateMode === 'manual'"
                      (change)="setDrawerCreateMode('manual')"
                    />
                    <span>Cadastro manual</span>
                  </label>
                </div>
              </label>

              <label class="clients-field">
                <span class="clients-field__label"
                  >Nome completo <span class="clients-required">*</span></span
                >
                <input
                  name="drawerFullName"
                  [value]="drawerForm.fullName"
                  class="clients-input"
                  [class.clients-input--error]="drawerFieldErrors.fullName"
                  (input)="onDrawerInput('fullName', $event)"
                />
                @if (drawerFieldErrors.fullName) {
                <small class="clients-error">{{ drawerFieldErrors.fullName }}</small>
                }
              </label>

              <label class="clients-field">
                <span class="clients-field__label"
                  >E-mail <span class="clients-required">*</span></span
                >
                <input
                  name="drawerEmail"
                  type="email"
                  [value]="drawerForm.email"
                  class="clients-input"
                  [class.clients-input--error]="drawerFieldErrors.email"
                  (input)="onDrawerInput('email', $event)"
                />
                @if (drawerFieldErrors.email) {
                <small class="clients-error">{{ drawerFieldErrors.email }}</small>
                }
              </label>

              @if (drawerCreateMode === 'manual') {
              <label class="clients-field">
                <span class="clients-field__label"
                  >Senha <span class="clients-required">*</span></span
                >
                <input
                  name="drawerPassword"
                  type="password"
                  minlength="8"
                  [value]="drawerForm.password"
                  class="clients-input"
                  [class.clients-input--error]="drawerFieldErrors.password"
                  (input)="onDrawerInput('password', $event)"
                />
                @if (drawerFieldErrors.password) {
                <small class="clients-error">{{ drawerFieldErrors.password }}</small>
                }
              </label>

              <label class="clients-field">
                <span class="clients-field__label"
                  >Repetir senha <span class="clients-required">*</span></span
                >
                <input
                  name="drawerConfirmPassword"
                  type="password"
                  minlength="8"
                  [value]="drawerForm.confirmPassword"
                  class="clients-input"
                  [class.clients-input--error]="drawerFieldErrors.confirmPassword"
                  (input)="onDrawerInput('confirmPassword', $event)"
                />
                @if (drawerFieldErrors.confirmPassword) {
                <small class="clients-error">{{ drawerFieldErrors.confirmPassword }}</small>
                }
              </label>
              }

              <div class="clients-form__actions">
                <button type="submit" class="btn btn--primary">
                  {{ drawerCreateMode === 'invite' ? 'Enviar convite' : 'Criar usuário' }}
                </button>
              </div>

              @if (drawerSuccess) {
              <div class="clients-alert">{{ drawerSuccess }}</div>
              }
              @if (drawerError) {
              <div class="clients-alert clients-alert--error">{{ drawerError }}</div>
              }
            </form>
          </div>
        </aside>
      </div>
      }
    </section>
  `,
})
export class AdminCompaniesComponent {
  readonly vm$;

  companies: CompanyDto[] = [];
  clientCompanies: CompanyDto[] = [];
  clientUsers: UserDto[] = [];
  private usersByCompany = new Map<string, UserDto[]>();

  editingId: string | null = null;
  createMode: 'manual' | 'invite' = 'manual';

  form: {
    name: string;
    segment: string;
    contactEmail: string;
    site: string;
    activeStr: 'true' | 'false';
    inviteFullName: string;
    inviteEmail: string;
  } = {
    name: '',
    segment: '',
    contactEmail: '',
    site: '',
    activeStr: 'true',
    inviteFullName: '',
    inviteEmail: '',
  };

  formError: string | null = null;
  formSuccess: string | null = null;

  fieldErrors: Partial<
    Record<'name' | 'segment' | 'contactEmail' | 'inviteFullName' | 'inviteEmail' | 'site', string>
  > = {};

  searchTerm = '';

  drawerCompany: CompanyDto | null = null;
  drawerCreateMode: 'manual' | 'invite' = 'invite';
  drawerForm: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  } = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  drawerFieldErrors: Partial<
    Record<'fullName' | 'email' | 'password' | 'confirmPassword', string>
  > = {};
  drawerError: string | null = null;
  drawerSuccess: string | null = null;

  private readonly lastLoginFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  private readonly refresh$ = new Subject<void>();

  constructor(
    private readonly companiesApi: AdminCompaniesApi,
    private readonly usersApi: AdminUsersApi,
    private readonly invitesApi: AdminInvitesApi
  ) {
    this.vm$ = this.refresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        forkJoin({
          companies: this.companiesApi.listCompanies(),
          users: this.usersApi.listUsers(),
        })
      ),
      map(({ companies, users }) => {
        this.setCompanies(companies);
        this.setUsers(users);
        this.syncDrawerCompany();
        return { status: 'ready' as const, companies: this.clientCompanies };
      }),
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

  getBoolStr(ev: Event): 'true' | 'false' {
    const target = ev.target as HTMLSelectElement;
    return target.value === 'true' ? 'true' : 'false';
  }

  setCreateMode(mode: 'manual' | 'invite'): void {
    this.createMode = mode;
    this.formSuccess = null;
    this.formError = null;
  }

  setDrawerCreateMode(mode: 'manual' | 'invite'): void {
    this.drawerCreateMode = mode;
    this.drawerSuccess = null;
    this.drawerError = null;
    this.drawerFieldErrors = {};
  }

  onTextInput(
    field: 'name' | 'segment' | 'contactEmail' | 'site' | 'inviteFullName' | 'inviteEmail',
    ev: Event
  ): void {
    const value = this.getValue(ev);
    this.form[field] = value;
    if (this.fieldErrors[field] && value.trim()) {
      delete this.fieldErrors[field];
    }
  }

  onDrawerInput(
    field: 'fullName' | 'email' | 'password' | 'confirmPassword',
    ev: Event
  ): void {
    const value = this.getValue(ev);
    this.drawerForm[field] = value;
    if (this.drawerFieldErrors[field] && value.trim()) {
      delete this.drawerFieldErrors[field];
    }
  }

  getFilteredCompanies(companies: CompanyDto[]): CompanyDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return companies;

    return companies.filter((company) => {
      const name = company.name.toLowerCase();
      const code = (company.companyCode ?? '').toLowerCase();
      const email = (company.contactEmail ?? '').toLowerCase();
      const segment = (company.segment ?? '').toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term) ||
        email.includes(term) ||
        segment.includes(term)
      );
    });
  }

  getCompanyUsers(companyId: string): UserDto[] {
    return this.usersByCompany.get(companyId) ?? [];
  }

  getUserActivityAt(user: UserDto): string | null | undefined {
    return user.lastSeenAt ?? user.lastLoginAt;
  }

  getCompanyUserCount(companyId: string): number {
    return this.getCompanyUsers(companyId).length;
  }

  getCompanyActivityLabel(companyId: string): string {
    const lastLoginAt = this.resolveCompanyLastLoginAt(companyId);
    return this.getActivityLabel(lastLoginAt);
  }

  getCompanyActivityTone(companyId: string): 'online' | 'recent' | 'stale' | 'unknown' {
    const lastLoginAt = this.resolveCompanyLastLoginAt(companyId);
    return this.getActivityTone(lastLoginAt);
  }

  getActivityLabel(lastLoginAt?: string | null): string {
    if (!lastLoginAt) return 'Nunca';
    const parsed = new Date(lastLoginAt);
    if (Number.isNaN(parsed.getTime())) return '—';
    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 5) return 'Online';
    if (diffMinutes < 60) return `Online há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return diffHours === 1 ? 'Online há 1 hora' : `Online há ${diffHours} horas`;
    }
    return this.lastLoginFormatter.format(parsed);
  }

  getActivityTone(lastLoginAt?: string | null): 'online' | 'recent' | 'stale' | 'unknown' {
    if (!lastLoginAt) return 'unknown';
    const parsed = new Date(lastLoginAt);
    if (Number.isNaN(parsed.getTime())) return 'unknown';
    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 60 * 24) return 'recent';
    return 'stale';
  }

  startEdit(company: CompanyDto): void {
    this.formError = null;
    this.formSuccess = null;
    this.fieldErrors = {};
    this.editingId = company.id;
    this.createMode = 'manual';
    this.form.name = company.name;
    this.form.segment = company.segment ?? '';
    this.form.contactEmail = company.contactEmail ?? '';
    this.form.site = company.site ?? '';
    this.form.activeStr = company.active ? 'true' : 'false';
    this.form.inviteFullName = '';
    this.form.inviteEmail = '';
  }

  cancelEdit(): void {
    this.formError = null;
    this.formSuccess = null;
    this.fieldErrors = {};
    this.editingId = null;
    this.resetFormFields();
  }

  private resetFormFields(): void {
    this.createMode = 'manual';
    this.form = {
      name: '',
      segment: '',
      contactEmail: '',
      site: '',
      activeStr: 'true',
      inviteFullName: '',
      inviteEmail: '',
    };
    this.fieldErrors = {};
  }

  openDrawer(company: CompanyDto): void {
    this.drawerCompany = company;
    this.drawerCreateMode = 'invite';
    this.drawerError = null;
    this.drawerSuccess = null;
    this.drawerFieldErrors = {};
    this.drawerForm = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
  }

  closeDrawer(): void {
    this.drawerCompany = null;
    this.drawerError = null;
    this.drawerSuccess = null;
    this.drawerFieldErrors = {};
  }

  private syncDrawerCompany(): void {
    if (!this.drawerCompany) return;
    const updated = this.clientCompanies.find((c) => c.id === this.drawerCompany?.id) ?? null;
    this.drawerCompany = updated;
  }

  private setCompanies(companies: CompanyDto[]): void {
    this.companies = companies;
    this.clientCompanies = companies.filter((company) => company.type === 'CLIENT');
  }

  private setUsers(users: UserDto[]): void {
    this.clientUsers = users.filter((user) => user.role === 'CLIENT_USER');
    const mapByCompany = new Map<string, UserDto[]>();
    for (const user of this.clientUsers) {
      if (!user.companyId) continue;
      const list = mapByCompany.get(user.companyId) ?? [];
      list.push(user);
      mapByCompany.set(user.companyId, list);
    }
    this.usersByCompany = mapByCompany;
  }

  private resolveCompanyLastLoginAt(companyId: string): string | null {
    const users = this.usersByCompany.get(companyId) ?? [];
    let latest: Date | null = null;
    let latestRaw: string | null = null;
    for (const user of users) {
      const activityAt = this.getUserActivityAt(user);
      if (!activityAt) continue;
      const parsed = new Date(activityAt);
      if (Number.isNaN(parsed.getTime())) continue;
      if (!latest || parsed > latest) {
        latest = parsed;
        latestRaw = activityAt;
      }
    }
    return latestRaw;
  }

  private validateCompanyForm(): boolean {
    const errors: typeof this.fieldErrors = {};

    if (!this.form.name.trim()) {
      errors.name = 'Informe o nome do cliente.';
    }
    if (!this.form.segment.trim()) {
      errors.segment = 'Informe o segmento.';
    }
    if (!this.form.contactEmail.trim()) {
      errors.contactEmail = 'Informe o e-mail de contato.';
    }

    if (!this.editingId && this.createMode === 'invite') {
      if (!this.form.inviteFullName.trim()) {
        errors.inviteFullName = 'Informe o nome do usuário.';
      }
      if (!this.form.inviteEmail.trim()) {
        errors.inviteEmail = 'Informe o e-mail do usuário.';
      }
    }

    this.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async onSubmitCompany(ev: Event): Promise<void> {
    ev.preventDefault();
    this.formError = null;
    this.formSuccess = null;

    if (!this.validateCompanyForm()) {
      return;
    }

    const base: CreateCompanyDto = {
      name: this.form.name.trim(),
      type: 'CLIENT',
      segment: this.form.segment.trim(),
      contactEmail: this.form.contactEmail.trim(),
      site: this.form.site.trim() || null,
      usefulLinks: null,
    };

    try {
      if (this.editingId) {
        const dto: UpdateCompanyDto = {
          ...base,
          active: this.form.activeStr === 'true',
        };
        await firstValueFrom(this.companiesApi.updateCompany(this.editingId, dto));
        this.formSuccess = 'Cliente atualizado com sucesso.';
        this.editingId = null;
        this.resetFormFields();
        this.refresh$.next();
        return;
      }

      const created = await firstValueFrom(this.companiesApi.createCompany(base));

      if (this.createMode === 'invite') {
        const inviteDto: CreateClientUserInviteDto = {
          fullName: this.form.inviteFullName.trim(),
          email: this.form.inviteEmail.trim(),
          companyId: created.id,
        };
        try {
          await firstValueFrom(this.invitesApi.createClientUserInvite(inviteDto));
          this.formSuccess = 'Cliente criado e convite enviado com sucesso.';
        } catch (inviteErr: unknown) {
          const message =
            inviteErr instanceof HttpErrorResponse
              ? inviteErr.error?.message ?? inviteErr.statusText
              : inviteErr instanceof Error
                ? inviteErr.message
                : 'Falha ao enviar convite.';
          this.formError = `Cliente criado, mas falha ao enviar convite: ${message}`;
        }
      } else {
        this.formSuccess = 'Cliente criado com sucesso.';
      }

      this.resetFormFields();
      this.refresh$.next();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.formError = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao salvar'
        }`;
        return;
      }
      this.formError = err instanceof Error ? err.message : 'Falha inesperada ao salvar.';
    }
  }

  private validateDrawerForm(): boolean {
    const errors: typeof this.drawerFieldErrors = {};

    if (!this.drawerForm.fullName.trim()) {
      errors.fullName = 'Informe o nome completo.';
    }
    if (!this.drawerForm.email.trim()) {
      errors.email = 'Informe o e-mail.';
    }

    if (this.drawerCreateMode === 'manual') {
      const password = this.drawerForm.password.trim();
      const confirmPassword = this.drawerForm.confirmPassword.trim();
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

    this.drawerFieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async onSubmitDrawerUser(ev: Event): Promise<void> {
    ev.preventDefault();
    this.drawerError = null;
    this.drawerSuccess = null;

    if (!this.drawerCompany) return;

    if (!this.validateDrawerForm()) {
      return;
    }

    try {
      if (this.drawerCreateMode === 'invite') {
        const inviteDto: CreateClientUserInviteDto = {
          fullName: this.drawerForm.fullName.trim(),
          email: this.drawerForm.email.trim(),
          companyId: this.drawerCompany.id,
        };
        await firstValueFrom(this.invitesApi.createClientUserInvite(inviteDto));
        this.drawerSuccess = 'Convite enviado com sucesso.';
      } else {
        const dto: CreateUserDto = {
          fullName: this.drawerForm.fullName.trim(),
          email: this.drawerForm.email.trim(),
          password: this.drawerForm.password,
          role: 'CLIENT_USER',
          companyId: this.drawerCompany.id,
        };
        await firstValueFrom(this.usersApi.createUser(dto));
        this.drawerSuccess = 'Usuário criado com sucesso.';
      }

      this.drawerForm = {
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
      };
      this.drawerFieldErrors = {};
      this.refresh$.next();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.drawerError = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao salvar'
        }`;
        return;
      }
      this.drawerError = err instanceof Error ? err.message : 'Falha inesperada ao salvar.';
    }
  }
}
