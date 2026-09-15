<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inventaire extends Model
{
    
    use HasFactory,SoftDeletes;

    protected $fillable = [
        'numero',
        'name',
        'site',
        'status',
        'credit',
        'dette',
        'acquisition',
        'benefice',
        'auteur',
        'finaliser_par'
    ];

    protected $dates = ['date','deleted_at']; // pour faciliter les manipulations avec Carbon

    public function lignes()
    {
        return $this->hasMany(LigneInventaire::class);
    }
}

// Routes inventaires that require authentication (using JWT)
Route::prefix('inventaire')->group(function () {
    Route::get('/', [InventaireController::class, 'inventaires']);
    Route::post('/', [InventaireController::class, 'store']);
    Route::get('{id}', [InventaireController::class, 'inventaire']);
    Route::put('{id}', [InventaireController::class, 'update']);
    Route::put('/terminer/{id}', [InventaireController::class, 'terminer']);
    Route::delete('{id}', [InventaireController::class, 'destroy']);
});

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Inventaire;
use App\Models\Produit;
use App\Models\Entrepot1;
use App\Models\LigneInventaire;
use Helper;
use Carbon\Carbon;

class InventaireController extends Controller
{
    public function maxId(){
        $maxId = Helper::max_inventaire();

        return response()->json(['maxId' => $maxId],200);
    }
    
    public function store(Request $request)
    {
        $last_inv = Inventaire::orderBy('id', 'desc')->first();

        if($last_inv){
            $yearFact = strtok($last_inv->numero, 'INV');
            $yearNow = date('y', strtotime(Carbon::now()));

            if($yearNow != $yearFact){
                Helper::reset_max_inventaire();
            }
        }
        
        $inventaire = new Inventaire();
        
        $maxId = Helper::max_inventaire();
        $year = date('y', strtotime(Carbon::now()));
        $month = date('m', strtotime(Carbon::now()));
        $numero = $year.'INV'.$month.$maxId;
        
        $exist = Inventaire::where('numero', $numero)->exists();
        
        if($exist){
            $maxId += 1;
            $numero = $year.'INV'.$month.$maxId;
        }
        
        $inventaire->numero = $numero;
        $inventaire->name = $request->name;
        $inventaire->site = $request->site;
        $inventaire->auteur = $request->auteur;
        $inventaire->save();
        
        Helper::set_max_inventaire();
    
        return response()->json([
            'message' => 'Inventaire effectué avec succès.',
            'inventaire' => $inventaire
        ], 200);
    }
    
    public function update(Request $request, $id)
    {
        // Trouver l'inventaire ou retourner une erreur 404 si l'inventaire n'est pas trouvé
        $inventaire = Inventaire::findOrFail($id);
        
        // Mettre à jour les champs de base
        $inventaire->update([
            'name' => $request->name,
            'site' => $request->site,
            'auteur' => $request->auteur,
        ]);
    
        // Si des lignes d'inventaire sont fournies, on les met à jour
        if ($request->has('ligneInventaire') && is_array($request->ligneInventaire)) {
            
            // Supprimer les anciennes lignes d'inventaire avant d'ajouter les nouvelles
            LigneInventaire::where('inventaire_id', $inventaire->id)->delete();
    
            foreach ($request->ligneInventaire as $ligne) {
                // Créer la ligne d'inventaire si le produit existe
                LigneInventaire::create([
                    'inventaire_id' => $inventaire->id,
                    'code' => $ligne['code'],
                    'designation' => $ligne['designation'],
                    'qty' => $ligne['qty'],
                    'prix_achat' => $ligne['prix_achat'],
                    'total' => $ligne['total'],
                    'total_reel' => $ligne['total_reel'],
                    'stock_physique' => $ligne['stock_physique'],
                    'ecart' => $ligne['ecart'],
                    'remarque' => $ligne['remarque'] ?? 'pas de remarque',
                    'auteur' => $inventaire->auteur,
                ]);
            }
            $inventaire->credit = $request->credit;
            $inventaire->dette = $request->dette;
            $inventaire->acquisition = $request->acquisition;
            $inventaire->benefice = $request->benefice;
            $inventaire->status = 'En cours';
            $inventaire->update();
        }
    
        // Réponse conditionnelle en fonction du site
        if ($inventaire->site == "Magasin") {
            // Récupérer les produits classés par désignation
            $produits = Produit::orderBy('designation')->get();
            // Récupérer toutes les familles distinctes de produits
            $familles = Produit::distinct()->pluck('famille');
    
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $produits,
                'familles' => $familles
            ], 200);
        } else {
            // Récupérer les entrepôts avec les produits et familles
            $entrepots = Entrepot1::select('entrepot1s.*', 'produits.*', 'entrepot1s.id')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->get();
            
            // Récupérer les familles distinctes des produits associés aux entrepôts
            $familles = Entrepot1::select('produits.famille')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->distinct()
                ->pluck('famille');
    
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $entrepots,
                'familles' => $familles
            ], 200);
        }
    }

    public function terminer(Request $request, $id)
    {
        // Trouver l'inventaire ou retourner une erreur 404 si l'inventaire n'est pas trouvé
        $inventaire = Inventaire::with('lignes')->find($id);
        
        // Mettre à jour les champs de base
        $inventaire->update([
            'finaliser_par' => $request->auteur,
        ]);
    
        if ($inventaire->site == "Magasin") {
            // Si des lignes d'inventaire sont fournies, on les met à jour
            if ($inventaire->lignes) {
                foreach ($inventaire->lignes as $ligne) {
                    $produits = Produit::where('code',$ligne->code)->first();
                    // ajuster la quantité
                    $produits->qty = $ligne->stock_physique;
                    $produits->update();
                }
                $inventaire->status = 'Terminer';
                $inventaire->update();
            }
        } else {
            // Si des lignes d'inventaire sont fournies, on les met à jour
            if ($inventaire->lignes) {
                foreach ($inventaire->lignes as $ligne) {
                    $produit = Produit::where('code',$ligne->code)->first();
                    $depot = Entrepot1::where('id_produit',$produit->id)->first();
                    // ajuster la quantité
                    $depot->stock = $ligne->stock_physique;
                    $depot->update();
                }
                $inventaire->status = 'Terminer';
                $inventaire->update();
            }
        }
    
        // Réponse conditionnelle en fonction du site
        if ($inventaire->site == "Magasin") {
            // Récupérer les produits classés par désignation
            $produits = Produit::orderBy('designation')->get();
            // Récupérer toutes les familles distinctes de produits
            $familles = Produit::distinct()->pluck('famille');
    
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $produits,
                'familles' => $familles
            ], 200);
        } else {
            // Récupérer les entrepôts avec les produits et familles
            $entrepots = Entrepot1::select('entrepot1s.*', 'produits.*', 'entrepot1s.id')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->get();
            
            // Récupérer les familles distinctes des produits associés aux entrepôts
            $familles = Entrepot1::select('produits.famille')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->distinct()
                ->pluck('famille');
    
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $entrepots,
                'familles' => $familles
            ], 200);
        }
    }
    
    public function inventaires(){
        
        $inventaires = Inventaire::with('lignes')->latest('created_at')->get();
        
        return response()->json($inventaires, 200);
    }
    
    public function inventaire($id){
        // Retrieve the inventory with its related lines (lignes)
        $inventaire = Inventaire::with('lignes')->find($id);
        
        // If the inventaire is not found, return a 404 response
        if (!$inventaire) {
            return response()->json(['error' => 'Inventaire not found'], 404);
        }
    
        // If the site is "Magasin", fetch the produits
        if ($inventaire->site == "Magasin") {
            $produits = Produit::orderBy('designation')->get();
            
            // Get the distinct families from the produits
            $familles = Produit::distinct()->pluck('famille');
            
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $produits,
                'familles' => $familles
            ], 200);
        } else {
            // Otherwise, fetch entrepots with the related produits using a join
            /*$entrepots = Entrepot1::select('entrepot1s.*', 'produits.*', 'entrepot1s.id')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->get();*/
                
            $entrepots = Entrepot1::join(
                'produits',
                'entrepot1s.id_produit',
                '=',
                'produits.id'
            )
            ->select(
                'entrepot1s.*',
                'produits.designation',
                'produits.prix_achat',
                'produits.famille',
                'produits.code'
            )
            ->get();
                
            $familles = Entrepot1::select('produits.famille')
                ->join('produits', 'entrepot1s.id_produit', '=', 'produits.id')
                ->distinct()
                ->pluck('famille');
    
            return response()->json([
                'inventaire' => $inventaire,
                'produits' => $entrepots,
                'familles' => $familles
            ], 200);
        }
    }
}

