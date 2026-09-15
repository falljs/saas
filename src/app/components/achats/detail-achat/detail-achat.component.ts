import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ParametreService } from 'src/app/services/parametre.service';
import { LigneReglementAchatService } from 'src/app/services/ligne-reglement-achat.service';
import { AchatService } from 'src/app/services/achat.service';
import { LigneAchatService } from 'src/app/services/ligne-achat.service';
import { CommandeService } from 'src/app/services/commande.service';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-detail-achat',
  templateUrl: './detail-achat.component.html',
  styleUrls: ['./detail-achat.component.scss']
})
export class DetailAchatComponent implements OnInit {

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

  // Réglement
  formReglement!: FormGroup;
  verser!: number;
  monnaie: number = 0;
  wave: number = 0;

  // Remboursement
  formRemboursement!: FormGroup;
  mt_remboursement: number = 0;
  motif!: any;

  // Reduction
  formReduction!: FormGroup;
  reduce!: number;
  // Id Ligne achat
  id_ligneAchat!: number;
  id_Achat!: number;
  // Var Form achat
  id!: number;
  numero!: number;
  date_achat!: string;
  heure_achat!: string;
  totht!: number;
  reduction!: number;
  restant!: number;
  versement: any;
  net!: number;
  tottva!: number;
  auteur!: any;
  id_fn: any;
  nom_fn: any;
  code_fn: any;
  numero_fn: any;
  email_fn: any;
  totttc!: number;
  numCheck!: any;

  editeLigne!: boolean;
  isLastAchat: boolean = false;
  achat: any;
  fournisseur: any;

