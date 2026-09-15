import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatistiqueService {

  // URL dynamique du tenant courant
  private url = environment.apiUrl;

  private index = `${this.url}/statistique/index`;
  private lignestock = `${this.url}/lignestock/lignestock`;
  private lstByDate = `${this.url}/lignestock/lignestockByDate`;
  private lstBy2Date = `${this.url}/lignestock/lignestockByTwoDate`;

  private clientEndetter = `${this.url}/statistique/clientEndetter`;

  private benefice = `${this.url}/statistique/benefice`;
  private allbenefice = `${this.url}/statistique/allbenefice`;
  private beneficeByDate = `${this.url}/statistique/beneficeByDate`;
  private beneficeBy2Date = `${this.url}/statistique/beneficeBy2Date`;

  constructor(private http: HttpClient) { }

  getVentesParJour(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.url}/statistique/ventes`
    );
  }

  getVentesParJourFexible(
    start?: string,
    end?: string
  ): Observable<any[]> {

    let params: any = {};

    if (start) {
      params.start = start;
    }

    if (end) {
      params.end = end;
    }

    return this.http.get<any[]>(
      `${this.url}/statistique/ventes_flex`,
      { params }
    );
  }

  getInfo(date?: string): Observable<any> {

    const params: any = date
      ? { date }
      : {};

    return this.http.get<any>(
      `${this.index}`,
      { params }
    );
  }

  getMostSeller(): Observable<any> {
    return this.http.get<any>(
      `${this.lignestock}`
    );
  }

  getBenefice(): Observable<any> {
    return this.http.get<any>(
      `${this.benefice}`
    );
  }

  getAllBenefice(): Observable<any> {
    return this.http.get<any>(
      `${this.allbenefice}`
    );
  }

  getBeneficeByDate(date: string): Observable<any> {
    return this.http.get<any>(
      `${this.beneficeByDate}/${date}`
    );
  }

  getBeneficeBy2Date(
    date1: string,
    date2: string
  ): Observable<any> {

    return this.http.get<any>(
      `${this.beneficeBy2Date}/${date1}/${date2}`
    );
  }

  getMostSellerByDate(date: string): Observable<any> {
    return this.http.get<any>(
      `${this.lstByDate}/${date}`
    );
  }

  getMostSellerBy2Date(
    date1: string,
    date2: string
  ): Observable<any> {

    return this.http.get<any>(
      `${this.lstBy2Date}/${date1}/${date2}`
    );
  }

  getCommandesClientEndette(): Observable<any> {
    return this.http.get<any>(
      `${this.clientEndetter}`
    );
  }

  onPrint(): Observable<any> {
    return this.http.get<any>(
      `${this.url}/print`
    );
  }
}