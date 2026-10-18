import { environment } from '../../environments/environment';

export const isCentralHost = (): boolean =>
    window.location.hostname === environment.centralHost;

/** Sur app.iconestock.com, on force l'arrivée sur la porte d'entrée. */
export function centralInitializer() {
    return () => {
        if (isCentralHost() && !window.location.hash.startsWith('#/gateway')) {
            window.history.replaceState({}, '', '/#/gateway');
        }
    };
}

/** Sur un magasin : si l'URL contient ?sso=..., on échange le jeton contre une session. */
export function ssoInitializer() {
    return async () => {
        if (isCentralHost()) return;

        const params = new URLSearchParams(window.location.search);
        const jeton = params.get('sso');
        if (!jeton) return;

        // Retirer le jeton de l'URL tout de suite (historique, partage d'écran...)
        params.delete('sso');
        const reste = params.toString();
        window.history.replaceState(
            {},
            '',
            window.location.pathname + (reste ? '?' + reste : '') + window.location.hash
        );

        try {
            const res = await fetch(`${window.location.origin}${environment.tenantApiPath}/sso/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ token: jeton }),
            });
            const texte = await res.text();
            if (!res.ok) throw new Error('HTTP ' + res.status + ' : ' + texte.slice(0, 300));

            const json = JSON.parse(texte);
            if (!json.success) throw new Error('refusé : ' + texte.slice(0, 300));

            saveSession(json.data);
            localStorage.setItem('via_gateway', '1');
        } catch (e) {
            alert('SSO échoué : ' + (e as Error).message);   // plus de redirection
        }
    };
}

/**
 * IMPORTANT : doit ranger la session EXACTEMENT comme ton login actuel.
 * Les clés ci-dessous sont des suppositions : remplace-les par les tiennes.
 */
function saveSession(d: any): void {
    localStorage.setItem('token', d.token);
    localStorage.setItem('user', JSON.stringify(d.user));
    localStorage.setItem('roles', JSON.stringify(d.roles));
    localStorage.setItem('permissions', JSON.stringify(d.permissions));
    localStorage.setItem('allPermissions', JSON.stringify(d.allPermissions));
}