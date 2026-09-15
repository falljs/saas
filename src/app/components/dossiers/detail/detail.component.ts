import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AchatService } from 'src/app/services/achat.service';
import { BonAchatService } from 'src/app/services/bon-achat.service';
import { BonService } from 'src/app/services/bon.service';
import { CommandeService } from 'src/app/services/commande.service';
import { DevisService } from 'src/app/services/devis.service';
import { DossierService } from 'src/app/services/dossier.service';
import { LigneReglementAchatService } from 'src/app/services/ligne-reglement-achat.service';
import { LigneReglementService } from 'src/app/services/ligne-reglement.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UserService } from 'src/app/services/user.service';
declare var $: any;

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit {

  formUpdate!: FormGroup;
  dossier!: any;
  client!: any;
  fournisseur!: any;
  msgError!: any;

  listComm!: any[];
  listBons!: any[];
  listDevis!: any[];

  listAchats!: any[];
  listBonAchats!: any[];

  nbrComm: number = 0;
  totalVente: number = 0;
  totalPayer: number = 0;
  totalRestant: number = 0;

  nbrDevis: number = 0;
  totalDevis: number = 0;

  nbrBon: number = 0;
  totalBon: number = 0;

  nbrAchat: number = 0;
  totalAchat: number = 0;
  totalPayerAchat: number = 0;
  totalRestantAchat: number = 0;

  nbrBonAchat: number = 0;
  totalBonAchat: number = 0;

  beneficeCom: number = 0;
  beneficeBon: number = 0;

  listReglements: any[] = [];
  listReglementsFiltres: any[] = [];

  dateDebut: string = '';
  dateFin: string = '';

  listReglementAchats: any[] = [];
  listReglementAchatsFiltres: any[] = [];
  searchFacture: string = '';

  // Réglement
  formReglement!: FormGroup;
  formReglementAchat!: FormGroup;

  id_ligneReg!: number;
  verser!: number;
  monnaie: number = 0;
  disableBtn: boolean = false;
  isDossier: any = 'none';

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  phone: string = '';

  hasPhone = false;
  hasImpayes = false;

  listAchatsFiltres: any[] = [];
  searchNumeroAchat: string = '';
  dateDebutAchat: string = '';
  dateFinAchat: string = '';


  constructor(public dossierService: DossierService, public userService: UserService,
    public router: Router, public localStorageService: LocalStorageService,
    public toastrService: ToastrService, public commandeService: CommandeService,
    public fb: FormBuilder, public reglementService: LigneReglementService,
    public bonService: BonService, public devisService: DevisService, public reglementAchatService: LigneReglementAchatService,
    public achatService: AchatService, public bonAchatService: BonAchatService) { }
  get fUpdate() { return this.formUpdate.controls }

  ngOnInit() {
    this.getDossier();
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

  /**
   * CORRECTIF TEMPORAIRE - côté CLIENT uniquement.
   *
   * Le ReglementAchatController (fournisseur) a été corrigé pour stocker
   * directement `net` = solde avant versement, donc le tableau des achats
   * n'a plus besoin de ce recalcul (voir getDossier()).
   *
   * Ce recalcul reste utilisé uniquement pour les règlements CLIENT en
   * attendant la même correction dans le ReglementController (backend).
   * A supprimer dès que ce contrôleur sera corrigé, pour repasser sur
   * reg.net / reg.restant directement, comme pour les achats.
   */
  private calculerHistoriqueReglements(reglements: any[]): any[] {

    // On travaille du plus ancien au plus récent
    // pour calculer correctement l'historique.
    const reglementsTries = [...reglements].sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    // Nombre de versements déjà effectués par facture
    const versementsParFacture: { [key: string]: number } = {};

    const resultats = reglementsTries.map((reg: any) => {

      const numeroFacture = reg.commande?.numero;

      const montantInitial = Number(reg.net || 0);
      const versement = Number(reg.avance || 0);

      // Montant restant AVANT ce versement
      const dejaVerse = versementsParFacture[numeroFacture] || 0;

      const montantFactureAffiche =
        montantInitial - dejaVerse;

      // Reste APRÈS ce versement
      const resteAffiche =
        montantFactureAffiche - versement;

      // Mise à jour du cumul
      versementsParFacture[numeroFacture] =
        dejaVerse + versement;

      return {
        ...reg,
        montant_facture_affiche: montantFactureAffiche,
        reste_affiche: resteAffiche
      };
    });

    // On remet du plus récent au plus ancien
    return resultats.reverse();
  }

  getDossier() {
    if (localStorage.getItem('dossier') != null) {
      this.dossier = JSON.parse(localStorage.getItem('dossier')!);
      this.dossierService.getDossier(this.dossier.id).subscribe(
        data => {
          let response: any = data;
          if (response.client) {
            this.isDossier = 'client';
            this.listComm = response.cmd;
            this.listDevis = response.devis;
            this.listBons = response.bons;
            this.client = response.client;
            this.nbrComm = this.listComm?.length;
            this.nbrDevis = this.listDevis?.length;
            this.nbrBon = this.listBons?.length;
            this.totalVente = response.cmd_mt;
            this.totalDevis = response.devis_mt;
            this.totalBon = response.bon_mt;
            this.totalPayer = response.cmd_verse;
            this.totalRestant = response.cmd_reste;
            this.beneficeCom = response.cmd_bnf;
            this.beneficeBon = response.bon_bnf;

            // Correctif temporaire tant que le ReglementController
            // (client) n'est pas aligné sur le fix du ReglementAchatController.
            this.listReglements = this.calculerHistoriqueReglements(
              response.reglements || []
            );

            this.listReglementsFiltres = [...this.listReglements];

            this.phone = this.client.phone || '';
            this.hasPhone = this.phone.trim() != '';
            this.hasImpayes = this.listComm.some((c: any) => c.restant > 0);

          } else {
            this.isDossier = 'fournisseur';
            this.listAchats = response.achat;
            this.listAchats = response.achat;
            this.listAchatsFiltres = [...this.listAchats];
            this.listBonAchats = response.bonAchat;

            this.fournisseur = response.fournisseur;

            this.nbrAchat = this.listAchats?.length;
            this.nbrBonAchat = this.listBonAchats?.length;

            this.totalAchat = response.achat_mt;
            this.totalBonAchat = response.bonAchat_mt;
            this.totalPayerAchat = response.achat_verse;
            this.totalRestantAchat = response.achat_reste;

            // Le backend (ReglementAchatController) renvoie déjà `net`
            // = solde avant versement et `restant` correct : plus besoin
            // de recalcul frontend ici, contrairement au client (cf. plus haut).
            this.listReglementAchats = response.reglementAchats || [];
            this.listReglementAchatsFiltres = [...this.listReglementAchats];

            this.phone = this.fournisseur.phone || '';
            this.hasPhone = this.phone.trim() != '';
            this.hasImpayes = this.listAchats.some((a: any) => a.restant > 0);
          }
        });
    }
  }

  editCommande(commande: any) {
    this.commandeService.edit(commande);
  }

  editDevis(devis: any) {
    this.devisService.edit(devis);
  }

  editBon(bon: any) {
    this.bonService.edit(bon);
  }

  editAchat(achat: any) {
    this.achatService.edit(achat);
  }

  editBonAchat(achat: any) {
    this.bonAchatService.edit(achat);
  }

  detailCommande(commande: any) {
    this.commandeService.detail(commande);
  }

  detailDevis(devis: any) {
    this.devisService.detail(devis);
  }

  detailBon(bon: any) {
    this.bonService.detail(bon);
  }

  detailAchat(achat: any) {
    this.achatService.detail(achat);
  }

  detailBonAchat(achat: any) {
    this.bonAchatService.detail(achat);
  }

  routeDossier() {
    this.localStorageService.rootDossier();
    this.router.navigate(['/dossier']);
  }


  InfoFormReglement() {
    this.formReglement = this.fb.group({
      client: this.client.code,
      net: this.totalVente,
      verser: this.verser,
      restant: this.totalVente - this.totalPayer,
      auteur: this.userService.name,
    });
  }

  onSubmitReglement() {
    this.disableBtn = true;
    this.InfoFormReglement();
    this.reglementService.setCreatedClientReglement(this.formReglement.value).subscribe({
      next: data => {
        let response: any = data;
        this.toastrService.success('versement de ' + response.ligneReglement.avance + ' F CFA');
        this.verser = 0;
        this.disableBtn = false;
        this.getDossier();
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }

  InfoFormReglementAchat() {
    this.formReglementAchat = this.fb.group({
      fournisseur: this.fournisseur.code,
      net: this.totalAchat,
      verser: this.verser,
      restant: this.totalAchat - this.totalPayerAchat,
      auteur: this.userService.name,
    });
  }

  onSubmitReglementAchat() {
    this.disableBtn = true;
    this.InfoFormReglementAchat();
    this.reglementAchatService.setcreatedFournisseurReglement(this.formReglementAchat.value).subscribe({
      next: data => {
        let response: any = data;
        this.toastrService.success('versement de ' + response.ligneReglement.avance + ' F CFA');
        this.verser = 0;
        this.disableBtn = false;
        this.getDossier();
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }

  onVerser() {
    if (this.verser < (this.totalVente - this.totalPayer)) {
      this.monnaie = 0;
    } else {
      this.monnaie = this.verser - (this.totalVente - this.totalPayer);
    }
  }

  onVerserAchat() {
    if (this.verser < (this.totalAchat - this.totalPayerAchat)) {
      this.monnaie = 0;
    } else {
      this.monnaie = this.verser - (this.totalAchat - this.totalPayerAchat);
    }
  }

  get totalVersementsReglement(): number {
    return this.listReglementsFiltres.reduce(
      (total, item) => total + Number(item.avance || 0),
      0
    );
  }
  //Start Factures Achat

  private parseDateAchat(dateStr: string): Date | null {
    if (!dateStr) {
      return null;
    }

    // Format ISO : YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Format DD-MM-YYYY ou DD/MM/YYYY
    const match = dateStr.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return new Date(dateStr);
  }

  filtrerAchats() {

    this.listAchatsFiltres = this.listAchats.filter((achat: any) => {

      const numero = (achat.numero || '').toLowerCase();
      const recherche = this.searchNumeroAchat.toLowerCase();

      if (recherche && !numero.includes(recherche)) {
        return false;
      }

      if (this.dateDebutAchat || this.dateFinAchat) {

        const dateAchat = this.parseDateAchat(achat.date_achat);

        if (!dateAchat) {
          return true; // date invalide/absente -> on ne filtre pas cette ligne
        }

        if (this.dateDebutAchat) {
          const debut = new Date(this.dateDebutAchat); // input type="date" => toujours ISO, OK
          if (dateAchat < debut) {
            return false;
          }
        }

        if (this.dateFinAchat) {
          const fin = new Date(this.dateFinAchat);
          fin.setHours(23, 59, 59, 999);
          if (dateAchat > fin) {
            return false;
          }
        }
      }

      return true;
    });
  }

  get totalHtAchatsFiltres(): number {
    return this.listAchatsFiltres.reduce((total, a) => total + Number(a.totht || 0), 0);
  }

  get totalTtcAchatsFiltres(): number {
    return this.listAchatsFiltres.reduce((total, a) => total + Number(a.totttc || 0), 0);
  }

  get totalNetAchatsFiltres(): number {
    return this.listAchatsFiltres.reduce((total, a) => total + Number(a.net || 0), 0);
  }

  get totalVersementAchatsFiltres(): number {
    return this.listAchatsFiltres.reduce((total, a) => total + Number(a.versement || 0), 0);
  }

  get totalRestantAchatsFiltres(): number {
    return this.listAchatsFiltres.reduce((total, a) => total + Number(a.restant || 0), 0);
  }

  get reglementAchatsPourFactureFiltrees(): any[] {
    const numerosFiltres = new Set(
      this.listAchatsFiltres.map((a: any) => a.numero)
    );

    return this.listReglementAchats
      .filter((reg: any) => numerosFiltres.has(reg.achat?.numero))
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  get totalVersementPourFactureFiltrees(): number {
    return this.reglementAchatsPourFactureFiltrees.reduce(
      (total, reg) => total + Number(reg.avance || 0),
      0
    );
  }
  //End getters Filter Factures Achat

  filtrerReglements() {

    this.listReglementsFiltres = this.listReglements.filter((r: any) => {

      // Filtre facture
      const numeroFacture = (r.commande?.numero || '').toLowerCase();
      const recherche = this.searchFacture.toLowerCase();

      if (recherche && !numeroFacture.includes(recherche)) {
        return false;
      }

      // Filtre dates
      if (this.dateDebut || this.dateFin) {

        const dateReglement = new Date(r.created_at);

        if (this.dateDebut) {
          const debut = new Date(this.dateDebut);
          if (dateReglement < debut) {
            return false;
          }
        }

        if (this.dateFin) {
          const fin = new Date(this.dateFin);
          fin.setHours(23, 59, 59, 999);

          if (dateReglement > fin) {
            return false;
          }
        }
      }

      return true;
    });
  }

  filtrerReglementAchats() {

    this.listReglementAchatsFiltres = this.listReglementAchats.filter((reg: any) => {

      // Filtre facture
      const numeroFacture = (reg.achat?.numero || '').toLowerCase();
      const recherche = this.searchFacture.toLowerCase();

      if (recherche && !numeroFacture.includes(recherche)) {
        return false;
      }

      // Filtre dates
      const dateReg = new Date(reg.created_at);

      if (this.dateDebut) {
        const debut = new Date(this.dateDebut);
        if (dateReg < debut) {
          return false;
        }
      }

      if (this.dateFin) {
        const fin = new Date(this.dateFin);
        fin.setHours(23, 59, 59, 999);

        if (dateReg > fin) {
          return false;
        }
      }

      return true;
    });
  }

  get totalVersementsReglementAchats(): number {
    return this.listReglementAchatsFiltres.reduce(
      (total, item) => total + Number(item.avance || 0),
      0
    );
  }

  /**
   * Retourne true si un filtre (date ou n° facture) est actuellement actif.
   */
  private hasFiltresActifs(): boolean {
    return !!(this.dateDebut || this.dateFin || (this.searchFacture && this.searchFacture.trim() !== ''));
  }

  /**
    * Additionne un montant par facture en ne comptant chaque facture qu'une
    * seule fois (déduplication par numéro), pour éviter de sommer plusieurs
    * fois la même facture lorsqu'elle a plusieurs règlements dans la période filtrée.
    *
    * mode 'max' -> garde le montant le plus élevé (= montant initial de la facture,
    *               utile pour "Montant Facture")
    * mode 'min' -> garde le montant le plus faible (= reste actuel le plus récent,
    *               utile pour "Reste")
    */
  private getUniqueFacturesTotal(
    list: any[],
    key: 'commande' | 'achat',
    champ: string,
    mode: 'max' | 'min' = 'max'
  ): number {
    const valeursParFacture = new Map<string, number>();

    list.forEach((item: any) => {
      const numero = item[key]?.numero;
      if (!numero) {
        return;
      }

      const valeur = Number(item[champ] || 0);
      const valeurActuelle = valeursParFacture.get(numero);

      const doitRemplacer =
        valeurActuelle === undefined ||
        (mode === 'max' && valeur > valeurActuelle) ||
        (mode === 'min' && valeur < valeurActuelle);

      if (doitRemplacer) {
        valeursParFacture.set(numero, valeur);
      }
    });

    return Array.from(valeursParFacture.values()).reduce((total, v) => total + v, 0);
  }

  // ---- Client ----

  get totalMontantFacturesReglement(): number {
    if (!this.hasFiltresActifs()) {
      return this.totalVente;
    }
    return this.getUniqueFacturesTotal(
      this.listReglementsFiltres,
      'commande',
      'montant_facture_affiche',
      'max'
    );
  }

  get totalResteReglement(): number {
    if (!this.hasFiltresActifs()) {
      return this.totalRestant;
    }
    return this.getUniqueFacturesTotal(
      this.listReglementsFiltres,
      'commande',
      'reste_affiche',
      'min'
    );
  }

  // ---- Fournisseur ----

  get totalMontantFacturesReglementAchats(): number {
    if (!this.hasFiltresActifs()) {
      return this.totalAchat;
    }
    return this.getUniqueFacturesTotal(
      this.listReglementAchatsFiltres,
      'achat',
      'net',
      'max'
    );
  }

  get totalResteReglementAchats(): number {
    if (!this.hasFiltresActifs()) {
      return this.totalRestantAchat;
    }
    return this.getUniqueFacturesTotal(
      this.listReglementAchatsFiltres,
      'achat',
      'restant',
      'min'
    );
  }

  sendWhatsapp() {

    this.dossierService.whatsappRappel(this.dossier.id)
      .subscribe({

        next: (response: any) => {

          if (!response.success) {

            this.toastrService.warning(response.message);
            return;

          }

          window.open(response.url, '_blank');

        },

        error: (err) => {

          console.error(err);

          this.toastrService.error("Impossible d'ouvrir WhatsApp.");

        }

      });

  }

  updatePhone() {

    if (!this.phone || this.phone.trim() === '') {

      this.toastrService.warning(
        'Veuillez saisir un numéro de téléphone.'
      );

      return;
    }

    const id = this.isDossier === 'client'
      ? this.client.id
      : this.fournisseur.id;

    this.dossierService
      .updatePhone(id, this.phone, this.isDossier)
      .subscribe({

        next: (response: any) => {

          if (!response.success) {

            this.toastrService.warning(
              response.message
            );

            return;
          }

          this.hasPhone = true;

          this.phone = response.phone;

          if (this.isDossier === 'client') {

            this.client.phone = response.phone;

          } else {

            this.fournisseur.phone = response.phone;

          }

          this.toastrService.success(
            response.message
          );

        },

        error: (err) => {

          console.error(err);

          if (err.status === 422) {

            this.toastrService.warning(
              err.error.message
            );

          } else if (err.status === 404) {

            this.toastrService.error(
              "Le client ou le fournisseur est introuvable."
            );

          } else if (err.status === 500) {

            this.toastrService.error(
              "Une erreur interne est survenue sur le serveur."
            );

          } else {

            this.toastrService.error(
              "Impossible d'enregistrer le numéro. Vérifiez votre connexion puis réessayez."
            );

          }

        }

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
