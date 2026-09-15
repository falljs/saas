import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { ToastrService } from 'ngx-toastr';
import { LigneDevisService } from 'src/app/services/ligne-devis.service';
import { DevisService } from 'src/app/services/devis.service';
import { LigneDevis } from 'src/app/models/ligne-devis';
import { DatePipe } from '@angular/common';
import { CommandeService } from 'src/app/services/commande.service';
import { ProduitService } from 'src/app/services/produit.service';
import { ParametreService } from 'src/app/services/parametre.service';
import { BonService } from 'src/app/services/bon.service';
import { environment } from 'src/environments/environment';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-devis-detail',
  templateUrl: './devis-detail.component.html',
  styleUrls: ['./devis-detail.component.scss']
})
export class DevisDetailComponent implements OnInit {

  // Environnement
  environment = environment;

  // Disabled btn
  disableBtn: boolean = false;

  formCommande!: FormGroup;
  formDevis!: FormGroup;

  // Id Ligne devis
  id_ligneDevis!: number;
  id_devis!: number;

  // Var Form devis
  id!: number;
  numero!: number;
  date_devis!: string;
  heure_devis!: string;
  type!: string;
  valid!: boolean;
  etat!: boolean;
  totht!: number;
  net!: number;
  tottva!: number;
  auteur!: number;
  id_client!: any;
  nom_client!: any;
  code_client!: any;
  numero_client!: any;
  email_client!: any;
  totttc!: number;

  editeLigne!: boolean;
  isConvert: boolean = false;

  devis!: any;
  client!: any;

  firstRoleName: string | null = null;

  constructor(
    public router: Router,
    public fb: FormBuilder,
    public devisService: DevisService,
    public ligneDevisService: LigneDevisService,
    public userService: UserService,
    public toastrService: ToastrService,
    private datePipe: DatePipe,
    public commandeService: CommandeService,
    public produitService: ProduitService,
    public parametreService: ParametreService,
    public bonService: BonService
  ) { }

  get fCommande() {
    return this.formCommande.controls;
  }

  get fDevis() {
    return this.formDevis.controls;
  }

  ngOnInit() {

    if (localStorage.getItem('devis') != null) {

      this.devis = JSON.parse(
        localStorage.getItem('devis')!
      );

      this.ligneDevisService.listLigneDevis =
        JSON.parse(
          localStorage.getItem('listLigneDevisDetail')!
        );

      this.ligneDevisService.listLigneDevis.forEach(
        (ligne, index) => {

          let codeProduit = ligne.codeProduit;

          this.produitService
            .getProduitByCode(codeProduit)
            .subscribe(data => {

              let produit: any = data;

              this.ligneDevisService
                .listLigneDevis[index]
                .qtyReste = produit.qty;

            });
        }
      );

      this.client = JSON.parse(
        localStorage.getItem('client')!
      );

      this.id = this.devis.id;
      this.numero = this.devis.numero;
      this.date_devis = this.devis.date_devis;
      this.heure_devis = this.devis.heure_devis;
      this.type = this.devis.type;
      this.totht = this.devis.totht;
      this.net = this.devis.net;
      this.tottva = this.devis.tottva;
      this.auteur = this.userService.name;
      this.totttc = this.devis.totttc;

      this.getSetting();
      this.refreshRoleAndPermissonsUser();

      if (
        this.userService.user.roles &&
        this.userService.user.roles.length > 0
      ) {
        this.firstRoleName =
          this.userService.user.roles[0].name;
      }
    }
  }

  refreshRoleAndPermissonsUser(): void {

    this.userService
      .refreshRoleAndPermissonsUser(
        this.userService.user.id
      )
      .subscribe(data => {

        let resp: any = data;

        this.userService.user.permissions =
          resp.user.permissions;

        this.userService.setRoles(
          resp.user.roles
        );
      });
  }

  InfoFormDevis() {

    this.formDevis = this.fb.group({

      id: this.id_devis,

      auteur: this.userService.name,

    });
  }

  getDate(date: any) {

    return this.datePipe.transform(
      date,
      'dd-MM-yyyy'
    );
  }

  getHeure(date: any) {

    return this.datePipe.transform(
      date,
      'HH:mm:ss'
    );
  }

  dateNow(dateNow: any) {

    return this.datePipe.transform(
      dateNow,
      'dd-MM-yyyy HH:mm:ss'
    );
  }

  setDevisToCommande() {

    this.InfoFormDevis();

    this.devisService
      .setDevisToCommande(
        this.formDevis.value
      )
      .subscribe(data => {

        let resp: any = data;

        this.toastrService.success(
          'Commande numero ' +
          resp.commande.numero +
          ' crée !'
        );

        this.commandeService.detail(
          resp.commande
        );

      });
  }

  setDevisToBon() {

    this.InfoFormDevis();

    this.devisService
      .setDevisToBon(
        this.formDevis.value
      )
      .subscribe(data => {

        let resp: any = data;

        this.toastrService.success(
          'Bon numero ' +
          resp.bon.numero +
          ' crée !'
        );

        this.bonService.detail(
          resp.bon
        );

      });
  }

  modalDeleteLigneDevis(id: number) {

    this.id_ligneDevis = id;

  }

  openModalConvert(id: number) {

    this.id_devis = id;

  }

  deleteLigneDevis() {

    this.ligneDevisService
      .delete(this.id_ligneDevis)
      .subscribe(data => {

        let response: any = data;

        localStorage.removeItem('devis');
        localStorage.removeItem(
          'listLigneDevisDetail'
        );

        localStorage.setItem(
          'devis',
          JSON.stringify(response.devis)
        );

        localStorage.setItem(
          'listLigneDevisDetail',
          JSON.stringify(response.listLigneDevis)
        );

        this.toastrService.warning(
          'Ligne supprimée !'
        );

        this.devis = JSON.parse(
          localStorage.getItem('devis')!
        );

        this.ligneDevisService.listLigneDevis =
          JSON.parse(
            localStorage.getItem(
              'listLigneDevisDetail'
            )!
          );

        this.client = JSON.parse(
          localStorage.getItem('client')!
        );

        this.id = this.devis.id;
        this.date_devis = this.devis.date_devis;
        this.heure_devis = this.devis.heure_devis;
        this.totht = this.devis.totht;
        this.net = this.devis.net;
        this.tottva = this.devis.tottva;
        this.auteur = this.userService.name;
        this.id_client = this.client.id;
        this.totttc = this.devis.totttc;

      });
  }

  deleteDevis() {

    this.devisService
      .delete(this.devis.id)
      .subscribe(data => {

        localStorage.removeItem('client');
        localStorage.removeItem('devis');
        localStorage.removeItem('utilisateur');
        localStorage.removeItem(
          'listLignedevisDetail'
        );

        this.toastrService.warning(
          'Devis supprimé !'
        );

        this.router.navigate(['/devis']);

      });
  }

  getSetting() {

    this.parametreService
      .getSetting()
      .subscribe(data => {

        localStorage.setItem(
          'setting',
          JSON.stringify(data)
        );

      });
  }

  editDevis(devis: any) {

    this.devisService.edit(devis);

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

  printDevis(devis: any): void {

    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération du devis...</title>
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
          <p>Génération du devis...</p>
        </div>
      </body>
    </html>
  `);

    this.devisService
      .printDevis(devis.numero)
      .subscribe({
        next: (blob: Blob) => {
          this.openPdfInNewTab(pdfWindow, blob);
        },

        error: (error: any) => {

          console.error(
            'Erreur impression devis :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer le devis.
          </div>
        `;
        }
      });
  }

}