Angular :

import { registerLocaleData } from '@angular/common';
import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Produit } from 'src/app/models/produit';
import { InventaireService } from 'src/app/services/inventaire.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UserService } from 'src/app/services/user.service';
import localeFr from '@angular/common/locales/fr';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ParametreService } from 'src/app/services/parametre.service';
declare const bootstrap: any;

registerLocaleData(localeFr, 'fr')

@Component({
  selector: 'app-inventaires',
  templateUrl: './inventaires.component.html',
  styleUrls: ['./inventaires.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'fr' }]
})
export class InventairesComponent implements OnInit {

  page: number = 1;
  nbrProduit: number = 0;
  defaultItem: number = 50;
  currentPage: number = 1; // Page actuelle
  nbrPage: number = 0;

  inventaires!: Produit[];

  form!: FormGroup;
  formUpdate!: FormGroup;

  inventaireUpdate: any = {
    id: '',
    name: '',
    site: '',
    auteur: ''
  };

  searchSelect = '';
  selectedFournisseur: any = null;
  showDropdown = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  settingPayment: any;
  hostname: any;
  reference: any;

  constructor(public inventaireService: InventaireService, public userService: UserService,
    public toastrService: ToastrService, public router: Router,
    public parametreService: ParametreService,
    public localStorageService: LocalStorageService,) { }
  get f() { return this.form.controls; }
  get fUp() { return this.formUpdate.controls; }

  ngOnInit(): void {
    // Initialiser le formulaire
    this.initForm();
    this.getInventaires();
    this.initFormUpdate();
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }
    this.checkpaiement();
  }

  checkpaiement() {
    this.parametreService.getSettingIconeStock().subscribe(data => {
      let resp: any = data;
      const settingPaymentList = resp.payments;
      const hostname = window.location.hostname;
      if (!hostname.startsWith('www.')) {
        this.hostname = `www.${hostname}`;
      } else {
        this.hostname = hostname;
      }
      const settingPayment = settingPaymentList.filter((item: any) => item.client === this.hostname && item.module === 'inventaire');
      this.settingPayment = settingPayment[0];
      if (this.settingPayment?.check == 0) {
        this.reference = this.settingPayment?.reference;
        const openModal = document.getElementById('modalPayInventaireProduct') as HTMLElement;
        const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
        modalInstance.show();
      }
    });
  }

  essaie() {
    this.parametreService.getEssaieIconeStock(this.reference).subscribe(data => {
      let resp: any = data;
      const openModal = document.getElementById('modalPayInventaireProduct') as HTMLElement;
      const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
      modalInstance.hide();
    });
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }


  //init form created data
  initForm() {
    this.form = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      site: new FormControl('', Validators.required),
      auteur: new FormControl(this.userService.name)
    });
  }

  //init form created data
  initFormUpdate() {
    this.formUpdate = new FormGroup({
      id: new FormControl('', Validators.required),
      name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      site: new FormControl('', Validators.required),
      auteur: new FormControl(this.userService.name)
    });
  }

  edit(inventaire: any) {
    this.inventaireUpdate = { ...inventaire };
    this.formUpdate.patchValue({
      id: this.inventaireUpdate.id,
      name: this.inventaireUpdate.name,
      site: this.inventaireUpdate.site,
    });
    const openModal = document.getElementById('modal-update-inventaire') as HTMLElement;
    const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
    modalInstance.show();
  }

  detail(inventaire: any) {
    if (this.userService.checkPermissionExistence(this.firstRoleName + ' faire inventaire Stock')) {
      this.inventaireService.getInventaire(inventaire.id).subscribe(res => {
        let data: any = res;
        localStorage.removeItem('detailInventaire')
        localStorage.setItem('detailInventaire', JSON.stringify(data.inventaire));
        localStorage.removeItem('listeProduitInventaire')
        localStorage.setItem('listeProduitInventaire', JSON.stringify(data.produits));
        localStorage.removeItem('listeFamillesInventaire')
        localStorage.setItem('listeFamillesInventaire', JSON.stringify(data.familles));
        localStorage.removeItem('produitsInventaire')
        this.router.navigate(['/detail-inventaires']);
      });
    } else {
      this.toastrService.error("Vous n'avez pas l'authorisation d'acces !");
    }
  }

  onSubmit() {
    this.inventaireService.create(this.form.value).subscribe(res => {
      this.getInventaires();
      this.form.reset();
      const openModal = document.getElementById('modal-new-inventaire') as HTMLElement;
      const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
      modalInstance.hide();
      this.toastrService.success('Inventaire Créé avec succès !');
    });
  }


  onUpdate() {
    this.inventaireService.update(this.formUpdate.value, this.formUpdate.value.id).subscribe(res => {
      this.getInventaires();
      const openModal = document.getElementById('modal-update-inventaire') as HTMLElement;
      const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
      modalInstance.hide();
      this.toastrService.success('Inventaire modifié avec succès !');
    });
  }


  //Get All product
  getInventaires() {
    this.inventaireService.getInventaires().subscribe(res => {
      this.inventaires = res;
      //this.nbrProduit = this.inventaires.length;
      //this.nbrPage = Math.ceil(this.nbrProduit / this.defaultItem);
    });
  }



  onItemsPerPageChange(): void {
    this.currentPage = 1; // Réinitialiser à la première page après modification
  }
}

<div class="row row-deck row-cards">

    <app-menu-stock></app-menu-stock>

    <!--Liste des Produit-->
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Liste des inventaires</h3>
                <!-- Afficher par quantité -->
                <select class="form-select w-auto mx-2" [(ngModel)]="defaultItem" (change)="onItemsPerPageChange()">
                    <option value="50" selected disabled>Afficher par 50</option>
                    <option [value]="50">50</option>
                    <option [value]="100">100</option>
                    <option [value]="150">150</option>
                    <option [value]="200">200</option>
                    <option [value]="nbrProduit">Tous</option>
                </select>
            </div>
            <div class="table-responsive">
                <table class="table card-table table-vcenter text-nowrap datatable">
                    <thead>
                        <tr>
                            <th class="w-1">N°</th>
                            <th>Nom du site</th>
                            <th>Inventaire</th>
                            <th>Date Création</th>
                            <th>Dernière modification</th>
                            <th>Status</th>
                            <th>Auteur</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            *ngFor="let inventaire of inventaires | paginate: { itemsPerPage: defaultItem, currentPage: page, totalItems: nbrProduit }">
                            <td><span class="text-muted">{{inventaire.numero}}</span></td>
                            <td>
                                <a class="text-dark" (click)="detail(inventaire)" data-bs-toggle="offcanvas"
                                    href="#detailOffcanvasStart" role="button" aria-controls="detailOffcanvasStart">
                                    {{inventaire.site}}
                                </a>
                            </td>
                            <td>{{inventaire.name}}</td>
                            <td>{{inventaire.created_at | date: 'EEEE d MMMM y à HH:mm'}}</td>
                            <td>{{inventaire.updated_at | date: 'EEEE d MMMM y à HH:mm'}}</td>
                            <td [ngClass]="{
                                    'text-secondary': inventaire.status === 'Brouillon',
                                    'text-warning': inventaire.status === 'En cours',
                                    'text-success': inventaire.status === 'Terminer'
                                    }">
                                {{ inventaire.status }}
                            </td>

                            <td>{{inventaire.auteur}}</td>
                            <td>
                                <div class="btn-list flex-nowrap">
                                    <a *ngIf="userService.checkPermissionExistence(firstRoleName+ ' faire inventaire Stock')"
                                        class="btn btn-sm btn-primary" (click)="detail(inventaire)"
                                        href="javascript:void(0)">
                                        <i class="fa fa-eye"></i>
                                    </a>
                                    <a *ngIf="userService.checkPermissionExistence(firstRoleName+ ' modifier inventaire Stock')"
                                        class="btn btn-sm btn-warning" (click)="edit(inventaire)"
                                        href="javascript:void(0)"
                                        [hidden]="inventaire.status == 'Terminer' || inventaire.status == 'En cours'">
                                        <i class="fa fa-edit"></i>
                                    </a>
                                    <a *ngIf="userService.checkPermissionExistence(firstRoleName+ ' supprimer inventaire Stock')"
                                        class="btn btn-sm btn-danger" (click)="delete(inventaire)"
                                        href="javascript:void(0)" data-bs-toggle="modal"
                                        data-bs-target="#modal-delete-inventaire">
                                        <i class="fa fa-trash"></i>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card-footer d-flex align-items-center" style="height: 40px;">
                <p class="m-0 text-muted">Affichage
                    <span *ngIf="page == 1">{{defaultItem}}</span>
                    <span *ngIf="page != 1 && page != nbrPage">{{defaultItem * page}}</span>
                    <span *ngIf="page != 1 && page == nbrPage">{{nbrProduit}}</span>
                    sur <span>{{nbrProduit}}</span> Produits
                </p>
                <ul class="pagination m-0 ms-auto mt-3">
                    <pagination-controls (pageChange)="page = $event" previousLabel="Précédent" nextLabel="Suivant">
                    </pagination-controls>
                </ul>
            </div>

        </div>
    </div>
