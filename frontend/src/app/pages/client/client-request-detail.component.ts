import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { ClientApi } from '../../api/client.api';
import type { RequestDto } from '../../api/request';
import type { RequestEventDto } from '../../api/request-event';

type Vm =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; request: RequestDto | null; events: RequestEventDto[] };

@Component({
  selector: 'app-client-request-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <p><a routerLink="/client/requests">Voltar</a></p>

    <h2>Detalhe da Requisição</h2>

    @if (vm$ | async; as vm) { @if (vm.status === 'loading') {
    <p>Carregando...</p>
    } @else if (vm.status === 'error') {
    <p style="color: inherit;">{{ vm.message }}</p>
    } @else { @if (vm.request) {
    <div style="display: grid; gap: 6px; margin: 12px 0;">
      <div><strong>Título:</strong> {{ vm.request.title }}</div>
      <div><strong>Status:</strong> {{ vm.request.status }}</div>
      <div><strong>Prioridade:</strong> {{ vm.request.priority }}</div>
      <div><strong>Tipo:</strong> {{ vm.request.type }}</div>
      <div><strong>Departamento:</strong> {{ vm.request.department }}</div>
      <div>
        <strong>Due date:</strong>
        {{ vm.request.dueDate ? (vm.request.dueDate | date : 'dd/MM/yyyy HH:mm') : '-' }}
      </div>
    </div>
    }

    <h3>Eventos (visíveis para cliente)</h3>
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
            <th style="text-align: left; padding: 8px;">Mensagem</th>
          </tr>
        </thead>
        <tbody>
          @for (e of vm.events; track e.id) {
          <tr>
            <td style="padding: 8px;">{{ e.createdAt | date : 'dd/MM/yyyy HH:mm' }}</td>
            <td style="padding: 8px;">{{ e.eventType }}</td>
            <td style="padding: 8px;">{{ (e.fromStatus ?? '-') + ' → ' + (e.toStatus ?? '-') }}</td>
            <td style="padding: 8px;">{{ e.message ?? '-' }}</td>
          </tr>
          }
        </tbody>
      </table>
    </div>
    } }
  `,
})
export class ClientRequestDetailComponent {
  readonly vm$;

  constructor(route: ActivatedRoute, clientApi: ClientApi) {
    this.vm$ = route.paramMap.pipe(
      map((pm) => pm.get('id')),
      switchMap((id) => {
        if (!id) return of({ status: 'error' as const, message: 'ID inválido.' });

        // Cliente não depende de /requests/{id}. Usa /requests/mine e encontra pelo id.
        const request$ = clientApi
          .listMyRequests()
          .pipe(map((list: RequestDto[]) => list.find((r) => r.id === id) ?? null));

        return combineLatest([request$, clientApi.listRequestEventsVisibleToClient(id)]).pipe(
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
                  message: 'Sem permissão (403). Necessário CLIENT_USER.',
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
}
