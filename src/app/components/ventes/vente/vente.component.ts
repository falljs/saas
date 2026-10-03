import { DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { Commande } from 'src/app/models/commande';
import { LigneCommande } from 'src/app/models/ligne-commande';

import { ClientService } from 'src/app/services/client.service';
import { CommandeService } from 'src/app/services/commande.service';
import { DevisService } from 'src/app/services/devis.service';
import { LigneCommandeService } from 'src/app/services/ligne-commande.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { ParametreService } from 'src/app/services/parametre.service';
declare var bootstrap: any;

@Component({
  selector: 'app-vente',
  templateUrl: './vente.component.html',
  styleUrls: ['./vente.component.scss']
})
export class VenteComponent implements OnInit, OnDestroy {

  private produitSub?: Subscription;

  formDossier!: FormGroup;
  formClient!: FormGroup;
  formCommande!: FormGroup;

  maxIdCmd!: number;
  commande: Commande = new Commande;
  ligneCommande!: LigneCommande;
  nbrProduit!: number;

  date!: any;
  heure: any;

  isValid: boolean = true;
  isProduit: string = 'Difoncé';

  // Var Form Commande
  year!: any;
  month!: any;
  date_comm!: any;
  heure_comm!: any;
  valid!: boolean;
  etat!: boolean;

  totht: number = 0;
  reduction: number = 0;
  restant: number = 0;
  versement: number = 0;
  net: number = 0;
  tottva: number = 0;
  auteur!: any;
  id_client: number = 1;
  nom_client!: any;
  code_client!: any;
  numero_client!: any;
  email_client!: any;
  totttc: number = 0;

  editeLigne!: boolean;
  isDisable: boolean = false;
  isClick: boolean = false;

  client: any = 'Néant';
  clientAutre: any;

  typeVente: any = 'detail';

  searchSelect = '';
  selectedClient: any = null;
  showDropdown = false;
  isSelect = false;

  firstRoleName: string | null = null;

  /**
   * Paramètres du tenant.
   *
   * emprunt_produit_active :
   * 1 / "1" / true  => emprunt autorisé
   * 0 / "0" / false => emprunt interdit
   */
  parametre: any = null;

  /**
   * Empêche toute interaction avec la liste des produits
   * tant que les paramètres du tenant ne sont pas chargés.
   * Élimine l'effet de "flash" (verrouillé -> déverrouillé).
   */
  parametreLoaded: boolean = false;

  pasVente: number = 0.5;
  pasOptions: number[] = [0.5, 1, 2, 3, 5, 10, 12, 24];

  searchDesignationValue: string = '';
  searchFamilleValue: string = '';
  searchReferenceValue: string = '';

  constructor(
    public produitService: ProduitService,
    public ligneCommandeService: LigneCommandeService,
    public commandeService: CommandeService,
    public userService: UserService,
    public clientService: ClientService,
    public toastrService: ToastrService,
    private datePipe: DatePipe,
    public devisService: DevisService,
    public formBuilder: FormBuilder,
    public router: Router,
    public localStorageService: LocalStorageService,
    public parametreService: ParametreService
  ) { }

  get filteredProduits(): any[] {

    const produits = this.produitService.listProduits || [];

    const designation = this.searchDesignationValue
      .trim()
      .toLowerCase();

    const famille = this.searchFamilleValue
      .trim()
      .toLowerCase();

    const reference = this.searchReferenceValue
      .trim()
      .toLowerCase();

    return produits.filter((produit: any) => {

      const produitDesignation =
        String(produit.designation ?? '').toLowerCase();

      const produitFamille =
        String(produit.famille ?? '').toLowerCase();

      const produitReference =
        String(produit.ref ?? '').toLowerCase();

      return (
        (!designation ||
          produitDesignation.includes(designation)) &&

        (!famille ||
          produitFamille.includes(famille)) &&

        (!reference ||
          produitReference.includes(reference))
      );
    });
  }

  get fClient() {
    return this.formClient.controls;
  }

  get fDossier() {
    return this.formDossier.controls;
  }

  get fCommande() {
    return this.formCommande.controls;
  }

  getPasVente(): number {
    const pas = Number(this.parametre?.pas_vente);
    return pas > 0 ? pas : 0.5; // fallback sécurisé
  }

  ngOnInit(): void {

    this.ligneCommande = new LigneCommande();

    // Chargement des paramètres AVANT d'afficher les produits
    this.getParametre();

    this.getProduits();
    this.getClients();
    this.getMaxId();

    this.initFormDossier();
    this.initFormClient();
    this.initFormCommande();

    this.date_comm = this.getDate(new Date(Date.now()));
    this.heure_comm = this.getHeure(new Date(Date.now()));

    this.id_client = 1;

    this.ligneCommandeService.listLigneCommande = [];

    const storedLignes = localStorage.getItem('listLigneCommande');

    if (storedLignes != null) {

      try {

        this.ligneCommandeService.listLigneCommande =
          JSON.parse(storedLignes);

        let total = 0;

        for (
          let i = 0;
          i < this.ligneCommandeService.listLigneCommande.length;
          i++
        ) {

          const ligne =
            this.ligneCommandeService.listLigneCommande[i];

          if (ligne.totht) {
            total += Number(ligne.totht);
            this.totht = total;
          }

          this.getTtc();
        }

      } catch (error) {

        console.error(
          'Erreur lors de la restauration des lignes de commande :',
          error
        );

        this.ligneCommandeService.listLigneCommande = [];
      }

    } else {

      this.totht = 0;
      this.tottva = 0;
      this.totttc = 0;
      this.reduction = 0;
      this.net = 0;
    }

    this.refreshRoleAndPermissonsUser();

    if (
      this.userService.user &&
      this.userService.user.roles &&
      this.userService.user.roles.length > 0
    ) {

      this.firstRoleName =
        this.userService.user.roles[0].name;
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
          this.ligneCommandeService.listLigneCommande.map((l: LigneCommande) => l.codeProduit)
        );
        data.forEach((p: any) => p.isselected = selectedCodes.has(p.code));

        this.produitService.listAllProduits = data;
        this.produitService.listProduits = data;
        localStorage.setItem('listProduitsCache', JSON.stringify(data));
      },
      error: (error) => console.error('Erreur lors du rafraîchissement des produits :', error)
    });
  }

  /**
     * Récupération des paramètres du tenant.
     *
     * IMPORTANT :
     * - parametreLoaded reste false tant que la réponse
     *   n'est pas arrivée => les checkboxes restent désactivées
     *   pendant ce laps de temps, AUCUN flash n'est visible
     *   côté utilisateur car le template masque l'interaction
     *   tant que parametreLoaded est false (voir HTML).
     * - En cas d'erreur réseau, parametre reste null et
     *   parametreLoaded passe à true quand même : l'emprunt
     *   est alors considéré comme désactivé par défaut (sécurisé).
     */
  getParametre(): void {

    this.parametreLoaded = false;

    this.parametreService.getSetting().subscribe({

      next: (data: any) => {

        this.parametre =
          data?.data ??
          data?.setting ??
          data;

        this.parametreLoaded = true;
      },

      error: (err) => {

        console.error(
          'Erreur récupération paramètres :',
          err
        );

        // Sécurité : emprunt désactivé par défaut
        this.parametre = null;
        this.parametreLoaded = true;
      }
    });
  }

  isEmpruntProduitActive(): boolean {

    return Number(
      this.parametre?.emprunt_produit_active
    ) === 1;
  }

  /**
   * Vérifie si un produit peut être sélectionné.
   *
   * Tant que les paramètres ne sont pas chargés
   * (parametreLoaded === false), AUCUN produit en
   * rupture de stock n'est sélectionnable, quel que
   * soit l'état futur de emprunt_produit_active.
   */
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

  refreshRoleAndPermissonsUser(): void {

    this.userService
      .refreshRoleAndPermissonsUser(this.userService.user.id)
      .subscribe(data => {

        const resp: any = data;

        this.userService.user.permissions =
          resp.user.permissions;

        this.userService.setRoles(
          resp.user.roles
        );
      });
  }

  get filteredClient() {

    return this.clientService.listClient.filter(client =>
      client.name
        .toLowerCase()
        .includes(
          this.searchSelect.toLowerCase()
        )
    );
  }

  selectClient(client: any) {

    if (client == 'autre') {

      this.isSelect = true;

    } else {

      this.clientAutre = null;
      this.isSelect = false;

      this.selectedClient = client;

      this.client = client.name;
      this.nom_client = client.name;

      this.id_client = client.id;

      this.code_client = client.code;
      this.numero_client = client.numero;

      this.searchSelect = '';
      this.showDropdown = false;
    }
  }

  initFormCommande() {

    this.formCommande =
      this.formBuilder.group({

        date_comm: '',
        heure_comm: '',
        auteur: '',
        id_client: 1,
        nom_client: this.client,
        reduction: 0,
        versement: 0,
        restant: 0,
        net: 0,
        totht: 0,
        tottva: 0,
        totttc: 0,
        isCommande: '',
        ligneCommande: [],
      });
  }

  dafaForm() {

    this.fCommande['date_comm']
      .setValue(this.date_comm);

    this.fCommande['heure_comm']
      .setValue(this.heure_comm);

    this.fCommande['id_client']
      .setValue(this.id_client);

    this.fCommande['nom_client']
      .setValue(this.client);

    this.fCommande['auteur']
      .setValue(this.userService.name);

    this.fCommande['totht']
      .setValue(this.totht);

    this.fCommande['reduction']
      .setValue(this.reduction);

    this.fCommande['net']
      .setValue(this.net);

    this.fCommande['tottva']
      .setValue(this.tottva);

    this.fCommande['totttc']
      .setValue(this.totttc);

    this.fCommande['restant']
      .setValue(this.net);

    this.fCommande['versement']
      .setValue(this.versement);

    this.fCommande['isCommande']
      .setValue(this.isProduit);

    this.fCommande['ligneCommande']
      .setValue(
        this.ligneCommandeService.listLigneCommande
      );
  }

  initFormClient() {

    this.formClient = new FormGroup({

      name: new FormControl('', [
        Validators.required
      ]),

      phone: new FormControl('221'),

      surnom: new FormControl(''),

      address: new FormControl(''),

      auteur: new FormControl(
        this.userService.name
      )
    });
  }

  initFormDossier() {

    this.formDossier = new FormGroup({

      nom: new FormControl('', [
        Validators.required
      ]),

      auteur: new FormControl(
        this.userService.name
      )
    });
  }

  onSubmitClient() {

    this.formClient.value.auteur =
      this.userService.name;

    this.clientService
      .createData(this.formClient.value)
      .subscribe({

        next: (data: any) => {

          const resp: any = data;

          this.initFormClient();

          this.toastrService.success(
            'Client ' +
            resp.data.name +
            ' ajouté !'
          );

          this.clientService
            .getAll()
            .subscribe(data => {

              this.clientService.listClient = data;
            });

          this.selectClient(resp.data);
        },

        error: (err: {
          error: {
            message: any;
          }
        }) => {

          console.log(
            err.error.message
          );
        }
      });
  }

  /**
   * Chargement de tous les produits.
   *
   * IMPORTANT :
   * Aucun filtrage Difoncé / Sicap ici.
   */
  getProduits() {

    // ================================
    // CACHE LOCAL
    // ================================

    const cachedProduits =
      localStorage.getItem(
        'listProduitsCache'
      );

    if (cachedProduits) {

      try {

        const produits =
          JSON.parse(cachedProduits);

        this.produitService.listAllProduits =
          produits;

        this.produitService.listProduits =
          produits;

      } catch (error) {

        console.error(
          'Erreur lecture cache produits :',
          error
        );

        localStorage.removeItem(
          'listProduitsCache'
        );
      }
    }


    // ================================
    // API
    // ================================

    this.produitService
      .getAllProduct()
      .subscribe({

        next: (data: any) => {

          // TOUS les produits
          this.produitService.listAllProduits =
            data;

          this.produitService.listProduits =
            data;

          // Cache
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

  /**
   * Cette méthode est conservée pour ne pas casser
   * les autres parties de l'application qui pourraient
   * encore l'appeler.
   */
  filterListProduit() {

    const produits =
      this.produitService.listAllProduits;

    if (!produits || produits.length === 0) {
      return;
    }

    this.produitService.listProduits =
      produits.filter(
        (p: any) =>
          p.isProduit === this.isProduit
      );
  }


  getMaxId() {

    this.year =
      this.getYear(
        new Date(Date.now())
      );

    this.month =
      this.getMonth(
        new Date(Date.now())
      );

    this.commandeService
      .getMaxId()
      .subscribe(data => {

        this.commandeService.maxId =
          this.year +
          'F' +
          this.month +
          data.maxId;
      });
  }


  getClients() {

    this.clientService
      .getAll()
      .subscribe(data => {

        this.clientService.listClient =
          data;

        // filtre le client néant
        const listClients =
          this.clientService.listClient
            .filter(
              (client: any) =>
                client.name == 'NÉANT'
            );

        // Sélectionne le premier client par défaut
        if (listClients.length > 0) {

          this.selectedClient =
            listClients[0];

          this.selectClient(
            this.selectedClient
          );
        }
      });
  }


  onChangeVente(event: Event): void {

    const selectedValue =
      (event.target as HTMLSelectElement).value;

    this.typeVente =
      selectedValue;
  }

  /**
   * Vente au détail
   */

  onchange(produit: any) {

    // Si le produit est sélectionné
    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;
      const empruntActif = this.isEmpruntProduitActive();

      // ============================================================
      // PRODUIT EN EMPRUNT
      // ============================================================
      // Si le stock est insuffisant et que l'emprunt est activé,
      // on ouvre le modal AVANT d'ajouter le produit.
      if (stock <= 0 && empruntActif) {

        // On mémorise le produit pour submitAlert()
        localStorage.setItem('produit', JSON.stringify(produit));

        // On remet temporairement la checkbox à false.
        // Elle sera cochée après confirmation dans submitAlert().
        produit.isselected = false;

        // Ouverture du modal
        const modalElement = document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }

        return;
      }

      // ============================================================
      // STOCK INSUFFISANT + EMPRUNT DESACTIVE
      // ============================================================
      if (stock <= 0 && !empruntActif) {
        produit.isselected = false;

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        return;
      }

      // ============================================================
      // STOCK DISPONIBLE
      // ============================================================
      this.ajouterProduitDetail(produit);

    } else {
      this.deleteLigneCommande(produit.code);
    }
  }

  ajouterProduitDetail(produit: any) {

    this.ligneCommande.codeProduit = produit.code;
    this.ligneCommande.produit = produit.designation;
    this.ligneCommande.qtyProduit = Number(produit.qty) || 0;

    this.ligneCommande.qty = this.getPasVente();

    this.ligneCommande.prix = produit.prix;
    this.ligneCommande.prix_achat = produit.prix_achat;

    this.ligneCommande.totht =
      this.ligneCommande.qty * this.ligneCommande.prix;

    this.ligneCommande.auteur = this.userService.name;

    this.ligneCommandeService.listLigneCommande.push(
      this.ligneCommande
    );

    localStorage.removeItem('listLigneCommande');

    localStorage.setItem(
      'listLigneCommande',
      JSON.stringify(
        this.ligneCommandeService.listLigneCommande
      )
    );

    this.nbrProduit =
      this.ligneCommandeService.listLigneCommande.length;

    this.ligneCommande = new LigneCommande();

    this.calcul();
  }

  /**
   * Gestion de la validation de l'alerte.
   */
  submitAlert() {

    const storedProduit = localStorage.getItem('produit');

    if (!storedProduit) {
      return;
    }

    const produit: any = JSON.parse(storedProduit);

    // Le produit est confirmé : on le coche
    produit.isselected = true;

    // On retrouve également l'objet correspondant dans la liste
    const produitListe = this.produitService.listProduits.find(
      (p: any) => p.code === produit.code
    );

    if (produitListe) {
      produitListe.isselected = true;
    }

    // ============================================================
    // AJOUT SELON LE TYPE DE VENTE
    // ============================================================

    if (this.typeVente === 'detail') {

      this.ajouterProduitDetail(produit);

    } else if (this.typeVente === 'gros') {

      this.onchangeGros(produit);

    } else if (this.typeVente === 'douzaine') {

      this.onchangeDouzaine(produit);

    } else if (this.typeVente === 'carton') {

      this.onchangeCarton(produit);
    }

    // On supprime le produit temporaire
    localStorage.removeItem('produit');
  }

  cancelAlert() {

    const storedProduit = localStorage.getItem('produit');

    if (!storedProduit) {
      return;
    }

    const produit: any = JSON.parse(storedProduit);

    for (let i = 0; i < this.produitService.listProduits.length; i++) {

      if (this.produitService.listProduits[i].code === produit.code) {

        this.produitService.listProduits[i].isselected = false;

        break;
      }
    }

    localStorage.removeItem('produit');
  }

  // ================================
  // CALCUL TOTAL HT
  // ================================

  calcul() {

    let total = 0;
    let benefice = 0;

    if (
      this.ligneCommandeService
        .listLigneCommande
        .length > 0
    ) {

      for (
        let i = 0;
        i <
        this.ligneCommandeService
          .listLigneCommande
          .length;
        i++
      ) {

        const ligne =
          this.ligneCommandeService
            .listLigneCommande[i];

        if (ligne.totht) {

          total += Number(
            ligne.totht
          );

          this.totht =
            total;
        }

        this.getTtc();
      }


      localStorage.removeItem(
        'listLigneCommande'
      );

      localStorage.setItem(
        'listLigneCommande',
        JSON.stringify(
          this.ligneCommandeService
            .listLigneCommande
        )
      );

    } else {

      this.removeLcmd();
    }

    return [
      total,
      benefice
    ];
  }


  // ================================
  // CALCUL TOTAL TTC
  // ================================

  getTtc() {

    this.totttc =
      this.totht +
      (
        this.totht *
        this.tottva
      ) / 100;

    this.net =
      this.totttc -
      this.reduction;
  }


  // ================================
  // DELETE LIGNE COMMANDE
  // ================================

  deleteLigneCommande(code: any) {

    for (
      let i = 0;
      i <
      this.ligneCommandeService
        .listLigneCommande
        .length;
      ++i
    ) {

      this.nbrProduit = i;

      if (
        this.ligneCommandeService
          .listLigneCommande[i]
          .codeProduit == code
      ) {

        this.ligneCommandeService
          .listLigneCommande
          .splice(i, 1);

        break;
      }
    }


    for (
      let i = 0;
      i <
      this.produitService
        .listProduits
        .length;
      i++
    ) {

      if (
        this.produitService
          .listProduits[i]
          .code == code
      ) {

        this.produitService
          .listProduits[i]
          .isselected = false;
      }
    }


    this.calcul();
  }


  openClient() {

    this.formClient.reset();
  }


  openDossier() {

    this.formDossier.reset();
  }


  // ================================
  // REMOVE LIGNES COMMANDE
  // ================================

  removeLcmd() {

    localStorage.removeItem(
      'listLigneCommande'
    );

    this.ligneCommandeService
      .listLigneCommande = [];

    this.totht = 0;
    this.tottva = 0;
    this.totttc = 0;
    this.reduction = 0;
    this.net = 0;


    for (
      let i = 0;
      i <
      this.produitService
        .listProduits
        .length;
      i++
    ) {

      this.produitService
        .listProduits[i]
        .isselected = false;
    }
  }


  // ================================
  // AUGMENTER QUANTITE
  // ================================

  incremente(pi: LigneCommande) {
    const empruntActif = this.isEmpruntProduitActive();
    const pas = this.getPasVente();

    if (pi.qty + pas <= pi.qtyProduit) {
      pi.qty = pi.qty + pas;
      pi.totht = pi.qty * pi.prix;
    } else if (empruntActif) {
      pi.qty = pi.qty + pas;
      const emprunt = pi.qty - pi.qtyProduit;
      this.toastrService.error('Vous venez d\'emprunter une quantité de ' + emprunt + ' sur ce produit !');
      pi.totht = pi.qty * pi.prix;
    } else {
      this.toastrService.error('Stock insuffisant : l\'emprunt de produit est désactivé.');
    }

    this.calcul();
  }

  // ================================
  // DIMINUER QUANTITE
  // ================================

  decremente(pi: LigneCommande) {
    const pas = this.getPasVente();

    if (pi.qty > pas) {
      pi.qty = pi.qty - pas;
      pi.totht = pi.qty * pi.prix;
    }

    this.calcul();
  }

  // ================================
  // EDIT LIGNE
  // ================================

  editDomain(p: LigneCommande) {

    this.editeLigne = true;

    p.editable =
      !p.editable;
  }


  // ================================
  // VALIDATION EDIT LIGNE
  // ================================

  editDomainValid(p: LigneCommande) {

    this.editeLigne = false;

    p.editable =
      !p.editable;


    const empruntActif =
      this.isEmpruntProduitActive();


    if (
      p.qty > p.qtyProduit
    ) {

      if (
        empruntActif
      ) {

        const emprunt =
          p.qty -
          p.qtyProduit;

        this.toastrService.error(
          'Vous venez d\'emprunter une quantité de ' +
          emprunt +
          ' sur ce produit !'
        );

        p.totht =
          p.qty *
          p.prix;

      } else {

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        p.qty =
          p.qtyProduit;

        p.totht =
          p.qty *
          p.prix;
      }

    } else if (p.qty < this.getPasVente()) {
      this.toastrService.error('La quantité doit être au moins ' + this.getPasVente());
      p.qty = this.getPasVente();
      p.totht = p.qty * p.prix;
    } else {

      p.totht =
        p.qty *
        p.prix;
    }


    this.calcul();
  }


  alert() {

    this.reduction = 0;

    this.toastrService.error(
      'La reduction ne doit pas être superieure au TTC'
    );
  }


  getDate(date: any) {

    return this.datePipe.transform(
      date,
      'dd-MM-yyyy'
    );
  }


  getYear(date: any) {

    return this.datePipe.transform(
      date,
      'yy'
    );
  }


  getMonth(date: any) {

    return this.datePipe.transform(
      date,
      'MM'
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


  // ================================
  // CREATION COMMANDE
  // ================================

  onSubmitCommande() {

    this.isDisable = true;
    this.isClick = true;

    this.dafaForm();

    this.fCommande['heure_comm']
      .setValue(
        this.getHeure(
          new Date(Date.now())
        )
      );


    if (this.clientAutre) {

      this.fCommande['nom_client']
        .setValue(
          this.clientAutre
        );
    }


    this.commandeService
      .create(
        this.formCommande.value
      )
      .subscribe(

        data => {

          const resp: any = data;

          this.toastrService.success(
            'Commande numero ' +
            resp.commande.numero +
            ' crée !'
          );

          this.commandeService
            .detail(
              resp.commande
            );
        }
      );
  }


  // ================================
  // CREATION DEVIS
  // ================================

  onSubmitDevis() {

    this.isDisable = true;
    this.isClick = true;

    this.dafaForm();

    this.fCommande['heure_comm']
      .setValue(
        this.getHeure(
          new Date(Date.now())
        )
      );


    if (this.clientAutre) {

      this.fCommande['nom_client']
        .setValue(
          this.clientAutre
        );
    }


    this.devisService
      .create(
        this.formCommande.value
      )
      .subscribe(

        data => {

          const resp: any = data;

          this.toastrService.success(
            'Devis numero ' +
            resp.devis.numero +
            ' crée !'
          );

          this.devisService
            .detail(
              resp.devis
            );
        }
      );
  }


  // ================================
  // SEARCH DESIGNATION
  // ================================

  searchDesignation() {

    let input: any;
    let filter: any;
    let table: any;
    let tr: any;
    let i: any;

    input =
      document.getElementById(
        'InputDesignation'
      );

    if (!input) {
      return;
    }

    filter =
      input.value.toUpperCase();

    table =
      document.getElementById(
        'tableProduit'
      );

    if (!table) {
      return;
    }

    tr =
      table.getElementsByTagName(
        'tr'
      );


    for (
      i = 0;
      i < tr.length;
      i++
    ) {

      const td0 =
        tr[i]
          .getElementsByTagName(
            'td'
          )[1];

      if (td0) {

        const txtValue0 =
          td0.textContent ||
          td0.innerHTML;

        if (
          txtValue0
            .toUpperCase()
            .indexOf(filter) !== -1
        ) {

          tr[i].style.display =
            '';

        } else {

          tr[i].style.display =
            'none';
        }
      }
    }
  }


  // ================================
  // SEARCH FAMILLE
  // ================================

  searchFamille() {

    let input: any;
    let filter: any;
    let table: any;
    let tr: any;
    let i: any;

    input =
      document.getElementById(
        'InputFamille'
      );

    if (!input) {
      return;
    }

    filter =
      input.value.toUpperCase();

    table =
      document.getElementById(
        'tableProduit'
      );

    if (!table) {
      return;
    }

    tr =
      table.getElementsByTagName(
        'tr'
      );


    for (
      i = 0;
      i < tr.length;
      i++
    ) {

      const td0 =
        tr[i]
          .getElementsByTagName(
            'td'
          )[4];

      if (td0) {

        const txtValue0 =
          td0.textContent ||
          td0.innerHTML;

        if (
          txtValue0
            .toUpperCase()
            .indexOf(filter) == 0
        ) {

          tr[i].style.display =
            '';

        } else {

          tr[i].style.display =
            'none';
        }
      }
    }
  }


  // ================================
  // SEARCH REFERENCE
  // ================================

  searchReference() {

    let input: any;
    let filter: any;
    let table: any;
    let tr: any;
    let i: any;

    input =
      document.getElementById(
        'InputReference'
      );

    if (!input) {
      return;
    }

    filter =
      input.value.toUpperCase();

    table =
      document.getElementById(
        'tableProduit'
      );

    if (!table) {
      return;
    }

    tr =
      table.getElementsByTagName(
        'tr'
      );


    for (
      i = 0;
      i < tr.length;
      i++
    ) {

      const td0 =
        tr[i]
          .getElementsByTagName(
            'td'
          )[5];

      if (td0) {

        const txtValue0 =
          td0.textContent ||
          td0.innerHTML;

        if (
          txtValue0
            .toUpperCase()
            .indexOf(filter) == 0
        ) {

          tr[i].style.display =
            '';

        } else {

          tr[i].style.display =
            'none';
        }
      }
    }
  }


  // ================================
  // ROUTES
  // ================================

  routeVente() {

    const exceptions = [
      'user',
      'token',
      'payment'
    ];

    this.localStorageService
      .clearLocalStorage(
        exceptions
      );

    this.router.navigate([
      '/vente'
    ]);
  }


  routeTicket() {

    const exceptions = [
      'user',
      'token',
      'payment'
    ];

    this.localStorageService
      .clearLocalStorage(
        exceptions
      );

    this.commandeService
      .getCommandesDay();

    this.router.navigate([
      '/ticket'
    ]);
  }


  routeDevis() {

    this.localStorageService
      .rootDevis();

    this.router.navigate([
      '/devis'
    ]);
  }


  routeBon() {

    const exceptions = [
      'user',
      'token',
      'payment'
    ];

    this.localStorageService
      .clearLocalStorage(
        exceptions
      );

    this.router.navigate([
      '/bon'
    ]);
  }


  // ==================================================
  // IMPORTANT :
  // Ces méthodes sont appelées par submitAlert().
  // Elles existent dans ton fichier original.
  // ==================================================

  // ================================
  // VENTE EN GROS
  // ================================

  onchangeGros(produit: any) {

    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;
      const empruntActif = this.isEmpruntProduitActive();

      // ============================================================
      // PRODUIT EN EMPRUNT
      // ============================================================
      if (stock <= 0 && empruntActif) {

        localStorage.setItem('produit', JSON.stringify(produit));

        produit.isselected = false;

        const modalElement = document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }

        return;
      }

      // ============================================================
      // STOCK INSUFFISANT + EMPRUNT DESACTIVE
      // ============================================================
      if (stock <= 0 && !empruntActif) {
        produit.isselected = false;

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        return;
      }

      // ============================================================
      // STOCK DISPONIBLE
      // ============================================================
      this.ligneCommande.codeProduit = produit.code;
      this.ligneCommande.produit = produit.designation;
      this.ligneCommande.qtyProduit = produit.qty;

      this.ligneCommande.qty = 0.5;

      this.ligneCommande.prix = produit.prix_gros;
      this.ligneCommande.prix_achat = produit.prix_achat;

      this.ligneCommande.totht =
        this.ligneCommande.qty * this.ligneCommande.prix;

      this.ligneCommande.auteur = this.userService.name;

      this.ligneCommandeService.listLigneCommande.push(
        this.ligneCommande
      );

      localStorage.setItem(
        'listLigneCommande',
        JSON.stringify(
          this.ligneCommandeService.listLigneCommande
        )
      );

      this.nbrProduit =
        this.ligneCommandeService.listLigneCommande.length;

      this.ligneCommande = new LigneCommande();

      this.calcul();

    } else {

      this.deleteLigneCommande(produit.code);
    }
  }


  // ================================
  // VENTE A LA DOUZAINE
  // ================================

  onchangeDouzaine(produit: any) {

    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;
      const empruntActif = this.isEmpruntProduitActive();

      // ============================================================
      // PRODUIT EN EMPRUNT
      // ============================================================
      if (stock <= 0 && empruntActif) {

        localStorage.setItem('produit', JSON.stringify(produit));

        produit.isselected = false;

        const modalElement = document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }

        return;
      }

      // ============================================================
      // STOCK INSUFFISANT + EMPRUNT DESACTIVE
      // ============================================================
      if (stock <= 0 && !empruntActif) {
        produit.isselected = false;

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        return;
      }

      // ============================================================
      // STOCK DISPONIBLE
      // ============================================================
      this.ligneCommande.codeProduit = produit.code;
      this.ligneCommande.produit = produit.designation;
      this.ligneCommande.qtyProduit = produit.qty;

      this.ligneCommande.qty = 0.5;

      this.ligneCommande.prix = produit.prix_douzaine;
      this.ligneCommande.prix_achat = produit.prix_achat;

      this.ligneCommande.totht =
        this.ligneCommande.qty * this.ligneCommande.prix;

      this.ligneCommande.auteur = this.userService.name;

      this.ligneCommandeService.listLigneCommande.push(
        this.ligneCommande
      );

      localStorage.setItem(
        'listLigneCommande',
        JSON.stringify(
          this.ligneCommandeService.listLigneCommande
        )
      );

      this.nbrProduit =
        this.ligneCommandeService.listLigneCommande.length;

      this.ligneCommande = new LigneCommande();

      this.calcul();

    } else {

      this.deleteLigneCommande(produit.code);
    }
  }


  // ================================
  // VENTE AU CARTON
  // ================================

  onchangeCarton(produit: any) {

    if (produit.isselected === true) {

      const stock = Number(produit.qty) || 0;
      const empruntActif = this.isEmpruntProduitActive();

      // ============================================================
      // PRODUIT EN EMPRUNT
      // ============================================================
      if (stock <= 0 && empruntActif) {

        localStorage.setItem('produit', JSON.stringify(produit));

        produit.isselected = false;

        const modalElement = document.getElementById('modalAlertLine');

        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }

        return;
      }

      // ============================================================
      // STOCK INSUFFISANT + EMPRUNT DESACTIVE
      // ============================================================
      if (stock <= 0 && !empruntActif) {
        produit.isselected = false;

        this.toastrService.error(
          'Stock insuffisant : l\'emprunt de produit est désactivé.'
        );

        return;
      }

      // ============================================================
      // STOCK DISPONIBLE
      // ============================================================
      this.ligneCommande.codeProduit = produit.code;
      this.ligneCommande.produit = produit.designation;
      this.ligneCommande.qtyProduit = produit.qty;

      this.ligneCommande.qty = 0.5;

      this.ligneCommande.prix = produit.prix_carton;
      this.ligneCommande.prix_achat = produit.prix_achat;

      this.ligneCommande.totht =
        this.ligneCommande.qty * this.ligneCommande.prix;

      this.ligneCommande.auteur = this.userService.name;

      this.ligneCommandeService.listLigneCommande.push(
        this.ligneCommande
      );

      localStorage.setItem(
        'listLigneCommande',
        JSON.stringify(
          this.ligneCommandeService.listLigneCommande
        )
      );

      this.nbrProduit =
        this.ligneCommandeService.listLigneCommande.length;

      this.ligneCommande = new LigneCommande();

      this.calcul();

    } else {

      this.deleteLigneCommande(produit.code);
    }
  }

}