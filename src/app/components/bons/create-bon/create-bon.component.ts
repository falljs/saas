import { DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Bon } from 'src/app/models/bon';
import { LigneBon } from 'src/app/models/ligne-bon';
import { BonService } from 'src/app/services/bon.service';
import { ClientService } from 'src/app/services/client.service';
import { LigneBonService } from 'src/app/services/ligne-bon.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { ParametreService } from 'src/app/services/parametre.service';
declare var bootstrap: any;

@Component({
  selector: 'app-create-bon',
  templateUrl: './create-bon.component.html',
  styleUrls: ['./create-bon.component.scss']
})
export class CreateBonComponent implements OnInit, OnDestroy {

  private produitSub?: Subscription;

  formClient!: FormGroup;
  formBon!: FormGroup;

  maxIdBon!: number;
  bon: Bon = new Bon;
  ligneBon!: LigneBon;
  nbrProduit!: number;

  date: any;
  heure: any;
  year!: any;
  month!: any;

  isValid: boolean = true;
  isProduit: string = '';

  // Var Form Commande
  date_bon!: any;
  heure_bon!: any;
  valid!: boolean;
  etat!: boolean;
  totht: number = 0;
  reduction: number = 0;
  net: number = 0;
  tottva: number = 0;
  auteur!: any;
  id_client: number = 0;
  nom_client!: any;
  code_client!: any;
  numero_client!: any;
  email_client!: any;
  totttc: number = 0;
  benefice: number = 0;

  editeLigne!: boolean;
  isDisable: boolean = false;
  isClick: boolean = false;

  searchSelect = '';
  selectedClient: any = null;
  showDropdown = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  parametre: any = null;
  parametreLoaded: boolean = false;

  pasVente: number = 0.5;

  constructor(public produitService: ProduitService, private datePipe: DatePipe,
    public bonService: BonService, public userService: UserService,
    public clientService: ClientService,
    public toastrService: ToastrService, public ligneBonService: LigneBonService,
    public formBuilder: FormBuilder, public localStorageService: LocalStorageService, public parametreService: ParametreService) { }
  get fClient() { return this.formClient.controls }
  get fBon() { return this.formBon.controls }

  ngOnInit(): void {
    this.ligneBon = new LigneBon();
    this.getParametre();
    this.getProduits();
    this.getClients();
    this.getMaxId();
    this.initFormClient();
    this.initFormBon();
    this.date_bon = this.getDate(new Date(Date.now()));
    this.heure_bon = this.getHeure(new Date(Date.now()));
    this.id_client = 0;
    this.ligneBonService.listLigneBon = [];
    if (localStorage.getItem('listLigneBon') != null) {
      this.ligneBonService.listLigneBon = JSON.parse(localStorage.getItem('listLigneBon')!);
      let total = 0;
      for (var i = 0; i < this.ligneBonService.listLigneBon.length; i++) {
        if (this.ligneBonService.listLigneBon[i].totht) {
          total += this.ligneBonService.listLigneBon[i].totht;
          this.totht = total;
        }
        this.getTtc();
      }
    }
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }

