import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { StatistiqueService } from 'src/app/services/statistique.service';
import { UserService } from 'src/app/services/user.service';
declare var $: any;

@Component({
  selector: 'app-rapport',
  templateUrl: './rapport.component.html',
  styleUrls: ['./rapport.component.scss']
})
export class RapportComponent {

  pageProd: number = 1;
  nbrProd: number = 0;
  defaultItemProd: number = 10;
  nbrPageProd: number = 0;

  pageCmd: number = 1;
  nbrCmd: number = 0;
  defaultItemCmd: number = 12;
  nbrPageCmd: number = 0;

  date: any;
  dateChange: any;

  codeClt: any;
  date1: any;
  date2: any;

  isDate2: boolean = false;

  listeBeneficeByCmd!: any[];
  totalListeBeneficeByCmd: number = 0;

  listeBeneficeByProd!: any[];
  totalListeBeneficeByProd: number = 0;

  frais: number = 0;

  activeTab: 'prod' | 'cmd' = 'prod';

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public statistiqueService: StatistiqueService, private datePipe: DatePipe,
    public userService: UserService, public fb: FormBuilder,
    public toastrService: ToastrService,
    public router: Router, public localStorageService: LocalStorageService) { }


  ngOnInit(): void {
    this.date = this.datePipe.transform(new Date(Date.now()), 'yyyy-MM-dd');
    this.getBenefice();
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

  //Get Bénéfice
  getBenefice(): void {
    this.statistiqueService.getBenefice().subscribe({
      next: (res: any) => {
        this.updateBeneficeData(res);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des bénéfices :', error);
        this.toastrService.error(
          'Impossible de récupérer les bénéfices.'
        );
      }
    });
  }

  //Get All frais
  getAllBenefice(): void {

    // Réinitialiser les filtres
    this.date = null;
    this.dateChange = null;

    this.date1 = null;
    this.date2 = null;

    this.isDate2 = false;

    // Première page
    this.pageProd = 1;
    this.pageCmd = 1;

    this.statistiqueService.getAllBenefice().subscribe({
      next: (res: any) => {

        this.updateBeneficeData(res);

      },

      error: (error) => {

        console.error(
          'Erreur lors de la récupération de tous les bénéfices :',
          error
        );

        this.toastrService.error(
          'Impossible de récupérer les rapports.'
        );
      }
    });
  }

  onChangeDate(event: any): void {

    const date = event.target.value;

    // Si aucune date
    if (!date) {
      this.date1 = null;
      this.date2 = null;
      this.isDate2 = false;

      this.pageProd = 1;
      this.pageCmd = 1;

      this.getBenefice();
      return;
    }

    // On annule le filtre intervalle
    this.date1 = null;
    this.date2 = null;
    this.isDate2 = false;

    // Première page
    this.pageProd = 1;
    this.pageCmd = 1;

    this.statistiqueService.getBeneficeByDate(date).subscribe({
      next: (res: any) => {
        this.updateBeneficeData(res);
      },
      error: (error) => {
        console.error(
          'Erreur lors du filtrage par date :',
          error
        );

        this.toastrService.error(
          'Impossible de récupérer les bénéfices pour cette date.'
        );
      }
    });
  }

  onChangeDate1(event: any): void {

    const date = event.target.value;

    // Réinitialisation
    this.date2 = null;

    if (!date) {

      this.date1 = null;
      this.isDate2 = false;

      this.getBenefice();

      return;
    }

    // Nouvelle date de début
    this.date1 = date;

    // On active la date de fin
    this.isDate2 = true;

    // Première page
    this.pageProd = 1;
    this.pageCmd = 1;
  }

  onChangeDate2(event: any): void {

    const date = event.target.value;

    if (!date || !this.date1) {
      return;
    }

    /*
     * Vérification date début <= date fin
     */
    if (date < this.date1) {

      this.toastrService.warning(
        'La date de fin doit être supérieure ou égale à la date de début.'
      );

      this.date2 = null;
      event.target.value = '';

      return;
    }

    this.date2 = date;

    // Première page
    this.pageProd = 1;
    this.pageCmd = 1;

    /*
     * Appel API
     */
    this.statistiqueService
      .getBeneficeBy2Date(this.date1, this.date2)
      .subscribe({
        next: (res: any) => {

          this.updateBeneficeData(res);

        },

        error: (error) => {

          console.error(
            'Erreur lors du filtrage par intervalle :',
            error
          );

          this.toastrService.error(
            'Impossible de récupérer les bénéfices pour cette période.'
          );
        }
      });
  }

  private updateBeneficeData(data: any): void {

    /*
     * =========================================================
     * COMMANDES
     * =========================================================
     */

    this.listeBeneficeByCmd =
      Array.isArray(data?.benefice_commandes)
        ? data.benefice_commandes
        : [];

    this.totalListeBeneficeByCmd =
      Number(data?.total_benefice_commandes ?? 0);

    /*
     * =========================================================
     * PRODUITS
     * =========================================================
     */

    this.listeBeneficeByProd =
      Array.isArray(data?.benefice_produits)
        ? data.benefice_produits
        : [];

    this.totalListeBeneficeByProd =
      Number(data?.total_benefice_produits ?? 0);

    /*
     * =========================================================
     * FRAIS
     * =========================================================
     */

    this.frais =
      Number(data?.total_frais ?? 0);

    /*
     * =========================================================
     * PAGINATION COMMANDES
     * =========================================================
     */

    this.nbrCmd =
      this.listeBeneficeByCmd.length;

    this.nbrPageCmd =
      Math.ceil(
        this.nbrCmd / this.defaultItemCmd
      );

    /*
     * =========================================================
     * PAGINATION PRODUITS
     * =========================================================
     */

    this.nbrProd =
      this.listeBeneficeByProd.length;

    this.nbrPageProd =
      Math.ceil(
        this.nbrProd / this.defaultItemProd
      );

    /*
     * =========================================================
     * SÉCURITÉ PAGINATION
     * =========================================================
     */

    if (
      this.nbrPageCmd > 0 &&
      this.pageCmd > this.nbrPageCmd
    ) {
      this.pageCmd = 1;
    }

    if (
      this.nbrPageProd > 0 &&
      this.pageProd > this.nbrPageProd
    ) {
      this.pageProd = 1;
    }
  }

  routeAcceuil() {
    // Utilisation de la fonction clearLocalStorage
    const exceptions = ['user', 'token', 'payment'];
    this.localStorageService.clearLocalStorage(exceptions);
    this.router.navigate(['/accueil']);
  }

  routeFrais() {
    // Utilisation de la fonction clearLocalStorage
    const exceptions = ['user', 'token', 'payment'];
    this.localStorageService.clearLocalStorage(exceptions);
    this.router.navigate(['/frais']);
  }

}