</div>

<!-- Modal New Product -->
<div class="modal modal-blur" id="modal-new-inventaire" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Ajouter un produit</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form [formGroup]="form" (ngSubmit)="onSubmit()" autocomplete="off" novalidate>
                    <div class="mb-2">
                        <label class="form-label">Nom de l'inventaire <span class="text-danger mx-1">*</span></label>
                        <input type="text" class="form-control" placeholder="Nom de l'inventaire" formControlName="name"
                            id="name">
                        <div *ngIf="f['name'].touched && f['name'].invalid" class="alert alert-danger">
                            <div *ngIf="f['name'].errors && f['name'].errors['required']">Donner un nom à l'inventaire.
                            </div>
                            <div *ngIf="f['name'].errors && f['name'].errors['minlength']">
                                Le nom de l'inventaire doit être composé d’au minimum deux caractères.
                            </div>
                        </div>
                    </div>

                    <div class="mb-2">
                        <label class="form-label" for="site">Stock à inventer <span
                                class="text-danger mx-1">*</span></label>
                        <select name="site" id="site" formControlName="site" class="form-select">
                            <option value="">Sélectionner un site</option>
                            <option value="Magasin">Magasin</option>
                            <option value="Dépot">Dépot</option>
                        </select>
                        <div *ngIf="f['site'].touched && f['site'].invalid" class="alert alert-danger">
                            <div *ngIf="f['site'].errors && f['site'].errors['required']">
                                Veuillez sélectionner un site !
                            </div>
                        </div>
                    </div>

                    <div class="mb-2">
                        <button type="button" class="btn btn-danger" style="float: left;"
                            data-bs-dismiss="modal">Annuler</button>
                        <button type="submit" class="btn btn-success" style="float: right;" [disabled]="form.invalid">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Modal New Product -->
<div class="modal modal-blur" id="modal-update-inventaire" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Modification un produit</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form [formGroup]="formUpdate" (ngSubmit)="onUpdate()" autocomplete="off" novalidate>
                    <div class="mb-2">
                        <label class="form-label">Nom de l'inventaire <span class="text-danger mx-1">*</span></label>
                        <input type="text" class="form-control" placeholder="Nom de l'inventaire" formControlName="name"
                            id="name">
                        <div *ngIf="fUp['name'].touched && fUp['name'].invalid" class="alert alert-danger">
                            <div *ngIf="fUp['name'].errors && fUp['name'].errors['required']">Donner un nom à
                                l'inventaire.
                            </div>
                            <div *ngIf="fUp['name'].errors && fUp['name'].errors['minlength']">
                                Le nom de l'inventaire doit être composé d’au minimum deux caractères.
                            </div>
                        </div>
                    </div>

                    <div class="mb-2">
                        <label class="form-label" for="site">Stock à inventer <span
                                class="text-danger mx-1">*</span></label>
                        <select name="site" id="site" formControlName="site" class="form-select">
                            <option value="Magasin">Magasin</option>
                            <option value="Dépot">Dépot</option>
                        </select>
                    </div>

                    <div class="mb-2">
                        <button type="button" class="btn btn-danger" style="float: left;"
                            data-bs-dismiss="modal">Annuler</button>
                        <button type="submit" class="btn btn-success" style="float: right;"
                            [disabled]="formUpdate.invalid">
                            Modification
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Modal Alert Paiement -->
<div class="modal modal-blur" id="modalPayInventaireProduct" data-bs-backdrop="static" data-bs-keyboard="false"
    tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-md modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Nouvelle Fonctionnalité</h5>
                <a type="button" class="btn-close" routerLink="/produit" data-bs-dismiss="modal" aria-label="Close"></a>
            </div>
            <div class="modal-body">
                <p class="text-center"><span class="h3">** Nouvelle fonctionnalité iconeStock : Inventaire Produit !
                        **</span> <br /></p>

                <p> Avec la toute nouvelle fonctionnalité de iconeStock, Maîtrisez votre stock en temps réel, réduisez
                    vos coûts et ne perdez plus jamais une vente à cause d’une rupture. Voici un aperçu de quelques
                    principaux avantages :</p>

                <ul>
                    <li>📈 Gestion en temps réel des stocks :</li>
                    <p>Obtenez un résumé précis de l'état de votre stock, incluant la quantité disponible et la quantité
                        en alerte. Vous aurez une vue claire sur la gestion de votre
                        inventaire à tout
                        moment.</p>
                    <li>🔄 Automatisation des ajustements :</li>
                    <p>Accés à un interface configuré en cas d'inventaire. Vous pourrez ainsi
                        ajuster la quantité en stock apres décompte.
                    </p>
                    <li>📦 Inventaire sur un produit :</li>
                    <p>Cette fonctionnalité vous permet de faire un inventaire sur un produit donné !
                    </p>
                    <li>📦 Inventaire global :</li>
                    <p>Cette fonctionnalité vous permet de faire un inventaire sur une catégorie de produit spécifique
                        ou sur un ensemble de produit distincts !
                    </p>
                </ul>
                <p class="text-center"><span class="h4">**Pourquoi activer cette fonctionnalité ?**</span> <br /></p>
                <p>Débloquer cette fonctionnalité premium vous permet de suivre vos produits de manière ultra-précise,
                    d'éviter
                    les erreurs d'inventaire et de maximiser vos profits. Vous aurez une gestion optimisée de vos stocks
                </p> <br />

                <div class="text-center">** Débloquez dès aujourd’hui cette fonctionnalité premium pour simplifier la
                    gestion
                    de vos produits et
                    booster
                    vos performances ! **</div>
            </div>
            <div class="d-flex justify-content-center">
                <a *ngIf="settingPayment?.essaie > 0" (click)="essaie()" class="btn btn-primary mb-3 mx-2">Nombre
                    d'essaie
                    {{settingPayment?.essaie}}</a>

                <a href="https://iconestock.com/wave/{{settingPayment?.wave}}/{{reference}}/{{hostname}}"
                    target="_blank" class="btn btn-success mb-3">Payer à
                    {{settingPayment?.wave}} F CFA</a>
            </div>

        </div>
    </div>
</div>


import { registerLocaleData } from '@angular/common';
import { Component, LOCALE_ID, OnInit } from '@angular/core';
import localeFr from '@angular/common/locales/fr';
import { Router } from '@angular/router';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { PaymentService } from 'src/app/services/payment.service';
import { ParametreService } from 'src/app/services/parametre.service';
registerLocaleData(localeFr, 'fr')
declare const bootstrap: any;

