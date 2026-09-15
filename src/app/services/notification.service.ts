import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Notification } from '../models/Notification';

export interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // API du tenant courant
  private apiUrl = `${window.location.origin}/server/public/notification`;

  constructor(private http: HttpClient) { }

  // Récupérer les notifications récentes
  getNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recent`).pipe(
      catchError((error) => {
        console.error('Error fetching notifications:', error);
        return throwError(() => error);
      })
    );
  }

  // Récupérer toutes les notifications
  getAllNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications`).pipe(
      catchError((error) => {
        console.error('Error fetching notifications:', error);
        return throwError(() => error);
      })
    );
  }

  // Marquer une notification comme envoyée
  markAsSent(notificationId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${notificationId}/mark-as-sent`,
      {}
    );
  }

  // Rechercher des notifications
  searchNotifications(term: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/search`,
      {
        params: { term }
      }
    );
  }

}