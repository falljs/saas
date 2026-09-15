import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { DatePipe } from '@angular/common';
import { ProduitService } from 'src/app/services/produit.service';
import { CommandeService } from 'src/app/services/commande.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mouvement-detail',
  templateUrl: './mouvement-detail.component.html',
  styleUrls: ['./mouvement-detail.component.scss']
})
export class MouvementDetailComponent implements OnInit {

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
    if (localStorage.getItem('mouvement') != null) {
      this.mouvement = JSON.parse(localStorage.getItem('mouvement')!);
      this.ligneMouvement = JSON.parse(localStorage.getItem('ligneMouvementDetail')!);
    }
  }

  private openPdfInNewTab(
    pdfWindow: Window,
    blob: Blob
  ): void {

    const pdfUrl = URL.createObjectURL(blob);

    pdfWindow.location.href = pdfUrl;

    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  }

  printMouvenement(mouvement: any): void {

    // Ouvre immédiatement l'onglet
    const pdfWindow = window.open('', '_blank');

    if (!pdfWindow) {
      console.error('La fenêtre d’impression a été bloquée.');
      return;
    }

    // Page d'attente temporaire
    pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Génération du mouvement...</title>
      </head>

      <body style="
        margin:0;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        font-family:Arial,sans-serif;
      ">
        <div>
          <p>Génération du document...</p>
        </div>
      </body>
    </html>
  `);

    // Récupération du PDF
    this.commandeService
      .printMouvement(mouvement.numero)
      .subscribe({
        next: (blob: Blob) => {

          this.openPdfInNewTab(
            pdfWindow,
            blob
          );

        },

        error: (error) => {

          console.error(
            'Erreur impression mouvement :',
            error
          );

          pdfWindow.document.body.innerHTML = `
          <div style="
            font-family:Arial;
            text-align:center;
            margin-top:50px;
            color:red;
          ">
            Impossible de générer le document.
          </div>
        `;
        }
      });
  }

  modifier(commande: any) {
    localStorage.removeItem('mouvement');
    localStorage.removeItem('ligneMouvement');
    localStorage.removeItem('ligneMouvementDetail');
    localStorage.setItem('mouvement', JSON.stringify(commande));
    localStorage.setItem('ligneMouvement', JSON.stringify(this.ligneMouvement));
    this.router.navigate(['/mouvement-edit']);
  }



  deleteMouvement(id: any) {
    if (this.mouvement.type == 'Stock => Depôt') {
      this.produitService.deleteMouvementStock(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement supprimé !');
        localStorage.removeItem('mouvement');
        localStorage.removeItem('ligneMouvementDetail');
        this.router.navigate(['/mouvement-list']);
      });
    } else {
      this.produitService.deleteMouvementDepot(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement supprimé !');
        localStorage.removeItem('mouvement');
        localStorage.removeItem('ligneMouvementDetail');
        this.router.navigate(['/mouvement-list']);
      });
    }
  }


  annulerMouvement(id: any) {
    if (this.mouvement.type == 'Stock => Depôt') {
      this.produitService.cancelMouvementStock(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement annulé !');
        localStorage.removeItem('mouvement');
        localStorage.removeItem('ligneMouvementDetail');
        this.router.navigate(['/mouvement-list']);
      });
    } else {
      this.produitService.cancelMouvementDepot(id).subscribe((data: any) => {
        this.toastrService.warning('Mouvement annulé !');
        localStorage.removeItem('mouvement');
        localStorage.removeItem('ligneMouvementDetail');
        this.router.navigate(['/mouvement-list']);
      });
    }
  }


}
