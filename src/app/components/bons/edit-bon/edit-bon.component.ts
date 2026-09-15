import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LigneBon } from 'src/app/models/ligne-bon';
import { BonService } from 'src/app/services/bon.service';
import { ClientService } from 'src/app/services/client.service';
import { LigneBonService } from 'src/app/services/ligne-bon.service';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { ParametreService } from 'src/app/services/parametre.service';
declare var bootstrap: any;

@Component({
  selector: 'app-edit-bon',
  templateUrl: './edit-bon.component.html',
  styleUrls: ['./edit-bon.component.scss']
})
export class EditBonComponent implements OnInit {

  formDossier!: FormGroup;
  formClient!: FormGroup;
  fUpdateBon!: FormGroup;

  maxIdBon!: number;
  ligneBon!: LigneBon;
  nbrProduit!: number;

  date!: any;
  heure: any;

  isValid: boolean = true;

  // Var Form bon
  id!: number;
  numero!: number;
  date_bon!: string;
  heure_bon!: string;
  valid!: boolean;
  etat!: boolean;
  totht!: number;
  reduction!: number;
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
  isDisable: boolean = false;
  isClick: boolean = false;
  bon!: any;
  client!: any;

  searchSelect = '';
  selectedClient: any = null;
  showDropdown = false;

  parametre: any = null;
  parametreLoaded: boolean = false;
  pasVente: number = 0.5;

  constructor(public produitService: ProduitService, public ligneBonService: LigneBonService,
    public bonService: BonService, public userService: UserService,
    public clientService: ClientService,
    public toastrService: ToastrService, public formBuilder: FormBuilder, public parametreService: ParametreService) { }
  get fClient() { return this.formClient.controls }
  get fDossier() { return this.formDossier.controls }
  get formUpdateBon() { return this.fUpdateBon.controls }

  ngOnInit() {
    this.getParametre();
    this.getProduits();
    this.getClients();

    this.ligneBon = new LigneBon();

    this.initFormClient();
    this.initFormBon();

    if (localStorage.getItem('bon') != null) {
      this.bon = JSON.parse(localStorage.getItem('bon')!);
      this.client = JSON.parse(localStorage.getItem('client')!);

      if (this.client) {
        this.selectedClient = this.client;
        this.selectClient(this.selectedClient);
      }

      this.id = this.bon.id;
      this.numero = this.bon.numero;
      this.date_bon = this.bon.date_bon;
      this.heure_bon = this.bon.heure_bon;
      this.valid = this.bon.valid;
      this.etat = this.bon.etat;
      this.totht = this.bon.totht;
      this.reduction = this.bon.reduction;
      this.net = this.bon.net;
      this.tottva = this.bon.tottva;
      this.auteur = this.userService.name;
      this.id_client = this.client.id;
      this.totttc = this.bon.totttc;
    }

    if (localStorage.getItem('listLigneBon') != null) {
      this.ligneBonService.listLigneBon =
        JSON.parse(localStorage.getItem('listLigneBon')!);

      let total = 0;

      for (let i = 0; i < this.ligneBonService.listLigneBon.length; i++) {
        if (this.ligneBonService.listLigneBon[i].totht) {
          total += this.ligneBonService.listLigneBon[i].totht;
          this.totht = total;
        }

        this.getTtc();
      }
    }
  }

  getPasVente(): number {
    const pas = Number(this.parametre?.pas_vente);
    return pas > 0 ? pas : 0.5;
  }

  getParametre(): void {
    this.parametreLoaded = false;

    this.parametreService.getSetting().subscribe({
      next: (data: any) => {
        this.parametre = data?.data ?? data?.setting ?? data;
        this.pasVente = this.getPasVente();
        this.parametreLoaded = true;
      },
      error: (err) => {
        console.error('Erreur récupération paramètres :', err);

        this.parametre = null;
        this.pasVente = 0.5;
        this.parametreLoaded = true;
      }
    });
  }

  isEmpruntProduitActive(): boolean {
    return Number(this.parametre?.emprunt_produit_active) === 1;
  }

