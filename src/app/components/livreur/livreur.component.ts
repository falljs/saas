import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { LivreurService } from 'src/app/services/livreur.service';
import { UserService } from 'src/app/services/user.service';
declare var bootstrap: any;

@Component({
  selector: 'app-livreur',
  templateUrl: './livreur.component.html'
})
export class LivreurComponent implements OnInit {
  livreurs: any[] = [];
  search = '';
  form!: FormGroup;
  editId: number | null = null;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private livreurService: LivreurService,
    private toastr: ToastrService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(l?: any) {
    this.editId = l?.id ?? null;
    this.form = this.fb.group({
      nom: [l?.nom ?? '', Validators.required],
      telephone: [l?.telephone ?? ''],
      adresse: [l?.adresse ?? ''],
      vehicule: [l?.vehicule ?? '']
    });
  }

  get filtered() {
    const s = this.search.toLowerCase();
    return this.livreurs.filter(l =>
      l.nom.toLowerCase().includes(s) || (l.telephone ?? '').includes(s)
    );
  }

  load() {
    this.livreurService.getAll().subscribe(data => this.livreurs = data);
  }

  openModal(l?: any) {
    this.initForm(l);
    new bootstrap.Modal(document.getElementById('modalLivreur')).show();
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;

    const payload = { ...this.form.value, id: this.editId, auteur: this.userService.name };
    const req = this.editId
      ? this.livreurService.update(payload)
      : this.livreurService.create(payload);

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.toastr.success(this.editId ? 'Livreur modifié !' : 'Livreur ajouté !');
        bootstrap.Modal.getInstance(document.getElementById('modalLivreur'))?.hide();
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(err?.error?.message || 'Erreur lors de l\'enregistrement.');
      }
    });
  }

  toggle(l: any) {
    this.livreurService.toggle(l.id).subscribe(() => this.load());
  }

  remove(l: any) {
    Swal.fire({
      title: 'Supprimer ce livreur ?',
      text: l.nom + ' restera affiché sur ses anciennes commandes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed) {
        this.livreurService.delete(l.id).subscribe(() => {
          this.toastr.success('Livreur supprimé !');
          this.load();
        });
      }
    });
  }
}