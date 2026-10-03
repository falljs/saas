import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ProduitService } from 'src/app/services/produit.service';
import { UserService } from 'src/app/services/user.service';
import { FournisseurService } from 'src/app/services/fournisseur.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

declare var bootstrap: any;

@Component({
  selector: 'app-produit-create-modal',
  templateUrl: './produit-create-modal.component.html',
  styleUrls: ['./produit-create-modal.component.scss']
})
export class ProduitCreateModalComponent {
  form!: FormGroup;
  fournisseurs: any[] = [];
  selectedFournisseur: any = null;
  searchSelect = '';
  showDropdown = false;
  newInputFn = false;
  newFournisseur = '';
  isChecked = false;
  msg_designation: any;

  constructor(
    private produitService: ProduitService,
    private userService: UserService,
    private fournisseurService: FournisseurService,
    private localStorageService: LocalStorageService,
    private toastrService: ToastrService
  ) {
    this.initForm();
  }

  get f() { return this.form.controls; }

  get filteredFournisseur() {
    return this.fournisseurs.filter(fn =>
      fn.name?.toLowerCase().includes(this.searchSelect.toLowerCase()));
  }

  get qtyRestante(): number {
    const qty = Number(this.form.value.qty) || 0;
    const dep = this.isChecked ? (Number(this.form.value.entrepot_1) || 0) : 0;
    return qty - dep;
  }

  initForm() {
    this.form = new FormGroup({
      designation: new FormControl('', [Validators.required, Validators.minLength(2)]),
      qty: new FormControl(0, [Validators.required]),
      qtyAlert: new FormControl(0),
      prix: new FormControl(0, [Validators.required]),
      prix_achat: new FormControl(0, [Validators.required, Validators.min(10)]),
      prix_gros: new FormControl(0),
      prix_carton: new FormControl(0),
      prix_douzaine: new FormControl(0),
      ref: new FormControl(''),
      code_barre: new FormControl(''),
      famille: new FormControl(''),
      marque: new FormControl(''),
      code_fn: new FormControl('Fn_1'),
      description: new FormControl(''),
      entrepot_1: new FormControl(0),
      auteur: new FormControl(this.userService.name)
    });
  }

  /** Appelée depuis le menu */
  open() {
    this.initForm();
    this.isChecked = false;
    this.newInputFn = false;
    this.msg_designation = null;
    this.getFournisseurs();

    const el = document.getElementById('modal-product');
    if (el) bootstrap.Modal.getOrCreateInstance(el).show();
  }

  close() {
    const el = document.getElementById('modal-product');
    if (el) bootstrap.Modal.getOrCreateInstance(el).hide();
  }

  getFournisseurs() {
    this.fournisseurService.getAll().subscribe((res: any[]) => {
      this.fournisseurs = res;
      const neant = res.find(fn => fn.name == 'Néant');
      if (neant) this.selectFournisseur(neant);
    });
  }

  selectFournisseur(fn: any) {
    this.selectedFournisseur = fn;
    this.form.patchValue({ code_fn: fn.code });
    this.searchSelect = '';
    this.showDropdown = false;
  }

  onToggleEntrepot(checked: boolean) {
    this.isChecked = checked;
    if (!checked) this.f['entrepot_1'].setValue(0);
  }

  onDepotChange() {
    const qty = Number(this.form.value.qty) || 0;
    if ((Number(this.form.value.entrepot_1) || 0) > qty) {
      this.toastrService.error('La quantité en dépôt ne doit pas dépasser la quantité en stock !');
      this.f['entrepot_1'].setValue(0);
    }
  }

  onSubmitFournisseur() {
    this.fournisseurService.createData({ name: this.newFournisseur, auteur: this.userService.name })
      .subscribe({
        next: (resp: any) => {
          this.newInputFn = false;
          this.newFournisseur = '';
          this.toastrService.success('Fournisseur ' + resp.data.name + ' Ajouté !');
          this.fournisseurService.getAll().subscribe(r => this.fournisseurs = r);
          this.selectFournisseur(resp.data);
        },
        error: err => console.log(err.error?.message)
      });
  }

  onSubmit() {
    const payload = {
      ...this.form.value,
      auteur: this.userService.name,
      qty: this.qtyRestante
    };

    this.produitService.createProduit(payload).subscribe((produit: any) => {
      if (produit.msg_designation) {
        this.msg_designation = produit.msg_designation;
        return;
      }
      this.localStorageService.clearExecptException();
      this.toastrService.success('Produit ' + produit.designation + ' Ajouté !');
      this.close();
      this.produitService.produitCreated$.next(); // prévient la liste
    });
  }
}