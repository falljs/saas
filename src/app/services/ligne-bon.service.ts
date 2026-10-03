import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LigneBon } from '../models/ligne-bon';

@Injectable({
  providedIn: 'root'
})
export class LigneBonService {

  private url = environment.apiUrl;

  private updated = `${this.url}/lignebon/update`;
  private deleted = `${this.url}/lignebon/delete`;
  private lignebons = `${this.url}/lignebon/lignebons`;
  private lignebon = `${this.url}/lignebon/lignebon`;

  listLigneBon: LigneBon[] = [];

  constructor(private http: HttpClient) { }

  update(data: Object): Observable<Object> {
    return this.http.post(`${this.updated}`, data);
  }

  delete(id: number): Observable<Object> {
    return this.http.get(`${this.deleted}/${id}`);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  getLigneBon(id: number): Observable<Object> {
    return this.http.get(`${this.lignebon}/${id}`);
  }

  getLigneBons(data: number): Observable<Object> {
    return this.http.get(`${this.lignebons}/${data}`);
  }

}