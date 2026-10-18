import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GatewayService } from './gateway.service';

@Component({
    selector: 'app-gateway-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page">
      <h1>Espace gestionnaire</h1>
      <p class="sub">Connectez-vous pour accéder à tous vos magasins.</p>

      <form class="box" (ngSubmit)="valider()">
        <label for="email">Email</label>
        <input id="email" type="email" name="email" [(ngModel)]="email"
               autocomplete="username" required />

        <label for="password">Mot de passe</label>
        <input id="password" type="password" name="password" [(ngModel)]="password"
               autocomplete="current-password" required />

        <p class="err" *ngIf="erreur">{{ erreur }}</p>

        <button type="submit" [disabled]="chargement || !email || !password">
          {{ chargement ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  `,
    styles: [`
    .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center;
            justify-content: center; background: #fff; padding: 24px; font-family: inherit; }
    h1 { font-size: 26px; font-weight: 500; margin: 0 0 8px; }
    .sub { color: #5f6368; margin: 0 0 28px; text-align: center; }
    .box { width: 100%; max-width: 380px; background: #f8f9fa; border-radius: 14px;
           padding: 24px; display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; color: #3c4043; margin-top: 8px; }
    input { padding: 11px 12px; border: 1px solid #dadce0; border-radius: 8px; font-size: 15px; }
    input:focus { outline: none; border-color: #1a73e8; }
    button { margin-top: 18px; padding: 12px; border: 0; border-radius: 999px;
             background: #1a73e8; color: #fff; font-size: 15px; cursor: pointer; }
    button:disabled { opacity: .55; cursor: default; }
    .err { color: #d93025; font-size: 13px; margin: 6px 0 0; }
  `],
})
export class GatewayLoginComponent {
    email = '';
    password = '';
    erreur = '';
    chargement = false;

    constructor(private gw: GatewayService, private router: Router) {
        if (this.gw.isLoggedIn) this.router.navigateByUrl('/gateway/magasins');
    }

    valider(): void {
        this.erreur = '';
        this.chargement = true;

        this.gw.login(this.email.trim(), this.password).subscribe({
            next: () => this.router.navigateByUrl('/gateway/magasins'),
            error: (e) => {
                this.chargement = false;
                if (e.status === 422) this.erreur = e.error?.message ?? 'Identifiants incorrects.';
                else if (e.status === 429) this.erreur = 'Trop de tentatives. Réessayez dans une minute.';
                else this.erreur = 'Connexion impossible. Vérifiez votre réseau.';
            },
        });
    }
}