@Component({
  selector: 'app-inventaire',
  templateUrl: './inventaire.component.html',
  styleUrls: ['./inventaire.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'fr' }]
})


export class InventaireComponent implements OnInit {

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  produit: any;
  settingPayment: any;
  hostname: any;
  reference: any;

  mouvementsOriginal: any[] = [];
  mouvementsFiltres: any[] = [];
  dateDebut: string = '';
  dateFin: string = '';

  statutFiltre: string = '';
  sourceFiltre: string = '';
  destinationFiltre: string = '';

  motCle: string = '';
  typeFiltre: string = '';

  constructor(public produitService: ProduitService, public router: Router,
    public userService: UserService, public paymentService: PaymentService,
    public parametreService: ParametreService,) { }

  ngOnInit() {
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }
    if (localStorage.getItem('produitInventaire') != null) {
      this.produit = JSON.parse(localStorage.getItem('produitInventaire')!);
      this.mouvementsOriginal = this.produit.mouvements;
      this.mouvementsFiltres = [...this.mouvementsOriginal];
    } else {
      this.router.navigate(['/produit'])
    }

    this.checkpaiement();
  }

  checkpaiement() {
    this.parametreService.getSettingIconeStock().subscribe(data => {
      let resp: any = data;
      const settingPaymentList = resp.payments;
      const hostname = window.location.hostname;
      if (!hostname.startsWith('www.')) {
        this.hostname = `www.${hostname}`;
      } else {
        this.hostname = hostname;
      }
      const settingPayment = settingPaymentList.filter((item: any) => item.client === this.hostname && item.module === 'détail produit');
      this.settingPayment = settingPayment[0];
      if (this.settingPayment?.check == 0) {
        this.reference = this.settingPayment?.reference;
        const openModal = document.getElementById('modalPayDetailProduct') as HTMLElement;
        const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
        modalInstance.show();
      }
    });
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  essaie() {
    this.parametreService.getEssaieIconeStock(this.reference).subscribe(data => {
      let resp: any = data;
      const openModal = document.getElementById('modalPayDetailProduct') as HTMLElement;
      const modalInstance = bootstrap.Modal.getInstance(openModal) || new bootstrap.Modal(openModal);
      modalInstance.hide();
    });
  }

  get totalTothtAchat(): number {
    return this.produit?.achat?.reduce((sum: number, a: any) => sum + (a.totht || 0), 0) || 0;
  }

  get totalTothtVente(): number {
    return this.produit?.vente?.reduce((sum: number, a: any) => sum + (a.totht || 0), 0) || 0;
  }

  getStockStatus(qty: number, qtyAlert: number): { label: string, class: string, icon: string } {
    if (qty === 0) {
      return { label: 'Terminé', class: 'bg-danger', icon: 'fa-times-circle' };
    } else if (qty <= qtyAlert) {
      return { label: 'Presque terminé', class: 'bg-warning text-dark', icon: 'fa-exclamation-triangle' };
    } else {
      return { label: 'En stock', class: 'bg-success', icon: 'fa-check-circle' };
    }
  }

  get totalEntreesFiltrees(): number {
    return this.mouvementsFiltres
      .filter(m => m.nature === 'ENTREE')
      .reduce((s, m) => s + Number(m.qty), 0);
  }

  get totalSortiesFiltrees(): number {
    return this.mouvementsFiltres
      .filter(m => m.nature === 'SORTIE')
      .reduce((s, m) => s + Number(m.qty), 0);
  }

  filtrerMouvements() {
    const debut = this.dateDebut
      ? this.convertDate(this.dateDebut)
      : '';

    const fin = this.dateFin
      ? this.convertDate(this.dateFin)
      : '';

    this.mouvementsFiltres = this.mouvementsOriginal.filter(m => {

      const dateMvt = this.convertDate(m.created_at);

      const okDateDebut =
        !debut || dateMvt >= debut;

      const okDateFin =
        !fin || dateMvt <= fin;


      const okStatut =
        !this.statutFiltre ||
        m.statut === this.statutFiltre;


      const source =
        m.type?.split('=>')[0]?.trim() || '';

      const destination =
        m.type?.split('=>')[1]?.trim() || '';


      const okSource =
        !this.sourceFiltre ||
        source === this.sourceFiltre;


      const okDestination =
        !this.destinationFiltre ||
        destination === this.destinationFiltre;


      const okRecherche =
        !this.motCle ||
        JSON.stringify(m)
          .toLowerCase()
          .includes(this.motCle.toLowerCase());

      const okType =
        !this.typeFiltre ||
        m.nature === this.typeFiltre;


      return (
        okDateDebut &&
        okDateFin &&
        okStatut &&
        okSource &&
        okDestination &&
        okType &&
        okRecherche
      );
    });
  }

  convertDate(date: any): string {

    if (!date) return '';

    const d = new Date(date);

    return [
      d.getFullYear(),
      ('0' + (d.getMonth() + 1)).slice(-2),
      ('0' + d.getDate()).slice(-2)
    ].join('-');
  }

  resetFiltre() {
    this.dateDebut = '';
    this.dateFin = '';
    this.statutFiltre = '';
    this.sourceFiltre = '';
    this.destinationFiltre = '';
    this.motCle = '';

    this.mouvementsFiltres = [...this.mouvementsOriginal];
  }

}


<div class="container-fluid">
    <app-menu-stock></app-menu-stock>
    <div class="card-header bg-white py-1 h2 mb-3"><span class="mx-1">Détail Produit
            {{produit.produit?.designation}}</span>
    </div>
    <div class="card">
        <div class="card-header">
            <ul class="nav nav-tabs card-header-tabs" data-bs-toggle="tabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <a href="#info" class="nav-link active" data-bs-toggle="tab" aria-selected="true"
                        role="tab">Information Générale</a>
                </li>
                <li class="nav-item" role="presentation">
                    <a href="#achat" class="nav-link" data-bs-toggle="tab" aria-selected="false" role="tab"
                        tabindex="-1">Achat</a>
                </li>
                <li class="nav-item" role="presentation">
                    <a href="#vente" class="nav-link" data-bs-toggle="tab" aria-selected="false" role="tab"
                        tabindex="-1">Vente</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#transfert">
                        Mouvements magasins
                    </a>
                </li>
            </ul>
        </div>


        <div class="card-body">
            <div class="tab-content">
                <div class="tab-pane active show" id="info" role="tabpanel">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card p-3 mb-3">
                                <h5 class="card-title badge bg-secondary mb-3 ">📦 Article
                                    {{produit.produit?.designation}}</h5>
                                <div class="mb-3"><strong>Prix de vente</strong> : {{produit.produit?.prix | number:
                                    '1.0-0'}}</div>
                                <div class="mb-3"><strong>Prix d'achat</strong> : {{produit.produit?.prix_achat |
                                    number: '1.0-0'}}</div>
                                <div class="mb-3"><strong>Catégorie d'article</strong> : {{produit.produit?.famille}}
                                </div>
                                <div class="mb-3"><strong>Référence</strong> : {{produit.produit?.ref}}</div>
                                <div class="mb-3"><strong>Code artcile</strong> : {{produit.produit?.code}}</div>
                                <div class="mb-3"><strong>Code barres</strong> : {{produit.produit?.code_barre}}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card p-3 mb-3">
                                <h5 class="card-title badge bg-secondary mb-3">📦 Stock</h5>

                                <div class="d-flex flex-column gap-2">
                                    <div>
                                        <div><span class="text-muted">Quantité actuellement en stock : </span>
                                            <strong>{{produit.produit?.qty}}</strong>
                                        </div>
                                    </div>
                                    <div>
                                        <span class="text-muted">Statut : </span>
                                        <span class="badge me-1"
                                            [ngClass]="getStockStatus(produit.produit?.qty, produit.produit?.qtyAlert).class">
                                            <i class="fa"
                                                [ngClass]="getStockStatus(produit.produit?.qty, produit.produit?.qtyAlert).icon + ' me-1'"></i>
                                            {{ getStockStatus(produit.produit?.qty, produit.produit?.qtyAlert).label
                                            }}
                                        </span>
                                    </div>
                                    <div><span class="text-muted">Quantité en transit : </span>
                                        <strong>{{produit.transite}}</strong>
                                    </div>
                                    <div><span class="text-muted">Dernier approvisionnement : </span>
                                        <strong>({{produit.lastAchat?.qty}}) </strong>
                                        <strong>{{ produit.lastAchat?.updated_at | date:'EEEE d MMMM y à HH:mm'
                                            }}</strong>
                                    </div>
                                    <div><span class="text-muted">Quantité totale stockée depuis l'achat : </span>
                                        <strong>{{produit.totalStock}}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card p-3 mb-3" style="width: 100%; height: 100%;">
                                <h5 class="card-title badge bg-secondary mb-3">📦 Comptablité</h5>
                                <as-split direction="horizontal">
                                    <as-split-area [size]="30">
                                        <div class="mb-3"><span class="text-muted">Prix d'achat : </span>
                                            <strong>{{produit.produit?.prix_achat | number: '1.0-0' }}</strong>
                                        </div>
                                        <div class="mb-3"><span class="text-muted">Prix en détail : </span>
                                            <strong>{{produit.produit?.prix | number: '1.0-0'}}</strong>
                                        </div>
                                        <div class="mb-3"><span class="text-muted">Prix en gros : </span>
                                            <strong>{{produit.produit?.prix_gros | number: '1.0-0'}}</strong>
                                        </div>
                                        <div class="mb-3"><span class="text-muted">Prix en douzaine : </span>
                                            <strong>{{produit.produit?.prix_douzaine | number: '1.0-0'}}</strong>
                                        </div>
                                        <div class="mb-3"><span class="text-muted">Prix en carton : </span>
                                            <strong>{{produit.produit?.prix_carton | number: '1.0-0'}}</strong>
                                        </div>
                                    </as-split-area>
                                    <as-split-area [size]="70">
                                        <div class="mx-2">
                                            <div class="mb-3"><span class="text-muted">Prix total d'achat : </span>
                                                <strong>{{produit.totalAchat | number: '1.0-0'}}</strong>
                                            </div>
                                            <div class="mb-3"><span class="text-muted">Prix total vente : </span>
                                                <strong>{{produit.totalVente | number: '1.0-0'}}</strong>
                                            </div>
                                            <div class="mb-3"><span class="text-muted">Total frais : </span>
                                                <strong>{{produit.totalFrais | number: '1.0-0' }}</strong>
                                            </div>

                                            <div class="mb-3"><span class="text-muted">Total bénéfice : </span>
                                                <strong>{{produit.totalBenefice | number: '1.0-0'}}</strong>
                                            </div>
                                        </div>
                                    </as-split-area>
                                </as-split>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="tab-pane" id="achat" role="tabpanel">
                    <h4>Liste des achats {{produit.produit?.designation}}</h4>
                    <div class="table-responsive">
                        <table class="table table-vcenter card-table table-striped">
                            <thead>
                                <tr>
                                    <th>N° Achat</th>
                                    <th>Produit</th>
                                    <th>Quantité</th>
                                    <th>Prix</th>
                                    <th>Frais</th>
                                    <th>Sous total</th>
                                    <th>Date</th>
                                    <th>Fournisseur</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr [hidden]="produit.achat.length != 0">
                                    <td class="font-italic text-center" colspan="8">
                                        <marquee behavior="alternate" direction="" class="h3 text-warning">Pas de
                                            données...</marquee>
                                    </td>
                                </tr>
                                <tr [hidden]="produit.achat.length == 0" *ngFor="let achat of produit.achat">
                                    <td>{{achat.achat?.numero}}</td>
                                    <td>{{ achat.designation }}</td>
                                    <td>{{ achat.qty }}</td>
                                    <td>{{ achat.prix_achat }}</td>
                                    <td>{{ achat.frais }}</td>
                                    <td>{{ achat.totht }}</td>
                                    <td>{{ achat.updated_at | date:'EEEE d MMMM y à HH:mm' }}</td>
                                    <td>{{ achat.nom_fn }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="tab-pane" id="vente" role="tabpanel">
                    <h4>Liste des ventes {{produit.produit?.designation}}</h4>
                    <div class="table-responsive">
                        <table class="table table-vcenter card-table table-striped">
                            <thead>
                                <tr>
                                    <th>N° Vente</th>
                                    <th>Produit</th>
                                    <th>Quantité</th>
                                    <th>Prix</th>
                                    <th>Bénéfice</th>
                                    <th>Sous total</th>
                                    <th>Date</th>
                                    <th>Client</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr [hidden]="produit.vente.length != 0">
                                    <td class="font-italic text-center" colspan="8">
                                        <marquee behavior="alternate" direction="" class="h3 text-warning">Pas de
                                            données...</marquee>
                                    </td>
                                </tr>
                                <tr [hidden]="produit.vente.length == 0" *ngFor="let vente of produit.vente">
                                    <td>{{vente.commande?.numero}}</td>
                                    <td>{{ vente.produit }}</td>
                                    <td>{{ vente.qty }}</td>
                                    <td>{{ vente.prix }}</td>
                                    <td>{{ vente.benefice }}</td>
                                    <td>{{ vente.totht }}</td>
                                    <td>{{ vente.updated_at | date:'EEEE d MMMM y à HH:mm' }}</td>
                                    <td>{{ vente.commande?.nom_client }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="tab-pane" id="transfert" role="tabpanel">
                    <h4>Mouvements entre magasins</h4>

                    <div class="row mb-3">
                        <div class="col-md-3">
                            <label>Date début</label>
                            <input type="date" class="form-control" [(ngModel)]="dateDebut">
                        </div>


                        <div class="col-md-3">
                            <label>Date fin</label>
                            <input type="date" class="form-control" [(ngModel)]="dateFin"
                                (change)="filtrerMouvements()">
                        </div>

                        <!--div class="col-md-2">
                            <label>&nbsp;</label>
                            <button class="btn btn-primary d-block w-100" (click)="filtrerMouvements()">
                                Filtrer
                            </button>
                        </div-->
                        <div class="col-md-2">
                            <label>&nbsp;</label>
                            <button class="btn btn-secondary d-block w-100" (click)="resetFiltre()">
                                Réinitialiser
                            </button>
                        </div>

                        <div class="col-md-2">
                            <label>Recherche</label>
                            <input class="form-control" [(ngModel)]="motCle" (input)="filtrerMouvements()"
                                placeholder="N°, responsable...">
                        </div>
                        <div class="col-md-2">
                            <label>Type</label>
                            <select class="form-control" [(ngModel)]="typeFiltre" (change)="filtrerMouvements()">
                                <option value="">Tous</option>
                                <option value="ENTREE">Entrée</option>
                                <option value="SORTIE">Sortie</option>
                            </select>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-striped">

                            <thead>

                                <tr>
                                    <th>N°</th>
                                    <th>Mouvement</th>
                                    <th>Type</th>
                                    <th>Stock avant</th>
                                    <th>Qté mouv.</th>
                                    <th>Stock après</th>
                                    <th>Date</th>
                                    <th>Utilisateur</th>
                                </tr>

                            </thead>


                            <tbody>

                                <tr *ngFor="let mouvement of mouvementsFiltres">


                                    <td>
                                        {{ mouvement.numero }}
                                    </td>


                                    <td>
                                        {{ mouvement.libelle }}
                                    </td>



                                    <td>

                                        <span class="badge bg-primary" *ngIf="mouvement.nature=='ENTREE'">

                                            Entrée

                                        </span>


                                        <span class="badge bg-danger" *ngIf="mouvement.nature=='SORTIE'">

                                            Sortie

                                        </span>


                                    </td>
                                    <td>
                                        <span *ngIf="mouvement.nature=='ENTREE'">
                                            {{ mouvement.stock - mouvement.qty }}
                                        </span>

                                        <span *ngIf="mouvement.nature=='SORTIE'">
                                            {{ mouvement.stock + mouvement.qty }}
                                        </span>
                                    </td>

                                    <td>{{ mouvement.qty }}</td>

                                    <td>
                                        {{ mouvement.stock }}
                                    </td>

                                    <td>
                                        {{ mouvement.created_at | date:'dd/MM/yyyy HH:mm' }}
                                    </td>

                                    <td>
                                        {{ mouvement.responsable }}
                                    </td>


                                </tr>


                            </tbody>

                        </table>
                    </div>
                    <div class="row mb-3 pt-3">
                        <div class="col-md-4">
                            <div class="alert alert-primary">
                                Entrées : {{ totalEntreesFiltrees }}
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="alert alert-danger">
                                Sorties : {{ totalSortiesFiltrees }}
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="alert alert-warning">
                                En transit : {{ produit.transite }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Alert Paiement -->
<div class="modal modal-blur" id="modalPayDetailProduct" data-bs-backdrop="static" data-bs-keyboard="false"
    tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-md modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Nouvelle Fonctionnalité</h5>
                <a type="button" class="btn-close" routerLink="/produit" data-bs-dismiss="modal" aria-label="Close"></a>
            </div>
            <div class="modal-body">
                <p class="text-center"><span class="h3">** Nouvelle fonctionnalité iconeStock : Gestion complète et
                        détaillée de
                        vos produits
                        ! **</span> <br /></p>

                <p> Avec la toute nouvelle fonctionnalité de iconeStock, vous obtenez une **vision complète et
                    détaillée** de
                    chaque produit de votre inventaire, de l'achat à la vente, en passant par la gestion du stock et la
                    comptabilité. Voici un aperçu des trois principaux avantages :</p>
                <ul>
                    <li>1. ** Détail complet du produit ** :</li>
                    <p>Obtenez un résumé précis de l'état de votre stock, incluant la quantité disponible, la quantité
                        en transit
                        et la dernière date d'approvisionnement. Vous aurez une vue claire sur la gestion de votre
                        inventaire à tout
                        moment.</p>
                    <li>2. ** Suivi des achats et des ventes ** :</li>
                    <p>Accédez à un historique détaillé des achats et des ventes de chaque produit. Vous pourrez ainsi
                        suivre
                        l'évolution des transactions, de la quantité achetée à la quantité vendue, ainsi que les
                        montants associés.
                    </p>
                    <li>3. ** Comptabilité transparente ** :</li>
                    <p>La fonctionnalité vous permet de suivre le coût d'achat, le prix de vente, les bénéfices
                        réalisés, et la
                        rentabilité de chaque produit. Ce suivi vous aide à prendre des décisions éclairées pour
                        optimiser vos
                        marges.
                    </p>
                </ul>
                <p class="text-center"><span class="h4">**Pourquoi activer cette fonctionnalité ?**</span> <br /></p>
                <p>Débloquer cette fonctionnalité premium vous permet de suivre vos produits de manière ultra-précise,
                    d'éviter
                    les erreurs d'inventaire et de maximiser vos profits. Vous aurez une gestion optimisée des stocks,
                    des achats,
                    des ventes et de la comptabilité, le tout en un seul endroit.</p> <br />

                <div class="text-center">** Débloquez dès aujourd’hui cette fonctionnalité premium pour simplifier la
                    gestion
                    de vos produits et
                    booster
                    vos performances ! **</div>
            </div>

            <div class="d-flex justify-content-center">
                <a *ngIf="settingPayment?.essaie > 0" (click)="essaie()" class="btn btn-primary mb-3 mx-2">Nombre
                    d'essaie
                    {{settingPayment?.essaie}}</a>
                <a href="https://iconestock.com/wave/{{settingPayment?.wave}}/{{reference}}/{{hostname}}"
                    target="_blank" class="btn btn-success mb-3">Payer à
                    {{settingPayment?.wave}} F CFA</a>
            </div>

        </div>
    </div>
</div>

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventaireService } from 'src/app/services/inventaire.service';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ToastrService } from 'ngx-toastr';

declare var $: any;
declare var bootstrap: any; // important si tu utilises Bootstrap JS via CDN ou installé via npm
registerLocaleData(localeFr, 'fr')
@Component({
  selector: 'app-detail-inventaires',
  templateUrl: './detail-inventaires.component.html',
  styleUrls: ['./detail-inventaires.component.scss'],
})
export class DetailInventairesComponent implements OnInit {
  inventaire: any;
  produits: any;
  listeFamilles: any;
  produitsInventaire: any[] = [];

  ligneInventaire: any[] = [];

  isDisable: boolean = false;
  isClick: boolean = false;

  isDisableTerminer: boolean = false;
  isClickTerminer: boolean = false;

  searchSelect = '';
  selectedProduit: any = null;
  showDropdown = false;

  isAllChecked: boolean = false;

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  montantPerte: number = 0;
  montantSurplus: number = 0;

  constructor(public router: Router, public userService: UserService,
    public toastrService: ToastrService, public inventaireService: InventaireService,
    public produitService: ProduitService) { }

  ngOnInit(): void {
    this.refreshRoleAndPermissonsUser();
    // Vérifier si les rôles existent dans l'utilisateur
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
      // Extraire le nom du premier rôle
      this.firstRoleName = this.userService.user.roles[0].name;
    }
    const detailInventaire = localStorage.getItem('detailInventaire');
    if (detailInventaire) {
      this.inventaire = JSON.parse(detailInventaire);
      if (localStorage.getItem('produitsInventaire') != null) {
        this.produitsInventaire = JSON.parse(localStorage.getItem('produitsInventaire')!);
      } else {
        this.produitsInventaire = this.inventaire.lignes;
      };
      if (localStorage.getItem('isAllChecked') != null) {
        this.isAllChecked = localStorage.getItem('isAllChecked') === 'true';
      };
    } else {
      this.router.navigate(['/inventaires']);
    }

    if (localStorage.getItem('listeProduitInventaire') != null) {
      this.produits = JSON.parse(localStorage.getItem('listeProduitInventaire')!);
      console.log(this.produits);
    };

    if (localStorage.getItem('listeFamillesInventaire') != null) {
      // Récupère les données depuis localStorage, ou un tableau vide si aucune donnée
      this.listeFamilles = JSON.parse(localStorage.getItem('listeFamillesInventaire') || '[]');
    };

    this.calculeTotalReel();
    this.calculerMontantPerteSurplus();   // <-- ajouté
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      let resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }


  get filtre() {
    return this.produits.filter((produit: any) =>
      produit.designation.toLowerCase().includes(this.searchSelect.toLowerCase())
    );
  }


  selectProduit(produit: any) {
    // Vérifier si le produit est déjà dans l'inventaire
    const produitExiste = this.produitsInventaire.some(p => p.code === produit.code);

    if (produitExiste) {
      this.toastrService.warning('Ce produit est déjà pris !');
      return;
    }
    produit.checked = false;

    this.isAllChecked = false;
    localStorage.removeItem('isAllChecked');
    this.selectedProduit = produit;
    this.searchSelect = '';
    this.showDropdown = false; // Fermer le dropdown après la sélection

    // Ajouter le produit à l'inventaire

    if (this.inventaire.site == 'Dépot') {
      produit.qty = produit.stock;
    }

    produit.stock_physique = 0;
    produit.ecart = 0;
    produit.total = produit.qty * produit.prix_achat;
    produit.total_reel = produit.stock_physique * produit.prix_achat;
    this.produitsInventaire.push(produit);

    // Mettre à jour le localStorage
    localStorage.removeItem('produitsInventaire');
    localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
    this.calculeTotalReel();
    this.calculerMontantPerteSurplus();   // <-- ajouté
  }


  // Fonction pour gérer le changement de famille sélectionnée
  selectFamille(event: any): void {
    this.isAllChecked = false;
    localStorage.removeItem('isAllChecked');
    const familleSelectionnee = event.target.value;
    if (familleSelectionnee == null) {
      localStorage.removeItem('produitsInventaire');
      this.produitsInventaire = [];
      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();
    } else {
      localStorage.removeItem('produitsInventaire');
      this.produitsInventaire = [];

      // Filtrer les produits qui appartiennent à la famille sélectionnée
      const produitsSelectionnes = this.produits
        .filter((produit: any) => produit.famille === familleSelectionnee);

      // Mettre à jour ou initialiser les propriétés "stock_physique" et "ecart" pour chaque produit
      produitsSelectionnes.forEach((produit: any) => {
        produit.checked = false;
        if (this.inventaire.site == 'Dépot') {
          produit.qty = produit.stock;
        }
        produit.stock_physique = 0; // Initialiser la quantité saisie à 0
        produit.ecart = 0; // Initialiser l'écart à 0
        produit.total = produit.qty * produit.prix_achat;
        produit.total_reel = produit.stock_physique * produit.prix_achat;
      });

      // Ajouter les nouveaux produits à l'inventaire
      this.produitsInventaire = [...this.produitsInventaire, ...produitsSelectionnes];

      localStorage.removeItem('produitsInventaire');
      localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();   // <-- ajouté
    }

  }

  selectAllProduit(event: any) {
    if (event.target.checked) {
      this.isAllChecked = true;
      localStorage.setItem('isAllChecked', this.isAllChecked.toString());
      localStorage.removeItem('produitsInventaire');
      this.produitsInventaire = [];

      // Trier : les produits commençant par "Sicap" en premier
      this.produits.sort((a: any, b: any) => {
        const aSicap = a.designation?.toLowerCase().startsWith('sicap') ? 0 : 1;
        const bSicap = b.designation?.toLowerCase().startsWith('sicap') ? 0 : 1;

        if (aSicap !== bSicap) {
          return aSicap - bSicap;
        }

        // Ensuite trier alphabétiquement
        return a.designation.localeCompare(b.designation);
      });

      // Mettre à jour ou initialiser les propriétés
      this.produits.forEach((produit: any) => {
        produit.checked = false;
        if (this.inventaire.site == 'Dépot') {
          produit.qty = produit.stock;
        }

        produit.stock_physique = 0;
        produit.ecart = 0;
        produit.total = produit.qty * produit.prix_achat;
        produit.total_reel = produit.stock_physique * produit.prix_achat;
      });

      this.produitsInventaire = [...this.produitsInventaire, ...this.produits];

      localStorage.setItem(
        'produitsInventaire',
        JSON.stringify(this.produitsInventaire)
      );

      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();   // <-- ajouté
    } else {
      this.isAllChecked = false;
      localStorage.removeItem('isAllChecked');
      localStorage.removeItem('produitsInventaire');
      this.produitsInventaire = [];
      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();   // <-- ajouté
    }
  }

  calculerQuantiteDifferent(produit: any) {

    const stockPhysique = Number(produit.stock_physique);

    if (stockPhysique > 0) {

      produit.ecart = stockPhysique - produit.qty;
      produit.total_reel = stockPhysique * produit.prix_achat;
      produit.checked = true;

    } else {

      produit.ecart = 0;
      produit.total_reel = 0;
      produit.checked = false;

    }

    localStorage.removeItem('produitsInventaire');
    localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));

    this.calculeTotalReel();
    this.calculerMontantPerteSurplus();
  }



  // fonction pour calculer la quantité différente
  calculerQuantiteDifferentOld(produit: any) {
    if (produit.stock_physique && produit.stock_physique > 0) {
      produit.ecart = produit.stock_physique - produit.qty;
      produit.total_reel = produit.stock_physique * produit.prix_achat;
      localStorage.removeItem('produitsInventaire')
      localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
      // La ligne a été comptée
      produit.checked = true;
      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();   // <-- ajouté
    } else {
      produit.ecart = 0;
      produit.total_reel = 0;
      produit.checked = false;
      localStorage.removeItem('produitsInventaire')
      localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
    }
    this.calculerMontantPerteSurplus();
  }

  calculeTotalReel() {
    this.inventaire.total = this.produitsInventaire.reduce((sum, produit) => sum + (produit.total || 0), 0);
    this.inventaire.acquisition = this.produitsInventaire.reduce((sum, produit) => sum + (produit.total_reel || 0), 0);
    this.inventaire.benefice = this.inventaire.acquisition - (this.inventaire.credit - this.inventaire.dette);
  }


  // fonction pour calculer la quantité différente
  keyRemarque() {
    localStorage.removeItem('produitsInventaire')
    localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
  }


  // Méthode pour supprimer un produit
  remove(produit: any): void {
    const index = this.produitsInventaire.indexOf(produit);
    if (index > -1) {
      this.produitsInventaire.splice(index, 1);
      localStorage.removeItem('produitsInventaire')
      localStorage.setItem('produitsInventaire', JSON.stringify(this.produitsInventaire));
      this.calculeTotalReel();
      this.calculerMontantPerteSurplus();   // <-- ajouté
    }
  }

  onSubmit() {
    this.isDisable = true;
    this.isClick = true;
    const payload = {
      inventaire_id: this.inventaire.id,
      name: this.inventaire.name,
      site: this.inventaire.site,
      credit: this.inventaire.credit,
      dette: this.inventaire.dette,
      acquisition: this.inventaire.acquisition,
      benefice: this.inventaire.benefice,
      ligneInventaire: this.produitsInventaire,
      auteur: this.userService.name,
    };
    this.inventaireService.update(payload, this.inventaire.id).subscribe(data => {
      let resp: any = data;
      localStorage.removeItem('detailInventaire');
      this.inventaire = resp.inventaire;
      localStorage.setItem('detailInventaire', JSON.stringify(this.inventaire));
      this.isDisable = false;
      this.isClick = false;
      this.toastrService.success('Inventaire mis à jour avec succès !');
    });
  }

  onTerminer() {
    this.isDisableTerminer = true;
    this.isClickTerminer = true;
    this.isDisable = true;
    this.isClick = true;
    const payload = {
      inventaire_id: this.inventaire.id,
      auteur: this.userService.name,
    };
    this.inventaireService.terminer(payload, this.inventaire.id).subscribe(data => {
      let resp: any = data;
      localStorage.removeItem('detailInventaire');
      this.inventaire = resp.inventaire;
      localStorage.setItem('detailInventaire', JSON.stringify(this.inventaire));
      this.isDisableTerminer = false;
      this.isClickTerminer = false;
      this.toastrService.success('Inventaire Terminer avec succès !');
    });
  }

  calculerMontantPerteSurplus() {

    this.montantPerte = 0;
    this.montantSurplus = 0;

    this.produitsInventaire.forEach((produit: any) => {

      const ecart = Number(produit.ecart) || 0;
      const prix = Number(produit.prix_achat) || 0;

      if (ecart < 0) {
        this.montantPerte += Math.abs(ecart) * prix;
      }

      if (ecart > 0) {
        this.montantSurplus += ecart * prix;
      }

    });

  }

  get bilanInventaire(): number {
    return this.montantSurplus - this.montantPerte;
  }


} 


