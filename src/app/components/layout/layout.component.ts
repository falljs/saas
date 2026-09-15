import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { ParametreService } from 'src/app/services/parametre.service';
import { PaymentService } from 'src/app/services/payment.service';
import { TimerService } from 'src/app/services/timer.service';
import { UserService } from 'src/app/services/user.service';
declare var $: any;
declare const bootstrap: any;
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  environment = environment;

  timeSpent: number = 0;
  private interval: any;

  private intervalId: any;
  private elapsedTime: number = 0;

  maintenance: any;
  setting: any;

  pdfUrl!: SafeResourceUrl;

  isUpdatingCredit: boolean = false;

  private creditSessionKey = 'iconestock_credit_consumed';

  constructor(
    private timerService: TimerService,
    public router: Router,
    private route: ActivatedRoute,
    public userService: UserService,
    public paymentService: PaymentService,
    public parametreService: ParametreService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {

    this.route.queryParams.subscribe(params => {

      const payment = params['payment'];

      if (payment === 'success') {

        console.log('Paiement Wave réussi');

        this.getPayment();

      }

      if (payment === 'error') {

        console.log('Paiement Wave échoué');

        this.getPayment();
      }
    });

    this.getPayment();

    this.startTimer();
    this.pastime();
  }

  /*
    private timerService: TimerService,

    timeSpent: number = 0;
    private interval: any;

    private intervalId: any;
    private elapsedTime: number = 0;

    this.startTimer();
    this.pastime();
  */
  pastime() {
    this.timerService.startTimer();
    this.interval = setInterval(() => {
      this.timeSpent = this.timerService.getTime();
    }, 1000);
  }

  startTimer(): void {
    this.intervalId = setInterval(() => {
      this.elapsedTime += 60; // Incrémente le temps passé
      this.saveElapsedTime(this.elapsedTime);
    }, 60000); // 60 secondes
  }

  saveElapsedTime(data: any) {
    const jsonData = {
      domain: 'https://iconestock.com',
      time_spent: data
    };

    this.timerService.store(jsonData).subscribe({
      next: data => {
        //console.log('Données envoyées avec succès', data);
      },
      error: err => {
        console.log(err.error.message);
      }
    });
  }

  ngOnDestroy(): void {

    clearInterval(this.interval);

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getPayment(): void {

    this.paymentService.getPayment().subscribe({
      next: (data: any) => {

        const response = data;

        localStorage.setItem(
          'payment',
          this.userService.encrypt(JSON.stringify(response))
        );

        this.paymentService.actif = response.actif;
        this.paymentService.credit = Number(response.credit || 0);

        console.log('Paiement :', response);

        // ==========================================
        // ABONNEMENT ENCORE VALIDE
        // ==========================================
        if (response.actif === true) {

          this.closeModalSafe('paiementWave');
          this.closeModalSafe('modalPaiementLayout');
          this.closeModalSafe('modalPaie');

          return;
        }

        // ==========================================
        // ABONNEMENT EXPIRÉ
        // ==========================================
        //
        // Même s'il reste des crédits,
        // ON AFFICHE LE MODAL.
        //
        this.closeModalSafe('paiementWave');
        this.closeModalSafe('modalPaiementLayout');

        this.showModalSafe('modalPaie');
      },

      error: (err) => {

        console.error(
          'Erreur récupération paiement :',
          err
        );

      }
    });
  }

  updateCredit(): void {

    if (this.isUpdatingCredit) {
      return;
    }

    if (Number(this.paymentService.credit) <= 0) {
      return;
    }

    this.isUpdatingCredit = true;

    this.paymentService.updateCredit().subscribe({

      next: (data: any) => {

        // Nouveau solde venant de Laravel
        this.paymentService.credit = Number(data.credit);

        this.isUpdatingCredit = false;

        // Fermer les modals
        this.closeModalSafe('modalPaie');
        this.closeModalSafe('modalPaiementLayout');
        this.closeModalSafe('paiementWave');
      },

      error: (err) => {

        this.isUpdatingCredit = false;

        if (err.status === 402) {

          this.paymentService.credit = 0;

          // Pas de crédit => afficher le paiement
          this.showModalSafe('modalPaie');

          return;
        }

        console.error(
          'Erreur consommation crédit :',
          err
        );
      }
    });
  }

  private showModalSafe(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
  }

  private closeModalSafe(id: string): void {

    const el = document.getElementById(id);

    if (!el) {
      return;
    }

    const instance =
      bootstrap.Modal.getInstance(el) ||
      new bootstrap.Modal(el);

    instance.hide();

    // Nettoyage après fermeture
    setTimeout(() => {

      el.classList.remove('show');

      el.style.display = 'none';

      el.setAttribute('aria-hidden', 'true');

      el.removeAttribute('aria-modal');
      el.removeAttribute('role');

      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });

      document.body.classList.remove('modal-open');

      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');

    }, 300);
  }

  logout(): void {

    // La prochaine connexion sera une nouvelle session
    sessionStorage.removeItem(this.creditSessionKey);

    this.closeModalSafe('modalPaie');
    this.closeModalSafe('modalPaiementLayout');
    this.closeModalSafe('paiementWave');

    this.userService.logout();
  }

  /*getPayment() {
    this.paymentService.getPayment().subscribe((data) => {
      let response: any = data;
      localStorage.removeItem('payment');
      localStorage.setItem('payment', this.userService.encrypt(JSON.stringify(response)));
      this.paymentService.actif = response.actif;
      this.paymentService.credit = response.credit;
      if (!this.paymentService.actif) {
        $('#modalPaie').modal('toggle');
      }
    });
  }*/

  getApiWave(mois: number): void {

    const url =
      `${window.location.origin}/server/public/index.php/wave/${mois}`;

    console.log('Redirection Wave :', url);

    window.location.assign(url);
  }
  /*updateCredit() {
    this.paymentService.updateCredit().subscribe({
      next: (data: any) => {
        this.paymentService.credit = data.credit;
        $('#modalPaie').modal('hide');
        $('#modalPaiementLayout').modal('hide');
      },
      error: (err) => {
        if (err.status === 402) {
          // credits à 0 -> forcer le paiement
          this.paymentService.credit = 0;
          $('#modalPaiementLayout').modal('show'); // garde le choix de paiement ouvert
        }
      }
    });
  }*/

  /*logout() {
    $('#modalPaie').modal('hide');
    $('#modalPaiementLayout').modal('hide');
    this.userService.logout();
  }*/


}

