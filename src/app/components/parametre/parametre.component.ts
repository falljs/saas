import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { ParametreService } from 'src/app/services/parametre.service';
import { UserService } from 'src/app/services/user.service';

declare var $: any;

@Component({
  selector: 'app-parametre',
  templateUrl: './parametre.component.html',
  styleUrls: ['./parametre.component.scss']
})
export class ParametreComponent {

  setting: any = null;
  msgError: any = null;

  formUpdate!: FormGroup;

  stgFile: any = null;
  logoURL: any = null;

  listModels: any[] = [];
  template: any = null;

  listYears: number[] = [];
  yearNow: any;

  maintenance: any;

  firstRoleName: string | null = null;

  formModules!: FormGroup;

  readonly moduleGroups = [
    {
      label: 'Vente', modules: [
        { key: 'vente', label: 'Module Vente (parent)' },
        { key: 'vente.encaissement', label: 'Encaissement' },
        { key: 'vente.remboursement', label: 'Remboursements' },
      ]
    },
    {
      label: 'Achat', modules: [
        { key: 'achat', label: 'Module Achat (parent)' },
        { key: 'achat.nouveau', label: 'Nouvel achat' },
        { key: 'achat.factures', label: 'Factures achat' },
        { key: 'achat.bons', label: "Bons d'achat" },
      ]
    },
    {
      label: 'CRM', modules: [
        { key: 'crm', label: 'Module CRM (parent)' },
        { key: 'crm.client', label: 'Clients' },
        { key: 'crm.fournisseur', label: 'Fournisseurs' },
      ]
    },
    {
      label: 'Stock', modules: [
        { key: 'stock', label: 'Module Stock (parent)' },
        { key: 'stock.produit', label: 'Produits' },
        { key: 'stock.mouvement', label: 'Mouvements' },
        { key: 'stock.mouvement_place', label: 'Mouvements place' },
        { key: 'stock.depot', label: 'Dépôts' },
        { key: 'stock.inventaire', label: 'Inventaire' },
      ]
    },
    {
      label: 'Autres', modules: [
        { key: 'compte', label: 'Compte' },
        { key: 'utilisateur', label: 'Utilisateurs' },
        { key: 'caisse', label: 'Caisse' },
        { key: 'corbeille', label: 'Corbeille' },
        { key: 'dashboard', label: 'Tableau de bord' },
        { key: 'dossier', label: 'Dossiers' },
      ]
    },
  ];

  constructor(
    public parametreService: ParametreService,
    public userService: UserService,
    public router: Router,
    public toastrService: ToastrService,
    private datePipe: DatePipe
  ) { }

  get fUpdate() {
    return this.formUpdate.controls;
  }

  ngOnInit(): void {

    this.yearNow = this.getYear(new Date());

    this.getYears(Number(this.yearNow));

    // 1. Toujours créer le formulaire
    this.initFormUp();

    this.initFormModules();

    // 2. Charger les données
    this.getSetting();

    // 3. Autres données
    this.getModels();

    this.refreshRoleAndPermissonsUser();

    if (
      this.userService.user.roles &&
      this.userService.user.roles.length > 0
    ) {
      this.firstRoleName =
        this.userService.user.roles[0].name;
    }
  }

  /** Seul le compte technique "webmaster" doit voir la gestion des modules */
  isWebmaster(): boolean {
    return this.userService.user?.username === 'webmaster';
  }

  initFormModules(): void {
    const controls: { [key: string]: FormControl } = {};
    this.moduleGroups.forEach(group => {
      group.modules.forEach(m => {
        controls[m.key] = new FormControl(true);
      });
    });
    this.formModules = new FormGroup(controls);
  }

