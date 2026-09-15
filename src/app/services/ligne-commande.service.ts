import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LigneCommandeService {

  private url = environment.apiUrl;

  private updated = `${this.url}/lignecommande/update`;
  private deleted = `${this.url}/lignecommande/delete`;
  private commandes = `${this.url}/lignecommande/lignecommandes`;
  private commande = `${this.url}/lignecommande/lignecommande`;

  listLigneCommande: any = [];

  constructor(private http: HttpClient) { }

  update(data: Object): Observable<Object> {
    return this.http.post(`${this.updated}`, data);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  delete(id: number): Observable<Object> {
    return this.http.get(`${this.deleted}/${id}`);
  }

  getLigneCommande(id: number): Observable<Object> {
    return this.http.get(`${this.commande}/${id}`);
  }

  getLigneCommandes(data: number): Observable<Object> {
    return this.http.get(`${this.commandes}/${data}`);
  }

}