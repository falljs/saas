import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class RemboursementService {

    private url = `${environment.apiUrl}/remboursement`;

    constructor(private http: HttpClient) { }

    getRemboursements() {
        return this.http.get(`${this.url}/remboursements`);
    }

    getRemboursementsToday() {
        return this.http.get(`${this.url}/remboursementsToday`);
    }

    getRemboursementsByDate(date: any) {
        return this.http.get(`${this.url}/remboursementsByDate/${date}`);
    }

    createData(data: any) {
        return this.http.post(`${this.url}/create`, data);
    }

    updateData(data: any) {
        return this.http.post(`${this.url}/update`, data);
    }

    valide(data: any) {
        return this.http.post(`${this.url}/valider`, data);
    }

    invalide(data: any) {
        return this.http.post(`${this.url}/invalider`, data);
    }

    deleteData(id: number) {
        return this.http.get(`${this.url}/delete/${id}`);
    }

    search(term: string) {
        return this.http.get(`${this.url}/search/${term}`);
    }
}