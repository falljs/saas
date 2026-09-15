import { registerLocaleData } from '@angular/common';
import { Component, LOCALE_ID, OnInit } from '@angular/core';
import localeFr from '@angular/common/locales/fr';
import { Router } from '@angular/router';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { PaymentService } from 'src/app/services/payment.service';
import { ParametreService } from 'src/app/services/parametre.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

registerLocaleData(localeFr, 'fr');

declare const bootstrap: any;

@Component({
  selector: 'app-inventaire',
  templateUrl: './inventaire.component.html',
  styleUrls: ['./inventaire.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'fr' }]
})
export class InventaireComponent implements OnInit {

  private url = environment.apiUrl;

  firstRoleName: string | null = null;

  produit: any;
  settingPayment: any;
  hostname: any;
  reference: any;

  mouvementsOriginal: any[] = [];
  mouvementsFiltres: any[] = [];
  dateDebut: string = '';
  dateFin: string = '';

  statutFiltre: string = '';
  sourceFiltre: string = '';
  destinationFiltre: string = '';

  motCle: string = '';
  typeFiltre: string = '';

  constructor(public produitService: ProduitService, public router: Router,
    public userService: UserService, public paymentService: PaymentService,
    public parametreService: ParametreService, public http: HttpClient) { }

  ngOnInit() {

    this.refreshRoleAndPermissonsUser();

    if (this.userService.user.roles &&
      this.userService.user.roles.length > 0) {

      this.firstRoleName =
        this.userService.user.roles[0].name;
    }

    const produitStorage =
      localStorage.getItem('produitInventaire');

    if (!produitStorage) {
      this.router.navigate(['/produit']);
      return;
    }

    const data = JSON.parse(produitStorage);

    this.chargerInventaire(data.id);

    this.checkpaiement();
  }

  chargerInventaire(id: number) {

    this.produitService.inventaire(id).subscribe({

      next: (response: any) => {

        this.produit = response;

        this.mouvementsOriginal =
          response.mouvements || [];

        this.mouvementsFiltres =
          [...this.mouvementsOriginal];

      },

      error: (error) => {

        console.error(
          'Erreur chargement inventaire',
          error
        );

        this.router.navigate(['/produit']);
      }

    });
  }

  checkpaiement() {
    this.parametreService.getSettingIconeStock().subscribe(data => {
      let resp: any = data;
      const settingPaymentList = resp.payments;
      const hostname = window.location.hostname;
      if (!hostname.startsWith('www.')) {
        this.hostname = `www.${hostname}`;
      } else {
        this.hostname = hostname;
      }
      const settingPayment = settingPaymentList.filter((item: any) => item.client === this.hostname && item.module === 'détail produit');
      this.settingPayment = settingPayment[0];
      if (this.settingPayment?.check == 0) {
        this.reference = this.settingPayment?.reference;
        const openModal = document.getElementById('modalPayDetailProduct') as HTMLElement;
        const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
        modalInstance.show();
      }
    });
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  essaie() {
    this.parametreService.getEssaieIconeStock(this.reference).subscribe(data => {
      let resp: any = data;
      const openModal = document.getElementById('modalPayDetailProduct') as HTMLElement;
      const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
      modalInstance.hide();
    });
  }

  get totalTothtAchat(): number {
    return this.produit?.achat?.reduce((sum: number, a: any) => sum + (a.totht || 0), 0) || 0;
  }

  get totalTothtVente(): number {
    return this.produit?.vente?.reduce((sum: number, a: any) => sum + (a.totht || 0), 0) || 0;
  }

  getStockStatus(qty: number, qtyAlert: number): { label: string, class: string, icon: string } {
    if (qty === 0) {
      return { label: 'Terminé', class: 'bg-danger', icon: 'fa-times-circle' };
    } else if (qty <= qtyAlert) {
      return { label: 'Presque terminé', class: 'bg-warning text-dark', icon: 'fa-exclamation-triangle' };
    } else {
      return { label: 'En stock', class: 'bg-success', icon: 'fa-check-circle' };
    }
  }

  get totalEntreesFiltrees(): number {
    return this.mouvementsFiltres
      .filter(m => m.nature === 'ENTREE')
      .reduce((s, m) => s + Number(m.qty), 0);
  }

  get totalSortiesFiltrees(): number {
    return this.mouvementsFiltres
      .filter(m => m.nature === 'SORTIE')
      .reduce((s, m) => s + Number(m.qty), 0);
  }

  filtrerMouvements() {
    const debut = this.dateDebut
      ? this.convertDate(this.dateDebut)
      : '';

    const fin = this.dateFin
      ? this.convertDate(this.dateFin)
      : '';

    this.mouvementsFiltres = this.mouvementsOriginal.filter(m => {

      const dateMvt = this.convertDate(m.created_at);

      const okDateDebut =
        !debut || dateMvt >= debut;

      const okDateFin =
        !fin || dateMvt <= fin;


      const okStatut =
        !this.statutFiltre ||
        m.statut === this.statutFiltre;


      const source =
        m.type?.split('=>')[0]?.trim() || '';

      const destination =
        m.type?.split('=>')[1]?.trim() || '';


      const okSource =
        !this.sourceFiltre ||
        source === this.sourceFiltre;


      const okDestination =
        !this.destinationFiltre ||
        destination === this.destinationFiltre;


      const okRecherche =
        !this.motCle ||
        JSON.stringify(m)
          .toLowerCase()
          .includes(this.motCle.toLowerCase());

      const okType =
        !this.typeFiltre ||
        m.nature === this.typeFiltre;


      return (
        okDateDebut &&
        okDateFin &&
        okStatut &&
        okSource &&
        okDestination &&
        okType &&
        okRecherche
      );
    });
  }

  convertDate(date: any): string {

    if (!date) return '';

    const d = new Date(date);

    return [
      d.getFullYear(),
      ('0' + (d.getMonth() + 1)).slice(-2),
      ('0' + d.getDate()).slice(-2)
    ].join('-');
  }

  resetFiltre() {
    this.dateDebut = '';
    this.dateFin = '';
    this.statutFiltre = '';
    this.sourceFiltre = '';
    this.destinationFiltre = '';
    this.motCle = '';
    this.typeFiltre = '';

    this.mouvementsFiltres = [...this.mouvementsOriginal];
  }

}
