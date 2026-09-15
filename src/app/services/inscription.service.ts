import { Injectable } from '@angular/core';
import {
    HttpClient
} from '@angular/common/http';

import {
    Observable
} from 'rxjs';

export interface InscriptionData {

    nom_entreprise: string;

    sous_domaine: string;

    email: string;

    password: string;

    password_confirmation: string;

    referral_code?: string | null;

}

export interface InscriptionResponse {

    success: boolean;

    message: string;

    tenant_id: string;

    domain: string;

    login_url: string;

    referral_applied: boolean;

}

@Injectable({
    providedIn: 'root'
})
export class InscriptionService {

    private url =
        `${window.location.origin}/server/public`;

    constructor(
        private http: HttpClient
    ) { }


    inscrire(
        data: InscriptionData
    ): Observable<InscriptionResponse> {

        return this.http.post<InscriptionResponse>(
            `${this.url}/inscription`,
            data
        );

    }

}