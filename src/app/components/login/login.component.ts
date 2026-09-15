import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ParametreService } from 'src/app/services/parametre.service';
import { PaymentService } from 'src/app/services/payment.service';
import { TokenService } from 'src/app/services/token.service';
import { UserService } from 'src/app/services/user.service';
declare var $: any;
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  environment = environment;

  user: any = {};
  settingIconeStock: any;
  showPassword = false;
  errorMessage = false;
  errorAccess = false;
  isClick = false;
  isLoad = false;
  loginForm: any;

  paymentLoaded = false;

  constructor(private router: Router, public userService: UserService, public datePipe: DatePipe,
    public tokenService: TokenService, public fb: FormBuilder,
    public paymentService: PaymentService, public parametreService: ParametreService) { }

  ngOnInit() {
    this.isClick = true;
    this.isLoad = false;
    this.getPayment();

    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    this.getSettingIconeStock();
  }

  getSettingIconeStock() {
    this.parametreService.getSettingIconeStock().subscribe(data => {
      let resp: any = data;
      localStorage.setItem('settingIconeStock', this.userService.encrypt(JSON.stringify(resp.setting)));
    });

    const settingIconeStock: any = localStorage.getItem('settingIconeStock');
    this.settingIconeStock = JSON.parse(this.userService.decrypt(settingIconeStock));
  }

  getPayment() {
    this.paymentService.getPayment().subscribe({
      next: (data) => {
        const response: any = data;

        this.paymentService.actif = response.actif;
        this.paymentService.joursRestants = response.jours_restants;
        this.paymentService.alerte = response.alerte;

        this.paymentService.dateExpiration =
          this.datePipe.transform(
            response.date_expiration,
            'dd/MM/yyyy à HH:mm:ss'
          );

        this.paymentService.credit = response.credit;

        // Très important :
        // on autorise l'affichage des alertes uniquement
        // après avoir reçu la réponse du serveur.
        this.paymentLoaded = true;
      },

      error: (error) => {
        console.error('Erreur récupération abonnement :', error);

        // Évite de considérer automatiquement le client
        // comme étant expiré en cas d'erreur réseau.
        this.paymentLoaded = true;
      }
    });
  }

  login(loginForm: { value: { username: string; password: string; }; }) {
    this.errorMessage = false; this.errorAccess = false; this.isClick = false; this.isLoad = true;
    this.userService.login(loginForm.value.username, loginForm.value.password)
      .subscribe(data => {
        if (data) {
          this.user = data;
          if (this.user.data.user.blocked == 1) {
            this.errorAccess = true;
            this.isClick = true;
            this.isLoad = false;
          } else {
            localStorage.setItem('user', this.userService.encrypt(JSON.stringify(this.user.data.user)));
            localStorage.setItem('allPermissions', this.userService.encrypt(JSON.stringify(this.user.data.allPermissions)));
            const token = this.user.data.token;

            this.tokenService.saveToken(token);

            localStorage.setItem(
              'token',
              'Bearer ' + token
            );

            localStorage.setItem(
              'user',
              this.userService.encrypt(
                JSON.stringify(this.user.data.user)
              )
            );

            localStorage.setItem(
              'allPermissions',
              this.userService.encrypt(
                JSON.stringify(this.user.data.allPermissions)
              )
            );

            this.userService.isloggedIn = true;

            this.userService.getUserLoggin();

            this.router.navigate(['/accueil']).then(() => {
              window.location.reload();
            });

          }
        } else {
          this.errorMessage = true;
          this.isClick = true;
          this.isLoad = false;
        }
      });
  }

  showHidePwd() {
    this.showPassword = !this.showPassword;
  }

  /* administrateur() {
    // Remplir les champs avec les informations de l'administrateur
    this.loginForm.get('username')?.setValue('administrateur');
    this.loginForm.get('password')?.setValue('1234');  // Change le mot de passe si nécessaire
    this.isClick = false;
  }

  vendeur() {
    // Remplir les champs avec les informations du vendeur
    this.loginForm.get('username')?.setValue('vendeur');
    this.loginForm.get('password')?.setValue('1234');  // Change le mot de passe si nécessaire
    this.isClick = false;
  }

  caissier() {
    // Remplir les champs avec les informations du caissier
    this.loginForm.get('username')?.setValue('caissier');
    this.loginForm.get('password')?.setValue('1234');  // Change le mot de passe si nécessaire
    this.isClick = false;
  }

  gestionnaire() {
    // Remplir les champs avec les informations du gestionnaire
    this.loginForm.get('username')?.setValue('gestionnaire');
    this.loginForm.get('password')?.setValue('1234');  // Change le mot de passe si nécessaire
    this.isClick = false;
  } */
}