  isProduitSelectable(produit: any): boolean {
    if (!produit) {
      return false;
    }

    if (!this.parametreLoaded) {
      return Number(produit.qty) > 0;
    }

    const stock = Number(produit.qty) || 0;

    return this.isEmpruntProduitActive() || stock > 0;
  }

  get filteredClient() {
    return this.clientService.listClient.filter(client =>
      client.name.toLowerCase().includes(this.searchSelect.toLowerCase())
    );
  }

  selectClient(client: any) {
    this.selectedClient = client;
    this.client.name = client.name; // Mettre à jour le nom du client sélectionné
    this.id_client = client.id; // Mettre à jour l'ID du client sélectionné
    this.code_client = client.code;
    this.nom_client = client.name;
    this.numero_client = client.numero;
    this.searchSelect = '';
    this.showDropdown = false; // Fermer le dropdown après la sélection
  }

  initFormBon() {
    this.fUpdateBon = this.formBuilder.group({
      id: this.id,
      numero: this.numero,
      date_bon: '',
      heure_bon: '',
      auteur: '',
      id_client: 1,
      nom_client: '',
      reduction: 0,
      net: 0,
      totht: 0,
      tottva: 0,
      totttc: 0,
      ligneBon: [],
    });
  }

  dafaForm() {
    this.formUpdateBon['id'].setValue(this.id);
    this.formUpdateBon['numero'].setValue(this.numero);
    this.formUpdateBon['date_bon'].setValue(this.date_bon);
    this.formUpdateBon['heure_bon'].setValue(this.heure_bon);
    this.formUpdateBon['nom_client'].setValue(this.nom_client);
    this.formUpdateBon['id_client'].setValue(this.id_client);
    this.formUpdateBon['auteur'].setValue(this.userService.name);
    this.formUpdateBon['totht'].setValue(this.totht);
    this.formUpdateBon['reduction'].setValue(this.reduction);
    this.formUpdateBon['net'].setValue(this.net);
    this.formUpdateBon['tottva'].setValue(this.tottva);
    this.formUpdateBon['totttc'].setValue(this.totttc);
    this.formUpdateBon['ligneBon'].setValue(
      this.ligneBonService.listLigneBon
    );
  }


  initFormClient() {
    this.formClient = new FormGroup({
      name: new FormControl('', [Validators.required]),
      phone: new FormControl('221'),
      surnom: new FormControl(''),
      address: new FormControl(''),
      auteur: new FormControl(this.userService.name)
    });
  }


  onSubmitClient() {
    this.formClient.value.auteur = this.userService.name;
    this.clientService.createData(this.formClient.value).subscribe({
      next: data => {
        let resp: any = data;
        this.initFormClient();
        this.getClients();
        this.toastrService.success('Client ' + resp.data.name + ' ajouté !');
        //this.getClients();
        this.id_client = resp.data.id;
        this.selectClient(resp.data);
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }



  getProduits() {
    const cachedProduits = localStorage.getItem('listProduitsCache');

    if (cachedProduits) {
      const produits = JSON.parse(cachedProduits);

      this.produitService.listAllProduits = produits;
      this.produitService.listProduits = produits;
    }

    this.produitService.getAllProduct().subscribe(
      data => {
        this.produitService.listAllProduits = data;
        this.produitService.listProduits = data;

        localStorage.setItem(
          'listProduitsCache',
          JSON.stringify(data)
        );
      },
      error => {
        console.error(
          'Erreur lors de la récupération des produits :',
          error
        );
      }
    );
  }

  getClients() {
    this.clientService.getAll().subscribe(
      data => {
        this.clientService.listClient = data;
      });

  }

  onchange(produit: any) {
    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;

      // Aucun stock + emprunt désactivé
      if (stock <= 0 && !this.isEmpruntProduitActive()) {
        produit.isselected = false;

        this.toastrService.error(
          'Ce produit est en rupture de stock. L’emprunt de produit est désactivé.'
        );

        return;
      }

      // Aucun stock + emprunt activé
      if (stock <= 0 && this.isEmpruntProduitActive()) {
        localStorage.setItem('produit', JSON.stringify(produit));

        const modalElement = document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }

        return;
      }

      this.ajouterProduit(produit);

    } else {
      this.deleteLigneBon(produit.code);
    }
  }

  ajouterProduit(produit: any) {

    const pas = this.getPasVente();

    this.ligneBon.bon = 0;
    this.ligneBon.codeProduit = produit.code;
    this.ligneBon.produit = produit.designation;
    this.ligneBon.qtyProduit = Number(produit.qty) || 0;

    this.ligneBon.qty = pas;

    this.ligneBon.prix = produit.prix;
    this.ligneBon.prix_achat = produit.prix_achat;

    this.ligneBon.totht =
      this.ligneBon.qty * this.ligneBon.prix;

    this.ligneBon.auteur = this.userService.name;

    this.ligneBonService.listLigneBon.push(this.ligneBon);

    localStorage.setItem(
      'listLigneBon',
      JSON.stringify(this.ligneBonService.listLigneBon)
    );

    this.nbrProduit =
      this.ligneBonService.listLigneBon.length;

    this.ligneBon = new LigneBon();

    this.calcul();
  }

  onchangeAlert(produit: any) {
    if (produit.isselected) {

      const modalElement =
        document.getElementById('modalAlertLine');

      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }

      localStorage.setItem(
        'produit',
        JSON.stringify(produit)
      );

    } else {
      this.deleteLigneBon(produit.code);
    }
  }

