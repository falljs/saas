import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompteService {

  private url = environment.apiUrl;

  private comptes = `${this.url}/compte/comptes`;
  private compte = `${this.url}/compte/compte`;
  private created = `${this.url}/compte/create`;
  private updated = `${this.url}/compte/update`;
  private deleted = `${this.url}/compte/delete`;
  private search = `${this.url}/compte/search`;
  private createdIn = `${this.url}/compte/createIn`;
  private createdOut = `${this.url}/compte/createOut`;
  private deletedIn = `${this.url}/compte/deleteIn`;
  private deletedOut = `${this.url}/compte/deleteOut`;
  private verser = `${this.url}/compte/verser`;
  private retirer = `${this.url}/compte/retirer`;

  listComptes!: any[];

  constructor(private http: HttpClient) { }

  getAllCompte(): Observable<any> {
    return this.http.get(this.comptes);
  }

  create(data: any): Observable<any> {
    return this.http.post(this.created, data);
  }

  update(data: any): Observable<any> {
    return this.http.post(this.updated, data);
  }

  delete(id: number): Observable<any> {
    return this.http.get(`${this.deleted}/${id}`, {
      responseType: 'text'
    });
  }

  getCompte(id: number): Observable<any> {
    return this.http.get(`${this.compte}/${id}`);
  }

  searchCompte(search: any): Observable<any> {
    return this.http.get(`${this.search}/${search}`);
  }

  createIn(data: any): Observable<any> {
    return this.http.post(this.createdIn, data);
  }

  createOut(data: any): Observable<any> {
    return this.http.post(this.createdOut, data);
  }

  deleteIn(id: number): Observable<any> {
    return this.http.get(`${this.deletedIn}/${id}`);
  }

  deleteOut(id: number): Observable<any> {
    return this.http.get(`${this.deletedOut}/${id}`);
  }

  getVerser(id: number, month: any): Observable<any> {
    return this.http.get(`${this.verser}/${id}/${month}`);
  }

  getRetirer(id: number, month: any): Observable<any> {
    return this.http.get(`${this.retirer}/${id}/${month}`);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

}