import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Produit } from 'src/app/models/produit';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-mouvement-edit-place',
  templateUrl: './mouvement-edit-place.component.html',
  styleUrls: ['./mouvement-edit-place.component.scss']
})
export class MouvementEditPlaceComponent implements OnInit {

  ligneProduit!: any;
  nbrProduit!: number;

  date!: any;
  heure: any;

  // Var Form Achat
  year!: any;
  month!: any;

  date_mouvement!: any;
  heure_achat!: any;
  name_depot = null;

  // Produit
  produits: any = [];
  allProduits: any = [];
  listProduits: any = [];
  isProduit: string = 'Difoncé';
  responsable!: any;

  designation: any;
  mouvement: any;
  editeLigne!: boolean;
  isDisable: boolean = false;
  isClick: boolean = false;
  isLoading: boolean = false;


  constructor(public produitService: ProduitService, public router: Router, private route: ActivatedRoute,
    public userService: UserService, public toastrService: ToastrService,
    private datePipe: DatePipe,) { }

  ngOnInit(): void {
    this.ligneProduit = new Produit();
    this.date_mouvement = this.getDate(new Date(Date.now()));
    this.heure_achat = this.getHeure(new Date(Date.now()));
    this.getMouvementEdit();
  }

  getMouvementEdit() {
    if (localStorage.getItem('mouvementPlace') != null) {
      this.mouvement = JSON.parse(localStorage.getItem('mouvementPlace')!);
      this.produitService.listLigneMouvementPlace = JSON.parse(localStorage.getItem('ligneMouvementPlace')!);
      this.responsable = this.mouvement.responsable;
      if (this.mouvement.type == 'Difoncé => Sicap') {
        this.getProduitDifonce();
      } else {
        this.getProduitSicap();
      }
    }
  }

  //Get All product Difoncé
  getProduitDifonce() {
    this.produitService.getAllProduct().subscribe(response => {
      this.allProduits = response;
      this.produits = this.allProduits.filter((p: any) => p.isProduit === 'Difoncé');
    });
  }

  //Get All product Sicap
  getProduitSicap() {
    this.produitService.getAllProduct().subscribe(response => {
      this.allProduits = response;
      this.produits = this.allProduits.filter((p: any) => p.isProduit === 'Sicap');
    });
  }


  getYear(date: any) {
    return this.datePipe.transform(date, 'yy');
  }

  getMonth(date: any) {
    return this.datePipe.transform(date, 'MM');
  }



  updateMouvement() {
    this.isDisable = true;
    this.isClick = true;
    var data: any = {
      numero: this.mouvement.numero,
      auteur: this.userService.name,
      responsable: this.responsable,
      ligneMouvement: this.produitService.listLigneMouvementPlace
    };
    if (this.mouvement.type == 'Difoncé => Sicap') {
      this.produitService.onUdapte_mouvement_difonce(data).subscribe(
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
      this.produitService.onUdapte_mouvement_sicap(data).subscribe(
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
      this.ligneProduit.id = 0;
      this.ligneProduit.code = produit.code;
      this.ligneProduit.produit = produit.designation;
      this.ligneProduit.stock = produit.qty;
      this.ligneProduit.qty = 0.5;
      this.ligneProduit.prix_achat = produit.prix_achat;
      this.ligneProduit.ref = produit.ref;
      this.ligneProduit.place = 'Difoncé';
      this.ligneProduit.auteur = this.userService.name;
      this.produitService.listLigneMouvementPlace.push(this.ligneProduit);
      localStorage.removeItem('ligneMouvementPlace');
      localStorage.setItem('ligneMouvementPlace', JSON.stringify(this.produitService.listLigneMouvementPlace));
      this.ligneProduit = new Produit();
    } else {
      this.deleteLigne(produit.matricule);
    }

  }

  onchangeSicap(produit: any) {

    if (produit.isselected == true) {
      this.ligneProduit.matricule = produit.code;
      this.ligneProduit.id = 0;
      this.ligneProduit.code = produit.code;
      this.ligneProduit.produit = produit.designation;
      this.ligneProduit.stock = produit.qty;
      this.ligneProduit.qty = 0.5;
      this.ligneProduit.prix_achat = produit.prix_achat;
      this.ligneProduit.ref = produit.ref;
      this.ligneProduit.place = 'Sicap';
      this.ligneProduit.auteur = this.userService.name;
      this.produitService.listLigneMouvementPlace.push(this.ligneProduit);
      localStorage.removeItem('ligneMouvementPlace');
      localStorage.setItem('ligneMouvementPlace', JSON.stringify(this.produitService.listLigneMouvementPlace));
      this.ligneProduit = new Produit();
    } else {
      this.deleteLigne(produit.matricule);
    }

  }

  // Delete Ligne Commande
  deleteLigne(matricule: any) {
    for (let i = 0; i < this.produitService.listLigneMouvement.length; ++i) {
      this.nbrProduit = i;
      if (this.produitService.listLigneMouvement[i].matricule == matricule) {
        this.produitService.listLigneMouvement.splice(i, 1);
      }
    }

    for (var i = 0; i < this.produits.length; i++) {
      if (this.produits[i].code == matricule) {
        this.produits[i].isselected = false;
      }
    }
  }

  // Remove les lignes
  removeLignes() {
    localStorage.removeItem("ligneMouvementPlace");
    this.produitService.listLigneMouvementPlace = [];
  }

  // Edit Line
  editDomain(produit: any) {
    this.editeLigne = true;
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
