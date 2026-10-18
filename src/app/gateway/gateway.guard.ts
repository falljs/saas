import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GatewayService } from './gateway.service';

export const gatewayGuard: CanActivateFn = () => {
    const gw = inject(GatewayService);
    const router = inject(Router);
    return gw.isLoggedIn ? true : router.createUrlTree(['/gateway/login']);
};