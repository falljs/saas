import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { User } from '../models/user';
import * as CryptoJS from 'crypto-js';
import { ParametreService } from './parametre.service';
import { LocalStorageService } from './local-storage.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  // URL dynamique du tenant courant
  private url = environment.apiUrl;

  // URL des images dynamique du tenant courant
  public urlImg = `${environment.serverUrl}/users/`;

  private register = `${this.url}/user/register`;
  private logIn = `${this.url}/user/login`;
  private logOut = `${this.url}/user/logout`;
  private updated = `${this.url}/user/update`;
  private users = `${this.url}/user/users`;
  private oneUser = `${this.url}/user/user`;
  private delete = `${this.url}/user/delete`;
  private userBloked = `${this.url}/user/usersBlocked`;
  private updatePasswordAdmin = `${this.url}/user/updatePasswordAdmin`;
  private updatePasswordUser = `${this.url}/user/updatePasswordUser`;
  private image = `${this.url}/user/image`;
  private search = `${this.url}/user/search`;

  private onRefresh = `${this.url}/user/refresh`;
  private onUpdatePermissonUser = `${this.url}/user/update/permission`;

  public isloggedIn: boolean = false;

  key = "IconeDev";
  user: any;
  name: any;
  listeUtilisateur!: User[];

  private rolesKey = 'user_roles';
  private permissionsKey = 'user_permissions';

  public roles: string[] = [];
  public permissions: string[] = [];
  public allPermissions: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService,
    public localStorageService: LocalStorageService,
    public parametreService: ParametreService
  ) { }

  encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(txt, this.key).toString();
  }

  decrypt(txtToDecrypt: string) {
    return CryptoJS.AES.decrypt(
      txtToDecrypt,
      this.key
    ).toString(CryptoJS.enc.Utf8);
  }

  getUserLoggin() {
    const data: any = localStorage.getItem('user');
    const allPermissions: any = localStorage.getItem('allPermissions');

    this.user = JSON.parse(this.decrypt(data));
    this.allPermissions = JSON.parse(this.decrypt(allPermissions));

    this.roles = this.user.roles;
    this.permissions = this.user.permissions;
    this.name = this.user.prenom + ' ' + this.user.nom;
  }

  isUserLoggedIn(): boolean {
    return this.isloggedIn;
  }

  login(username: string, password: string) {
    return this.http.post(`${this.logIn}`, {
      username,
      password
    });
  }

  logout(): void {
    this.isloggedIn = false;

    const exceptions = ['settingIconeStock'];

    this.localStorageService.clearLocalStorage(exceptions);
    this.tokenService.signOut();

    this.getLogOut().subscribe((data) => { });

    this.router.navigate(['/login']);
  }

  getLogOut(): Observable<Object> {
    return this.http.get(`${this.logOut}`);
  }

  getData(id: number): Observable<Object> {
    return this.http.get(`${this.oneUser}/${id}`);
  }

  onPrint(): Observable<any> {
    return this.http.get(`${this.url}/print`);
  }

  createData(info: Object): Observable<Object> {
    return this.http.post(`${this.register}`, info);
  }

  updateData(value: any): Observable<Object> {
    return this.http.post(`${this.updated}`, value);
  }

  deleteData(id: number): Observable<any> {
    return this.http.get(`${this.delete}/${id}`, {
      responseType: 'text'
    });
  }

  getAll(): Observable<any> {
    return this.http.get(`${this.users}`);
  }

  bloked(data: Object): Observable<Object> {
    return this.http.post(`${this.userBloked}`, data);
  }

  updateAdminPassword(data: Object): Observable<Object> {
    return this.http.post(`${this.updatePasswordAdmin}`, data);
  }

  updateUserPassword(data: Object): Observable<Object> {
    return this.http.post(`${this.updatePasswordUser}`, data);
  }

  updateImage(data: FormData): Observable<any> {
    return this.http.post(`${this.image}`, data);
  }

  searchUser(search: any): Observable<Object> {
    return this.http.get(`${this.search}/${search}`);
  }

  /************** Roles et permissions ******************/

  setRoles(roles: string[]): void {
    this.roles = roles;
    localStorage.setItem(
      this.rolesKey,
      JSON.stringify(roles)
    );
  }

  setPermissions(permissions: string[]): void {
    this.permissions = permissions;
    localStorage.setItem(
      this.permissionsKey,
      JSON.stringify(permissions)
    );
  }

  getRoles(): string[] {
    const roles = localStorage.getItem(this.rolesKey);

    return roles
      ? JSON.parse(roles)
      : [];
  }

  getPermissions(): string[] {
    const permissions = localStorage.getItem(this.permissionsKey);

    return permissions
      ? JSON.parse(permissions)
      : [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  checkPermissionExistence(name: string): boolean {
    return this.user.permissions.some(
      (permission: any) =>
        permission.name.includes(name)
    );
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(
      permission =>
        this.permissions.includes(permission)
    );
  }

  updateUserPermisson(info: Object) {
    return this.http.post(
      `${this.onUpdatePermissonUser}`,
      info,
      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem('token')}`
        }
      }
    ).pipe(
      catchError(error => {
        console.error('Error occurred:', error);

        return throwError(
          () => new Error('Something went wrong')
        );
      })
    );
  }

  refreshRoleAndPermissonsUser(
    id: number
  ): Observable<Object> {

    return this.http.get(
      `${this.onRefresh}/${id}`,
      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
  }
}