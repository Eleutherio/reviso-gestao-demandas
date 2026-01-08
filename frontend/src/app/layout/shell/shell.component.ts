import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import type { UserRole } from '../../core/roles';

type NavItem = {
  label: string;
  path: string;
  roles: UserRole[];
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly role: UserRole | null;
  readonly companyId: string | null;
  bannerVisivel = false;
  bannerContagem = '';

  private ultimaAtividadeEm = Date.now();
  private intervaloId: number | null = null;
  private ultimoSinalAtividade = 0;
  private readonly inatividadeMs = 15 * 60 * 1000;
  private readonly logoutMs = 20 * 60 * 1000;
  private readonly throttleAtividadeMs = 1000;
  private readonly eventosAtividade = ['mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];
  private readonly handleAtividade = () => this.registrarAtividade(false);

  private readonly items: NavItem[] = [
    { label: 'Meus Briefings', path: '/client/briefings', roles: ['CLIENT_USER'] },
    { label: 'Minhas Requisições', path: '/client/requests', roles: ['CLIENT_USER'] },

    {
      label: 'Inbox Briefings',
      path: '/agency/briefings/inbox',
      roles: ['AGENCY_USER', 'AGENCY_ADMIN'],
    },
    {
      label: 'Workflow',
      path: '/agency/workflow',
      roles: ['AGENCY_USER', 'AGENCY_ADMIN'],
    },
    {
      label: 'Eventos',
      path: '/agency/events',
      roles: ['AGENCY_USER', 'AGENCY_ADMIN'],
    },
    {
      label: 'Criar requisição',
      path: '/agency/requests/new',
      roles: ['AGENCY_USER', 'AGENCY_ADMIN'],
    },
    { label: 'Requisições', path: '/agency/requests', roles: ['AGENCY_USER', 'AGENCY_ADMIN'] },
    { label: 'Relatórios', path: '/agency/reports', roles: ['AGENCY_USER', 'AGENCY_ADMIN'] },

    { label: 'Empresas', path: '/admin/companies', roles: ['AGENCY_ADMIN'] },
    { label: 'Usuários', path: '/admin/users', roles: ['AGENCY_ADMIN'] },
  ];

  constructor(private readonly auth: AuthService, private readonly router: Router) {
    this.role = this.auth.getRole();
    this.companyId = this.auth.getCompanyId();
  }

  get navItems(): NavItem[] {
    const role = this.role;
    if (!role) return [];
    return this.items.filter((it) => it.roles.includes(role));
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  ngOnInit(): void {
    this.ultimaAtividadeEm = Date.now();
    this.vincularEventosAtividade();
    this.iniciarMonitorInatividade();
  }

  ngOnDestroy(): void {
    this.pararMonitorInatividade();
    this.removerEventosAtividade();
  }

  continuarSessao(): void {
    this.registrarAtividade(true);
  }

  private iniciarMonitorInatividade(): void {
    this.intervaloId = window.setInterval(() => this.atualizarInatividade(), 1000);
    this.atualizarInatividade();
  }

  private pararMonitorInatividade(): void {
    if (this.intervaloId !== null) {
      window.clearInterval(this.intervaloId);
      this.intervaloId = null;
    }
  }

  private vincularEventosAtividade(): void {
    this.eventosAtividade.forEach((evento) =>
      window.addEventListener(evento, this.handleAtividade, { passive: true })
    );
  }

  private removerEventosAtividade(): void {
    this.eventosAtividade.forEach((evento) =>
      window.removeEventListener(evento, this.handleAtividade)
    );
  }

  private registrarAtividade(force: boolean): void {
    const agora = Date.now();
    if (!force && agora - this.ultimoSinalAtividade < this.throttleAtividadeMs) {
      return;
    }
    this.ultimoSinalAtividade = agora;
    this.ultimaAtividadeEm = agora;
    if (this.bannerVisivel) {
      this.bannerVisivel = false;
    }
  }

  private atualizarInatividade(): void {
    const agora = Date.now();
    const inatividade = agora - this.ultimaAtividadeEm;

    if (inatividade >= this.logoutMs) {
      this.executarLogout();
      return;
    }

    if (inatividade >= this.inatividadeMs) {
      const restanteMs = this.logoutMs - inatividade;
      this.bannerVisivel = true;
      this.bannerContagem = this.formatarRestante(restanteMs);
      return;
    }

    this.bannerVisivel = false;
  }

  private formatarRestante(ms: number): string {
    const totalSegundos = Math.max(0, Math.ceil(ms / 1000));
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }

  private executarLogout(): void {
    this.auth.logout();
    this.pararMonitorInatividade();
    this.removerEventosAtividade();
    this.router.navigateByUrl('/login');
  }
}
