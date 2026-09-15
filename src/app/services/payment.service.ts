import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private url = environment.apiUrl;

  private index = `${this.url}/payment/index`;
  private counter = `${this.url}/payment/credit`;

  actif: boolean = false;
  joursRestants: number = 0;
  alerte: boolean = false;
  dateExpiration: any = '';
  credit: number = 0;

  constructor(private http: HttpClient) { }

  getPayment(): Observable<Object> {
    return this.http.get(this.index);
  }

  updateCredit(): Observable<Object> {
    return this.http.post(this.counter, {});
  }

  getWaveUrl(mois: number): string {
    return `${environment.serverUrl}/wave/${mois}`;
  }

}