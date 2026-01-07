import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, combineLatest, map, of, startWith, switchMap, Subject } from 'rxjs';

import { RequestsApi, type RequestStatus } from '../../api/requests.api';
import type { RequestDto } from '../../api/request';
import type { RequestEventDto } from '../../api/request-event';

type Vm =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; request: RequestDto; events: RequestEventDto[] };

@Component({
  selector: 'app-agency-request-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  template: `
    <p><a routerLink="/agency/requests">Voltar</a></p>

    <h2>Detalhe da Requisição</h2>

    @if (vm$ | async; as vm) { @if (vm.status === 'loading') {
    <p>Carregando...</p>
    } @else if (vm.status === 'error') {
    <p style="color: inherit;">{{ vm.message }}</p>
    } @else {
    <div style="display: grid; gap: 6px; margin: 12px 0;">
      <div><strong>Título:</strong> {{ vm.request.title }}</div>
      <div><strong>Empresa:</strong> {{ vm.request.companyName }}</div>
      <div><strong>Status:</strong> {{ vm.request.status }}</div>
      <div><strong>Prioridade:</strong> {{ vm.request.priority }}</div>
      <div><strong>Tipo:</strong> {{ vm.request.type }}</div>
      <div><strong>Departamento:</strong> {{ vm.request.department }}</div>
      <div><strong>Responsável:</strong> {{ vm.request.assigneeId ?? '-' }}</div>
      <div>
        <strong>Due date:</strong>
        {{ vm.request.dueDate ? (vm.request.dueDate | date : 'dd/MM/yyyy HH:mm') : '-' }}
      </div>
      <div><strong>Criado em:</strong> {{ vm.request.createdAt | date : 'dd/MM/yyyy HH:mm' }}</div>
      <div>
        <strong>Atualizado em:</strong>
        {{ vm.request.updatedAt ? (vm.request.updatedAt | date : 'dd/MM/yyyy HH:mm') : '-' }}
      </div>
    </div>

    <h3>Ações</h3>

    @if (actionError) {
    <p style="color: inherit;">{{ actionError }}</p>
    }

    <div style="display: grid; gap: 12px; margin: 12px 0;">
      <div style="display: grid; gap: 8px;">
        <div><strong>Mudar status</strong></div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <select [(ngModel)]="statusTo" [ngModelOptions]="{ standalone: true }">
            <option [ngValue]="null">Selecione</option>
            @for (s of statuses; track s) {
            <option [ngValue]="s">{{ s }}</option>
            }
          </select>
          <input
            type="text"
            placeholder="Mensagem (opcional)"
            [(ngModel)]="statusMessage"
            [ngModelOptions]="{ standalone: true }"
            style="min-width: 280px;"
          />
          <button
            type="button"
            (click)="changeStatus(vm.request.id)"
            [disabled]="!statusTo || actionLoading"
          >
            Aplicar
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Atribuir responsável</strong></div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <input
            type="text"
            placeholder="assigneeId (UUID)"
            [(ngModel)]="assigneeId"
            [ngModelOptions]="{ standalone: true }"
            style="min-width: 320px;"
          />
          <button
            type="button"
            (click)="assign(vm.request.id)"
            [disabled]="!assigneeId || actionLoading"
          >
            Atribuir
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Adicionar comentário</strong></div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <label style="display: inline-flex; gap: 6px; align-items: center;">
            <input
              type="checkbox"
              [(ngModel)]="commentVisibleToClient"
              [ngModelOptions]="{ standalone: true }"
            />
            Visível para cliente
          </label>
        </div>
        <textarea
          rows="3"
          placeholder="Mensagem"
          [(ngModel)]="commentMessage"
          [ngModelOptions]="{ standalone: true }"
        ></textarea>
        <div>
          <button
            type="button"
            (click)="addComment(vm.request.id)"
            [disabled]="!commentMessage || actionLoading"
          >
            Comentar
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Adicionar revisão</strong></div>
        <textarea
          rows="2"
          placeholder="Mensagem (opcional)"
          [(ngModel)]="revisionMessage"
          [ngModelOptions]="{ standalone: true }"
        ></textarea>
        <div>
          <button type="button" (click)="addRevision(vm.request.id)" [disabled]="actionLoading">
            Registrar revisão
          </button>
        </div>
      </div>
    </div>

    <h3>Eventos</h3>
    <p>
      Total: <strong>{{ vm.events.length }}</strong>
    </p>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px;">Data</th>
            <th style="text-align: left; padding: 8px;">Tipo</th>
            <th style="text-align: left; padding: 8px;">Status</th>
            <th style="text-align: left; padding: 8px;">Visível p/ cliente</th>
            <th style="text-align: left; padding: 8px;">Mensagem</th>
          </tr>
        </thead>
        <tbody>
          @for (e of vm.events; track e.id) {
          <tr>
            <td style="padding: 8px;">{{ e.createdAt | date : 'dd/MM/yyyy HH:mm' }}</td>
            <td style="padding: 8px;">{{ e.eventType }}</td>
            <td style="padding: 8px;">{{ (e.fromStatus ?? '-') + ' → ' + (e.toStatus ?? '-') }}</td>
            <td style="padding: 8px;">{{ e.visibleToClient ? 'Sim' : 'Não' }}</td>
            <td style="padding: 8px;">{{ e.message ?? '-' }}</td>
          </tr>
          }
        </tbody>
      </table>
    </div>
    } }
  `,
})
export class AgencyRequestDetailComponent {
  readonly statuses: RequestStatus[] = [
    'NEW',
    'IN_PROGRESS',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'DELIVERED',
    'DONE',
    'CANCELED',
    'CLOSED',
  ];

  statusTo: RequestStatus | null = null;
  statusMessage: string = '';

  assigneeId: string = '';

  commentMessage: string = '';
  commentVisibleToClient = true;

  revisionMessage: string = '';

  actionLoading = false;
  actionError: string | null = null;

  private readonly reload$ = new Subject<void>();
  readonly vm$;

  constructor(route: ActivatedRoute, private readonly api: RequestsApi) {
    const id$ = route.paramMap.pipe(map((pm) => pm.get('id')));

    this.vm$ = combineLatest([id$, this.reload$.pipe(startWith(void 0))]).pipe(
      map(([id]) => id),
      switchMap((id) => {
        if (!id) return of({ status: 'error' as const, message: 'ID inválido.' });

        return combineLatest([this.api.getById(id), this.api.listEvents(id, false)]).pipe(
          map(([request, events]) => ({ status: 'ready' as const, request, events })),
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
                  message: 'Sem permissão (403). Necessário AGENCY_USER/ADMIN.',
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
      })
    );
  }

  private reload(): void {
    this.reload$.next();
  }

  private mapActionError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Não autenticado (401). Faça login novamente.';
      if (err.status === 403) return 'Sem permissão (403). Necessário AGENCY_USER/ADMIN.';
      const backendMessage = typeof err.error === 'string' ? err.error : null;
      return backendMessage || `Erro HTTP ${err.status}: ${err.statusText || 'Falha na ação'}`;
    }
    return err instanceof Error ? err.message : 'Falha inesperada na ação.';
  }

  changeStatus(requestId: string): void {
    if (!this.statusTo) return;
    this.actionError = null;
    this.actionLoading = true;

    this.api
      .changeStatus(requestId, {
        toStatus: this.statusTo,
        message: this.statusMessage || null,
        actorId: null,
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.statusMessage = '';
          this.reload();
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapActionError(err);
        },
      });
  }

  assign(requestId: string): void {
    if (!this.assigneeId) return;
    this.actionError = null;
    this.actionLoading = true;

    this.api.assign(requestId, { assigneeId: this.assigneeId, actorId: null }).subscribe({
      next: () => {
        this.actionLoading = false;
        this.assigneeId = '';
        this.reload();
      },
      error: (err: unknown) => {
        this.actionLoading = false;
        this.actionError = this.mapActionError(err);
      },
    });
  }

  addComment(requestId: string): void {
    if (!this.commentMessage) return;
    this.actionError = null;
    this.actionLoading = true;

    this.api
      .addComment(requestId, {
        message: this.commentMessage,
        actorId: null,
        visibleToClient: this.commentVisibleToClient,
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.commentMessage = '';
          this.reload();
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapActionError(err);
        },
      });
  }

  addRevision(requestId: string): void {
    this.actionError = null;
    this.actionLoading = true;

    this.api
      .addRevision(requestId, {
        message: this.revisionMessage || null,
        actorId: null,
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.revisionMessage = '';
          this.reload();
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapActionError(err);
        },
      });
  }
}