    this.produitSub = this.produitService.produitCreated$.subscribe(() => this.refreshProduits());
  }

  ngOnDestroy(): void {
    this.produitSub?.unsubscribe();
  }

  /** Recharge la liste après création d'un produit, en gardant les cases cochées */
  refreshProduits(): void {
    this.produitService.getAllProduct().subscribe({
      next: (data: any[]) => {
        const selectedCodes = new Set<any>(
          this.ligneBonService.listLigneBon.map((l: LigneBon) => l.codeProduit)
        );
        data.forEach((p: any) => p.isselected = selectedCodes.has(p.code));

        this.produitService.listAllProduits = data;
        this.produitService.listProduits = data;
        localStorage.setItem('listProduitsCache', JSON.stringify(data));
      },
      error: (error) => console.error('Erreur lors du rafraîchissement des produits :', error)
    });
  }

  getPasVente(): number {
    const pas = Number(this.parametre?.pas_vente);

    return pas > 0 ? pas : 0.5;
  }

  getParametre(): void {
    this.parametreLoaded = false;

    this.parametreService.getSetting().subscribe({

      next: (data: any) => {

        this.parametre =
          data?.data ??
          data?.setting ??
          data;

        this.pasVente = this.getPasVente();

        this.parametreLoaded = true;
      },

      error: (err) => {

        console.error(
          'Erreur récupération paramètres :',
          err
        );

        this.parametre = null;
        this.pasVente = 0.5;
        this.parametreLoaded = true;
      }
    });
  }

  isEmpruntProduitActive(): boolean {
    return Number(
      this.parametre?.emprunt_produit_active
    ) === 1;
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

  selectClient(client: any) {
    this.selectedClient = client;
    this.id_client = client.id; // Mettre à jour l'ID du client sélectionné
    this.nom_client = client.name;
    this.code_client = client.code;
    this.numero_client = client.numero;
    this.searchSelect = '';
    this.showDropdown = false; // Fermer le dropdown après la sélection
  }

  initFormBon() {
    this.formBon = this.formBuilder.group({
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
      isBon: '',
      ligneBon: [],
    });
  }

  dafaForm() {
    this.fBon['date_bon'].setValue(this.date_bon);
    this.fBon['heure_bon'].setValue(this.heure_bon);
    this.fBon['id_client'].setValue(this.id_client);
    this.fBon['nom_client'].setValue(this.nom_client);
    this.fBon['auteur'].setValue(this.userService.name);
    this.fBon['totht'].setValue(this.totht);
    this.fBon['reduction'].setValue(this.reduction);
    this.fBon['net'].setValue(this.net);
    this.fBon['tottva'].setValue(this.tottva);
    this.fBon['totttc'].setValue(this.totttc);

    // Plus de distinction Difoncé / Sicap
    this.fBon['isBon'].setValue('');

    this.fBon['ligneBon'].setValue(
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
        this.toastrService.success('Client ' + resp.data.name + ' ajouté !');
        this.id_client = resp.data.id;
        this.clientService.getAll().subscribe(
          data => {
            this.clientService.listClient = data;
          });
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
      try {
        const produits = JSON.parse(cachedProduits);

        this.produitService.listAllProduits = produits;
        this.produitService.listProduits = produits;

      } catch (error) {
        console.error(
          'Erreur lecture cache produits :',
          error
        );

        localStorage.removeItem('listProduitsCache');
      }
    }

    this.produitService.getAllProduct().subscribe({

      next: (data: any) => {

        // TOUS les produits
        this.produitService.listAllProduits = data;
        this.produitService.listProduits = data;

        localStorage.setItem(
          'listProduitsCache',
          JSON.stringify(data)
        );
      },

      error: (error) => {
        console.error(
          'Erreur lors de la récupération des produits :',
          error
        );
      }
    });
  }

  filterListProduit() {
    const produits = this.produitService.listAllProduits;

    if (!produits || produits.length === 0) {
      return;
    }

    this.produitService.listProduits =
      produits.filter(
        (p: any) => p.isProduit === this.isProduit
      );
  }

  getMaxId() {
    this.year = this.getYear(new Date(Date.now()));
    this.month = this.getMonth(new Date(Date.now()));
    this.bonService.getMaxId().subscribe(
      data => {
        this.bonService.maxId = this.year + 'B' + this.month + data.maxId;
      });
  }

  getClients() {
    this.clientService.getAll().subscribe(
      data => {
        this.clientService.listClient = data;
        // filtre le client néant
        let listClients: any = this.clientService.listClient.filter((client: any) => client.name == 'NÉANT');
        // Sélectionne le premier client par défaut
        if (listClients.length > 0) {
          this.selectedClient = listClients[0];
          this.selectClient(this.selectedClient);
        }
      });

  }

  onchange(produit: any) {

    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;
      const empruntActif = this.isEmpruntProduitActive();

      // Stock épuisé + emprunt autorisé
      if (stock <= 0 && empruntActif) {

        localStorage.setItem(
          'produit',
          JSON.stringify(produit)
        );

        produit.isselected = false;

        const modalElement =
          document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal =
            new bootstrap.Modal(modalElement);

          modal.show();
        }

        return;
      }

      // Stock épuisé + emprunt interdit
      if (stock <= 0 && !empruntActif) {

        produit.isselected = false;

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        return;
      }

      // Stock disponible
      this.ajouterProduit(produit);

    } else {

      this.deleteLigneBon(produit.code);
    }
  }

  ajouterProduit(produit: any) {

    this.ligneBon.codeProduit = produit.code;
    this.ligneBon.produit = produit.designation;

    this.ligneBon.qtyProduit =
      Number(produit.qty) || 0;

    this.ligneBon.qty =
      this.getPasVente();

    this.ligneBon.prix =
      produit.prix;

    this.ligneBon.prix_achat =
      produit.prix_achat;

    this.ligneBon.totht =
      this.ligneBon.qty *
      this.ligneBon.prix;

    this.ligneBon.auteur =
      this.userService.name;

    this.ligneBonService.listLigneBon.push(
      this.ligneBon
    );

    localStorage.setItem(
      'listLigneBon',
      JSON.stringify(
        this.ligneBonService.listLigneBon
      )
    );

    this.nbrProduit =
      this.ligneBonService.listLigneBon.length;

    this.ligneBon =
      new LigneBon();

    this.calcul();
  }

  onchangeAlert(produit: any) {
    if (produit.isselected) {
      // Emprunt désactivé : on refuse tout de suite, sans modal
      if (!this.isEmpruntProduitActive()) {
        produit.isselected = false;
        this.toastrService.error("Stock insuffisant : l'emprunt de produit est désactivé.");
        return;
      }
      localStorage.setItem('produit', JSON.stringify(produit));
      const modal = new bootstrap.Modal(document.getElementById('modalAlertLine'));
      modal.show();
    } else {
      this.deleteLigneBon(produit.code);
    }
  }

  submitAlert() {
    const stored = localStorage.getItem('produit');
    if (!stored) return;

    const produit: any = JSON.parse(stored);
    localStorage.removeItem('produit');

    if (!this.isEmpruntProduitActive()) {
      this.toastrService.error("Stock insuffisant : l'emprunt de produit est désactivé.");
      this.cancelAlert(produit.code);
      return;
    }

    // Emprunt confirmé : on ajoute directement la ligne
    this.ajouterProduit(produit);
  }

  cancelAlert(codeProduit?: any) {
    let code = codeProduit;
    if (!code) {
      const stored = localStorage.getItem('produit');
      if (stored) code = JSON.parse(stored).code;
    }
    const p = this.produitService.listProduits.find((x: any) => x.code == code);
    if (p) p.isselected = false;
    localStorage.removeItem('produit');
  }

  // Calcule Totat Ht
  calcul() {
    const lignes: LigneBon[] = this.ligneBonService.listLigneBon;

    if (lignes.length > 0) {
      this.totht = lignes.reduce(
        (sum: number, l: LigneBon) => sum + (l.totht || 0),
        0
      );
      this.getTtc();
      localStorage.setItem('listLigneBon', JSON.stringify(lignes));
    } else {
      this.removeLcmd();
    }
    return this.totht;
  }

  // Calcule Totat TTC
  getTtc() {
    this.totttc = (this.totht + (this.totht * this.tottva) / 100);
    this.net = this.totttc - this.reduction;
  }

  // Delete Ligne Commande
  deleteLigneBon(code: any) {
    // Retire toutes les lignes correspondant au produit
    this.ligneBonService.listLigneBon =
      this.ligneBonService.listLigneBon.filter((l: LigneBon) => l.codeProduit != code);

    this.nbrProduit = this.ligneBonService.listLigneBon.length;

    // Décoche le produit dans la liste
    const produit = this.produitService.listProduits.find((p: any) => p.code == code);
    if (produit) {
      produit.isselected = false;
    }

    this.calcul();
  }

  openClient() {
    this.formClient.reset();
  }

  // Remove Ligne Commande
  removeLcmd() {
    localStorage.removeItem("listLigneBon");
    this.ligneBonService.listLigneBon = [];
    this.totht = 0;
    this.tottva = 0;
    this.totttc = 0;
    this.reduction = 0;
    this.net = 0;

    for (var i = 0; i < this.produitService.listProduits.length; i++) {
      this.produitService.listProduits[i].isselected = false;
    }
  }

  //Décrémenter
  incremente(pi: LigneBon) {

    const empruntActif =
      this.isEmpruntProduitActive();

    const pas =
      this.getPasVente();

    if (pi.qty + pas <= pi.qtyProduit) {

      pi.qty =
        pi.qty + pas;

      pi.totht =
        pi.qty * pi.prix;

    } else if (empruntActif) {

      pi.qty =
        pi.qty + pas;

      const emprunt =
        pi.qty - pi.qtyProduit;

      this.toastrService.error(
        'Vous venez d\'emprunter une quantité de ' +
        emprunt +
        ' sur ce produit !'
      );

      pi.totht =
        pi.qty * pi.prix;

    } else {

      this.toastrService.error(
        'Stock insuffisant : l\'emprunt de produit est désactivé.'
      );
    }

    this.calcul();
  }

  //Incrémenter
  decremente(pi: LigneBon) {

    const pas =
      this.getPasVente();

    if (pi.qty > pas) {

      pi.qty =
        pi.qty - pas;

      pi.totht =
        pi.qty * pi.prix;
    }

    this.calcul();
  }

  // Edit Line
  editDomain(p: LigneBon) {
    this.editeLigne = true
    p.editable = !p.editable;
  }

  // Edit Line Valid
  editDomainValid(p: LigneBon) {

    this.editeLigne = false;
    p.editable = !p.editable;

    const empruntActif =
      this.isEmpruntProduitActive();

    const pas =
      this.getPasVente();

    // Quantité supérieure au stock
    if (p.qty > p.qtyProduit) {

      if (empruntActif) {

        const emprunt =
          p.qty - p.qtyProduit;

        this.toastrService.error(
          'Vous venez d\'emprunter une quantité de ' +
          emprunt +
          ' sur ce produit !'
        );

        p.totht =
          p.qty * p.prix;

      } else {

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        p.qty =
          p.qtyProduit;

        p.totht =
          p.qty * p.prix;
      }

      // Quantité inférieure au pas autorisé
    } else if (p.qty < pas) {

      this.toastrService.error(
        'La quantité doit être au moins ' + pas
      );

      p.qty =
        pas;

      p.totht =
        p.qty * p.prix;

    } else {

      p.totht =
        p.qty * p.prix;
    }

    this.calcul();
  }

  alert() {
    this.reduction = 0;
    this.toastrService.error('La reduction ne doit pas être superieure au TTC');
  }

  getDate(date: any) {
    return this.datePipe.transform(date, 'dd-MM-yyyy');
  }

  getYear(date: any) {
    return this.datePipe.transform(date, 'yy');
  }

  getMonth(date: any) {
    return this.datePipe.transform(date, 'MM');
  }

  getHeure(date: any) {
    return this.datePipe.transform(date, 'HH:mm:ss');
  }

  dateNow(dateNow: any) {
    return this.datePipe.transform(dateNow, 'dd-MM-yyyy HH:mm:ss');
  }

  onSubmitBon() {
    this.isDisable = true;
    this.isClick = true;
    this.dafaForm();
    this.fBon['heure_bon'].setValue(this.getHeure(new Date(Date.now())));
    this.bonService.create(this.formBon.value).subscribe(
      data => {
        let resp: any = data;
        this.toastrService.success('Bon numero ' + resp.bon.numero + ' crée !');
        this.bonService.detail(resp.bon);
      });
  }

  /**************************** Search Filter Designation *******************************/
  searchDesignation() {
    let input: any, filter, table: any, tr, i;

    input = document.getElementById("InputDesignation");
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

    input = document.getElementById("InputFamille");
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

    input = document.getElementById("InputReference");
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
