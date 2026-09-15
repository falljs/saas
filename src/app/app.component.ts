import { Component, OnInit } from '@angular/core';

import { ParametreService } from './services/parametre.service';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  deferredPrompt: any = null;
  showInstallButton = false;

  constructor(
    public parametreService: ParametreService,
    public userService: UserService
  ) {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      console.log('✅ beforeinstallprompt déclenché');
      event.preventDefault();
      this.deferredPrompt = event;
      if (!this.isAppInstalled()) {
        this.showInstallButton = true;
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ Application installée');
      this.deferredPrompt = null;
      this.showInstallButton = false;
    });
  }

  ngOnInit(): void {
    // Le nettoyage des corbeilles (commandes, devis, bons, comptes, users, etc.)
    // est désormais géré côté serveur par le cron Laravel (tenants:run corbeille:vider),
    // une fois par nuit pour tous les tenants — plus besoin de le déclencher ici.
  }

  isAppInstalled(): boolean {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    return standalone || iosStandalone;
  }

  async installApplication(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }
    const promptEvent = this.deferredPrompt;
    this.deferredPrompt = null;
    this.showInstallButton = false;
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    console.log('Installation :', result.outcome);
  }
}