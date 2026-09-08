import http from '@/axios/index.js'

export function subWorkerList() {
    return http.get('/sub-worker/list')
}

export function subWorkerAdd(data) {
    return http.post('/sub-worker/add', data)
}

export function subWorkerTest(data) {
    return http.post('/sub-worker/test', data)
}

export function subWorkerUpdate(id, data) {
    return http.put('/sub-worker/' + id, data)
}

export function subWorkerDelete(id) {
    return http.delete('/sub-worker/' + id)
}

export function subWorkerSetStatus(id, status) {
    return http.put('/sub-worker/' + id + '/status', { status })
}
