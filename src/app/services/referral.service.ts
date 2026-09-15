import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from './token.service';
import { environment } from '../../environments/environment';

export interface ReferralStats {
    total_invites: number;
    en_attente: number;
    convertis: number;
    recompenses: number;
    mois_offerts: number;
}

export interface ReferralItem {
    id: number;
    nom: string;
    date: string;
    statut: 'en_attente' | 'converti';
    recompense_mois: number;
}

export interface ReferralResponse {
    referral_code: string;
    referral_link: string;
    reward_months: number;
    stats: ReferralStats;
    referrals: ReferralItem[];
}

@Injectable({
    providedIn: 'root'
})
export class ReferralService {

    private url = environment.apiUrl;


    constructor(
        private http: HttpClient,
        private tokenService: TokenService
    ) { }

    getReferral(): Observable<ReferralResponse> {

        const token = this.tokenService.getToken();

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });

        return this.http.get<ReferralResponse>(
            `${this.url}/referral`,
            { headers }
        );
    }
}