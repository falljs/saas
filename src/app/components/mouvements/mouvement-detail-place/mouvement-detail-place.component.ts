import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { DatePipe } from '@angular/common';
import { ProduitService } from 'src/app/services/produit.service';
import { CommandeService } from 'src/app/services/commande.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mouvement-detail-place',
  templateUrl: './mouvement-detail-place.component.html',
  styleUrls: ['./mouvement-detail-place.component.scss']
})
export class MouvementDetailPlaceComponent implements OnInit {

  // Disabled btn
  disableBtn: boolean = false;

  mouvement!: any;
  ligneMouvement!: any[];

  firstRoleName: string | null = null; // Contiendra le premier nom de rôle

  constructor(public router: Router, public commandeService: CommandeService,
    public userService: UserService, public produitService: ProduitService,
    private datePipe: DatePipe, public toastrService: ToastrService) { }

  ngOnInit() {
    this.getMouvement();
    this.userService.getUserLoggin();
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

  getMouvement() {
    if (localStorage.getItem('mouvementPlace') != null) {
      this.mouvement = JSON.parse(localStorage.getItem('mouvementPlace')!);
      this.ligneMouvement = JSON.parse(localStorage.getItem('ligneMouvementPlaceDetail')!);
    }
  }

  printMouvenement(mouvement: any) {
    this.commandeService.onPrint().subscribe((data) => {
      window.open(
        `${environment.serverUrl}/print/mouvement/place/numero/${mouvement.numero}`,
        '_blank'
      );
    });
  }

  modifier(commande: any) {
    localStorage.removeItem('mouvementPlace');
    localStorage.removeItem('ligneMouvementPlace');
    localStorage.removeItem('ligneMouvementPlaceDetail');
    localStorage.setItem('mouvementPlace', JSON.stringify(commande));
    localStorage.setItem('ligneMouvementPlace', JSON.stringify(this.ligneMouvement));
    this.router.navigate(['/mouvement-edit-place']);
  }



  deleteMouvement(id: any) {
    if (this.mouvement.type == 'Difoncé => Sicap') {
      this.produitService.deleteMouvementDifonce(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement supprimé !');
        localStorage.removeItem('mouvementPlace');
        localStorage.removeItem('ligneMouvementPlaceDetail');
        this.router.navigate(['/mouvement-list-place']);
      });
    } else {
      this.produitService.deleteMouvementSicap(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement supprimé !');
        localStorage.removeItem('mouvementPlace');
        localStorage.removeItem('ligneMouvementPlaceDetail');
        this.router.navigate(['/mouvement-list-place']);
      });
    }
  }


  annulerMouvement(id: any) {
    if (this.mouvement.type == 'Difoncé => Sicap') {
      this.produitService.cancelMouvementDifonce(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement annulé !');
        localStorage.removeItem('mouvementPlace');
        localStorage.removeItem('ligneMouvementPlaceDetail');
        this.router.navigate(['/mouvement-list-place']);
      });
    } else {
      this.produitService.cancelMouvementSicap(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement annulé !');
        localStorage.removeItem('mouvementPlace');
        localStorage.removeItem('ligneMouvementPlaceDetail');
        this.router.navigate(['/mouvement-list-place']);
      });
    }
  }


}
