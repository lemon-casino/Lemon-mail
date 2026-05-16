import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTransferStore = defineStore('transfer', () => {
    const pendingCount = ref(0)
    return { pendingCount }
})