  userName: string = '';
  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public router: Router, public ligneReglementAchatService: LigneReglementAchatService,
    public ligneAchatService: LigneAchatService, public fb: FormBuilder, public toastrService: ToastrService,
    public userService: UserService, public commandeService: CommandeService,
    public parametreService: ParametreService, public achatService: AchatService) { }
  get fReglement() { return this.formReglement.controls }
  get fReduction() { return this.formReduction.controls }

  ngOnInit() {
    if (localStorage.getItem('achat') != null) {
      this.achat = JSON.parse(localStorage.getItem('achat')!);
      this.isLastAchat = JSON.parse(localStorage.getItem('is_editable')!);
      this.ligneAchatService.listLigneAchat = JSON.parse(localStorage.getItem('listLigneAchatDetail')!);
      this.ligneReglementAchatService.listLigneReglementAchat = JSON.parse(localStorage.getItem('listReglementAchatDetail')!);
      this.fournisseur = JSON.parse(localStorage.getItem('fournisseur')!);
      this.id = this.achat.id;
      this.numero = this.achat.numero;
      this.date_achat = this.achat.date_achat;
      this.heure_achat = this.achat.heure_achat;
      this.totht = this.achat.totht;
      this.reduction = this.achat.reduction;
      this.restant = this.achat.restant;
      this.versement = this.achat.versement;
      this.net = this.achat.net;
      this.tottva = this.achat.tottva;
      this.auteur = this.userService.name;
      this.id_fn = this.fournisseur.id;
      this.totttc = this.achat.totttc;
      this.numCheck = this.achat.numCheck;
      this.getSetting();
      this.refreshRoleAndPermissonsUser();
      // Vérifier si les rôles existent dans l'utilisateur
      if (this.userService.user.roles && this.userService.user.roles.length > 0) {
        // Extraire le nom du premier rôle
        this.firstRoleName = this.userService.user.roles[0].name;
      }

    }
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
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

  printAchat(achat: any): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération de l'achat...</title>
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
          <p>Génération du document...</p>
        </div>
      </body>
    </html>
  `);

    this.achatService
      .printAchat(achat.numero)
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error) => {

          console.error(
            'Erreur impression achat :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer le document.
          </div>
        `;
        }
      });
  }

  modalDeleteLigneAchat(id: number) {
    this.id_ligneAchat = id;
  }

  deleteLigneReglement(id: number) {
    // Appelle le service pour envoyer les données
    Swal.fire({
      title: "Es-tu sûr ?",
      text: "de vouloir supprimer cette ligne ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui",
      cancelButtonText: "Non"
    }).then((result) => {
      if (result.isConfirmed) {
        this.ligneReglementAchatService.delete(id).subscribe({
          next: (response) => {
            let resp: any = response;
            localStorage.removeItem('achat');
            localStorage.removeItem('listLigneAchatDetail');
            localStorage.removeItem('listReglementAchatDetail');
            localStorage.setItem('achat', JSON.stringify(resp.achat));
            localStorage.setItem('listLigneAchatDetail', JSON.stringify(resp.ligneAchats));
            localStorage.setItem('listReglementAchatDetail', JSON.stringify(resp.ligneReglementAchats));
            this.achat = JSON.parse(localStorage.getItem('achat')!);
            this.ligneAchatService.listLigneAchat = JSON.parse(localStorage.getItem('listLigneAchatDetail')!);
            this.ligneReglementAchatService.listLigneReglementAchat = JSON.parse(localStorage.getItem('listReglementAchatDetail')!);
            this.fournisseur = JSON.parse(localStorage.getItem('fournisseur')!);
            this.id = this.achat.id;
            this.numero = this.achat.numero;
            this.date_achat = this.achat.date_achat;
            this.heure_achat = this.achat.heure_achat;
            this.totht = this.achat.totht;
            this.reduction = this.achat.reduction;
            this.restant = this.achat.restant;
            this.versement = this.achat.versement;
            this.net = this.achat.net;
            this.tottva = this.achat.tottva;
            this.auteur = this.userService.name;
            this.id_fn = this.fournisseur.id;
            this.totttc = this.achat.totttc;
            this.numCheck = this.achat.numCheck;
            Swal.fire({
              title: "Suppression de Ligne !",
              text: "Ligne supprimée !",
              icon: "success"
            });
          },
          error: (err) => {
            console.error('Erreur lors de la suppression de la ligne :', err);
          },
        });
      }
    });
  }

  openModalDeleteAchat(id: number) {
    this.id_Achat = id;
  }

  openModalCancelAchat(id: number) {
    this.id_Achat = id;
  }

  editAchat(achat: any) {
    this.achatService.edit(achat);
  }

  deleteAchat() {
    this.achatService.delete(this.id_Achat).subscribe((data: any) => {
      localStorage.removeItem('dossier');
      localStorage.removeItem('fournisseur');
      localStorage.removeItem('achat');
      localStorage.removeItem('utilisateur');
      localStorage.removeItem('listReglementAchatDetail');
      localStorage.removeItem('listLigneAchatDetail');
      this.router.navigate(['/achat']);
    });
  }

  cancelAchat() {
    this.achatService.cancel(this.id_Achat).subscribe((data: any) => {
      localStorage.removeItem('dossier');
      localStorage.removeItem('fournisseur');
      localStorage.removeItem('achat');
      localStorage.removeItem('utilisateur');
      localStorage.removeItem('listReglementAchatDetail');
      localStorage.removeItem('listLigneAchatDetail');
      this.router.navigate(['/achat']);
    });
  }

  alert() {
    this.reduce = 0;
    //this.toastrService.error('La reduction ne doit pas être superieure au TTC');
  }

  onVerser() {
    if (this.verser < this.achat.net) { this.monnaie = 0; };
    if (this.verser > this.achat.restant) {
      this.monnaie = this.verser - this.achat.restant
    }
  }

  InfoRemboursement() {
    this.formRemboursement = this.fb.group({
      achat: this.achat.id,
      mt_remboursement: this.mt_remboursement,
      motif: this.motif,
      auteur: this.userService.name,
    });
  }

  onSubmitRemboursement() {
    this.disableBtn = true;
    this.InfoRemboursement();
    this.ligneReglementAchatService.remboursement(this.formRemboursement.value).subscribe({
      next: data => {
        let response: any = data;
        localStorage.removeItem('achat');
        localStorage.removeItem('listLigneAchatDetail');
        localStorage.removeItem('listReglementAchatDetail');
        localStorage.setItem('achat', JSON.stringify(response.achat));
        localStorage.setItem('listLigneAchatDetail', JSON.stringify(response.ligneAchats));
        localStorage.setItem('listReglementAchatDetail', JSON.stringify(response.ligneReglementAchats));
        this.toastrService.success(this.verser + ' F CFA versé !');
        this.achat = JSON.parse(localStorage.getItem('achat')!);
        this.ligneAchatService.listLigneAchat = JSON.parse(localStorage.getItem('listLigneAchatDetail')!);
        this.ligneReglementAchatService.listLigneReglementAchat = JSON.parse(localStorage.getItem('listReglementAchatDetail')!);
        this.fournisseur = JSON.parse(localStorage.getItem('fournisseur')!);
        this.id = this.achat.id;
        this.date_achat = this.achat.date_achat;
        this.heure_achat = this.achat.heure_achat;
        this.totht = this.achat.totht;
        this.reduction = this.achat.reduction;
        this.restant = this.achat.restant;
        this.versement = this.achat.versement;
        this.net = this.achat.net;
        this.tottva = this.achat.tottva;
        this.auteur = this.userService.name;
        this.id_fn = this.fournisseur.id;
        this.totttc = this.achat.totttc;
        this.numCheck = this.achat.numCheck;
        this.verser = 0;
        this.disableBtn = false;
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }

  InfoFormReglement() {
    this.formReglement = this.fb.group({
      achat: this.achat.id,
      verser: this.verser,
      wave: this.wave,
      auteur: this.userService.name,
    });
  }

  onSubmitReglement() {
    this.disableBtn = true;
    this.InfoFormReglement();
    this.ligneReglementAchatService.create(this.formReglement.value).subscribe({
      next: (data: any) => {
        let response: any = data;

        localStorage.removeItem('achat');
        localStorage.removeItem('listLigneAchatDetail');
        localStorage.removeItem('listReglementAchatDetail');
        localStorage.setItem('achat', JSON.stringify(response.achat));
        localStorage.setItem('listLigneAchatDetail', JSON.stringify(response.ligneAchats));
        localStorage.setItem('listReglementAchatDetail', JSON.stringify(response.ligneReglementAchats));
        this.achat = JSON.parse(localStorage.getItem('achat')!);
        this.ligneAchatService.listLigneAchat = JSON.parse(localStorage.getItem('listLigneAchatDetail')!);
        this.ligneReglementAchatService.listLigneReglementAchat = JSON.parse(localStorage.getItem('listReglementAchatDetail')!);
        this.fournisseur = JSON.parse(localStorage.getItem('fournisseur')!);
        this.id = this.achat.id;
        this.date_achat = this.achat.date_achat;
        this.heure_achat = this.achat.heure_achat;
        this.totht = this.achat.totht;
        this.reduction = this.achat.reduction;
        this.restant = this.achat.restant;
        this.versement = this.achat.versement;
        this.net = this.achat.net;
        this.tottva = this.achat.tottva;
        this.auteur = this.userService.name;
        this.id_fn = this.fournisseur.id;
        this.totttc = this.achat.totttc;
        this.numCheck = this.achat.numCheck;
        this.verser = 0;
        this.disableBtn = false;
      },
      error: (err: { error: { message: any; }; }) => {
        console.log(err.error.message);
      }
    });
  }

  InfoFormReduction() {
    this.formReduction = this.fb.group({
      achat: this.achat.id,
      reduction: this.reduce,
      auteur: this.userService.name,
    });
  }

  onSubmitReduction() {
    this.disableBtn = true;
    this.InfoFormReduction();
    this.achatService.reduction(this.formReduction.value).subscribe({
      next: (data: any) => {

        let response: any = data;
        localStorage.removeItem('achat');
        localStorage.removeItem('listLigneAchatDetail');
        localStorage.removeItem('listReglementAchatDetail');
        localStorage.setItem('achat', JSON.stringify(response.achat));
        localStorage.setItem('listLigneAchatDetail', JSON.stringify(response.ligneAchats));
        localStorage.setItem('listReglementAchatDetail', JSON.stringify(response.ligneReglementAchats));
        this.achat = JSON.parse(localStorage.getItem('achat')!);
        this.ligneAchatService.listLigneAchat = JSON.parse(localStorage.getItem('listLigneAchatDetail')!);
        this.ligneReglementAchatService.listLigneReglementAchat = JSON.parse(localStorage.getItem('listReglementAchatDetail')!);
        this.fournisseur = JSON.parse(localStorage.getItem('fournisseur')!);
        this.id = this.achat.id;
        this.date_achat = this.achat.date_achat;
        this.heure_achat = this.achat.heure_achat;
        this.totht = this.achat.totht;
        this.reduction = this.achat.reduction;
        this.restant = this.achat.restant;
        this.versement = this.achat.versement;
        this.net = this.achat.net;
        this.tottva = this.achat.tottva;
        this.auteur = this.userService.name;
        this.id_fn = this.fournisseur.id;
        this.totttc = this.achat.totttc;
        this.numCheck = this.achat.numCheck;
        this.reduce = 0;
        this.disableBtn = false;
      },
      error: (err: { error: { message: any; }; }) => {
        console.log(err.error.message);
      }
    });
  }

  addRecu(achat: any) {
    this.achatService.getRecusAchat(achat.id).subscribe({
      next: (data: any) => {
        let response: any = data;
        localStorage.removeItem('listLigneAchatDetail');
        localStorage.removeItem('listReglementAchatDetail');
        localStorage.setItem('achat', JSON.stringify(response.achat));
        localStorage.setItem('listLigneRecu', JSON.stringify(response.ligneRecus));
        this.router.navigate(['/recu']);
      },
      error: (err: { error: { message: any; }; }) => {
        console.log(err.error.message);
      }
    });
  }

  getSetting() {
    this.parametreService.getSetting().subscribe((data: any) => {
      localStorage.setItem('setting', JSON.stringify(data));
    });
  }

}
