//Caisse sans encaissements

import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientService } from 'src/app/services/client.service';
import { CommandeService } from 'src/app/services/commande.service';
import { StatistiqueService } from 'src/app/services/statistique.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';
declare var $: any;

@Component({
  selector: 'app-caisse',
  templateUrl: './caisse.component.html',
  styleUrls: ['./caisse.component.scss']
})
export class CaisseComponent implements OnInit {
  private url = environment.apiUrl;


  listCommande!: any[];
  listCommClt!: any[];
  listVersement!: any[];
  listEncaissements!: any[];
  listeRemboursements!: any[];
  listeDettePaie!: any[];
  listCommPayer!: any[];
  listCommEncrs!: any[];
  listCommRest!: any[];

  input: any = '';
  result: any = '';

  mtv: number = 0;
  mte: number = 0;
  mtd: number = 0;
  mteDif: number = 0;

  totalVente: number = 0;
  totalAvance: number = 0;
  totalFrais: number = 0;
  totalRestant: number = 0;
  totalVersementCmd: number = 0;
  totlaAvanceReglement: number = 0;
  totalRemboursement: number = 0;
  totalDette: number = 0;
  totalWave: number = 0;
  totalCheque: number = 0;

  /*
   * Bénéfices (issus de donneesCaisse() côté Laravel)
   *  - totalBenefice    : marges des produits - réductions (frais NON déduits) -> benefice_commandes
   *  - totalBeneficeNet : totalBenefice - frais                                -> benefice_net
   */
  totalBenefice: number = 0;
  totalBeneficeNet: number = 0;

  decaissements_sum: number = 0;
  encaissements_sum: number = 0;

  nbr_cmd: number = 0;
  nbr_cmd_payee: number = 0;
  nbr_cmd_encours: number = 0;
  nbr_cmd_no_payee: number = 0;

  nbrVdus: number = 0;
  nbrPayer: number = 0;
  nbrEncrs: number = 0;
  nbrNonP: number = 0;

  title: any;
  isSearch: boolean = false;

  totPerCent: number = 0;
  verPerCent: number = 0;
  resPerCent: number = 0;

  date: any;
  codeClt: any;
  date1: any;
  date2: any;

  isAll: boolean = false;
  isToDay: boolean = false;
  isDate: boolean = false;
  isClt: boolean = false;
  is2Date: boolean = false;
  is2DateTrue: boolean = false;
  isToDate: boolean = false;

  searchSelect = '';
  selectedClient: any = null;
  showDropdown = false;

  isDisable = false;
  isClick = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle
  user: any;

  caisseActive: boolean = false;
  totalCaisse: number = 0;
  totalVentesEncaissees: number = 0;

  // Pagination serveur des 3 listes
  perPage = 50;
  pageReg = 1; totalReg = 0; searchReg = '';
  pageRemb = 1; totalRemb = 0; searchRemb = '';
  pageDette = 1; totalDetteList = 0;

  totalBeneficeBrut: number = 0;   // marges des produits vendus
  totalReductions: number = 0;     // réductions accordées

  constructor(public clientService: ClientService, public router: Router, public userService: UserService,
    public commandeService: CommandeService, private datePipe: DatePipe,
    public statistiqueService: StatistiqueService) { }

