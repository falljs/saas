import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {

  private url = environment.apiUrl;

  private created = `${this.url}/commande/create`;
  private updated = `${this.url}/commande/update`;
  private updatedInfo = `${this.url}/commande/updateInfo`;

  private deleted = `${this.url}/commande/delete`;
  private annuler = `${this.url}/commande/annuler`;
  private commandes = `${this.url}/commande/commandes`;
  private com = `${this.url}/commande/commande`;
  private reduce = `${this.url}/commande/reduction`;
  private maxid = `${this.url}/commande/maxId`;
  private search = `${this.url}/commande/search`;

  private searchByDate = `${this.url}/commande/searchByDate`;
  private searchByClient = `${this.url}/commande/searchByClient`;
  private searchByTwoDate = `${this.url}/commande/searchByTwoDate`;
  private commandesToDay = `${this.url}/commande/commandesToDay`;

  // NOUVEAU : routes dédiées à la LISTE des factures (renvoient { commandes: [...] })
  private facturesAll = `${this.url}/commande/factures`;
  private facturesToDay = `${this.url}/commande/factures/today`;
  private facturesByDate = `${this.url}/commande/factures/date`;
  private facturesByTwoDate = `${this.url}/commande/factures/dates`;

  // NOUVEAU : listes de la caisse paginées côté serveur
  private caisseReglementsUrl = `${this.url}/commande/caisse/reglements`;
  private caisseRemboursementsUrl = `${this.url}/commande/caisse/remboursements`;
  private caisseDettesUrl = `${this.url}/commande/caisse/dettes`;

  private nbrCommPayer = `${this.url}/commande/nombreCommandesPayer`;
  private nbrCommEncrs = `${this.url}/commande/nombreCommandesEncours`;
  private nbrCommRest = `${this.url}/commande/nombreCommandesRestant`;
  private nbrCommWave = `${this.url}/commande/nombreCommandesWave`;

  private nbrCommPayerToDay = `${this.url}/commande/nombreCommandesPayerToDay`;
  private nbrCommEncrsToDay = `${this.url}/commande/nombreCommandesEncoursToDay`;
  private nbrCommRestToDay = `${this.url}/commande/nombreCommandesRestantToDay`;

  private nbrCommPayerByDate = `${this.url}/commande/nombreCommandesPayerByDate`;
  private nbrCommEncrsByDate = `${this.url}/commande/nombreCommandesEncoursByDate`;
  private nbrCommRestByDate = `${this.url}/commande/nombreCommandesRestantByDate`;

  private nbrCommPayerByClient = `${this.url}/commande/nombreCommandesPayerByClient`;
  private nbrCommEncrsByClient = `${this.url}/commande/nombreCommandesEncoursByClient`;
  private nbrCommRestByClient = `${this.url}/commande/nombreCommandesRestantByClient`;

  private nbrCommPayerBy2Date = `${this.url}/commande/nombreCommandesPayerByTwoDate`;
  private nbrCommEncrs2Date = `${this.url}/commande/nombreCommandesEncoursByTwoDate`;
  private nbrCommRestBy2Date = `${this.url}/commande/nombreCommandesRestantByTwoDate`;

  private detteToDay = `${this.url}/commande/detteToDay`;
  private detteClient = `${this.url}/commande/dettesearchByClient`;
  private dettes = `${this.url}/commande/dettes`;
  private searchDetteByDate = `${this.url}/commande/searchDetteByDate`;

  listCommande: any[] = [];
  listDette!: any[];
  listDetteBon!: any[];
  commande!: any;
  maxId!: any;
  nbrCmd: number = 0;

  totalVente: number = 0;
  totalAvance: number = 0;
  totalRestant: number = 0;

  constructor(
    private http: HttpClient,
    public router: Router
  ) { }

  /** Charge la liste des factures du jour et calcule les totaux. */
  getCommandesDay() {
    this.totalVente = 0;
    this.totalAvance = 0;
    this.totalRestant = 0;

    this.getFacturesToDay().subscribe({
      next: data => {
        const response: any = data;

        // Accepte { commandes: [...] } ou directement un tableau
        this.listCommande = Array.isArray(response)
          ? response
          : (response?.commandes ?? []);
        this.nbrCmd = this.listCommande.length;

        this.totalVente = this.listCommande.reduce((t: number, c: any) => t + (Number(c.net) || 0), 0);
        this.totalAvance = this.listCommande.reduce((t: number, c: any) => t + (Number(c.versement) || 0), 0);
        this.totalRestant = this.listCommande.reduce((t: number, c: any) => t + (Number(c.restant) || 0), 0);
      },
      error: err => {
        console.error('Erreur chargement des commandes du jour :', err);
        this.listCommande = [];
        this.nbrCmd = 0;
      }
    });
  }

  create(data: Object): Observable<Object> {
    return this.http.post(this.created, data);
  }

  update(data: Object): Observable<Object> {
    return this.http.post(this.updated, data);
  }

  updateInfo(data: Object): Observable<Object> {
    return this.http.post(this.updatedInfo, data);
  }

  delete(id: number): Observable<any> {
    return this.http.get(`${this.deleted}/${id}`, {
      responseType: 'text'
    });
  }

  cancel(id: number): Observable<any> {
    return this.http.get(`${this.annuler}/${id}`, {
      responseType: 'text'
    });
  }

  getCommande(id: number): Observable<Object> {
    return this.http.get(`${this.com}/${id}`);
  }

  /**
   * Recharge une commande avec ses lignes, règlements et client
   * puis synchronise les données utilisées par commande-detail.
   */
  refreshCommande(id: number): Observable<any> {
    return this.getCommande(id);
  }

  // =====================================================================
  // CAISSE (renvoient les TOTAUX, pas la liste des commandes)
  // =====================================================================

  getCommandesToDay(): Observable<any> {
    return this.http.get(this.commandesToDay);
  }

  getCommandes(): Observable<any> {
    return this.http.get(this.commandes);
  }

  getCommandeByDate(date: any): Observable<any> {
    return this.http.get(`${this.searchByDate}/${date}`);
  }

  getCommandeBy2Dates(date1: any, date2: any): Observable<any> {
    return this.http.get(`${this.searchByTwoDate}/${date1}/${date2}`);
  }

  // =====================================================================
  // LISTE DES FACTURES (renvoient { commandes: [...], totaux: {...} })
  // =====================================================================

  getFactures(): Observable<any> {
    return this.http.get(this.facturesAll);
  }

  getFacturesToDay(): Observable<any> {
    return this.http.get(this.facturesToDay);
  }

  getFacturesByDate(date: any): Observable<any> {
    return this.http.get(`${this.facturesByDate}/${date}`);
  }

  getFacturesBy2Dates(date1: any, date2: any): Observable<any> {
    return this.http.get(`${this.facturesByTwoDate}/${date1}/${date2}`);
  }

  // =====================================================================
  // LISTES DE LA CAISSE (paginées côté serveur)
  // date1 / date2 au format dd-MM-yyyy ; absents = tout l'historique
  // =====================================================================

  private caisseParams(
    page: number,
    perPage: number,
    date1?: string,
    date2?: string,
    search?: string
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    if (date1 && date2) {
      params = params.set('date1', date1).set('date2', date2);
    }
    if (search) {
      params = params.set('search', search);
    }
    return params;
  }

  getCaisseReglements(page = 1, perPage = 50, date1?: string, date2?: string, search?: string): Observable<any> {
    return this.http.get(this.caisseReglementsUrl, {
      params: this.caisseParams(page, perPage, date1, date2, search)
    });
  }

  getCaisseRemboursements(page = 1, perPage = 50, date1?: string, date2?: string, search?: string): Observable<any> {
    return this.http.get(this.caisseRemboursementsUrl, {
      params: this.caisseParams(page, perPage, date1, date2, search)
    });
  }

  getCaisseDettes(page = 1, perPage = 50, date1?: string, date2?: string): Observable<any> {
    return this.http.get(this.caisseDettesUrl, {
      params: this.caisseParams(page, perPage, date1, date2)
    });
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  printBon(numero: string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/bon/numero/${numero}`,
      {
        responseType: 'blob'
      }
    );
  }

  getMaxId(): Observable<any> {
    return this.http.get(this.maxid);
  }

  reduction(data: Object): Observable<Object> {
    return this.http.post(this.reduce, data);
  }

  detail(commande: any) {

    this.getCommande(commande.id).subscribe({
      next: (data: any) => {

        const response = data;

        this.commande = response.commande;

        // Nettoyage des anciennes données
        localStorage.removeItem('restant');
        localStorage.removeItem('commande');
        localStorage.removeItem('client');
        localStorage.removeItem('listReglement');
        localStorage.removeItem('listLigneCommande');
        localStorage.removeItem('listReglementDetail');
        localStorage.removeItem('listLigneCommandeDetail');

        // Commande
        localStorage.setItem(
          'commande',
          JSON.stringify(this.commande)
        );

        // Règlements
        localStorage.setItem(
          'listReglementDetail',
          JSON.stringify(response.ligneReglements || [])
        );

        // Lignes
        localStorage.setItem(
          'listLigneCommandeDetail',
          JSON.stringify(response.ligneCommandes || [])
        );

        // Client
        if (response.client) {

          localStorage.setItem(
            'client',
            JSON.stringify(response.client)
          );

        } else {

          localStorage.setItem(
            'client',
            JSON.stringify(this.commande.nom_client)
          );
        }

        this.router.navigate(['/commande-detail']);
      },

      error: (error: any) => {

        console.error(
          'Erreur récupération commande :',
          error
        );

        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les détails de la commande.',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  edit(commande: any) {
    this.getCommande(commande.id).subscribe((data) => {

      let response: any = data;
      this.commande = response.commande;

      localStorage.removeItem('commande');
      localStorage.removeItem('restant');
      localStorage.removeItem('client');
      localStorage.removeItem('listLigneCommande');

      localStorage.setItem(
        'commande',
        JSON.stringify(this.commande)
      );

      localStorage.setItem(
        'listLigneCommande',
        JSON.stringify(response.ligneCommandes)
      );

      if (response.client) {
        localStorage.setItem(
          'client',
          JSON.stringify(response.client)
        );
      } else {
        localStorage.setItem(
          'client',
          JSON.stringify(this.commande.nom_client)
        );
      }

      this.router.navigate(['/commande-edit']);
    });
  }

  searchCommande(search: any): Observable<any> {
    return this.http.get(`${this.search}/${search}`);
  }

  getCommandeByCodeClient(code: string): Observable<any> {
    return this.http.get(`${this.searchByClient}/${code}`);
  }

  getNbrCommandesPayer(): Observable<any> {
    return this.http.get(this.nbrCommPayer);
  }

  getNbrCommandesEncours(): Observable<any> {
    return this.http.get(this.nbrCommEncrs);
  }

  getNbrCommandesRestant(): Observable<any> {
    return this.http.get(this.nbrCommRest);
  }

  getNbrCommandesWave(): Observable<any> {
    return this.http.get(this.nbrCommWave);
  }

  getNbrCommandesPayerToDay(): Observable<any> {
    return this.http.get(this.nbrCommPayerToDay);
  }

  getNbrCommandesEncoursToDay(): Observable<any> {
    return this.http.get(this.nbrCommEncrsToDay);
  }

  getNbrCommandesRestantToDay(): Observable<any> {
    return this.http.get(this.nbrCommRestToDay);
  }

  getNbrCommandesPayerByDate(date: any): Observable<any> {
    return this.http.get(`${this.nbrCommPayerByDate}/${date}`);
  }

  getNbrCommandesEncoursByDate(date: any): Observable<any> {
    return this.http.get(`${this.nbrCommEncrsByDate}/${date}`);
  }

  getNbrCommandesRestantByDate(date: any): Observable<any> {
    return this.http.get(`${this.nbrCommRestByDate}/${date}`);
  }

  getNbrCommandesPayerByClient(code: string): Observable<any> {
    return this.http.get(`${this.nbrCommPayerByClient}/${code}`);
  }

  getNbrCommandesEncoursByClient(code: string): Observable<any> {
    return this.http.get(`${this.nbrCommEncrsByClient}/${code}`);
  }

  getNbrCommandesRestantByClient(code: string): Observable<any> {
    return this.http.get(`${this.nbrCommRestByClient}/${code}`);
  }

  getNbrCommandesPayerBy2Date(
    date1: any,
    date2: any
  ): Observable<any> {
    return this.http.get(
      `${this.nbrCommPayerBy2Date}/${date1}/${date2}`
    );
  }

  getNbrCommandesEncoursBy2Date(
    date1: any,
    date2: any
  ): Observable<any> {
    return this.http.get(
      `${this.nbrCommEncrs2Date}/${date1}/${date2}`
    );
  }

  getNbrCommandesRestantBy2Date(
    date1: any,
    date2: any
  ): Observable<any> {
    return this.http.get(
      `${this.nbrCommRestBy2Date}/${date1}/${date2}`
    );
  }

  getDetteToDay(): Observable<any> {
    return this.http.get(this.detteToDay);
  }

  searchDetteByClient(code: string): Observable<any> {
    return this.http.get(`${this.detteClient}/${code}`);
  }

  getDettes(): Observable<any> {
    return this.http.get(this.dettes);
  }

  getDetteByDate(date: any): Observable<any> {
    return this.http.get(`${this.searchDetteByDate}/${date}`);
  }

  sendFactureWhatsApp(numero: string): Observable<any> {
    return this.http.get(
      `${environment.serverUrl}/send/facture/whatsapp/${numero}`
    );
  }

  printFacture(numero: string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/facture/numero/${numero}`,
      {
        responseType: 'blob'
      }
    );
  }

  printTicket(numero: string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/ticket/numero/${numero}`,
      {
        responseType: 'blob'
      }
    );
  }

  printBordereau(numero: string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/bordereau/numero/${numero}`,
      {
        responseType: 'blob'
      }
    );
  }

  printMouvement(numero: string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/mouvement/numero/${numero}`,
      {
        responseType: 'blob'
      }
    );
  }

  printToDay(userId: number | string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/toDay/caisse?user=${userId}`,
      {
        responseType: 'blob'
      }
    );
  }

  printAll(userId: number | string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/all/caisse?user=${userId}`,
      {
        responseType: 'blob'
      }
    );
  }

  printDate(date: string, userId: number | string): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/date/caisse/${date}?user=${userId}`,
      {
        responseType: 'blob'
      }
    );
  }

  printTwoDate(
    date1: string,
    date2: string,
    userId: number | string
  ): Observable<Blob> {
    return this.http.get(
      `${this.url}/print/twoDate/caisse/${date1}/${date2}?user=${userId}`,
      {
        responseType: 'blob'
      }
    );
  }

}