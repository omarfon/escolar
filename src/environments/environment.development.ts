export const environment = {
  production: false,
  apiUrl: '/api/v1',
  appName: 'EscolarERP',
  version: '1.0.0',
  tokenExpirationWarning: 300,
  sessionTimeout: 3600,
  maxFileSize: 10485760,
  allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  pagination: { defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100] }
};
