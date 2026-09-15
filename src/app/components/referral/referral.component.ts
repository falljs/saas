import { Component, OnInit } from '@angular/core';
import {
  ReferralResponse,
  ReferralService
} from 'src/app/services/referral.service';

@Component({
  selector: 'app-referral',
  templateUrl: './referral.component.html',
  styleUrls: ['./referral.component.scss']
})
export class ReferralComponent implements OnInit {

  referral: ReferralResponse | null = null;

  loading = true;

  copied = false;

  constructor(
    private referralService: ReferralService
  ) { }

  ngOnInit(): void {
    this.loadReferral();
  }

  loadReferral(): void {

    this.loading = true;

    this.referralService.getReferral()
      .subscribe({

        next: (response: ReferralResponse) => {

          this.referral = response;

          this.loading = false;
        },

        error: (error) => {

          console.error(
            'Erreur chargement parrainage',
            error
          );

          this.loading = false;
        }

      });
  }

  copyReferralLink(): void {

    if (!this.referral?.referral_link) {
      return;
    }

    navigator.clipboard.writeText(
      this.referral.referral_link
    );

    this.copied = true;

    setTimeout(() => {
      this.copied = false;
    }, 2000);
  }

  shareWhatsApp(): void {

    if (!this.referral?.referral_link) {
      return;
    }

    const message =
      `Découvrez IconeStock pour gérer votre stock facilement. ` +
      `Inscrivez-vous avec mon lien et profitez de votre offre : ` +
      `${this.referral.referral_link}`;

    const url =
      `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  }

  async shareReferral(): Promise<void> {

    if (!this.referral?.referral_link) {
      return;
    }

    if (navigator.share) {

      await navigator.share({
        title: 'IconeStock',
        text: 'Découvrez IconeStock avec mon lien de parrainage.',
        url: this.referral.referral_link
      });

    } else {

      this.copyReferralLink();
    }
  }
}