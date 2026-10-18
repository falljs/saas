export const environment = {
  production: true,
  maintenance: false,

  apiUrl: `${window.location.origin}/server/public`,
  serverUrl: `${window.location.origin}/server/public`,
  paymentOrigin: window.location.origin,

  centralHost: 'app.iconestock.com',
  gatewayApi: 'https://app.iconestock.com/server/public/api/gateway',
  tenantApiPath: '/server/public',   // mets '' si ton API est à la racine du domaine
};