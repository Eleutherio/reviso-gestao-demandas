import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';

import { AuthService } from '../../core/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  error: string | null = null;
  loading = false;
  portal: 'agency' | 'client' = 'agency';
  recoverVisible = false;
  recoverMessage: string | null = null;
  recoverError: string | null = null;
  recovering = false;
  agencyRecoverVisible = false;
  agencyRecoverMessage: string | null = null;
  agencyRecoverError: string | null = null;
  agencyRecovering = false;
  agencyResetMessage: string | null = null;
  agencyResetError: string | null = null;
  agencyResetting = false;

  readonly loginForm;
  readonly recoverForm;
  readonly agencyRecoverForm;
  readonly agencyResetForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.group({
      email: [''],
      companyCode: [''],
      password: ['', [Validators.required]],
    });
    this.recoverForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.agencyRecoverForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.agencyResetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      token: ['', [Validators.required]],
      newPassword: ['', [Validators.required]],
    });

    this.applyPortalValidators();

    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/');
    }
  }

  setPortal(portal: 'agency' | 'client'): void {
    if (this.portal === portal) return;
    this.portal = portal;
    this.error = null;
    this.recoverMessage = null;
    this.recoverError = null;
    this.recoverVisible = false;
    this.recoverForm.reset();
    this.agencyRecoverMessage = null;
    this.agencyRecoverError = null;
    this.agencyRecoverVisible = false;
    this.agencyResetMessage = null;
    this.agencyResetError = null;
    this.agencyRecoverForm.reset();
    this.agencyResetForm.reset();
    this.applyPortalValidators();
  }

  toggleRecover(): void {
    this.recoverVisible = !this.recoverVisible;
    this.recoverMessage = null;
    this.recoverError = null;
    this.recoverForm.reset();
  }

  toggleAgencyRecover(): void {
    this.agencyRecoverVisible = !this.agencyRecoverVisible;
    this.agencyRecoverMessage = null;
    this.agencyRecoverError = null;
    this.agencyResetMessage = null;
    this.agencyResetError = null;
    this.agencyRecoverForm.reset();
    this.agencyResetForm.reset();
  }

  submit(): void {
    this.error = null;
    this.applyPortalValidators();
    if (this.loginForm.invalid) {
      this.error = this.resolveLoginValidationError();
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = this.loginForm.value.email ?? '';
    const companyCode = this.loginForm.value.companyCode ?? '';
    const password = this.loginForm.value.password ?? '';

    this.loading = true;
    this.loginForm.disable();
    const login$ =
      this.portal === 'agency'
        ? this.auth.login(email, password)
        : this.auth.loginClient(companyCode, email, password);

    login$
      .pipe(
        finalize(() => {
          this.loading = false;
          this.loginForm.enable();
        })
      )
      .subscribe({
        next: () => {
          const role = this.auth.getRole();
          if (role === 'CLIENT_USER') return void this.router.navigateByUrl('/client/briefings');
          if (role === 'AGENCY_ADMIN') return void this.router.navigateByUrl('/admin/companies');
          if (role === 'AGENCY_USER')
            return void this.router.navigateByUrl('/agency/briefings/inbox');
          return void this.router.navigateByUrl('/');
        },
        error: (err: unknown) => {
          this.error = this.resolveLoginError(err);
        },
      });
  }

  private resolveLoginError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const serverMessage = this.extractServerMessage(err);
      if (serverMessage) {
        const normalized = serverMessage.toLowerCase();
        if (normalized.includes('inativo')) {
          return 'Seu usuario foi desativado. Contate um administrador.';
        }
        if (normalized.includes('codigo da empresa')) {
          return 'Codigo da empresa invalido.';
        }
        if (normalized.includes('credenciais')) {
          return this.portal === 'client'
            ? 'Codigo da empresa, email ou senha invalidos.'
            : 'Email ou senha invalidos.';
        }
        if (normalized.includes('muitas tentativas')) {
          return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        }
      }

      if (err.status === 0) {
        return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
      }
      if (err.status === 400 || err.status === 401) {
        return this.portal === 'client'
          ? 'Codigo da empresa, email ou senha invalidos.'
          : 'Email ou senha invalidos.';
      }
      if (err.status === 403) {
        return 'Seu acesso nao esta permitido. Fale com o administrador.';
      }
      if (err.status === 404) {
        return 'Servico de login indisponivel. Tente novamente em instantes.';
      }
      if (err.status === 408 || err.status === 504) {
        return 'Tempo de resposta excedido. Tente novamente.';
      }
      if (err.status === 429) {
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      }
      if (err.status >= 500) {
        return 'Servico indisponivel no momento. Tente novamente mais tarde.';
      }
    }
    return 'Falha ao autenticar. Tente novamente.';
  }

  recoverCompanyCode(): void {
    this.recoverMessage = null;
    this.recoverError = null;

    if (this.recoverForm.invalid) {
      const emailCtrl = this.recoverForm.get('email');
      if (emailCtrl?.hasError('required')) {
        this.recoverError = 'Informe seu email.';
      } else if (emailCtrl?.hasError('email')) {
        this.recoverError = 'Informe um email valido.';
      } else {
        this.recoverError = 'Preencha o email para continuar.';
      }
      this.recoverForm.markAllAsTouched();
      return;
    }

    const email = this.recoverForm.value.email ?? '';
    this.recovering = true;
    this.recoverForm.disable();
    this.auth
      .recoverCompanyCode(email)
      .pipe(
        finalize(() => {
          this.recovering = false;
          this.recoverForm.enable();
        })
      )
      .subscribe({
        next: (res) => {
          this.recoverMessage = res?.message ?? 'Se o email estiver ativo, enviaremos os codigos.';
        },
        error: (err: unknown) => {
          this.recoverError = this.resolveRecoverError(err);
        },
      });
  }

  requestAgencyPasswordToken(): void {
    this.agencyRecoverMessage = null;
    this.agencyRecoverError = null;

    if (this.agencyRecoverForm.invalid) {
      this.agencyRecoverError = this.resolveAgencyRecoverValidationError();
      this.agencyRecoverForm.markAllAsTouched();
      return;
    }

    const email = this.agencyRecoverForm.value.email ?? '';
    this.agencyRecovering = true;
    this.agencyRecoverForm.disable();
    this.auth
      .recoverAgencyPassword(email)
      .pipe(
        finalize(() => {
          this.agencyRecovering = false;
          this.agencyRecoverForm.enable();
        })
      )
      .subscribe({
        next: (res) => {
          this.agencyRecoverMessage = res?.message ?? 'Se o email estiver ativo, enviaremos um token.';
        },
        error: (err: unknown) => {
          this.agencyRecoverError = this.resolveAgencyRecoverError(err);
        },
      });
  }

  confirmAgencyPasswordToken(): void {
    this.agencyResetMessage = null;
    this.agencyResetError = null;

    if (this.agencyResetForm.invalid) {
      this.agencyResetError = this.resolveAgencyResetValidationError();
      this.agencyResetForm.markAllAsTouched();
      return;
    }

    const email = this.agencyResetForm.value.email ?? '';
    const token = this.agencyResetForm.value.token ?? '';
    const newPassword = this.agencyResetForm.value.newPassword ?? '';
    this.agencyResetting = true;
    this.agencyResetForm.disable();
    this.auth
      .confirmAgencyPassword(email, token, newPassword)
      .pipe(
        finalize(() => {
          this.agencyResetting = false;
          this.agencyResetForm.enable();
        })
      )
      .subscribe({
        next: (res) => {
          this.agencyResetMessage = res?.message ?? 'Senha atualizada com sucesso.';
        },
        error: (err: unknown) => {
          this.agencyResetError = this.resolveAgencyResetError(err);
        },
      });
  }

  private extractServerMessage(err: HttpErrorResponse): string | null {
    const payload = err.error as { message?: unknown } | string | null;
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (typeof payload.message === 'string') return payload.message;
    return null;
  }

  private applyPortalValidators(): void {
    const emailCtrl = this.loginForm.get('email');
    const companyCodeCtrl = this.loginForm.get('companyCode');
    const passwordCtrl = this.loginForm.get('password');

    if (this.portal === 'agency') {
      emailCtrl?.setValidators([Validators.required, Validators.email]);
      companyCodeCtrl?.clearValidators();
    } else {
      companyCodeCtrl?.setValidators([Validators.required]);
      emailCtrl?.setValidators([Validators.required, Validators.email]);
    }

    passwordCtrl?.setValidators([Validators.required]);

    emailCtrl?.updateValueAndValidity({ emitEvent: false });
    companyCodeCtrl?.updateValueAndValidity({ emitEvent: false });
    passwordCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  private resolveLoginValidationError(): string {
    const emailCtrl = this.loginForm.get('email');
    const companyCodeCtrl = this.loginForm.get('companyCode');
    const passwordCtrl = this.loginForm.get('password');

    if (this.portal === 'agency') {
      if (emailCtrl?.hasError('required')) return 'Informe seu email.';
      if (emailCtrl?.hasError('email')) return 'Informe um email valido.';
    } else {
      if (companyCodeCtrl?.hasError('required')) return 'Informe o codigo da empresa.';
      if (emailCtrl?.hasError('required')) return 'Informe seu email.';
      if (emailCtrl?.hasError('email')) return 'Informe um email valido.';
    }

    if (passwordCtrl?.hasError('required')) return 'Informe sua senha.';
    return 'Preencha os campos para continuar.';
  }

  private resolveRecoverError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
      }
      if (err.status === 429) {
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      }
      if (err.status >= 500) {
        return 'Nao foi possivel enviar o email. Tente novamente mais tarde.';
      }
    }
    return 'Nao foi possivel enviar o email. Tente novamente.';
  }

  private resolveAgencyRecoverValidationError(): string {
    const emailCtrl = this.agencyRecoverForm.get('email');
    if (emailCtrl?.hasError('required')) return 'Informe o email da agencia.';
    if (emailCtrl?.hasError('email')) return 'Informe um email valido.';
    return 'Preencha o email para continuar.';
  }

  private resolveAgencyResetValidationError(): string {
    const emailCtrl = this.agencyResetForm.get('email');
    const tokenCtrl = this.agencyResetForm.get('token');
    const passwordCtrl = this.agencyResetForm.get('newPassword');
    if (emailCtrl?.hasError('required')) return 'Informe o email da agencia.';
    if (emailCtrl?.hasError('email')) return 'Informe um email valido.';
    if (tokenCtrl?.hasError('required')) return 'Informe o token enviado.';
    if (passwordCtrl?.hasError('required')) return 'Informe a nova senha.';
    return 'Preencha os campos para continuar.';
  }

  private resolveAgencyRecoverError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
      }
      if (err.status === 429) {
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      }
      if (err.status >= 500) {
        return 'Nao foi possivel enviar o token. Tente novamente mais tarde.';
      }
    }
    return 'Nao foi possivel enviar o token. Tente novamente.';
  }

  private resolveAgencyResetError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const serverMessage = this.extractServerMessage(err);
      if (serverMessage && serverMessage.toLowerCase().includes('token')) {
        return 'Token invalido ou expirado.';
      }
      if (err.status === 0) {
        return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
      }
      if (err.status === 400) {
        return 'Token invalido ou expirado.';
      }
      if (err.status === 429) {
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      }
      if (err.status >= 500) {
        return 'Nao foi possivel atualizar a senha. Tente novamente mais tarde.';
      }
    }
    return 'Nao foi possivel atualizar a senha. Tente novamente.';
  }
}

