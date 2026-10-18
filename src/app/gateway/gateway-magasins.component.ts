import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GatewayService, Magasin } from './gateway.service';

@Component({
    selector: 'app-gateway-magasins',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page">
      <header>
  <span class="who">{{ gw.nom }}</span>
  <div class="actions">
    <button class="link" (click)="charger()" [disabled]="chargement">
      {{ chargement ? 'Actualisation…' : 'Actualiser' }}
    </button>
    <button class="link" (click)="deconnexion()">Se déconnecter</button>
  </div>
</header>

      <h1>Quel magasin voulez-vous gérer ?</h1>
      <p class="sub">Choisissez un magasin pour y accéder directement.</p>

      <input *ngIf="magasins.length > 6" class="search" type="search"
             placeholder="Rechercher un magasin" [(ngModel)]="recherche" />

      <p *ngIf="chargement" class="info">Chargement de vos magasins…</p>
      <p *ngIf="erreur" class="err">{{ erreur }}</p>
      <p *ngIf="!chargement && !erreur && magasins.length === 0" class="info">
        Aucun magasin n'est rattaché à votre compte.
      </p>

      <div class="grid">
        <button class="card" *ngFor="let m of filtres" (click)="entrer(m)"
                [disabled]="entrantId !== null">
          <div class="avatar" [style.background]="couleur(m.nom)">
            <img *ngIf="m.logo" [src]="m.logo" [alt]="m.nom" />
            <span *ngIf="!m.logo">{{ initiale(m.nom) }}</span>
          </div>
          <div class="nom">{{ m.nom }}</div>
          <div class="dom">{{ m.domaine }}</div>
          <span class="badge" [class.ok]="m.statut === 'active'"
                [class.ko]="m.statut === 'suspended'">
            {{ libelle(m.statut) }}
          </span>
          <div class="enter" *ngIf="entrantId === m.id">Ouverture…</div>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .page { min-height: 100vh; background: #fff; padding: 24px; font-family: inherit;
            display: flex; flex-direction: column; align-items: center; }
    header { width: 100%; max-width: 900px; display: flex; justify-content: space-between;
             align-items: center; margin-bottom: 36px; }
    .who { color: #5f6368; font-size: 14px; }
    .link { background: none; border: 0; color: #1a73e8; cursor: pointer; font-size: 14px; }
    h1 { font-size: 26px; font-weight: 500; margin: 0 0 8px; text-align: center; }
    .sub { color: #5f6368; margin: 0 0 24px; text-align: center; }
    .search { width: 100%; max-width: 360px; padding: 10px 14px; border: 1px solid #dadce0;
              border-radius: 999px; margin-bottom: 24px; font-size: 14px; }
    .info { color: #5f6368; } .err { color: #d93025; }
    .grid { width: 100%; max-width: 900px; display: grid; gap: 16px;
            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    .card { background: #f8f9fa; border: 0; border-radius: 14px; padding: 22px 14px;
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            cursor: pointer; transition: box-shadow .15s, transform .15s; font-family: inherit; }
    .card:hover:not(:disabled) { box-shadow: 0 2px 10px rgba(0,0,0,.14); transform: translateY(-2px); }
    .card:disabled { opacity: .6; cursor: default; }
    .avatar { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center;
              justify-content: center; color: #fff; font-size: 32px; overflow: hidden; margin-bottom: 6px; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .nom { font-weight: 600; font-size: 15px; color: #202124; text-align: center; }
    .dom { font-size: 12px; color: #5f6368; word-break: break-all; text-align: center; }
    .badge { font-size: 11px; padding: 2px 10px; border-radius: 999px; background: #e8eaed; color: #3c4043; }
    .badge.ok { background: #e6f4ea; color: #137333; }
    .badge.ko { background: #fce8e6; color: #c5221f; }
    .enter { font-size: 12px; color: #1a73e8; }

    .actions { display: flex; gap: 18px; }
.link:disabled { opacity: .5; cursor: default; }
  `],
})
export class GatewayMagasinsComponent implements OnInit {
    magasins: Magasin[] = [];
    recherche = '';
    chargement = true;
    erreur = '';
    entrantId: string | null = null;

    constructor(public gw: GatewayService, private router: Router) { }

    ngOnInit(): void {
        this.gw.magasins().subscribe({
            next: (liste) => { this.magasins = liste; this.chargement = false; },
            error: (e) => {
                this.chargement = false;
                if (e.status === 401) { this.gw.clear(); this.router.navigateByUrl('/gateway/login'); }
                else this.erreur = 'Impossible de charger vos magasins.';
            },
        });
        window.name = 'iconestock-gateway';   // utile pour l'option ci-dessous
        this.charger();
    }


    charger(): void {
        this.erreur = '';
        this.entrantId = null;   // débloque les cartes si on revient d'un magasin avec le bouton Précédent
        this.chargement = true;

        this.gw.magasins().subscribe({
            next: (liste) => { this.magasins = liste; this.chargement = false; },
            error: (e) => {
                this.chargement = false;
                if (e.status === 401) { this.gw.clear(); this.router.navigateByUrl('/gateway/login'); }
                else this.erreur = 'Impossible de charger vos magasins.';
            },
        });
    }

    get filtres(): Magasin[] {
        const q = this.recherche.trim().toLowerCase();
        return q ? this.magasins.filter((m) => m.nom.toLowerCase().includes(q)) : this.magasins;
    }

    entrer(m: Magasin): void {
        this.erreur = '';
        this.entrantId = m.id;

        // Ouvert tout de suite, dans le clic, pour échapper au bloqueur de popups.
        // Pas de 'noopener' ici : il ferait renvoyer null à window.open.
        const onglet = window.open('', '_blank');
        if (onglet) {
            onglet.opener = null;   // coupe le lien avec la porte d'entrée
            onglet.document.title = 'Ouverture…';
            onglet.document.body.textContent = 'Ouverture du magasin…';
        }

        this.gw.entrer(m.id).subscribe({
            next: (r) => {
                if (onglet) {
                    onglet.location.href = r.url;
                } else {
                    window.location.href = r.url;   // popup bloquée : repli dans le même onglet
                }
                this.entrantId = null;
            },
            error: (e) => {
                onglet?.close();
                this.entrantId = null;
                if (e.status === 401) { this.gw.clear(); this.router.navigateByUrl('/gateway/login'); }
                else this.erreur = e.error?.message ?? "Impossible d'ouvrir ce magasin.";
            },
        });
    }

    deconnexion(): void {
        this.gw.logout().subscribe({ next: () => { }, error: () => { } });
        this.router.navigateByUrl('/gateway/login');
    }

    initiale(nom: string): string { return (nom || '?').trim().charAt(0).toUpperCase(); }

    libelle(s: string): string {
        return s === 'active' ? 'Actif' : s === 'suspended' ? 'Suspendu' : 'Essai';
    }

    couleur(nom: string): string {
        const palette = ['#78909c', '#c2185b', '#2e6b1f', '#7b1fa2', '#e65100', '#00695c', '#1565c0'];
        let h = 0;
        for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return palette[h % palette.length];
    }
}