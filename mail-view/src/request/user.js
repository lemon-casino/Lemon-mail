import http from '@/axios/index.js'


export function userList(params) {
    return http.get('/user/list', {params: {...params}})
}

export function userSetPwd(params) {
    return http.put('/user/setPwd', params)
}

export function userSetStatus(params) {
    return http.put('/user/setStatus', params)
}

export function userSetType(params) {
    return http.put('/user/setType', params)
}


export function userDelete(userIds) {
    return http.delete('/user/delete', {params:{userIds: userIds + ''}})
}

export function userAdd(form) {
    return http.post('/user/add', form)
}

export function userRestSendCount(userId) {
    return http.put('/user/resetSendCount', {userId})
}

export function userRestore(userId,type) {
    return http.put('/user/restore', {userId,type})
}

export function userAllAccount(userId, num, size) {
    return http.get('/user/allAccount', {params:{userId,num,size}})
}

export function userDeleteAccount(accountId) {
    return http.delete('/user/deleteAccount', {params:{accountId}})
}

export function userBatchSetStatus(userIds, status) {
    return http.put('/user/batchSetStatus', { userIds: userIds.join(','), status })
}

export function userBatchRestore(userIds) {
    return http.put('/user/batchRestore', { userIds: userIds.join(',') })
}