  ngOnInit() {
    this.getClients();
    this.getCommandesToDay();
    this.getCommClientEndetter();
    this.refreshRoleAndPermissonsUser();
    this.user = this.userService.user;
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }
  }

  // Infobulle ouverte : 'benefice' | 'net' | 'reductions' | null
  openInfo: string | null = null;

  toggleInfo(name: string): void {
    this.openInfo = this.openInfo === name ? null : name;
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

  getClients() {
    this.clientService.getAll().subscribe(
      response => {
        this.clientService.listClient = response;
      });
  }

  private calculateCaisse(): void {

    const reglements = Number(this.totlaAvanceReglement) || 0;
    const encaissements = Number(this.encaissements_sum) || 0;
    const decaissements = Number(this.decaissements_sum) || 0;

    const remboursements = Number(this.totalRemboursement) || 0;
    const frais = Number(this.totalFrais) || 0;
    const wave = Number(this.totalWave) || 0;
    const cheque = Number(this.totalCheque) || 0;

    /*
     * Ventes encaissées :
     * on retire les paiements provenant
     * des anciennes dettes.
     */
    this.totalVentesEncaissees =
      reglements - (Number(this.totalDette) || 0);


    /*
     * Total réellement présent dans la caisse.
     */
    if (this.caisseActive) {

      this.totalCaisse =
        reglements
        + encaissements
        - decaissements
        - remboursements
        - frais
        - wave
        - cheque;

    } else {

      this.totalCaisse =
        reglements
        - remboursements
        - frais
        - wave
        - cheque;
    }
  }

  /* =====================================================================
   * REMISE À ZÉRO + APPLICATION DE LA RÉPONSE
   * (centralisés : plus de copier-coller dans chaque méthode)
   * ===================================================================== */

  private resetTotals(): void {
    this.listCommande = [];
    this.listeDettePaie = [];
    this.listVersement = [];
    this.listEncaissements = [];
    this.listeRemboursements = [];
    this.nbrVdus = 0;

    this.totalFrais = 0;
    this.totalVente = 0;
    this.totalAvance = 0;
    this.totalVersementCmd = 0;
    this.totlaAvanceReglement = 0;
    this.totalRestant = 0;
    this.totalRemboursement = 0;
    this.totalDette = 0;
    this.totalWave = 0;
    this.totalCheque = 0;

    this.totalBenefice = 0;
    this.totalBeneficeNet = 0;

    this.totalBeneficeBrut = 0;
    this.totalReductions = 0;

    this.decaissements_sum = 0;
    this.encaissements_sum = 0;

    this.nbr_cmd = 0;
    this.nbr_cmd_payee = 0;
    this.nbr_cmd_encours = 0;
    this.nbr_cmd_no_payee = 0;

    this.totalVentesEncaissees = 0;
    this.totalCaisse = 0;

    this.pageReg = 1; this.totalReg = 0;
    this.pageRemb = 1; this.totalRemb = 0;
    this.pageDette = 1; this.totalDetteList = 0;
  }

  private periodeCourante(): [string | undefined, string | undefined] {
    if (this.isToDay) {
      const t = this.datePipe.transform(new Date(), 'dd-MM-yyyy')!;
      return [t, t];
    }
    if (this.isDate) return [this.date, this.date];
    if (this.is2Date) return [this.date1, this.date2];
    return [undefined, undefined];            // « Toutes les ventes »
  }

  /**
   * Reçoit la réponse de donneesCaisse() (Laravel) et alimente l'écran.
   */
  private applyResponse(response: any): void {
    //this.listCommande = response.commandes;
    //this.listeDettePaie = response.listeDettes;
    //this.listVersement = response.reglements;
    //this.listeRemboursements = response.listeRemboursements;
    //this.nbrVdus = this.listCommande.length;
    this.nbrVdus = Number(response.nbr_cmd) || 0;

    this.totalFrais = Number(response.frais) || 0;
    this.totalVente = Number(response.net) || 0;
    this.totalAvance = Number(response.totalVersementCmd) || 0;
    this.totalVersementCmd = Number(response.totalVersementCmd) || 0;
    this.totlaAvanceReglement = Number(response.totlaAvanceReglement) || 0;
    this.totalRestant = Number(response.restant) || 0;
    this.totalRemboursement = Number(response.remboursement) || 0;
    this.totalDette = Number(response.dette) || 0;
    this.totalWave = Number(response.wave) || 0;
    this.totalCheque = Number(response.cheque) || 0;

    /* Bénéfices : clés renvoyées par le controller */
    this.totalBenefice = Number(response.benefice_commandes) || 0;   // réductions déduites, frais non déduits
    this.totalBeneficeNet = Number(response.benefice_net) || 0;      // réductions et frais déduits

    this.totalBeneficeBrut = Number(response.benefice_brut) || 0;
    this.totalReductions = Number(response.reductions) || 0;

    this.caisseActive = response.caisse_active === true;

    this.encaissements_sum = Number(response.encaissements_sum) || 0;
    this.decaissements_sum = Number(response.decaissements_sum) || 0;

    this.nbr_cmd = Number(response.nbr_cmd) || 0;
    this.nbr_cmd_payee = Number(response.nbr_cmd_payee) || 0;
    this.nbr_cmd_encours = Number(response.nbr_cmd_encours) || 0;
    this.nbr_cmd_no_payee = Number(response.nbr_no_payee) || 0;

    /* Recalcul centralisé */
    this.calculateCaisse();
  }

  /** Charge les 3 listes de la période courante (page 1). */
  private loadListes(): void {
    this.searchReg = '';
    this.searchRemb = '';
    this.loadReglements(1);
    this.loadRemboursements(1);
    this.loadDettes(1);
  }

  loadReglements(page: number): void {
    const [d1, d2] = this.periodeCourante();
    this.commandeService
      .getCaisseReglements(page, this.perPage, d1, d2, this.searchReg.trim())
      .subscribe({
        next: (res: any) => {
          this.listVersement = res?.data ?? [];
          this.totalReg = res?.total ?? 0;
          this.pageReg = res?.current_page ?? page;
        },
        error: err => console.error('Erreur encaissements :', err)
      });
  }

  loadRemboursements(page: number): void {
    const [d1, d2] = this.periodeCourante();
    this.commandeService
      .getCaisseRemboursements(page, this.perPage, d1, d2, this.searchRemb.trim())
      .subscribe({
        next: (res: any) => {
          this.listeRemboursements = res?.data ?? [];
          this.totalRemb = res?.total ?? 0;
          this.pageRemb = res?.current_page ?? page;
        },
        error: err => console.error('Erreur remboursements :', err)
      });
  }

  loadDettes(page: number): void {
    const [d1, d2] = this.periodeCourante();
    this.commandeService
      .getCaisseDettes(page, this.perPage, d1, d2)
      .subscribe({
        next: (res: any) => {
          this.listeDettePaie = res?.data ?? [];
          this.totalDetteList = res?.total ?? 0;
          this.pageDette = res?.current_page ?? page;
        },
        error: err => console.error('Erreur dettes payées :', err)
      });
  }

  /* =====================================================================
   * CHARGEMENTS
   * ===================================================================== */

  getCommandes() {
    this.isToDate = false; // IMPORTANT
    this.isDisable = true;
    this.isClick = true;
    this.isAll = true;
    this.isToDay = false; this.isDate = false;
    this.isClt = false; this.is2Date = false;
    this.title = 'vendu';
    this.isSearch = false;

    this.resetTotals();

    this.commandeService.getCommandes().subscribe({
      next: (data) => {
        this.isDisable = false;
        this.isClick = false;
        this.applyResponse(data);
        this.loadListes();
      },
      error: () => {
        this.isDisable = false;
        this.isClick = false;
      }
    });
  }

  onChangeDate(ctrl: any) {
    this.isToDate = false; // IMPORTANT
    this.isDate = true;
    this.isToDay = false; this.isAll = false;
    this.isClt = false; this.is2Date = false;

    this.resetTotals();

    if (ctrl.value) {
      let date: any = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.date = date;

      this.commandeService.getCommandeByDate(date).subscribe(
        data => {
          this.applyResponse(data);
          this.loadListes();
        });
    }
  }

  getCommandesToDay() {
    this.isToDate = false; // IMPORTANT
    this.isToDay = true;
    this.is2Date = false; this.isClt = false;
    this.isDate = false; this.isAll = false;
    this.title = 'vendu';

    this.resetTotals();

    this.commandeService.getCommandesToDay().subscribe(
      data => {
        this.applyResponse(data);
        this.loadListes();
      });
  }


  // For Calculator
  pressNum(num: string) {

    //Do Not Allow . more than once
    if (num == ".") {
      if (this.input != "") {

        const lastNum = this.getLastOperand()
        if (lastNum.lastIndexOf(".") >= 0) return;
      }
    }

    //Do Not Allow 0 at beginning.
    //Javascript will throw Octal literals are not allowed in strict mode.
    if (num == "0") {
      if (this.input == "") {
        return;
      }
      const PrevKey = this.input[this.input.length - 1];
      if (PrevKey === '/' || PrevKey === '*' || PrevKey === '-' || PrevKey === '+') {
        return;
      }
    }

    this.input = this.input + num
    this.calcAnswer();
  }

  getLastOperand() {
    let pos: number;
    pos = this.input.toString().lastIndexOf("+")
    if (this.input.toString().lastIndexOf("-") > pos) pos = this.input.lastIndexOf("-")
    if (this.input.toString().lastIndexOf("*") > pos) pos = this.input.lastIndexOf("*")
    if (this.input.toString().lastIndexOf("/") > pos) pos = this.input.lastIndexOf("/")
    return this.input.substr(pos + 1)
  }

  pressOperator(op: string) {

    //Do not allow operators more than once
    const lastKey = this.input[this.input.length - 1];
    if (lastKey === '/' || lastKey === '*' || lastKey === '-' || lastKey === '+') {
      return;
    }

    this.input = this.input + op
    this.calcAnswer();
  }

  clear() {
    if (this.input != "") {
      this.input = this.input.substr(0, this.input.length - 1)
    }
  }

  allClear() {
    this.result = '';
    this.input = '';
  }

  calcAnswer() {
    let formula = this.input;

    let lastKey = formula[formula.length - 1];

    if (lastKey === '.') {
      formula = formula.substr(0, formula.length - 1);
    }

    lastKey = formula[formula.length - 1];

    if (lastKey === '/' || lastKey === '*' || lastKey === '-' || lastKey === '+' || lastKey === '.') {
      formula = formula.substr(0, formula.length - 1);
    }

    this.result = eval(formula);
  }

  getAnswer() {
    this.calcAnswer();
    this.input = this.result;
    if (this.input == "0") this.input = "";
  }

  editCommande(commande: any) {
    $('#closeModal').click();
    this.commandeService.edit(commande);
  }

  detail(commande: any) {
    $('#closeModal').click();
    this.commandeService.getCommande(commande.id).subscribe((data) => {
      let response: any = data;
      this.commandeService.commande = response.commande;
      localStorage.removeItem('commande')
      localStorage.removeItem('dossier')
      localStorage.removeItem('client')
      localStorage.removeItem('listLigneCommande')
      localStorage.removeItem('listLigneCommande')
      localStorage.setItem('commande', JSON.stringify(this.commandeService.commande));
      localStorage.setItem('listLigneCommande', JSON.stringify(response.ligneCommandes));
      localStorage.setItem('listReglement', JSON.stringify(response.ligneReglements));
      localStorage.setItem('client', JSON.stringify(response.client));
      localStorage.setItem('dossier', JSON.stringify(response.dossier));
      this.router.navigate(['/commande-detail']);
    });
  }

  searchNumber() {
    var input: any, filter, table: any, tr, i;

    input = document.getElementById("inputNum");
    if (input.value) {
      this.isSearch = true;
    } else {
      this.isSearch = false;
    }
    filter = input.value.toUpperCase();
    table = document.getElementById("tableComm");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
      var td0 = tr[i].getElementsByTagName("td")[0];

      if (td0) {
        var txtValue0 = td0.textContent || td0.innerHTML;
        if (
          txtValue0.toUpperCase().indexOf(filter) == 0
        ) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  searchDate() {
    var input: any, filter, table: any, tr, i;

    input = document.getElementById("inputDate");
    if (input.value) {
      this.isSearch = true;
    } else {
      this.isSearch = false;
    }
    filter = input.value.toUpperCase();
    table = document.getElementById("tableComm");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
      var td0 = tr[i].getElementsByTagName("td")[1];

      if (td0) {
        var txtValue0 = td0.textContent || td0.innerHTML;
        if (
          txtValue0.toUpperCase().indexOf(filter) == 0
        ) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  searchClient() {
    var input: any, filter, table: any, tr, i;

    input = document.getElementById("inputClt");
    if (input.value) {
      this.isSearch = true;
    } else {
      this.isSearch = false;
    }
    filter = input.value.toUpperCase();
    table = document.getElementById("tableComm");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
      var td0 = tr[i].getElementsByTagName("td")[2];

      if (td0) {
        var txtValue0 = td0.textContent || td0.innerHTML;
        if (
          txtValue0.toUpperCase().indexOf(filter) == 0
        ) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  onChange2DatesFirst(ctrl: any) {
    if (ctrl.value) {
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.date1 = date;
      this.is2DateTrue = true;
    } else {
      this.is2DateTrue = false;
    }
  }

  onChange2DatesSecond(ctrl: any) {
    this.is2Date = true; this.isToDate = true;
    this.isToDay = false; this.isClt = false;
    this.isDate = false; this.isAll = false;
    if (ctrl.value) {
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.date2 = date;

      this.resetTotals();

      this.commandeService.getCommandeBy2Dates(this.date1, date).subscribe(
        data => {
          this.applyResponse(data);
          this.loadListes();
        });
    }
  }

  getCommClientEndetter() {
    this.statistiqueService.getCommandesClientEndette().subscribe(
      res => {
        let response: any = res;
        this.listCommClt = response;
      });
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

  printToDay(): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de la caisse...</title>
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
          <p>Génération de la caisse du jour...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printToDay(this.user.id)
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error) => {

          console.error(
            'Erreur impression caisse du jour :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer la caisse.
          </div>
        `;
        }
      });
  }

  printAll(): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de la caisse...</title>
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
          <p>Génération de la caisse...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printAll(this.user.id)
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error) => {

          console.error(
            'Erreur impression caisse :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer la caisse.
          </div>
        `;
        }
      });
  }

  printDate(): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de la caisse...</title>
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
          <p>Génération de la caisse...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printDate(
        this.date,
        this.user.id
      )
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error) => {

          console.error(
            'Erreur impression caisse par date :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer la caisse.
          </div>
        `;
        }
      });
  }

  printTwoDate(): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de la caisse...</title>
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
          <p>Génération de la caisse...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printTwoDate(
        this.date1,
        this.date2,
        this.user.id
      )
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error) => {

          console.error(
            'Erreur impression caisse entre deux dates :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer la caisse.
          </div>
        `;
        }
      });
  }

}
