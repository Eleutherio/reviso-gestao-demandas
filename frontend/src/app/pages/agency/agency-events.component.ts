import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RequestsApi } from '../../api/requests.api';
import type { RequestEventDto } from '../../api/request-event';

@Component({
  selector: 'app-agency-events',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  template: `
    <p><a routerLink="/agency/requests">Voltar</a></p>

    <h2>Eventos da requisição</h2>

    <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin: 12px 0;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: end;">
        <label style="display: grid; gap: 4px; flex: 1 1 360px;">
          ID da requisição *
          <input
            placeholder="UUID"
            [(ngModel)]="requestId"
            [ngModelOptions]="{ standalone: true }"
          />
        </label>

        <button type="button" (click)="reload()" [disabled]="loading">Recarregar</button>
      </div>

      @if (error) {
      <p style="color: inherit; margin-top: 10px;">{{ error }}</p>
      }
    </div>

    @if (loading) {
    <p>Carregando...</p>
    } @if (!loading && events.length) {
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
export class AgencyEventsComponent {
  requestId = '';
  loading = false;
  error: string | null = null;
  events: RequestEventDto[] = [];

  constructor(private readonly api: RequestsApi) {}

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

  reload(): void {
    const id = this.requestId.trim();
    if (!id) return;

    this.loading = true;
    this.error = null;

    this.api.listEvents(id, false).subscribe({
      next: (events) => {
        this.loading = false;
        this.events = events;
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = this.mapError(err);
      },
    });
  }
}
