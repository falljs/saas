import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommandeService } from 'src/app/services/commande.service';
import { LigneCommandeService } from 'src/app/services/ligne-commande.service';
import { UserService } from 'src/app/services/user.service';
import { LigneCommande } from 'src/app/models/ligne-commande';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LigneReglementService } from 'src/app/services/ligne-reglement.service';
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { ToastrService } from 'ngx-toastr';
import { ParametreService } from 'src/app/services/parametre.service';
import { PaymentLinkService } from 'src/app/services/payment-link.service';
import { ClientService } from 'src/app/services/client.service';
import { HttpClient } from '@angular/common/http';
(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
declare const bootstrap: any;

@Component({
  selector: 'app-detail-commande',
  templateUrl: './detail-commande.component.html',
  styleUrls: ['./detail-commande.component.scss']
})
export class DetailCommandeComponent implements OnInit {
  environment = environment;

  //keyboard buttons
  keyEnter: any = 13;

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.keyCode === this.keyEnter) {
      if (this.verser == 0) {

      } else {
        this.keyEnter = null;
        this.onSubmitReglement();
      }
    }
  }

  // Disabled btn
  disableBtn: boolean = false;
  isSubmittingReglement: boolean = false;

  // Réglement
  formReglement!: FormGroup;
  verser!: number;
  monnaie: number = 0;
  wave: number = 0;
  typeMonnaie: string = 'normal';


  // Remboursement
  formRemboursement!: FormGroup;
  mt_remboursement: number = 0;
  motif!: any;

  // Reduction
  formReduction!: FormGroup;
  reduce!: number;

  // Id Ligne Commande
  id_ligneCommande!: number;
  id_Commande!: number;

  // Id Ligne Rglement
  id_ligneReglement!: number;

  // Var Form Commande
  id!: number;
  numero!: number;
  date_comm!: string;
  heure_comm!: string;
  valid!: boolean;
  etat!: boolean;
  totht!: number;
  reduction!: number;
  restant!: number;
  versement: any;
  net!: number;
  tottva!: number;
  auteur!: number;
  id_client: any;
  nom_client: any;
  code_client: any;
  numero_client: any;
  email_client: any;
  totttc!: number;

  editeLigne!: boolean;
  commande: any;
  client: any;

  page: number = 1;
  nbrComm: number = 0;
  defaultItem: number = 4;
  nbrPage: number = 0;
  listCommClt!: any[];

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  updateInfo = {
    phone: '221',
    id: 0
  }

  paymentUrl: string = '';
  loadingPayment: boolean = false;
  copied: boolean = false;
  payment: any = null;

  constructor(public router: Router, public fb: FormBuilder, public reglementService: LigneReglementService,
    public ligneCommandeService: LigneCommandeService, public commandeService: CommandeService,
    public userService: UserService, public ligneRegelementService: LigneReglementService,
    public toastrService: ToastrService, public parametreService: ParametreService,
    public clientService: ClientService, private http: HttpClient, private paymentLinkService: PaymentLinkService) { }

  get fReglement() { return this.formReglement.controls }
  get fReduction() { return this.formReduction.controls }
  get fRemboursement() { return this.formRemboursement.controls }

  ngOnInit() {
    if (localStorage.getItem('commande') != null) {
      this.commande = JSON.parse(localStorage.getItem('commande')!);
      this.ligneCommandeService.listLigneCommande = JSON.parse(localStorage.getItem('listLigneCommandeDetail')!);
      this.ligneRegelementService.listLigneReglement = JSON.parse(localStorage.getItem('listReglementDetail')!);
      this.client = JSON.parse(localStorage.getItem('client')!);
      this.id = this.commande.id;
      this.numero = this.commande.numero;
      this.date_comm = this.commande.date_comm;
      this.heure_comm = this.commande.heure_comm;
      this.valid = this.commande.valid;
      this.etat = this.commande.etat;
      this.totht = this.commande.totht;
      this.reduction = this.commande.reduction;
      this.restant = this.commande.restant;
      this.versement = this.commande.versement;
      this.net = this.commande.net;
      this.tottva = this.commande.tottva;
      this.auteur = this.userService.name;

      this.totttc = this.commande.totttc;
      this.getSetting();
      this.getCommClient();
      this.refreshRoleAndPermissonsUser();
      // Vérifier si les rôles existent dans l'utilisateur
      if (this.userService.user.roles && this.userService.user.roles.length > 0) {
        // Extraire le nom du premier rôle
        this.firstRoleName = this.userService.user.roles[0].name;
      }
    }
  }


  /**
  * Point UNIQUE de synchronisation entre localStorage,
  * services partagés et propriétés du composant.
  */
  private syncCommandeState(
    commande: any,
    ligneCommandes: any[],
    ligneReglements: any[],
    client: any = null
  ): void {

    this.commande = commande;
    if (client) this.client = client;

    // Nouvelles références de tableau -> force le re-render Angular
    this.ligneCommandeService.listLigneCommande = [...(ligneCommandes || [])];
    this.ligneRegelementService.listLigneReglement = [...(ligneReglements || [])];

    localStorage.setItem('commande', JSON.stringify(this.commande));
    localStorage.setItem('listLigneCommandeDetail', JSON.stringify(this.ligneCommandeService.listLigneCommande));
    localStorage.setItem('listReglementDetail', JSON.stringify(this.ligneRegelementService.listLigneReglement));
    if (client) localStorage.setItem('client', JSON.stringify(this.client));

    this.id = this.commande.id;
    this.numero = this.commande.numero;
    this.date_comm = this.commande.date_comm;
    this.heure_comm = this.commande.heure_comm;
    this.valid = this.commande.valid;
    this.etat = this.commande.etat;
    this.totht = this.commande.totht;
    this.reduction = this.commande.reduction;
    this.restant = this.commande.restant;
    this.versement = this.commande.versement;
    this.net = this.commande.net;
    this.tottva = this.commande.tottva;
    this.totttc = this.commande.totttc;
    this.auteur = this.userService.name;
  }

  refreshCommandeData(): void {

    if (!this.commande?.id) {
      console.error('Impossible de rafraîchir : commande introuvable.');
      return;
    }

    this.commandeService.getCommande(this.commande.id).subscribe({
      next: (data: any) => {
        const response = data;
        this.syncCommandeState(
          response?.commande ?? this.commande,
          response?.ligneCommandes ?? [],
          response?.ligneReglements ?? [],
          response?.client
        );
      },
      error: (error: any) => {
        console.error('Erreur actualisation commande/règlements :', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: "Impossible d'actualiser les données de la commande.",
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onSubmitReglement(): void {

    const montantVerse = Number(this.verser) || 0;
    const restant = Number(this.commande?.restant) || 0;

    if (montantVerse <= 0) {
      Swal.fire({ icon: 'warning', title: 'Montant invalide', text: 'Veuillez saisir un montant supérieur à 0.', confirmButtonText: 'OK' });
      return;
    }

    if (restant <= 0) {
      Swal.fire({ icon: 'info', title: 'Commande déjà réglée', text: 'Cette commande est déjà entièrement payée.', confirmButtonText: 'OK' });
      return;
    }

    const typeMonnaie = this.typeMonnaie || 'normal';
    if (typeMonnaie !== 'normal' && typeMonnaie !== 'wave' && typeMonnaie !== 'cheque') {
      Swal.fire({ icon: 'warning', title: 'Mode de paiement invalide', text: 'Veuillez sélectionner un mode de paiement valide.', confirmButtonText: 'OK' });
      return;
    }

    this.monnaie = Math.max(montantVerse - restant, 0);
    this.InfoFormReglement();
    this.isSubmittingReglement = true;

    this.reglementService.create(this.formReglement.value).subscribe({
      next: (response: any) => {

        this.isSubmittingReglement = false;

        const monnaie = Number(response?.monnaie) || 0;
        let message = 'Le règlement a été enregistré avec succès.';
        if (monnaie > 0) message += ` Monnaie à remettre : ${this.formatMontant(monnaie)} F CFA.`;

        Swal.fire({ icon: 'success', title: 'Règlement enregistré', text: message, confirmButtonText: 'OK' });

        this.verser = 0;
        this.monnaie = 0;
        this.wave = 0;
        this.typeMonnaie = 'normal';

        // Mise à jour immédiate avec la réponse du serveur (déjà connue et fiable)
        if (response?.commande) {
          const listeActuelle = this.ligneRegelementService.listLigneReglement || [];
          this.syncCommandeState(
            response.commande,
            this.ligneCommandeService.listLigneCommande,
            response?.reglement ? [response.reglement, ...listeActuelle] : listeActuelle,
            this.client
          );
        }

        // Puis re-synchronisation complète depuis le back (source de vérité)
        this.refreshCommandeData();
      },

      error: (error: any) => {
        this.isSubmittingReglement = false;
        console.error('Erreur création règlement :', error);
        const message = error?.error?.message || 'Une erreur est survenue lors de l’enregistrement du règlement.';
        Swal.fire({ icon: 'error', title: 'Erreur', text: message, confirmButtonText: 'OK' });
      }
    });
  }

  deleteLigneReglement() {

    const modalEl = document.getElementById('modalDeleteLigneReg');
    const modalInstance = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;

    this.reglementService.delete(this.id_ligneReglement).subscribe({
      next: () => {

        // On ferme le modal seulement maintenant, une fois la suppression confirmée
        modalInstance?.hide();

        // Sécurité : nettoie un backdrop Bootstrap qui pourrait rester bloqué
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        }, 300);

        this.refreshCommandeData();

        Swal.fire({
          icon: 'success',
          title: 'Supprimé',
          text: 'La ligne de règlement a été supprimée.',
          confirmButtonText: 'OK'
        });
      },
      error: (error: any) => {
        modalInstance?.hide();
        console.error('Erreur suppression règlement :', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error?.error?.message || 'Impossible de supprimer cette ligne de règlement.',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onSubmitRemboursement() {
    this.disableBtn = true;
    this.InfoRemboursement();

    this.reglementService.remboursement(this.formRemboursement.value).subscribe({
      next: () => {
        this.disableBtn = false;
        Swal.fire({
          icon: 'success',
          title: 'Remboursement effectué',
          text: `${this.formatMontant(this.mt_remboursement)} F CFA remboursé.`,
          confirmButtonText: 'OK'
        });
        this.mt_remboursement = 0;
        this.motif = null;
        this.refreshCommandeData();
      },
      error: (err: any) => {
        this.disableBtn = false;
        Swal.fire({ icon: 'error', title: 'Erreur', text: err?.error?.message || 'Le remboursement a échoué.', confirmButtonText: 'OK' });
      }
    });
  }

  onSubmitReduction() {
    this.disableBtn = true;
    this.InfoFormReduction();

    this.commandeService.reduction(this.formReduction.value).subscribe({
      next: () => {
        this.disableBtn = false;
        Swal.fire({
          icon: 'success',
          title: 'Réduction appliquée',
          text: `Réduction de ${this.formatMontant(this.reduce)} F CFA effectuée.`,
          confirmButtonText: 'OK'
        });
        this.reduce = 0;
        this.refreshCommandeData();
      },
      error: (err: any) => {
        this.disableBtn = false;
        Swal.fire({ icon: 'error', title: 'Erreur', text: err?.error?.message || 'La réduction a échoué.', confirmButtonText: 'OK' });
      }
    });
  }

  formatMontant(value: number | string | null | undefined): string {

    const montant = Number(value) || 0;

    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0
    }).format(montant);

  }

  loadPaymentLink() {

    this.paymentLinkService
      .getPaymentLink(this.commande.id)
      .subscribe({

        next: (response) => {

          if (response.payment) {

            this.payment = response.payment;

          } else {

            this.payment = null;

          }

        },

        error: (error) => {

          this.payment = null;

        }

      });

  }

  confirmPayment() {

    if (!this.payment) {

      this.toastrService.warning(
        "Aucun lien de paiement n'a été trouvé."
      );

      return;

    }

    if (!confirm(
      "Confirmez-vous avoir reçu le paiement sur votre compte Wave ?"
    )) {
      return;
    }

    this.paymentLinkService
      .confirmPayment(this.payment.id)
      .subscribe({

        next: (response) => {

          this.toastrService.success(
            response.message
          );

          this.loadPaymentLink();

          this.getCommClient(); // recharge la commande

        },

        error: (error) => {

          this.toastrService.error(
            error.error.message
          );

        }

      });

  }

  generatePaymentLink() {


    if (this.commande.restant <= 0) {


      this.toastrService.warning(
        "Cette commande est déjà entièrement réglée."
      );


      return;

    }



    this.loadingPayment = true;



    this.paymentLinkService
      .createPaymentLink(this.commande.id)
      .subscribe({


        next: (response) => {


          this.loadingPayment = false;



          if (response.success) {


            // Récupération du paiement complet
            this.payment = response.payment;


            // URL publique
            this.paymentUrl = response.payment.url;



            this.toastrService.success(
              response.message
            );


          } else {


            this.toastrService.warning(
              response.message
            );


          }


        },


        error: (error) => {


          this.loadingPayment = false;



          if (error.status === 422) {


            this.toastrService.warning(
              error.error.message
            );


          }
          else if (error.status === 404) {


            this.toastrService.error(
              "Commande introuvable."
            );


          }
          else {


            this.toastrService.error(
              "Une erreur est survenue lors de la création du lien de paiement."
            );


          }


          console.log(error);


        }


      });


  }

  copyPaymentLink() {


    navigator.clipboard.writeText(
      this.paymentUrl
    );


    this.copied = true;


  }

  sendWhatsappPayment() {


    let phone =
      this.commande.numero_client
        .replace(/\D/g, '');



    let message = `Bonjour ${this.commande.nom_client},

Votre commande ${this.commande.numero}

Montant restant :
${this.commande.restant} FCFA


Vous pouvez effectuer votre règlement ici :

${this.paymentUrl}


Merci.`;



    let url =
      "https://wa.me/"
      + phone
      + "?text="
      + encodeURIComponent(message);



    window.open(url, '_blank');


  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  getCommClient() {
    this.clientService.getCommClient(this.client.code).subscribe(
      response => {
        this.listCommClt = response;
        this.nbrComm = this.listCommClt.length;
        this.nbrPage = Math.ceil(this.nbrComm / this.defaultItem);
      });
  }

  modalDeleteLigneReglement(id: number) {
    this.id_ligneReglement = id;
  }

  openModalDeleteCommande(id: number) {
    this.id_Commande = id;
  }

  openModalCancelCommande(id: number) {
    this.id_Commande = id;
  }

  deleteCommande() {
    this.commandeService.delete(this.id_Commande).subscribe((data) => {
      localStorage.removeItem('client');
      localStorage.removeItem('commande');
      localStorage.removeItem('utilisateur');
      localStorage.removeItem('listReglementDetail');
      localStorage.removeItem('listLigneCommandeDetail');
      this.toastrService.warning('Commande supprimée !');
      this.router.navigate(['/ticket']);
    });
  }

  cancelCommande() {
    this.commandeService.cancel(this.id_Commande).subscribe((data) => {
      localStorage.removeItem('client');
      localStorage.removeItem('commande');
      localStorage.removeItem('utilisateur');
      localStorage.removeItem('listReglementDetail');
      localStorage.removeItem('listLigneCommandeDetail');
      this.toastrService.warning('Commande annulée !');
      this.router.navigate(['/ticket']);
    });
  }

  alert() {
    this.reduce = 0;
    this.toastrService.error('La reduction ne doit pas être superieure au TTC');
  }

  onVerser(): void {

    const verser = Number(this.verser) || 0;

    const restant = Number(
      this.commande?.restant
    ) || 0;

    this.monnaie = Math.max(
      verser - restant,
      0
    );
  }

  InfoFormReglement(): void {

    this.formReglement = this.fb.group({

      commande: [
        this.commande.id
      ],

      verser: [
        Number(this.verser) || 0
      ],

      typeMonnaie: [
        this.typeMonnaie || 'normal'
      ],

      auteur: [
        this.userService.name
      ]

    });

  }

  InfoRemboursement() {
    this.formRemboursement = this.fb.group({
      commande: this.commande.id,
      mt_remboursement: this.mt_remboursement,
      motif: this.motif,
      auteur: this.userService.name,
    });
  }

  InfoFormReduction() {
    this.formReduction = this.fb.group({
      commande: this.commande.id,
      reduction: this.reduce,
      auteur: this.userService.name,
    });
  }

  getSetting() {
    this.parametreService.getSetting().subscribe((data) => {
      localStorage.setItem('setting', JSON.stringify(data));
    });
  }

  editCommande(commande: any) {
    this.commandeService.edit(commande);
  }

  detail(commande: any) {
    this.commandeService.getCommande(commande.id).subscribe((data) => {
      let response: any = data;
      this.commandeService.commande = response.commande;
      localStorage.removeItem('commande')
      localStorage.removeItem('listLigneCommandeDetail')
      localStorage.removeItem('listReglementDetail')
      localStorage.setItem('commande', JSON.stringify(this.commandeService.commande));
      localStorage.setItem('listLigneCommandeDetail', JSON.stringify(response.ligneCommandes));
      localStorage.setItem('listReglementDetail', JSON.stringify(response.ligneReglements));

      this.commande = JSON.parse(localStorage.getItem('commande')!);
      this.ligneCommandeService.listLigneCommande = JSON.parse(localStorage.getItem('listLigneCommandeDetail')!);
      this.ligneRegelementService.listLigneReglement = JSON.parse(localStorage.getItem('listReglementDetail')!);
      this.id = this.commande.id;
      this.date_comm = this.commande.date_comm;
      this.heure_comm = this.commande.heure_comm;
      this.valid = this.commande.valid;
      this.etat = this.commande.etat;
      this.totht = this.commande.totht;
      this.reduction = this.commande.reduction;
      this.restant = this.commande.restant;
      this.versement = this.commande.versement;
      this.net = this.commande.net;
      this.tottva = this.commande.tottva;
      this.auteur = this.userService.name;

      this.totttc = this.commande.totttc;
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

  printTicket(commande: any): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération du ticket...</title>
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
          <p>Génération du ticket...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printTicket(commande.numero)
      .subscribe({
        next: (blob: Blob) => {

          this.openPdfInNewTab(
            pdfWindow,
            blob
          );

        },

        error: (error) => {

          console.error(
            'Erreur impression ticket :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer le ticket.
          </div>
        `;
        }
      });
  }

  printBordereau(commande: any): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération du bordereau...</title>
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
          <p>Génération du bordereau...</p>
        </div>
      </body>
    </html>
  `);

    this.commandeService
      .printBordereau(commande.numero)
      .subscribe({
        next: (blob: Blob) => {

          this.openPdfInNewTab(
            pdfWindow,
            blob
          );

        },

        error: (error) => {

          console.error(
            'Erreur impression bordereau :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer le bordereau.
          </div>
        `;
        }
      });
  }

  printReglement(commande: any): void {
    const url =
      `${environment.serverUrl}/print/facture/reglements/numero/${commande.numero}`;

    window.open(url, '_blank');
  }

  printOneReg(id: number): void {
    const url =
      `${environment.serverUrl}/print/facture/reglement/numero/${id}`;

    window.open(url, '_blank');
  }

  sendFactureWhatsApp(commande: any) {
    this.commandeService.sendFactureWhatsApp(commande.numero).subscribe((response: any) => {
      if (response.whatsapp_link) {
        window.open(response.whatsapp_link, "_blank");
      } else {
        this.toastrService.warning("Impossible d'envoyer la facture sur WhatsApp");
      }
    }, error => {
      console.error("Erreur lors de l'envoi de la facture :", error);
    });
  }

  onSubmitUpdatePhone() {
    if (this.commande.code_client == "0") {
      this.toastrService.warning("Impossible de faire la mise à jour car ce client n'existe pas");
    } else {
      this.updateInfo.id = this.commande.id;
      this.commandeService.updateInfo(this.updateInfo).subscribe({
        next: (data: any) => {
          let resp: any = data;
          this.updateInfo.phone = '';
          this.updateInfo.id = 0;
          this.toastrService.success('Numéro client mis à jour !');
          this.detail(resp.commande);
          if (resp.commande.numero) {
            this.sendFactureWhatsApp(resp.commande);
          }
        },
        error: (err: { error: { message: any; }; }) => {
          console.log(err.error.message);
        }
      });
    }
  }

  checkWaveAmount(): boolean {
    const montantVerse = Number(this.verser) || 0;
    const montantWave = Number(this.wave) || 0;

    // Si aucun montant Wave n'est saisi, tout est OK
    if (montantWave <= 0) {
      return true;
    }

    // Wave doit être exactement égal au montant versé
    return montantWave === montantVerse;
  }


  /*printTicket() {
    window.open('/#/print-ticket', "_blank");
  };*/

}



