import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DossierService {

  private url = environment.apiUrl;

  private created = `${this.url}/dossier/create`;
  private updated = `${this.url}/dossier/update`;
  private deleted = `${this.url}/dossier/delete`;
  private rappel = `${this.url}/dossier/whatsapp-rappel`;
  private gets = `${this.url}/dossier/dossiers`;
  private get = `${this.url}/dossier/dossier`;
  private updatedEtat = `${this.url}/dossier/updateEtat`;
  private search = `${this.url}/dossier/search`;
  private nbrCommDos = `${this.url}/dossier/nombreCommandesDos`;
  private nbrCommDosPay = `${this.url}/dossier/nombreCommandesDosPayer`;
  private nbrCommDosNonPay = `${this.url}/dossier/nombreCommandesDosNonPayer`;

  public listDossiers!: any[];

  constructor(private http: HttpClient) { }

  whatsappRappel(id: number) {
    return this.http.post(`${this.rappel}`, { id });
  }

  /**
   * Mettre à jour le numéro du client/fournisseur
   */
  updatePhone(id: number, phone: string, type: string) {
    return this.http.post(
      `${this.url}/dossier/update-phone`,
      {
        id: id,
        phone: phone,
        type: type
      }
    );
  }

  create(data: Object): Observable<Object> {
    return this.http.post(`${this.created}`, data);
  }

  update(data: Object): Observable<Object> {
    return this.http.post(`${this.updated}`, data);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  delete(id: number): Observable<any> {
    return this.http.get(`${this.deleted}/${id}`, {
      responseType: 'text'
    });
  }

  getDossier(id: number): Observable<Object> {
    return this.http.get(`${this.get}/${id}`);
  }

  getAll(): Observable<any> {
    return this.http.get(`${this.gets}`);
  }

  updateEtat(data: Object): Observable<Object> {
    return this.http.post(`${this.updatedEtat}`, data);
  }

  searchDossier(search: any): Observable<Object> {
    return this.http.get(`${this.search}/${search}`);
  }

  getNbrCommDoss(id: number): Observable<any> {
    return this.http.get(`${this.nbrCommDos}/${id}`);
  }

  getNbrCommDossPayer(id: number): Observable<any> {
    return this.http.get(`${this.nbrCommDosPay}/${id}`);
  }

  getNbrCommDossNonPayer(id: number): Observable<any> {
    return this.http.get(`${this.nbrCommDosNonPay}/${id}`);
  }

  /**
 * =====================================================================
 * À AJOUTER dans ton DossierService existant (celui qui contient déjà
 * l'appel whatsapp-rappel), à côté des méthodes du même style.
 * =====================================================================
 */
  getReleveFactures(id: number, dateDebut?: string, dateFin?: string, statut?: string): Observable<any> {
    const body: any = { id };
    if (dateDebut) { body.date_debut = dateDebut; }
    if (dateFin) { body.date_fin = dateFin; }
    if (statut) { body.statut = statut; } // 'tous' | 'non_solde'

    return this.http.post(`${this.url}/dossier/releve-factures`, body);
  }

}