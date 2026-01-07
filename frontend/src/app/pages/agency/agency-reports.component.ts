import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ReportsApi } from '../../api/reports.api';
import type {
  CycleTimeDto,
  OverdueDto,
  ReworkMetricsDto,
  RequestsByStatusDto,
} from '../../api/reports.api';

type Vm<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-agency-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Relatórios</h2>

    <form
      [formGroup]="form"
      (ngSubmit)="runAll()"
      style="display: flex; gap: 12px; flex-wrap: wrap; align-items: end; margin: 12px 0;"
    >
      <label style="display: grid; gap: 4px;">
        Início (UTC)
        <input type="datetime-local" formControlName="from" />
      </label>

      <label style="display: grid; gap: 4px;">
        Fim (UTC)
        <input type="datetime-local" formControlName="to" />
      </label>

      <button type="submit" [disabled]="form.invalid || loadingAny()">
        {{ loadingAny() ? 'Carregando...' : 'Gerar' }}
      </button>

      @if (error) {
      <p style="color: inherit;">{{ error }}</p>
      }
    </form>

    @if (overdueVm.status === 'idle') {
    <p>Informe o período e clique em Gerar.</p>
    }

    <div
      style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"
    >
      <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
        <div style="font-size: 12px; opacity: 0.8;">Requisições atrasadas</div>
        <div style="font-size: 32px; font-weight: 700;">
          {{ overdueVm.status === 'ready' ? overdueVm.data.total : '-' }}
        </div>
        @if (overdueVm.status === 'error') {
        <div style="font-size: 12px;">{{ overdueVm.message }}</div>
        }
      </div>

      <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
        <div style="font-size: 12px; opacity: 0.8;">Tempo médio de ciclo</div>
        <div style="font-size: 32px; font-weight: 700;">
          {{ cycleVm.status === 'ready' ? formatCycle(cycleVm.data) : '-' }}
        </div>
        @if (cycleVm.status === 'error') {
        <div style="font-size: 12px;">{{ cycleVm.message }}</div>
        }
      </div>

      <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
        <div style="font-size: 12px; opacity: 0.8;">Retrabalho (%)</div>
        <div style="font-size: 32px; font-weight: 700;">
          {{ reworkVm.status === 'ready' ? formatPercent(reworkVm.data.reworkPercentage) : '-' }}
        </div>
        @if (reworkVm.status === 'ready') {
        <div style="font-size: 12px; opacity: 0.8;">
          {{ reworkVm.data.reworkCount }} / {{ reworkVm.data.totalCount }}
        </div>
        } @if (reworkVm.status === 'error') {
        <div style="font-size: 12px;">{{ reworkVm.message }}</div>
        }
      </div>

      <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
        <div style="font-size: 12px; opacity: 0.8;">Total no período</div>
        <div style="font-size: 32px; font-weight: 700;">
          {{ byStatusVm.status === 'ready' ? totalByStatus(byStatusVm.data) : '-' }}
        </div>
        @if (byStatusVm.status === 'error') {
        <div style="font-size: 12px;">{{ byStatusVm.message }}</div>
        }
      </div>
    </div>

    <div style="margin-top: 12px; border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
      <h3 style="margin: 0 0 8px;">Requisições por status</h3>
      @switch (byStatusVm.status) { @case ('idle') {
      <p>Informe o período e clique em Gerar.</p>
      } @case ('loading') {
      <p>Carregando...</p>
      } @case ('error') {
      <p style="color: inherit;">{{ byStatusVm.message }}</p>
      } @case ('ready') {
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px;">Status</th>
              <th style="text-align: left; padding: 8px;">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (row of byStatusVm.data; track row.status) {
            <tr>
              <td style="padding: 8px;">{{ row.status }}</td>
              <td style="padding: 8px;">{{ row.total }}</td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      } }
    </div>
  `,
})
export class AgencyReportsComponent {
  readonly form;
  error: string | null = null;

  overdueVm: Vm<OverdueDto> = { status: 'idle' };
  cycleVm: Vm<CycleTimeDto> = { status: 'idle' };
  reworkVm: Vm<ReworkMetricsDto> = { status: 'idle' };
  byStatusVm: Vm<RequestsByStatusDto[]> = { status: 'idle' };

  constructor(fb: FormBuilder, private readonly reports: ReportsApi) {
    this.form = fb.group({
      from: ['', [Validators.required]],
      to: ['', [Validators.required]],
    });
  }

  loadingAny(): boolean {
    return (
      this.overdueVm.status === 'loading' ||
      this.cycleVm.status === 'loading' ||
      this.reworkVm.status === 'loading' ||
      this.byStatusVm.status === 'loading'
    );
  }

  private toIsoUtc(dtLocalValue: string): string {
    // `datetime-local` entrega um horário local sem timezone.
    // Convertemos para Date local e serializamos em ISO (UTC), que o backend aceita como OffsetDateTime.
    return new Date(dtLocalValue).toISOString();
  }

  private mapHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Não autenticado (401). Faça login novamente.';
      if (err.status === 403) return 'Sem permissão (403). Necessário AGENCY_USER/ADMIN.';
      return `Erro HTTP ${err.status}: ${err.statusText || 'Falha ao buscar relatório'}`;
    }

    return err instanceof Error ? err.message : 'Falha inesperada';
  }

  runAll(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fromLocal = this.form.value.from ?? '';
    const toLocal = this.form.value.to ?? '';

    const from = this.toIsoUtc(fromLocal);
    const to = this.toIsoUtc(toLocal);

    this.overdueVm = { status: 'loading' };
    this.cycleVm = { status: 'loading' };
    this.reworkVm = { status: 'loading' };
    this.byStatusVm = { status: 'loading' };

    this.reports.overdue(to).subscribe({
      next: (data) => (this.overdueVm = { status: 'ready', data }),
      error: (err) => (this.overdueVm = { status: 'error', message: this.mapHttpError(err) }),
    });

    this.reports.avgCycleTime(from, to).subscribe({
      next: (data) => (this.cycleVm = { status: 'ready', data }),
      error: (err) => (this.cycleVm = { status: 'error', message: this.mapHttpError(err) }),
    });

    this.reports.reworkMetrics(from, to).subscribe({
      next: (data) => (this.reworkVm = { status: 'ready', data }),
      error: (err) => (this.reworkVm = { status: 'error', message: this.mapHttpError(err) }),
    });

    this.reports.requestsByStatus(from, to).subscribe({
      next: (data) => (this.byStatusVm = { status: 'ready', data }),
      error: (err) => (this.byStatusVm = { status: 'error', message: this.mapHttpError(err) }),
    });
  }

  formatCycle(c: CycleTimeDto): string {
    const days = c.avgDays ?? 0;
    const hours = c.avgHours ?? 0;
    return `${days}d ${hours}h`;
  }

  formatPercent(n: number): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    return `${v.toFixed(1)}%`;
  }

  totalByStatus(rows: RequestsByStatusDto[]): number {
    return (rows ?? []).reduce((acc, r) => acc + (r.total ?? 0), 0);
  }
}
