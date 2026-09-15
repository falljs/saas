import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DatePipe } from '@angular/common';
import { RemboursementService } from 'src/app/services/remboursement.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-remboursement',
  templateUrl: './remboursement.component.html',
  styleUrls: ['./remboursement.component.scss']
})
export class RemboursementComponent implements OnInit {

  @ViewChild('designationInputProduit') designationInputProduit!: ElementRef;

  keyEnter: any = 13;
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.keyCode === this.keyEnter) {
      if (this.produit == null && this.montant == null) {
        // rien
      } else {
        this.save();
      }
    }
  }

  produit: any = null;
  montant: any = 0;
  date_remboursement: any = null;
  nom_client: any = null;

  montantTotal_remboursement = 0;
  listRemboursements: any[] = [];

  id_remboursement!: number;

  firstRoleName: string | null = null;

  constructor(
    public remboursementService: RemboursementService,
    public userService: UserService,
    public toastrService: ToastrService,
    public datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.remboursementToday();
    this.refreshRoleAndPermissonsUser();
    if (this.userService.user.roles && this.userService.user.roles.length > 0) {
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

  valide(id: any) {
    this.remboursementService.valide({ id: id, etat: 'valide' }).subscribe(() => {
      this.remboursementToday();
    });
  }

  invalide(id: any) {
    this.remboursementService.invalide({ id: id, etat: 'invalide' }).subscribe(() => {
      this.remboursementToday();
    });
  }

  remboursements() {
    this.remboursementService.getRemboursements().subscribe(data => {
      var response: any = data;
      this.listRemboursements = response.remboursements;
      this.montantTotal_remboursement = response.total;
    });
  }

  remboursementToday() {
    this.remboursementService.getRemboursementsToday().subscribe(data => {
      var response: any = data;
      this.listRemboursements = response.remboursements;
      this.montantTotal_remboursement = response.total;
    });
  }

  OnChangeDate(ctrl: any) {
    let date = this.datePipe.transform(ctrl.value, 'dd-MM-yyyy');
    this.remboursementService.getRemboursementsByDate(date).subscribe(data => {
      var response: any = data;
      this.listRemboursements = response.remboursements;
      this.montantTotal_remboursement = response.total;
    });
  }

  openModalDelete(id: number) {
    this.id_remboursement = id;
  }

  delete() {
    this.remboursementService.deleteData(this.id_remboursement).subscribe({
      next: () => {
        this.remboursementToday();
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }

  save() {
    const data = {
      produit: this.produit,
      montant: this.montant,
      date_remboursement: this.date_remboursement,
      nom_client: this.nom_client,
      auteur: this.userService.name,
    };

    this.remboursementService.createData(data).subscribe({
      next: (response: any) => {
        console.log('Remboursement créé :', response);

        this.produit = null;
        this.montant = 0;
        this.date_remboursement = null;
        this.nom_client = null;

        this.remboursementToday();

        setTimeout(() => {
          this.designationInputProduit?.nativeElement?.focus();
        });
      },

      error: (err) => {
        console.error('Erreur complète :', err);
        console.error('Status :', err.status);
        console.error('Erreur Laravel :', err.error);

        this.toastrService.error(
          err.error?.message || 'Une erreur est survenue lors de la création du remboursement.',
          'Erreur'
        );
      }
    });
  }
}