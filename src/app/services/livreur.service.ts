import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class LivreurService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAll(actifs = false) {
    const params = actifs ? new HttpParams().set('actifs', '1') : new HttpParams();
    return this.http.get<any[]>(`${this.url}/livreur/all`, { params });
  }

  create(data: any) { return this.http.post(`${this.url}/livreur/create`, data); }
  update(data: any) { return this.http.post(`${this.url}/livreur/update`, data); }
  toggle(id: number) { return this.http.post(`${this.url}/livreur/toggle`, { id }); }
  delete(id: number) { return this.http.post(`${this.url}/livreur/delete`, { id }); }

  assignerCommande(id: number, livreur_id: number | null) {
    return this.http.post(`${this.url}/commande/livreur`, { id, livreur_id });
  }
}