import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentLinkService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) { }

  createPaymentLink(
    commandeId: number
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/commande/${commandeId}/payment-link`,
      {}
    );
  }

  getPaymentLink(
    commandeId: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/commande/${commandeId}/payment-link`
    );
  }

  confirmPayment(
    paymentId: number
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/payment-link/${paymentId}/confirm`,
      {}
    );
  }
}