<div class="cards">
    <app-menu-stock></app-menu-stock>

    <div class="card mb-2">
        <div class="card-header">
            <h5 class="card-title">Détails de l'inventaire</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md border-3">
                    <p class="fw-bold"> <span class="text-muted">Nom de l'inventaire <br> </span> {{inventaire.name}}
                    </p>
                    <p class="fw-bold"> <span class="text-muted">Stock à inventer <br> </span> {{inventaire.site}}</p>
                    <p class="fw-bold"> <span class="text-muted">Auteur <br> </span> {{inventaire.auteur }}</p>
                </div>
                <div class="col-md border-start border-3 ">
                    <p class="fw-bold"> <span class="text-muted">Date de création <br> </span> {{inventaire.created_at |
                        date: 'EEEE d MMMM y à HH:mm'}}</p>
                    <p class="fw-bold"> <span class="text-muted">Dernière modification <br> </span>
                        {{inventaire.updated_at
                        | date: 'EEEE d MMMM y à HH:mm'}}</p>

                    <p class="fw-bold"> <span class="text-muted">Status actual de l'inventaire : </span>
                        <span [ngClass]="{
                                    'text-secondary': inventaire.status === 'Brouillon',
                                    'text-warning': inventaire.status === 'En cours',
                                    'text-success': inventaire.status === 'Terminer'
                                    }">
                            {{ inventaire.status }}
                        </span>
                    </p>
                </div>
                <div class="col-md-8 border-start  border-3 ">
                    <p class="fw-bold"> Finaliser l'inventaire</p>
                    <div class="row">
                        <div class="col-md mb-1">
                            <div class="input-group">
                                <span class="input-group-text" id="basic-addon1">Coût d'acquisition</span>
                                <input type="text" [ngModel]="inventaire.acquisition"
                                    (ngModelChange)="inventaire.acquisition = $event"
                                    [value]="inventaire.acquisition | number:'1.0-0'" readonly class="form-control"
                                    placeholder="Coût d'acquisition" aria-label="Username"
                                    aria-describedby="basic-addon1">
                            </div>
                        </div>
                        <div class="col-md mb-1">
                            <div class="input-group">
                                <span class="input-group-text" id="basic-addon1">Crédit</span>
                                <input type="number" [(ngModel)]="inventaire.credit"
                                    [disabled]="inventaire.status == 'Terminer'" (ngModelChange)="calculeTotalReel()"
                                    class="form-control" placeholder="les crédits" aria-label="Username"
                                    aria-describedby="basic-addon1">
                            </div>
                        </div>

                        <div class="col-md mb-1">
                            <div class="input-group">
                                <span class="input-group-text" id="basic-addon1">Dette</span>
                                <input type="number" [(ngModel)]="inventaire.dette"
                                    [disabled]="inventaire.status == 'Terminer'" (ngModelChange)="calculeTotalReel()"
                                    class="form-control" placeholder="les dette" aria-label="Username"
                                    aria-describedby="basic-addon1">
                            </div>
                        </div>

                        <div class="col-md mb-1">
                            <div class="input-group">
                                <span class="input-group-text" id="basic-addon1">Rapport</span>
                                <input type="text" [ngModel]="inventaire.benefice"
                                    (ngModelChange)="inventaire.benefice = $event"
                                    [value]="inventaire.benefice | number: '1.0-0'" readonly class="form-control"
                                    placeholder="bénéfice ou perte" aria-label="rapport"
                                    aria-describedby="basic-addon1">

                            </div>
                        </div>

                        <div class="col-md-12 text-center" [hidden]="inventaire.status == 'Brouillon' ">
                            <div class="text-warning mb-2">
                                <small>
                                    Une fois l'inventaire marqué comme terminé, les quantités seront ajustées et il ne
                                    sera
                                    plus
                                    possible d'apporter de modifications. En d'autres termes, l'état final de
                                    l'inventaire
                                    sera
                                    figé et les ajustements effectués seront considérés comme définitifs.
                                </small>
                            </div>

                            <button
                                *ngIf="userService.checkPermissionExistence(firstRoleName + ' status inventaire Stock')"
                                [disabled]="isDisableTerminer" class="btn btn-success" (click)="onTerminer()"
                                [hidden]="inventaire.status == 'Terminer'" type="button">
                                <span *ngIf="!isDisableTerminer && !isClickTerminer">Terminer</span>
                                <span *ngIf="isDisableTerminer && isClickTerminer"
                                    class="spinner-border spinner-border-sm mx-1"></span>
                                <span *ngIf="isDisableTerminer && isClickTerminer">Chargement...</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header" [hidden]="inventaire.status == 'Terminer'">
            <div class="mx-3 w-50">
                <label for="basic-url" style="font-weight: 600;" class="form-label">Inventaire par produit
                    ({{produitsInventaire.length}})</label>
                <div class="input-group">
                    <div class="seach-produits">
                        <div class="form-select selected" (click)="showDropdown = !showDropdown">
                            <ng-container *ngIf="selectedProduit; else placeholder">
                                <span>{{ selectedProduit.designation }}</span>
                            </ng-container>
                            <ng-template #placeholder>
                                <span>Sélectionner un produit...</span>
                            </ng-template>
                        </div>

                        <div class="form-select showlists" *ngIf="showDropdown">
                            <input type="text" [(ngModel)]="searchSelect" placeholder="Rechercher..." />

                            <div class="showlists-item" *ngFor="let product of filtre"
                                (click)="selectProduit(product); showDropdown = false">
                                <span>{{ product.designation }}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="mx-3 w-25">
                <label for="basic-url" style="font-weight: 600;" class="form-label">Inventaire par catégorie</label>
                <select name="" id="" class="form-select" (change)="selectFamille($event)">
                    <option value="">Sélectionner un catégorie...</option>
                    <option *ngFor="let famille of listeFamilles" [value]="famille">{{famille}}</option>
                </select>
            </div>

            <div class="mx-3 w-25">
                <label for="basic-url" style="font-weight: 600;" class="form-label">Inventaire pour tous les
                    produits</label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="flexCheckDefault"
                        (change)="selectAllProduit($event)" [checked]="isAllChecked">
                    <label class="form-check-label" for="flexCheckDefault">
                        Tous les produits
                    </label>
                </div>
            </div>

            <div class="w-25">
                <label for="basic-url" style="font-weight: 600;" class="form-label">Enregistrer l'inventaire</label>
                <button [disabled]="isDisable || produitsInventaire.length === 0" class="btn btn-success form-control"
                    (click)="onSubmit()" type="button">
                    <span *ngIf="!isDisable && !isClick">Sauvegarder </span>
                    <span *ngIf="isDisable && isClick" class="spinner-border spinner-border-sm mx-1"></span>
                    <span *ngIf="isDisable && isClick">Chargement...</span>
                </button>
            </div>
        </div>

        <div class="card-body">
            <div class="table-scroll-container table-responsive">
                <table class="table table-vcenter card-table">
                    <thead class="sticky-top">
                        <tr>
                            <th>Produit</th>
                            <th>Quantité théorique</th>
                            <th>Prix</th>
                            <th>S.Total</th>
                            <th>Quantité comptée</th>
                            <th>Quantité différente</th>
                            <th>S.Total(réel)</th>
                            <th>Remarques</th>
                            <th [hidden]="inventaire.status == 'Terminer' || inventaire.status == 'Terminer'">Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- commentaire si produitsInventaire est vide -->
                        <tr *ngIf="produitsInventaire.length === 0">
                            <td colspan="7" class="text-center">
                                <marquee behavior="alternate" direction="">Aucun produit trouvé</marquee>
                            </td>
                        </tr>

                        <tr *ngFor="let produit of produitsInventaire" [ngClass]="{
      'table-success': produit.checked
    }">
                            <td>
                                <a class="text-dark" (click)="detail(produit)" data-bs-toggle="offcanvas"
                                    href="#detailOffcanvasStart" role="button" aria-controls="detailOffcanvasStart">
                                    {{produit.designation || produit.produit}}
                                </a>
                            </td>

                            <td>{{produit.qty}}</td>

                            <td>{{produit.prix_achat ?? 0 | number: '1.0-0'}}</td>

                            <td>
                                <input style="border: none;" disabled [value]="produit.total | number: '1.0-0' ">
                            </td>

                            <td>
                                <input [disabled]="inventaire.status == 'Terminer' || inventaire.status == 'Terminer'"
                                    type="number" [(ngModel)]="produit.stock_physique"
                                    (ngModelChange)="calculerQuantiteDifferent(produit)">
                            </td>

                            <td>
                                <span class="text-danger">
                                    <input style="border: none;font-weight: 600;font-size:larger;  " disabled
                                        [value]="produit.ecart > 0 ? ' + ' + produit.ecart : produit.ecart" type="text"
                                        name="" id="" [ngClass]="{
                                        'text-danger': produit.ecart < 0, 
                                        'text-success': produit.stock_physique === produit.qty,
                                        'text-warning': produit.ecart > 0
                                        }">
                                </span>

                            </td>

                            <td>
                                <input style="border: none;" disabled [value]="produit.total_reel | number: '1.0-0'">
                            </td>

                            <td>
                                <textarea
                                    [disabled]="inventaire.status == 'Terminer' || inventaire.status == 'Terminer'"
                                    (keyup)="keyRemarque()" name="" id="1" [(ngModel)]="produit.remarque"></textarea>
                            </td>

                            <td [hidden]="inventaire.status == 'Terminer' || inventaire.status == 'Terminer'">
                                <div class="btn-list flex-nowrap">
                                    <a class="btn btn-sm btn-danger" (click)="remove(produit)"
                                        href="javascript:void(0)">
                                        <i class="fa fa-trash"></i>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="row mt-3">

                <div class="col-md-4 mb-2">
                    <div class="alert alert-danger mb-0 d-flex justify-content-between align-items-center">
                        <strong>Total des pertes</strong>
                        <span>{{ montantPerte | number:'1.0-0' }} FCFA</span>
                    </div>
                </div>

                <div class="col-md-4 mb-2">
                    <div class="alert alert-success mb-0 d-flex justify-content-between align-items-center">
                        <strong>Total des surplus</strong>
                        <span>{{ montantSurplus | number:'1.0-0' }} FCFA</span>
                    </div>
                </div>

                <div class="col-md-4 mb-2">
                    <div class="alert mb-0 d-flex justify-content-between align-items-center" [ngClass]="{
                'alert-success': bilanInventaire > 0,
                'alert-danger': bilanInventaire < 0,
                'alert-secondary': bilanInventaire === 0
            }">
                        <strong>Bilan</strong>
                        <span>{{ bilanInventaire | number:'1.0-0' }} FCFA</span>
                    </div>
                </div>

            </div>
        </div>
    </div>