import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';


@Injectable({
  providedIn: 'root'
})
export class ParametreService {

  // API du tenant courant
  private url = environment.apiUrl;

  // URLs centrales IconeStock : NE PAS MODIFIER
  public urlSetting = 'https://iconestock.com/api/setting/iconestock';
  public urlEssaie = 'https://iconestock.com/api/wave/payer_essaie/essaie';

  private urlVider = `${this.url}/automatique`;

  public urlLogo = `${this.url}/parametre/`;

  private setting = `${this.url}/parametre/setting`;
  private updated = `${this.url}/parametre/update`;
  private maintenance = `${this.url}/parametre/maintenance`;
  private logo = `${this.url}/parametre/logo`;
  private models = `${this.url}/parametre/models`;
  private update_model = `${this.url}/parametre/update_model`;

  private payment = `${this.url}/wave/checkout`;
  private credit = `${this.url}/parametre/credit`;
  private updatePay = `${this.url}/parametre/updatePayment`;

  private vider = `${this.urlVider}/vider`;

  date_paye: any = '';
  payement: any = 0;
  counter: any = 0;
  difference: any = 0;
  reste_jour: any = 0;
  checkModalCredit: any = 0;

  parametre: any;

  constructor(private http: HttpClient, private userService: UserService) { }

  getSetting(): Observable<any> {
    return this.http.get(this.setting);
  }

  getSettingIconeStock(): Observable<any> {
    return this.http.get(this.urlSetting);
  }

  getEssaieIconeStock(reference: string): Observable<any> {
    return this.http.get(`${this.urlEssaie}/${reference}`);
  }

  updateData(data: any): Observable<any> {
    return this.http.post(this.updated, data);
  }

  setMaintenance(data: any): Observable<any> {
    return this.http.post(this.maintenance, data);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  updateLogo(formData: FormData): Observable<any> {
    return this.http.post(this.logo, formData);
  }

  onUpdate_model(id: number): Observable<any> {
    return this.http.get(`${this.update_model}/${id}`);
  }

  getModels(): Observable<any> {
    return this.http.get(this.models);
  }

  getPayment(): Observable<any> {
    return this.http.get(this.payment);
  }

  updateCredit(): Observable<any> {
    return this.http.get(this.credit);
  }

  updatePayment(): Observable<any> {
    return this.http.get(this.updatePay);
  }

  updatePaie(): void {
    this.updatePayment().subscribe();
  }

  /* viderCommande(): Observable<any> {
    return this.http.get(`${this.vider}/commande`, {
      responseType: 'text'
    });
  }

  viderDevis(): Observable<any> {
    return this.http.get(`${this.vider}/devis`, {
      responseType: 'text'
    });
  }

  viderBon(): Observable<any> {
    return this.http.get(`${this.vider}/bon`, {
      responseType: 'text'
    });
  }

  viderAchat(): Observable<any> {
    return this.http.get(`${this.vider}/achat`, {
      responseType: 'text'
    });
  }

  viderBonAchat(): Observable<any> {
    return this.http.get(`${this.vider}/bonAchat`, {
      responseType: 'text'
    });
  }

  viderProduit(): Observable<any> {
    return this.http.get(`${this.vider}/produit`, {
      responseType: 'text'
    });
  }

  viderMouvement(): Observable<any> {
    return this.http.get(`${this.vider}/mouvement`, {
      responseType: 'text'
    });
  }

  viderInventaire(): Observable<any> {
    return this.http.get(`${this.vider}/inventaire`, {
      responseType: 'text'
    });
  }

  viderCompte(): Observable<any> {
    return this.http.get(`${this.vider}/compte`, {
      responseType: 'text'
    });
  }

  viderUser(): Observable<any> {
    return this.http.get(`${this.vider}/utilisateur`, {
      responseType: 'text'
    });
  } */

  getParametre(): Observable<any> {
    return this.http.get(`${this.url}/tenant-settings`);
  }

  // parametre.service.ts

  updateModulesActifs(data: { modules_actifs: string[] }): Observable<any> {
    return this.http.put(`${this.url}/parametre/modules`, data);
  }

  /** Lit modules_actifs depuis le setting en cache (pas d'appel réseau) */
  isModuleActive(module: string): boolean {
    const raw = localStorage.getItem('setting');
    if (!raw) return true; // fail-open avant le premier chargement du setting

    try {
      const setting = JSON.parse(this.userService.decrypt(raw));
      const modules: string[] = setting.modules_actifs ?? setting.setting?.modules_actifs ?? [];
      return modules.includes(module);
    } catch {
      return true;
    }
  }

  /** Vrai si au moins un sous-module du groupe est actif — pilote la visibilité du groupe parent */
  hasAnyModuleActive(modules: string[]): boolean {
    return modules.some(m => this.isModuleActive(m));
  }
}