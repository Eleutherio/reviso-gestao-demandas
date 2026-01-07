import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RequestsApi, type CreateRequestDto } from '../../api/requests.api';
import type { AgencyDepartment } from '../../api/request';

@Component({
  selector: 'app-agency-create-request',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Criar requisição</h2>

    <p style="margin: 0 0 12px;">
      Fluxo manual (equivalente ao cadastro do legado): informe a empresa e os campos necessários.
    </p>

    <form (submit)="onSubmit($event)" style="display: grid; gap: 10px; max-width: 720px;">
      <label style="display: grid; gap: 4px;">
        ID da empresa (companyId) *
        <input
          required
          placeholder="UUID da empresa"
          [value]="form.companyId"
          (input)="form.companyId = getValue($event)"
        />
      </label>

      <label style="display: grid; gap: 4px;">
        Título *
        <input required [value]="form.title" (input)="form.title = getValue($event)" />
      </label>

      <label style="display: grid; gap: 4px;">
        Descrição
        <textarea
          rows="3"
          [value]="form.description"
          (input)="form.description = getValue($event)"
        ></textarea>
      </label>

      <label style="display: grid; gap: 4px;">
        Tipo
        <select [value]="form.type" (change)="form.type = getSelectValue($event)">
          <option value="">Selecione...</option>
          <option value="POST">POST</option>
          <option value="STORY">STORY</option>
          <option value="BANNER">BANNER</option>
          <option value="LANDING_PAGE">LANDING_PAGE</option>
          <option value="TRAFFIC">TRAFFIC</option>
          <option value="EMAIL">EMAIL</option>
          <option value="VIDEO">VIDEO</option>
          <option value="OTHER">OTHER</option>
        </select>
      </label>

      <label style="display: grid; gap: 4px;">
        Prioridade
        <select [value]="form.priority" (change)="form.priority = getSelectValue($event)">
          <option value="">Selecione...</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
      </label>

      <label style="display: grid; gap: 4px;">
        Departamento *
        <select
          required
          [value]="form.department"
          (change)="form.department = getDepartment($event)"
        >
          <option value="DESIGN">DESIGN</option>
          <option value="COPY">COPY</option>
          <option value="DEV">DEV</option>
          <option value="PLANNING">PLANNING</option>
          <option value="PRODUCTION">PRODUCTION</option>
          <option value="MEDIA">MEDIA</option>
        </select>
      </label>

      <label style="display: grid; gap: 4px;">
        Vencimento
        <input
          type="datetime-local"
          [value]="form.dueDate"
          (input)="form.dueDate = getValue($event)"
        />
      </label>

      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <button type="submit" [disabled]="saving">{{ saving ? 'Criando...' : 'Criar' }}</button>
        @if (error) {
        <span style="color: inherit;">{{ error }}</span>
        }
      </div>
    </form>
  `,
})
export class AgencyCreateRequestComponent {
  saving = false;
  error: string | null = null;

  form: {
    companyId: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    department: AgencyDepartment;
    dueDate: string;
  } = {
    companyId: '',
    title: '',
    description: '',
    type: '',
    priority: '',
    department: 'DESIGN',
    dueDate: '',
  };

  constructor(private readonly api: RequestsApi, private readonly router: Router) {}

  getValue(ev: Event): string {
    const target = ev.target as HTMLInputElement | HTMLTextAreaElement;
    return target.value;
  }

  getSelectValue(ev: Event): string {
    const target = ev.target as HTMLSelectElement;
    return target.value;
  }

  getDepartment(ev: Event): AgencyDepartment {
    const target = ev.target as HTMLSelectElement;
    return target.value as AgencyDepartment;
  }

  private toIsoUtcOrNull(dtLocalValue: string): string | null {
    const trimmed = (dtLocalValue ?? '').trim();
    if (!trimmed) return null;
    return new Date(trimmed).toISOString();
  }

  async onSubmit(ev: Event): Promise<void> {
    ev.preventDefault();
    this.error = null;

    const companyId = this.form.companyId.trim();
    const title = this.form.title.trim();
    if (!companyId || !title) {
      this.error = 'CompanyId e Título são obrigatórios.';
      return;
    }

    const dto: CreateRequestDto = {
      companyId,
      title,
      description: this.form.description.trim() || null,
      type: this.form.type || null,
      priority: this.form.priority || null,
      department: this.form.department,
      dueDate: this.toIsoUtcOrNull(this.form.dueDate),
    };

    this.saving = true;
    try {
      const created = await firstValueFrom(this.api.create(dto));
      await this.router.navigate(['/agency/requests', created.id]);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.error = `Erro HTTP ${err.status}: ${
          err.error?.message ?? err.statusText ?? 'Falha ao criar'
        }`;
      } else {
        this.error = err instanceof Error ? err.message : 'Falha inesperada ao criar';
      }
    } finally {
      this.saving = false;
    }
  }
}
