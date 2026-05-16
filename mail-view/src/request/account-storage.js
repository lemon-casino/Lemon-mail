import http from '@/axios/index.js';

export function accountStorageConfig(scope) {
  return http.get('/account/storage/config', { params: { scope } });
}

export function accountStorageDomainCollect(scope, domain) {
  return http.post('/account/storage/domainCollect', { scope, domain });
}

export function accountStorageCollect(scope, accountIds) {
  return http.post('/account/storage/collect', { scope, accountIds });
}

export function accountStorageRelease(scope, accountIds) {
  return http.post('/account/storage/release', { scope, accountIds });
}