  submitAlert() {
    const produitStorage = localStorage.getItem('produit');

    if (produitStorage != null) {
      const produit = JSON.parse(produitStorage);

      this.ajouterProduit(produit);

      localStorage.removeItem('produit');
    }
  }

  cancelAlert() {
    if (localStorage.getItem('produit') != null) {
      let produit: any = JSON.parse(localStorage.getItem('produit')!);
      for (var i = 0; i < this.produitService.listProduits.length; i++) {
        if (this.produitService.listProduits[i].code == produit.code) {
          this.produitService.listProduits[i].isselected = false;
        }
      }
      localStorage.removeItem('produit');
    }
  }

  // Calcule Totat Ht
  calcul() {
    let total = 0;
    if (this.ligneBonService.listLigneBon.length > 0) {
      for (var i = 0; i < this.ligneBonService.listLigneBon.length; i++) {
        if (this.ligneBonService.listLigneBon[i].totht) {
          total += this.ligneBonService.listLigneBon[i].totht;
          this.totht = total;
        }
        this.getTtc();
      }
      localStorage.removeItem('listLigneBon');
      localStorage.setItem('listLigneBon', JSON.stringify(this.ligneBonService.listLigneBon));
    } else {
      this.removeLcmd();
    }
    return total;
  }

  // Calcule Totat TTC
  getTtc() {
    this.totttc = (this.totht + (this.totht * this.tottva) / 100);
    this.net = this.totttc - this.reduction;
  }

  // Delete Ligne bon
  deleteLigneBon(code: any) {
    for (let i = 0; i < this.ligneBonService.listLigneBon.length; ++i) {
      this.nbrProduit = i;
      if (this.ligneBonService.listLigneBon[i].codeProduit == code) {
        this.ligneBonService.listLigneBon.splice(i, 1);
      }
    }
    this.calcul();

    for (var i = 0; i < this.produitService.listProduits.length; i++) {
      if (this.produitService.listProduits[i].code == code) {
        this.produitService.listProduits[i].isselected = false;
      }
    }
  }

  openClient() {
    this.formClient.reset();
  }

  openDossier() {
    this.formDossier.reset();
  }

  // Remove Ligne bon
  removeLcmd() {
    localStorage.removeItem("listLigneBon");
    this.ligneBonService.listLigneBon = [];
    this.totht = 0;
    this.tottva = 0;
    this.totttc = 0;
    this.reduction = 0;
    this.net = 0;
  }