  comparePasVente = (a: any, b: any): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    return Number(a) === Number(b);
  };

  refreshRoleAndPermissonsUser(): void {

    this.userService
      .refreshRoleAndPermissonsUser(this.userService.user.id)
      .subscribe(data => {

        const resp: any = data;

        this.userService.user.permissions =
          resp.user.permissions;

        this.userService.setRoles(resp.user.roles);
      });
  }

  /**
   * Récupération des paramètres depuis le localStorage.
   */
  getSetting(): void {

    const data = localStorage.getItem('setting');

    if (!data) {
      return;
    }

    try {

      const decrypted = this.userService.decrypt(data);
      const response = JSON.parse(decrypted);

      // Si l'API retourne { setting: {...} }
      this.setting = response.setting ?? response;

    } catch {

      try {

        const response = JSON.parse(data);

        this.setting = response.setting ?? response;

      } catch {

        this.setting = null;
        return;
      }
    }

    if (!this.setting) {
      return;
    }

    this.maintenance = this.setting.maintenance;

    this.formUpdate.patchValue({
      entreprise: this.setting.entreprise ?? '',
      description: this.setting.description ?? '',
      contact_nom: this.setting.contact_nom ?? '',
      email: this.setting.email ?? '',
      adresse: this.setting.adresse ?? '',

      phone1: this.setting.phone1 ?? '',
      phone2: this.setting.phone2 ?? '',
      phone3: this.setting.phone3 ?? '',
      phone4: this.setting.phone4 ?? '',

      ninea: this.setting.ninea ?? '',
      registre_commerce: this.setting.registre_commerce ?? '',

      archive: this.setting.archive ?? '',

      garantie_active:
        this.setting.garantie_active ?? true,

      garantie:
        this.setting.garantie ?? '',

      politique_retour_active:
        this.setting.politique_retour_active ?? false,

      politique_retour:
        this.setting.politique_retour ?? '',

      emprunt_produit_active:
        this.setting.emprunt_produit_active ?? false,

      pas_vente: Number(this.setting.pas_vente),
    });

    if (this.isWebmaster()) {
      const actifs: string[] = this.setting.modules_actifs ?? [];
      const patch: any = {};
      this.moduleGroups.forEach(g => g.modules.forEach(m => patch[m.key] = actifs.includes(m.key)));
      this.formModules.patchValue(patch);
    }
  }

  onUpdateModules(): void {
    const modules_actifs = Object.entries(this.formModules.value)
      .filter(([, actif]) => actif)
      .map(([key]) => key);

    this.parametreService.updateModulesActifs({ modules_actifs }).subscribe({
      next: (res: any) => {
        localStorage.removeItem('setting');
        localStorage.setItem('setting', this.userService.encrypt(JSON.stringify(res.setting)));
        this.setting = res.setting;
        this.toastrService.success('Modules mis à jour avec succès.');
      },
      error: err => {
        this.toastrService.error(err?.error?.message || 'Erreur lors de la mise à jour des modules.');
      }
    });
  }

  /**
   * Formulaire des informations entreprise.
   */
  initFormUp(): void {

    this.formUpdate = new FormGroup({

      entreprise: new FormControl(
        '',
        Validators.required
      ),

      description: new FormControl(''),

      contact_nom: new FormControl(''),

      email: new FormControl(
        '',
        Validators.email
      ),

      adresse: new FormControl(
        '',
        Validators.required
      ),

      phone1: new FormControl(
        '',
        Validators.required
      ),

      phone2: new FormControl(''),

      phone3: new FormControl(''),

      phone4: new FormControl(''),

      ninea: new FormControl(''),

      registre_commerce: new FormControl(''),

      archive: new FormControl(
        '',
        Validators.required
      ),

      garantie_active: new FormControl(true),

      garantie: new FormControl(''),

      politique_retour_active: new FormControl(false),

      politique_retour: new FormControl(''),

      // Vente au-delà du stock disponible (Super Admin uniquement)
      emprunt_produit_active: new FormControl(false),

      pas_vente: new FormControl(0.5, [Validators.required]),
    });
  }


  /**
   * Années d'archivage.
   */
  getYears(year: number): void {

    this.listYears = [];

    for (let i = 2014; i <= year; i++) {
      this.listYears.push(i);
    }
  }

  /**
   * Modification du mode maintenance.
   */
  updateMaintenance(maintenance: any): void {

    const data = {
      maintenance: maintenance.value
    };

    this.parametreService
      .setMaintenance(data)
      .subscribe({

        next: (response: any) => {

          if (response.data) {

            localStorage.setItem(
              'setting',
              this.userService.encrypt(
                JSON.stringify(response.data)
              )
            );

            this.setting = response.data;

            this.maintenance =
              response.data.maintenance;
          }

          this.toastrService.success(
            response.message
          );
        },

        error: err => {

          this.toastrService.error(
            err?.error?.message ||
            'Erreur lors de la mise à jour'
          );
        }
      });
  }

  /**
   * Sélection du logo.
   */
  onSelectFile(event: any): void {

    if (!event.target.files?.length) {
      return;
    }

    const file = event.target.files[0];

    // Vérification du type
    if (!file.type.startsWith('image/')) {
      this.toastrService.error(
        'Veuillez sélectionner une image.'
      );

      event.target.value = '';
      return;
    }

    // Vérification de la taille : 2 Mo maximum
    if (file.size > 2 * 1024 * 1024) {
      this.toastrService.error(
        'Le logo ne doit pas dépasser 2 Mo.'
      );

      event.target.value = '';
      return;
    }

    this.stgFile = file;

    // Aperçu immédiat
    const reader = new FileReader();

    reader.onload = () => {
      this.logoURL = reader.result;
    };

    reader.readAsDataURL(file);

    // Envoi au serveur
    const formData = new FormData();

    formData.append('logo', file);

    this.parametreService
      .updateLogo(formData)
      .subscribe({

        next: (data: any) => {

          // Mise à jour du setting
          this.setting = data;

          // Mise à jour du localStorage
          localStorage.setItem(
            'setting',
            this.userService.encrypt(
              JSON.stringify(data)
            )
          );

          this.toastrService.success(
            'Logo changé avec succès !'
          );
        },

        error: err => {

          this.toastrService.error(
            err?.error?.message ||
            'Erreur lors du changement du logo.'
          );
        }

      });
  }

  getModels(): void {

    this.parametreService
      .getModels()
      .subscribe(data => {

        this.listModels = data as any[];
      });
  }

  Update_model(id: number): void {

    this.parametreService
      .onUpdate_model(id)
      .subscribe({

        next: () => {
          this.getModels();
        },

        error: err => {

          console.log(
            err?.error?.message
          );
        }
      });
  }

  onDetail(img: any): void {

    this.template = img;

    $('#updateModal').modal('toggle');
  }

  onSelect(): void {
    $('#file').click();
  }

  /**
   * Enregistrement des paramètres.
   */
  onUpdate(): void {

    if (this.formUpdate.invalid) {
      this.formUpdate.markAllAsTouched();
      return;
    }

    this.parametreService
      .updateData(this.formUpdate.value)
      .subscribe({

        next: (data: any) => {

          localStorage.removeItem('setting');

          localStorage.setItem(
            'setting',
            this.userService.encrypt(
              JSON.stringify(data.data)
            )
          );

          this.setting = data.data;

          this.maintenance =
            data.data.maintenance;

          // ✅ Resynchronise le formulaire avec la valeur
          // réellement persistée côté serveur
          this.formUpdate.patchValue({
            emprunt_produit_active:
              data.data.emprunt_produit_active ?? false
          });

          this.toastrService.success(
            data.message
          );
        },

        error: err => {

          this.toastrService.error(
            err?.error?.message ||
            'Erreur lors de la mise à jour.'
          );
        }
      });
  }

  getYear(date: Date): string | null {

    return this.datePipe.transform(
      date,
      'yyyy'
    );
  }
}