import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Magasin {
    id: string;
    nom: string;
    logo: string | null;
    statut: 'trial' | 'active' | 'suspended';
    plan: string | null;
    date_prochaine_echeance: string | null;
    role: string;
    domaine: string | null;
}

@Injectable({ providedIn: 'root' })
export class GatewayService {
    private readonly api = environment.gatewayApi;
    private readonly KEY_TOKEN = 'gateway_token';
    private readonly KEY_NOM = 'gateway_nom';

    constructor(private http: HttpClient) { }

    get token(): string | null {
        return localStorage.getItem(this.KEY_TOKEN);
    }

    get isLoggedIn(): boolean {
        return !!this.token;
    }

    get nom(): string {
        return localStorage.getItem(this.KEY_NOM) ?? '';
    }

    private headers(): HttpHeaders {
        return new HttpHeaders({
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
        });
    }

    login(email: string, password: string) {
        return this.http
            .post<{ token: string; gestionnaire: { id: number; nom: string; email: string } }>(
                `${this.api}/login`,
                { email, password }
            )
            .pipe(
                tap((r) => {
                    localStorage.setItem(this.KEY_TOKEN, r.token);
                    localStorage.setItem(this.KEY_NOM, r.gestionnaire.nom);
                })
            );
    }

    magasins() {
        return this.http.get<Magasin[]>(`${this.api}/magasins`, { headers: this.headers() });
    }

    entrer(tenantId: string) {
        return this.http.post<{ url: string }>(
            `${this.api}/magasins/${encodeURIComponent(tenantId)}/entrer`,
            {},
            { headers: this.headers() }
        );
    }

    logout() {
        const h = this.headers();
        this.clear();
        return this.http.post(`${this.api}/logout`, {}, { headers: h });
    }

    clear(): void {
        localStorage.removeItem(this.KEY_TOKEN);
        localStorage.removeItem(this.KEY_NOM);
    }
}