  //Décrémenter
  incremente(pi: LigneBon) {

    const pas = this.getPasVente();
    const stock = Number(pi.qtyProduit) || 0;

    // Ligne déjà enregistrée en base
    if (pi.id) {

      pi.qty += pas;
      pi.totht = pi.qty * pi.prix;

      this.calcul();
      return;
    }

    // Quantité disponible dans le stock
    if (pi.qty + pas <= stock) {

      pi.qty += pas;
      pi.totht = pi.qty * pi.prix;

    }
    // Dépassement autorisé
    else if (this.isEmpruntProduitActive()) {

      pi.qty += pas;

      const emprunt = pi.qty - stock;

      this.toastrService.error(
        'Vous venez d’emprunter une quantité de ' +
        emprunt +
        ' sur ce produit !'
      );

      pi.totht = pi.qty * pi.prix;

    }
    // Dépassement interdit
    else {

      this.toastrService.error(
        'Stock insuffisant. L’emprunt de produit est désactivé.'
      );
    }

    this.calcul();
  }

  //Incrémenter
  decremente(pi: LigneBon) {

    const pas = this.getPasVente();

    if (pi.qty > pas) {
      pi.qty -= pas;
      pi.totht = pi.qty * pi.prix;
    }

    this.calcul();
  }

  // Edit Line
  editDomain(p: LigneBon) {
    if (!p.editable) {
      this.editeLigne = true
    } else {
      this.editeLigne = false
    }
    p.editable = !p.editable;
    p.totht = p.qty * p.prix;
  }

  // Edit Line Valid
  editDomainValid(p: LigneBon) {

    this.editeLigne = false;
    p.editable = !p.editable;

    const pas = this.getPasVente();
    const stock = Number(p.qtyProduit) || 0;

    // Quantité minimale
    if (p.qty < pas) {

      this.toastrService.error(
        'La quantité doit être au moins ' + pas
      );

      p.qty = pas;
      p.totht = p.qty * p.prix;

      this.calcul();
      return;
    }

    // Ligne déjà enregistrée en base
    if (p.id) {

      p.totht = p.qty * p.prix;

      this.calcul();
      return;
    }

    // Dépassement du stock
    if (p.qty > stock) {

      if (this.isEmpruntProduitActive()) {

        const emprunt = p.qty - stock;

        this.toastrService.error(
          'Vous venez d’emprunter une quantité de ' +
          emprunt +
          ' sur ce produit !'
        );

      } else {

        this.toastrService.error(
          'Stock insuffisant. L’emprunt de produit est désactivé.'
        );

        // On bloque la quantité au stock disponible
        p.qty = stock;

        // Si le stock est inférieur au pas minimum
        if (p.qty < pas) {
          p.qty = pas;
        }
      }
    }

    p.totht = p.qty * p.prix;

    this.calcul();
  }

  onSubmitUpdateBon() {
    this.isDisable = true;
    this.isClick = true;
    this.dafaForm();
    this.bonService.update(this.fUpdateBon.value).subscribe(
      data => {
        let resp: any = data;
        this.toastrService.success('bon numero ' + resp.bon.numero + ' mise à jour !');
        this.bonService.detail(resp.bon);
      });
  }

  retour() {
    this.bonService.detail(this.bon);
  }

  /**************************** Search Filter Designation *******************************/
  searchDesignation() {
    let input: any, filter, table: any, tr, i;

    input = document.getElementById("InputDesign");
    filter = input.value.toUpperCase();
    table = document.getElementById("tableProduit");
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

  /**************************** Search Filter Famille *******************************/
  searchFamille() {
    let input: any, filter, table: any, tr, i;

    input = document.getElementById("InputMifa");
    filter = input.value.toUpperCase();
    table = document.getElementById("tableProduit");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
      var td0 = tr[i].getElementsByTagName("td")[4];

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

  /**************************** Search Filter Reference *******************************/
  searchReference() {
    let input: any, filter, table: any, tr, i;

    input = document.getElementById("InputRef");
    filter = input.value.toUpperCase();
    table = document.getElementById("tableProduit");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
      var td0 = tr[i].getElementsByTagName("td")[5];

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
}
