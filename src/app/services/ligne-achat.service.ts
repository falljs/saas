import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LigneAchatService {

  private url = environment.apiUrl;

  private deleted = `${this.url}/ligneachat/delete`;
  private achats = `${this.url}/ligneachat/ligneachats`;
  private achat = `${this.url}/ligneachat/ligneachat`;

  listLigneAchat: any = [];
  listLigneBonAchat: any = [];

  constructor(private http: HttpClient) { }

  delete(id: number): Observable<Object> {
    return this.http.get(`${this.deleted}/${id}`);
  }

  getLigneAchat(id: number): Observable<Object> {
    return this.http.get(`${this.achat}/${id}`);
  }

  getLigneAchats(data: number): Observable<Object> {
    return this.http.get(`${this.achats}/${data}`);
  }

}