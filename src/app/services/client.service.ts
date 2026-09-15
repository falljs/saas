import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private url = environment.apiUrl;

  private clients = `${this.url}/client/clients`;
  private client = `${this.url}/client/client`;
  private created = `${this.url}/client/create`;
  private updated = `${this.url}/client/update`;
  private creatCpt = `${this.url}/client/createCompte`;
  private image = `${this.url}/client/image`;
  private deleted = `${this.url}/client/delete`;
  private search = `${this.url}/client/search`;
  private commClt = `${this.url}/client/commandesClient`;

  listClient!: any[];
  public dataForm!: FormGroup;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get(this.clients);
  }

  getData(id: number): Observable<Object> {
    return this.http.get(`${this.client}/${id}`);
  }

  createData(data: Object): Observable<Object> {
    return this.http.post(this.created, data);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  updateData(data: Object): Observable<Object> {
    return this.http.post(this.updated, data);
  }

  createCompte(data: Object): Observable<Object> {
    return this.http.post(this.creatCpt, data);
  }

  updateImage(formData: FormData): Observable<any> {
    return this.http.post(this.image, formData);
  }

  deleteData(id: number): Observable<any> {
    return this.http.get(`${this.deleted}/${id}`, {
      responseType: 'text'
    });
  }

  searchClient(search: any): Observable<Object> {
    return this.http.get(`${this.search}/${search}`);
  }

  getCommClient(code: any): Observable<any> {
    return this.http.get(`${this.commClt}/${code}`);
  }
}