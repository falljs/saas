import { DatePipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { EMPTY, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AchatService } from 'src/app/services/achat.service';
import { FournisseurService } from 'src/app/services/fournisseur.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UserService } from 'src/app/services/user.service';
import { ToastrService } from 'ngx-toastr';
declare var $: any;

@Component({
  selector: 'app-list-achat',
  templateUrl: './list-achat.component.html',
  styleUrls: ['./list-achat.component.scss']
})
export class ListAchatComponent implements OnInit {

  page: number = 1;
  nbrAchat: number = 0;
  defaultItem: number = 100;
  nbrPage: number = 0;
  date: any;
  codeFn: any;
  status: any;

  fournisseurs!: any[];

  searchSelect = '';
  selectedFournisseur: any = null;
  showDropdown = false;

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  isDisable = false;
  isClick = false;

  // ====== Fusion ======
  // Map id -> achat : la sélection survit aux recherches et filtres
  selection = new Map<number, any>();
  showFusionModal = false;
  fusionLoading = false;
  fusionSubmitting = false;
  fusionError: string | null = null;
  fusionPreview: any = null;
  fusionPrincipalId: number | null = null;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public achatService: AchatService, public router: Router, public localStorageService: LocalStorageService,
    private datePipe: DatePipe, public fournisseurService: FournisseurService,
    public userService: UserService, private toastrService: ToastrService) { }

  ngOnInit() {
    this.date = this.datePipe.transform(new Date(Date.now()), 'dd-MM-yyyy');
    this.achatService.getAchatsDay();
    this.getFournisseurs();
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }

    this.searchSub = this.search$.pipe(
      debounceTime(300),
      switchMap((term: string) => {
        if (!term) {
          this.achatService.getAchatsDay();
          return EMPTY;
        }
        return this.achatService.searchAchat(encodeURIComponent(term)).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe((res: any) => this.applyList(res));
  }

  ngOnDestroy() {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  onSearchInput(target: any) {
    this.search$.next((target.value || '').trim());
  }

  private applyList(list: any[]) {
    this.achatService.listAchat = list;
    this.achatService.nbrAchat = list.length;
    this.nbrAchat = list.length;
    this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);

    this.achatService.totalVente = list.reduce((s, a) => s + (a.net || 0), 0);
    this.achatService.totalAvance = list.reduce((s, a) => s + (a.versement || 0), 0);
    this.achatService.totalRestant = list.reduce((s, a) => s + (a.restant || 0), 0);
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  get filteredFournisseur() {
    return this.fournisseurs.filter(fournisseur =>
      fournisseur.name.toLowerCase().includes(this.searchSelect.toLowerCase())
    );
  }

  selectFournisseur(fournisseur: any) {
    this.selectedFournisseur = fournisseur;
    this.searchSelect = '';
    this.showDropdown = false; // Fermer le dropdown après la sélection
    if (fournisseur) {
      this.achatService.totalVente = 0;
      this.achatService.totalAvance = 0;
      this.achatService.totalRestant = 0;
      this.codeFn = fournisseur.code;
      this.achatService.getAchatByCodeFn(this.codeFn).subscribe(
        (data: any[]) => {
          this.achatService.listAchat = data;
          this.achatService.nbrAchat = this.achatService.listAchat.length;
          this.nbrAchat = this.achatService.listAchat.length;
          this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
          let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

          for (var i = 0; i < this.achatService.nbrAchat; i++) {

            if (this.achatService.listAchat[i].net) {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            } else {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            }

            if (this.achatService.listAchat[i].versement) {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            } else {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            }

            if (this.achatService.listAchat[i].restant) {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            } else {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            }
          }
        });
    }
    else {
      this.achatService.getAchatsDay();
    }
  }

  getAchats() {
    this.isDisable = true;
    this.isClick = true;
    this.achatService.totalVente = 0;
    this.achatService.totalAvance = 0;
    this.achatService.totalRestant = 0;
    this.achatService.getAchats().subscribe(
      (data: any) => {
        this.isDisable = false;
        this.isClick = false;
        let response: any = data;
        this.achatService.listAchat = response.achats;
        this.achatService.nbrAchat = this.achatService.listAchat.length;
        this.nbrAchat = this.achatService.listAchat.length;
        this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
        let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

        for (var i = 0; i < this.achatService.nbrAchat; i++) {

          if (this.achatService.listAchat[i].net) {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          } else {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          }

          if (this.achatService.listAchat[i].versement) {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          } else {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          }

          if (this.achatService.listAchat[i].restant) {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          } else {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          }
        }
      });
  }

  //Get All product fournisseurs!:any[];
  getFournisseurs() {
    this.fournisseurService.getAll().subscribe((res: any[]) => {
      this.fournisseurs = res;
    });
  }

  editAchat(achat: any) {
    this.achatService.edit(achat);
  }


  search() {
    let search: any = $("#inputSearch").val();
    if (search) {
      this.achatService.searchAchat(search).subscribe(
        (res: any[]) => {
          this.achatService.listAchat = res;
          let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

          for (var i = 0; i < this.achatService.listAchat.length; i++) {

            if (this.achatService.listAchat[i].net) {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            } else {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            }

            if (this.achatService.listAchat[i].versement) {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            } else {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            }

            if (this.achatService.listAchat[i].restant) {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            } else {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            }
          }
        });
    } else {
      this.achatService.getAchatsDay();
    }
  }

  OnChangeStatus(ctrl: any) {
    if (ctrl.value) {
      this.achatService.totalVente = 0;
      this.achatService.totalAvance = 0;
      this.achatService.totalRestant = 0;
      this.status = ctrl.value;
      if (this.status == 'payer') {
        this.getAchatsPayer();
      }
      if (this.status == 'cours') {
        this.getAchatsEncours();
      }
      if (this.status == 'nonPay') {
        this.getAchatsRestant();
      }
    }
    else {
      this.achatService.getAchatsDay();
    }
  }

  onChangeDate(ctrl: any) {
    if (ctrl.value) {
      this.achatService.totalVente = 0;
      this.achatService.totalAvance = 0;
      this.achatService.totalRestant = 0;
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.achatService.getAchatByDate(date).subscribe(
        (data: any) => {
          let response: any = data;
          this.achatService.listAchat = response.achats;
          this.achatService.nbrAchat = this.achatService.listAchat.length;
          this.nbrAchat = this.achatService.listAchat.length;
          this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
          let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

          for (var i = 0; i < this.achatService.nbrAchat; i++) {

            if (this.achatService.listAchat[i].net) {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            } else {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            }

            if (this.achatService.listAchat[i].versement) {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            } else {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            }

            if (this.achatService.listAchat[i].restant) {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            } else {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            }
          }
        });
    } else {
      this.achatService.getAchatsDay();
    }
  }

  OnChangeFournisseur(ctrl: any) {

  }

  onChange2DatesFirst(ctrl: any) {
    if (ctrl.value) {
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.date = date;
    }
  }

  onChange2DatesSecond(ctrl: any) {
    if (ctrl.value) {
      this.achatService.totalVente = 0;
      this.achatService.totalAvance = 0;
      this.achatService.totalRestant = 0;
      let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
      this.achatService.getAchatBy2Dates(this.date, date).subscribe(
        (data: any) => {
          let response: any = data;
          this.achatService.listAchat = response.achats;
          this.achatService.nbrAchat = this.achatService.listAchat.length;
          this.nbrAchat = this.achatService.listAchat.length;
          this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
          let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

          for (var i = 0; i < this.achatService.nbrAchat; i++) {

            if (this.achatService.listAchat[i].net) {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            } else {
              totalVente += this.achatService.listAchat[i].net;
              this.achatService.totalVente = totalVente;
            }

            if (this.achatService.listAchat[i].versement) {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            } else {
              totalAvance += this.achatService.listAchat[i].versement;
              this.achatService.totalAvance = totalAvance;
            }

            if (this.achatService.listAchat[i].restant) {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            } else {
              totalRestant += this.achatService.listAchat[i].restant;
              this.achatService.totalRestant = totalRestant;
            }
          }
        });
    } else {
      this.achatService.getAchatsDay();
    }
  }

  getAchatsPayer() {
    this.achatService.totalVente = 0;
    this.achatService.totalAvance = 0;
    this.achatService.totalRestant = 0;
    this.achatService.getNbrAchatsPayer().subscribe(
      (data: any[]) => {
        this.achatService.listAchat = data;
        this.achatService.nbrAchat = this.achatService.listAchat.length;
        this.nbrAchat = this.achatService.listAchat.length;
        this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
        let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

        for (var i = 0; i < this.achatService.nbrAchat; i++) {

          if (this.achatService.listAchat[i].net) {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          } else {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          }

          if (this.achatService.listAchat[i].versement) {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          } else {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          }

          if (this.achatService.listAchat[i].restant) {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          } else {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          }
        }
      });
  }

  getAchatsEncours() {
    this.achatService.totalVente = 0;
    this.achatService.totalAvance = 0;
    this.achatService.totalRestant = 0;
    this.achatService.getNbrAchatsEncours().subscribe(
      (data: any[]) => {
        this.achatService.listAchat = data;
        this.achatService.nbrAchat = this.achatService.listAchat.length;
        this.nbrAchat = this.achatService.listAchat.length;
        this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
        let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

        for (var i = 0; i < this.achatService.nbrAchat; i++) {

          if (this.achatService.listAchat[i].net) {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          } else {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          }

          if (this.achatService.listAchat[i].versement) {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          } else {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          }

          if (this.achatService.listAchat[i].restant) {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          } else {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          }
        }
      });
  }

  getAchatsRestant() {
    this.achatService.totalVente = 0;
    this.achatService.totalAvance = 0;
    this.achatService.totalRestant = 0;
    this.achatService.getNbrAchatsRestant().subscribe(
      (data: any[]) => {
        this.achatService.listAchat = data;
        this.achatService.nbrAchat = this.achatService.listAchat.length;
        this.nbrAchat = this.achatService.listAchat.length;
        this.nbrPage = Math.ceil(this.nbrAchat / this.defaultItem);
        let totalVente = 0; let totalAvance = 0; let totalRestant = 0;

        for (var i = 0; i < this.achatService.nbrAchat; i++) {

          if (this.achatService.listAchat[i].net) {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          } else {
            totalVente += this.achatService.listAchat[i].net;
            this.achatService.totalVente = totalVente;
          }

          if (this.achatService.listAchat[i].versement) {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          } else {
            totalAvance += this.achatService.listAchat[i].versement;
            this.achatService.totalAvance = totalAvance;
          }

          if (this.achatService.listAchat[i].restant) {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          } else {
            totalRestant += this.achatService.listAchat[i].restant;
            this.achatService.totalRestant = totalRestant;
          }
        }
      });
  }

  detail(achat: any) {
    this.achatService.getAchat(achat.id).subscribe((data: any) => {
      let response: any = data;
      this.achatService.achat = response.achat;
      localStorage.removeItem('achat')
      localStorage.removeItem('dossier')
      localStorage.removeItem('fournisseur')
      localStorage.removeItem('is_editable')
      localStorage.removeItem('listLigneAchatDetail')
      localStorage.removeItem('listReglementAchatDetail')
      localStorage.setItem('achat', JSON.stringify(this.achatService.achat));
      localStorage.setItem('is_editable', JSON.stringify(response.is_editable));
      localStorage.setItem('listLigneAchatDetail', JSON.stringify(response.ligneAchats));
      localStorage.setItem('listReglementAchatDetail', JSON.stringify(response.ligneReglementAchats));
      localStorage.setItem('fournisseur', JSON.stringify(response.fournisseur));
      localStorage.setItem('dossier', JSON.stringify(response.dossier));
      this.router.navigate(['/achat-detail']);
    });
  }

  routeAchat() {
    // Utilisation de la fonction clearLocalStorage
    const exceptions = ['user', 'token', 'payment'];
    this.localStorageService.clearLocalStorage(exceptions);
    this.router.navigate(['/achat-nouveau']);
  }

  // ====== FUSION D'ACHATS ======

  get selectedAchats(): any[] {
    return Array.from(this.selection.values());
  }

  get selectedCount(): number {
    return this.selection.size;
  }

  get selectedFournisseurName(): string {
    const first = this.selectedAchats[0];
    return first ? first.nom_fn : '';
  }

  isSelected(achat: any): boolean {
    return this.selection.has(achat.id);
  }

  // Raison pour laquelle un achat ne peut pas rejoindre la sélection (null = OK)
  selectDisabledReason(achat: any): string | null {
    if (this.selection.size === 0 || this.selection.has(achat.id)) {
      return null;
    }
    const ref = this.selectedAchats[0];
    if (ref.code_fn !== achat.code_fn) {
      return 'Fournisseur différent de la sélection';
    }
    if ((ref.isAchat || '') !== (achat.isAchat || '')) {
      return "Type d'achat différent de la sélection";
    }
    return null;
  }

  toggleSelect(achat: any) {
    if (this.selection.has(achat.id)) {
      this.selection.delete(achat.id);
    } else if (!this.selectDisabledReason(achat)) {
      this.selection.set(achat.id, achat);
    }
  }

  clearSelection() {
    this.selection.clear();
  }

  openFusionModal() {
    if (this.selectedCount < 2) {
      return;
    }
    const ids = this.selectedAchats.map(a => a.id).sort((a, b) => a - b);

    this.showFusionModal = true;
    this.fusionLoading = true;
    this.fusionError = null;
    this.fusionPreview = null;
    this.fusionPrincipalId = ids[0]; // par défaut : le plus ancien

    this.achatService.apercuFusion({ ids }).subscribe({
      next: (res: any) => {
        this.fusionPreview = res;
        this.fusionPrincipalId = res.principal_id;
        this.fusionLoading = false;
      },
      error: (err: any) => {
        this.fusionLoading = false;
        this.fusionError = this.extractError(err);
      }
    });
  }

  closeFusionModal() {
    if (this.fusionSubmitting) {
      return;
    }
    this.showFusionModal = false;
    this.fusionPreview = null;
    this.fusionError = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showFusionModal) {
      this.closeFusionModal();
    }
  }

  get fusionPrincipal(): any {
    if (!this.fusionPreview) {
      return null;
    }
    return this.fusionPreview.achats.find((a: any) => a.id === this.fusionPrincipalId);
  }

  isLigneAjoutee(ligne: any): boolean {
    return ligne.achat !== this.fusionPrincipalId;
  }

  isDoublon(ligne: any): boolean {
    return this.fusionPreview.lignes.filter((l: any) => l.code === ligne.code).length > 1;
  }

  get nbDoublons(): number {
    if (!this.fusionPreview) {
      return 0;
    }
    const codes = this.fusionPreview.lignes.map((l: any) => l.code);
    return new Set(codes.filter((c: any, i: number) => codes.indexOf(c) !== i)).size;
  }

  confirmFusion() {
    if (!this.fusionPreview || this.fusionSubmitting) {
      return;
    }
    this.fusionSubmitting = true;
    this.fusionError = null;

    const ids = this.fusionPreview.achats.map((a: any) => a.id);

    this.achatService.fusionner({
      ids,
      principal_id: this.fusionPrincipalId,
      // Adapte au champ utilisé ailleurs dans ton app pour "auteur"
      auteur: this.userService.user.name
    }).subscribe({
      next: (res: any) => {
        this.fusionSubmitting = false;
        this.showFusionModal = false;
        this.fusionPreview = null;
        this.selection.clear();

        const fusionnes = (res.fusionnes || []).join(', ');

        this.toastrService.success(
          `${fusionnes} fusionné(s) dans l'achat ${res.achat.numero}`,
          'Fusion réussie',
          { timeOut: 5000, closeButton: true, progressBar: true }
        );

        // Affiche directement l'achat fusionné
        this.detail(res.achat);
      },
      error: (err: any) => {
        this.fusionSubmitting = false;
        this.fusionError = this.extractError(err);
        this.toastrService.error(this.fusionError || 'Une erreur est survenue.', 'Fusion impossible');
      }
    });
  }

  private extractError(err: any): string {
    if (err && err.error && err.error.message) {
      return err.error.message;
    }
    return 'Une erreur est survenue. Veuillez réessayer.';
  }
}
