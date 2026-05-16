import http from '@/axios/index.js'

export function accountList(accountId, size, lastSort) {
    return http.get('/account/list', {params: {accountId, size, lastSort}});
}

export function accountRecoveryList(keyword, size = 100) {
    return http.get('/account/recovery/list', {params: {keyword, size}});
}

export function accountAdd(email,token) {
    return http.post('/account/add', {email,token})
}

export function accountGeneratePrefix(mode, suffix) {
    return http.get('/account/generatePrefix', { params: { mode, suffix } })
}

export function accountSetName(accountId,name) {
    return http.put('/account/setName', {name,accountId})
}

export function accountDelete(accountId) {
    return http.delete('/account/delete', {params: {accountId}})
}

export function accountRestore(accountId) {
    return http.put('/account/restore', {accountId})
}

export function accountSetAllReceive(accountId) {
    return http.put('/account/setAllReceive', {accountId})
}

export function accountSetAsTop(accountId) {
    return http.put('/account/setAsTop', {accountId})
}
