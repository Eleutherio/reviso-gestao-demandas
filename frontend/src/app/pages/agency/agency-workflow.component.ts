import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RequestsApi, type RequestStatus } from '../../api/requests.api';
import type { RequestEventDto } from '../../api/request-event';

@Component({
  selector: 'app-agency-workflow',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  template: `
    <p><a routerLink="/agency/requests">Voltar</a></p>

    <h2>Workflow rápido</h2>

    <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin: 12px 0;">
      <div
        style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
      >
        <label style="display: grid; gap: 4px;">
          ID da requisição *
          <input
            placeholder="UUID"
            [(ngModel)]="requestId"
            [ngModelOptions]="{ standalone: true }"
          />
        </label>

        <label style="display: grid; gap: 4px;">
          ID do ator (opcional)
          <input placeholder="UUID" [(ngModel)]="actorId" [ngModelOptions]="{ standalone: true }" />
        </label>
      </div>
    </div>

    @if (actionError) {
    <p style="color: inherit;">{{ actionError }}</p>
    }

    <div style="display: grid; gap: 12px; margin: 12px 0;">
      <div style="display: grid; gap: 8px;">
        <div><strong>Alterar status</strong></div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <select [(ngModel)]="statusTo" [ngModelOptions]="{ standalone: true }">
            <option [ngValue]="null">Selecione...</option>
            @for (s of legacyStatuses; track s) {
            <option [ngValue]="s">{{ s }}</option>
            }
          </select>

          <input
            type="text"
            placeholder="Mensagem"
            [(ngModel)]="statusMessage"
            [ngModelOptions]="{ standalone: true }"
            style="min-width: 280px;"
          />

          <button type="button" (click)="changeStatus()" [disabled]="actionLoading || !statusTo">
            Alterar
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Comentário</strong></div>
        <textarea
          rows="2"
          placeholder="Mensagem"
          [(ngModel)]="commentMessage"
          [ngModelOptions]="{ standalone: true }"
        ></textarea>
        <div>
          <button
            type="button"
            (click)="addComment()"
            [disabled]="actionLoading || !commentMessage"
          >
            Comentar
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Revisão</strong></div>
        <textarea
          rows="2"
          placeholder="Detalhes"
          [(ngModel)]="revisionMessage"
          [ngModelOptions]="{ standalone: true }"
        ></textarea>
        <div>
          <button type="button" (click)="addRevision()" [disabled]="actionLoading">
            Registrar
          </button>
        </div>
      </div>

      <div style="display: grid; gap: 8px;">
        <div><strong>Atribuir</strong></div>
        <input
          placeholder="UUID do responsável"
          [(ngModel)]="assigneeId"
          [ngModelOptions]="{ standalone: true }"
          style="min-width: 320px;"
        />
        <div>
          <button type="button" (click)="assign()" [disabled]="actionLoading || !assigneeId">
            Atribuir
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button type="button" (click)="loadEvents()" [disabled]="actionLoading">
          Carregar eventos
        </button>
        @if (actionLoading) {
        <span>Carregando...</span>
        }
      </div>
    </div>

    @if (eventsError) {
    <p style="color: inherit;">{{ eventsError }}</p>
    } @if (events.length) {
    <h3>Eventos</h3>
    <p>
      Total: <strong>{{ events.length }}</strong>
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
          @for (e of events; track e.id) {
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
    }
  `,
})
export class AgencyWorkflowComponent {
  readonly legacyStatuses: RequestStatus[] = [
    'NEW',
    'IN_PROGRESS',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'DELIVERED',
    'CLOSED',
  ];

  requestId = '';
  actorId = '';

  statusTo: RequestStatus | null = null;
  statusMessage = '';

  commentMessage = '';

  revisionMessage = '';

  assigneeId = '';

  actionLoading = false;
  actionError: string | null = null;

  events: RequestEventDto[] = [];
  eventsError: string | null = null;

  constructor(private readonly api: RequestsApi) {}

  private cleanRequestId(): string | null {
    const id = this.requestId.trim();
    return id ? id : null;
  }

  private actorPayload(): { actorId?: string } {
    const actorId = this.actorId.trim();
    return actorId ? { actorId } : {};
  }

  private mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Não autenticado (401). Faça login novamente.';
      if (err.status === 403) return 'Sem permissão (403). Necessário AGENCY_USER/ADMIN.';
      const backendMessage =
        typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
      return backendMessage || `Erro HTTP ${err.status}: ${err.statusText || 'Falha'}`;
    }
    return err instanceof Error ? err.message : 'Falha inesperada.';
  }

  changeStatus(): void {
    const requestId = this.cleanRequestId();
    if (!requestId || !this.statusTo) return;

    this.actionError = null;
    this.actionLoading = true;

    this.api
      .changeStatus(requestId, {
        toStatus: this.statusTo,
        message: this.statusMessage,
        ...this.actorPayload(),
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.statusMessage = '';
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapError(err);
        },
      });
  }

  addComment(): void {
    const requestId = this.cleanRequestId();
    const message = this.commentMessage;
    if (!requestId || !message) return;

    this.actionError = null;
    this.actionLoading = true;

    this.api
      .addComment(requestId, {
        message,
        ...this.actorPayload(),
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.commentMessage = '';
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapError(err);
        },
      });
  }

  addRevision(): void {
    const requestId = this.cleanRequestId();
    if (!requestId) return;

    this.actionError = null;
    this.actionLoading = true;

    const message = this.revisionMessage.trim();

    this.api
      .addRevision(requestId, {
        ...(message ? { message } : {}),
        ...this.actorPayload(),
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.revisionMessage = '';
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapError(err);
        },
      });
  }

  assign(): void {
    const requestId = this.cleanRequestId();
    const assigneeId = this.assigneeId.trim();
    if (!requestId || !assigneeId) return;

    this.actionError = null;
    this.actionLoading = true;

    this.api
      .assign(requestId, {
        assigneeId,
        ...this.actorPayload(),
      })
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.assigneeId = '';
        },
        error: (err: unknown) => {
          this.actionLoading = false;
          this.actionError = this.mapError(err);
        },
      });
  }

  loadEvents(): void {
    const requestId = this.cleanRequestId();
    if (!requestId) return;

    this.eventsError = null;
    this.actionLoading = true;

    this.api.listEvents(requestId, false).subscribe({
      next: (events) => {
        this.actionLoading = false;
        this.events = events;
      },
      error: (err: unknown) => {
        this.actionLoading = false;
        this.eventsError = this.mapError(err);
      },
    });
  }
}
