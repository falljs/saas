import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Produit } from 'src/app/models/produit';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
declare var $: any;

@Component({
  selector: 'app-mouvement-new-place',
  templateUrl: './mouvement-new-place.component.html',
  styleUrls: ['./mouvement-new-place.component.scss']
})
export class MouvementNewPlaceComponent implements OnInit {

  ligneProduit!: any;
  nbrProduit!: number;

  date!: any;
  heure: any;

  // Var Form Achat
  year!: any;
  month!: any;

  date_mouvement!: any;
  heure_achat!: any;

  responsable!: any;

  name_depot = null;

  // Produit
  allProduits: any = [];
  produits: any = [];
  listLigneMouvement: any = [];
  isProduit: string = 'Difoncé';

  designation: any;

  editeLigne!: boolean;
  isDisable: boolean = false;
  isClick: boolean = false;
  isLoading: boolean = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public produitService: ProduitService, public router: Router,
    public userService: UserService, public toastrService: ToastrService,
    private datePipe: DatePipe, public localStorageService: LocalStorageService) { }

  ngOnInit(): void {
    this.ligneProduit = new Produit();
    this.listLigneMouvement = [];
    this.getMaxId();
    this.getProduits();
    this.date_mouvement = this.getDate(new Date(Date.now()));
    this.heure_achat = this.getHeure(new Date(Date.now()));
    if (localStorage.getItem('ligneMouvementPlace') != null) {
      this.listLigneMouvement = JSON.parse(localStorage.getItem('ligneMouvementPlace')!);
    }
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

  getProduits() {
    this.produitService.getAllProduct().subscribe(response => {
      this.allProduits = response;
      if (this.userService.checkPermissionExistence(this.firstRoleName + ' voir produit difoncé Stock')) {
        this.produits = this.allProduits.filter((p: any) => p.isProduit === 'Difoncé');
      } else if (this.userService.checkPermissionExistence(this.firstRoleName + ' voir produit sicap Stock')) {
        this.produits = this.allProduits.filter((p: any) => p.isProduit === 'Sicap');
      } else if (this.userService.checkPermissionExistence(this.firstRoleName + ' voir produit difoncé Stock') &&
        this.userService.checkPermissionExistence(this.firstRoleName + ' voir produit sicap Stock')) {
        this.produits = this.allProduits.filter((p: any) => p.isProduit === 'Difoncé');
      }
    });
  }

  filterListProduit() {
    const produits = this.allProduits;

    // Si la liste est vide ou non définie
    if (!produits || produits.length === 0) {
      return;
    }

    // Filtrer les produits publiés (publication = 1 ou true)
    this.produits = produits.filter((p: any) => p.isProduit === this.isProduit);
  }


  getMaxId() {
    this.year = this.getYear(new Date(Date.now()));
    this.month = this.getMonth(new Date(Date.now()));
    this.produitService.getMaxIdPlace().subscribe(
      (data: { maxId: string; }) => {
        this.produitService.maxId = this.year + 'MP' + this.month + data.maxId;
      });
  }

  getYear(date: any) {
    return this.datePipe.transform(date, 'yy');
  }

  getMonth(date: any) {
    return this.datePipe.transform(date, 'MM');
  }

  createMouvement() {
    this.isDisable = true;
    this.isClick = true;
    var data: any = {
      auteur: this.userService.name,
      responsable: this.responsable,
      ligneMouvement: this.listLigneMouvement
    };
    if (this.isProduit == 'Difoncé') {
      this.produitService.onCreate_mouvement_difonce(data).subscribe(
        data => {
          let response: any = data;
          this.toastrService.success('Les produits sont mouvementés de Difoncé vers Sicap avec succès !');
          localStorage.removeItem('mouvementPlace');
          localStorage.removeItem('ligneMouvementPlace');
          localStorage.removeItem('ligneMouvementPlaceDetail');
          localStorage.setItem('mouvementPlace', JSON.stringify(response.mouvement));
          localStorage.setItem('ligneMouvementPlaceDetail', JSON.stringify(response.ligne_mouvement));
          this.router.navigate(['/mouvement-detail-place']);
        });
    } else {
      this.produitService.onCreate_mouvement_sicap(data).subscribe(
        data => {
          let response: any = data;
          this.toastrService.success('Les produits sont mouvementés de Sicap vers Difoncé avec succès !');
          localStorage.removeItem('mouvementPlace');
          localStorage.removeItem('ligneMouvementPlace');
          localStorage.removeItem('ligneMouvementPlaceDetail');
          localStorage.setItem('mouvementPlace', JSON.stringify(response.mouvement));
          localStorage.setItem('ligneMouvementPlaceDetail', JSON.stringify(response.ligne_mouvement));
          this.router.navigate(['/mouvement-detail-place']);
        });
    }
  }


  onchangeDifonce(produit: any) {

    if (produit.isselected == true) {
      this.ligneProduit.matricule = produit.code;
      this.ligneProduit.id = produit.id;
      this.ligneProduit.code = produit.code;
      this.ligneProduit.produit = produit.designation;
      this.ligneProduit.stock = produit.qty;
      this.ligneProduit.qty = 0.5;
      this.ligneProduit.prix_achat = produit.prix_achat;
      this.ligneProduit.ref = produit.ref;
      this.ligneProduit.place = 'Difoncé';
      this.ligneProduit.auteur = this.userService.name;
      this.listLigneMouvement.push(this.ligneProduit);
      localStorage.removeItem('ligneMouvementPlace');
      localStorage.setItem('ligneMouvementPlace', JSON.stringify(this.listLigneMouvement));
      this.ligneProduit = new Produit();
    } else {
      this.deleteLigne(produit.matricule);
    }

  }

  onchangeSicap(produit: any) {

    if (produit.isselected == true) {
      this.ligneProduit.matricule = produit.code;
      this.ligneProduit.id = produit.id;
      this.ligneProduit.code = produit.code;
      this.ligneProduit.produit = produit.designation;
      this.ligneProduit.stock = produit.qty;
      this.ligneProduit.qty = 0.5;
      this.ligneProduit.prix_achat = produit.prix_achat;
      this.ligneProduit.ref = produit.ref;
      this.ligneProduit.place = 'Sicap';
      this.ligneProduit.auteur = this.userService.name;
      this.listLigneMouvement.push(this.ligneProduit);
      localStorage.removeItem('ligneMouvementPlace');
      localStorage.setItem('ligneMouvementPlace', JSON.stringify(this.listLigneMouvement));
      this.ligneProduit = new Produit();
    } else {
      this.deleteLigne(produit.matricule);
    }

  }


  // Delete Ligne Commande
  deleteLigne(matricule: any) {
    for (let i = 0; i < this.listLigneMouvement.length; ++i) {
      this.nbrProduit = i;
      if (this.listLigneMouvement[i].matricule == matricule) {
        this.listLigneMouvement.splice(i, 1);
      }
    }

    for (var i = 0; i < this.produits.length; i++) {
      if (this.produits[i].code == matricule) {
        this.produits[i].isselected = false;
      }
    }
  }

  // Remove les lignes
  deletLignes() {
    localStorage.removeItem("ligneMouvementPlace");
    this.listLigneMouvement = [];
    for (var i = 0; i < this.produits.length; i++) {
      this.produits[i].isselected = false;
    }
  }

  // Edit Line
  editDomain(produit: any) {
    this.editeLigne = true
    produit.editable = !produit.editable;
  }

  // Edit Line Valid
  valide(produit: any) {
    this.editeLigne = false;
    produit.editable = !produit.editable;
    if (produit.qty < 0.5) {
      this.toastrService.error('La quantité doit être au moins 0.5');
      produit.qty = 0.5;
    }
  }

  cancel(produit: any) {
    this.editeLigne = false;
    produit.editable = !produit.editable;
  }

  getDate(date: any) {
    return this.datePipe.transform(date, 'dd-MM-yyyy');
  }

  getHeure(date: any) {
    return this.datePipe.transform(date, 'HH:mm:ss');
  }

  dateNow(dateNow: any) {
    return this.datePipe.transform(dateNow, 'dd-MM-yyyy HH:mm:ss');
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

}
