import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientService } from 'src/app/services/client.service';
import { CommandeService } from 'src/app/services/commande.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UserService } from 'src/app/services/user.service';
declare var $: any;

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent implements OnInit {

  page: number = 1;
  nbrComm: number = 0;
  defaultItem: number = 100;
  nbrPage: number = 0;
  date: any;
  codeClt: any;
  status: any;

  searchSelect = '';
  selectedClient: any = null;
  showDropdown = false;

  isDisable = false;
  isClick = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public commandeService: CommandeService, public router: Router,
    private datePipe: DatePipe, public clientService: ClientService,
    public userService: UserService,
    public localStorageService: LocalStorageService) { }

  ngOnInit() {
    this.date = this.datePipe.transform(new Date(Date.now()), 'dd-MM-yyyy');
    this.commandeService.getCommandesDay();
    this.getClients();
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  get filteredClient() {
    return this.clientService.listClient.filter(client =>
      client.name.toLowerCase().includes(this.searchSelect.toLowerCase())
    );
  }

  // =====================================================================
  // Utilitaires communs (remplacent le code copié-collé)
  // =====================================================================

  /**
   * Extrait la liste des commandes d'une réponse API.
   * Accepte aussi bien un tableau direct que { commandes: [...] }.
   * Ne plante jamais si la réponse est inattendue.
   */
  private extraireListe(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.commandes)) {
      return data.commandes;
    }
    return [];
  }

  /** Applique une liste de commandes et recalcule compteurs, pagination et totaux. */
  private appliquerListe(data: any): void {
    const liste = this.extraireListe(data);
    const s = this.commandeService;

    s.listCommande = liste;
    s.nbrCmd = liste.length;
    this.nbrComm = liste.length;
    this.nbrPage = Math.ceil(this.nbrComm / this.defaultItem);

    s.totalVente = liste.reduce((t, c) => t + (Number(c.net) || 0), 0);
    s.totalAvance = liste.reduce((t, c) => t + (Number(c.versement) || 0), 0);
    s.totalRestant = liste.reduce((t, c) => t + (Number(c.restant) || 0), 0);
  }

  /** Remet les totaux à zéro avant un chargement. */
  private resetTotaux(): void {
    this.commandeService.totalVente = 0;
    this.commandeService.totalAvance = 0;
    this.commandeService.totalRestant = 0;
  }

  // =====================================================================
  // Chargements
  // =====================================================================

  getCommandes() {
    this.isDisable = true;
    this.isClick = true;
    this.resetTotaux();
    this.commandeService.getCommandes().subscribe({
      next: data => {
        this.isDisable = false;
        this.isClick = false;
        this.page = 1;
        this.appliquerListe(data);
      },
      error: err => {
        this.isDisable = false;
        this.isClick = false;
        console.error('Erreur chargement des commandes :', err);
      }
    });
  }

  getClients() {
    this.clientService.getAll().subscribe(
      response => {
        this.clientService.listClient = response;
      });
  }

  search() {
    this.page = 1;
    let search: any = $("#inputSearch").val();
    if (search) {
      this.commandeService.searchCommande(search).subscribe({
        next: response => this.appliquerListe(response),
        error: err => console.error('Erreur recherche :', err)
      });
    } else {
      this.commandeService.getCommandesDay();
    }
  }

  OnChangeStatus(ctrl: any) {
    if (ctrl.value) {
      this.resetTotaux();
      this.page = 1;
      this.status = ctrl.value;
      if (this.status == 'payer') {
        this.getCommandesPayer();
      }
      if (this.status == 'cours') {
        this.getCommandesEncours();
      }
      if (this.status == 'nonPay') {
        this.getCommandesRestant();
      }
      if (this.status == 'wave') {
        this.getCommandesWave();
      }
    }
    else {
      this.commandeService.getCommandesDay();
    }
  }

  selectClient(client: any) {
    this.selectedClient = client;
    this.searchSelect = '';
    this.showDropdown = false; // Fermer le dropdown après la sélection
    if (this.selectedClient.code) {
      this.resetTotaux();
      this.page = 1;
      this.codeClt = this.selectedClient.code;
      this.commandeService.getCommandeByCodeClient(this.codeClt).subscribe({
        next: data => this.appliquerListe(data),
        error: err => console.error('Erreur chargement par client :', err)
      });
    }
    else {
      this.commandeService.getCommandesDay();
    }
  }

  onChangeDate(ctrl: any) {
    if (ctrl.value) {
      this.resetTotaux();
      this.page = 1;
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.commandeService.getCommandeByDate(date).subscribe({
        next: data => this.appliquerListe(data),
        error: err => console.error('Erreur chargement par date :', err)
      });
    } else {
      this.commandeService.getCommandesDay();
    }
  }

  onChange2DatesFirst(ctrl: any) {
    if (ctrl.value) {
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.date = date;
    } else {
      this.getCommandes();
    }
  }

  onChange2DatesSecond(ctrl: any) {
    if (ctrl.value) {
      this.resetTotaux();
      this.page = 1;
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.commandeService.getCommandeBy2Dates(this.date, date).subscribe({
        next: data => this.appliquerListe(data),
        error: err => console.error('Erreur chargement entre deux dates :', err)
      });
    } else {
      this.commandeService.getCommandesDay();
    }
  }

  getCommandesPayer() {
    this.resetTotaux();
    this.commandeService.getNbrCommandesPayer().subscribe({
      next: data => this.appliquerListe(data),
      error: err => console.error('Erreur commandes payées :', err)
    });
  }

  getCommandesEncours() {
    this.resetTotaux();
    this.commandeService.getNbrCommandesEncours().subscribe({
      next: data => this.appliquerListe(data),
      error: err => console.error('Erreur commandes en cours :', err)
    });
  }

  getCommandesRestant() {
    this.resetTotaux();
    this.commandeService.getNbrCommandesRestant().subscribe({
      next: data => this.appliquerListe(data),
      error: err => console.error('Erreur commandes non payées :', err)
    });
  }

  getCommandesWave() {
    this.resetTotaux();
    this.commandeService.getNbrCommandesWave().subscribe({
      next: data => this.appliquerListe(data),
      error: err => console.error('Erreur commandes Wave :', err)
    });
  }

  // =====================================================================
  // Actions
  // =====================================================================

  editCommande(commande: any) {
    this.commandeService.edit(commande);
  }

  detail(commande: any) {
    this.commandeService.detail(commande);
  }

  routeVente() {
    // Utilisation de la fonction clearLocalStorage
    const exceptions = ['user', 'token', 'payment'];
    this.localStorageService.clearLocalStorage(exceptions);
    this.router.navigate(['/vente']);
  }

  routeDevis() {
    this.localStorageService.rootDevis();
    this.router.navigate(['/devis']);
  }

  routeBon() {
    // Utilisation de la fonction clearLocalStorage
    const exceptions = ['user', 'token', 'payment'];
    this.localStorageService.clearLocalStorage(exceptions);
    this.router.navigate(['/bon']);
  }

  private openPdfInNewTab(
    pdfWindow: Window,
    blob: Blob
  ): void {

    const pdfUrl = URL.createObjectURL(blob);

    pdfWindow.location.href = pdfUrl;

    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  }

  printFacture(commande: any): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de la facture...</title>
      </head>
      <body style="
        margin:0;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        font-family:Arial,sans-serif;
      ">
        <div>
          <p>Génération de la facture...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printFacture(commande.numero)
      .subscribe({
        next: (blob: Blob) => {

          this.openPdfInNewTab(
            pdfWindow,
            blob
          );

        },

        error: (error) => {

          console.error(
            'Erreur impression facture :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer la facture.
          </div>
        `;
        }
      });
  }

}