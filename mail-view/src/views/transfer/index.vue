<template>
  <div class="transfer-box">
    <div class="header-actions">
      <span class="page-title">{{ $t('transferPending') }}</span>
      <Icon class="icon" icon="ion:reload" width="17" height="17" @click="loadAll" />
    </div>

    <el-scrollbar class="scrollbar">
      <div class="content">

        <!-- Initiate Transfer -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:transfer-3-line" width="15" height="15" />
            {{ $t('initiateTransfer') }}
          </div>
          <div class="create-card">
            <div class="create-form">
              <div class="form-field">
                <div class="field-label">{{ $t('transferFromAccount') }}</div>
                <el-select
                  v-model="createForm.accountId"
                  :placeholder="$t('selectAccount')"
                  filterable
                  style="width:100%"
                  :loading="accountsLoading"
                >
                  <el-option
                    v-for="acc in myAccounts"
                    :key="acc.accountId"
                    :label="acc.email"
                    :value="acc.accountId"
                  />
                </el-select>
              </div>
              <div class="form-field">
                <div class="field-label">{{ $t('transferTargetId') }}</div>
                <el-input
                  v-model="createForm.toDisplayId"
                  :placeholder="$t('transferTargetIdPlaceholder')"
                  clearable
                />
              </div>
              <el-button
                type="primary"
                :loading="createLoading"
                :disabled="!createForm.accountId || !createForm.toDisplayId"
                @click="doCreate"
                style="width:100%"
              >
                <Icon icon="mingcute:transfer-3-line" width="16" height="16" style="margin-right:6px" />
                {{ $t('transferAccount') }}
              </el-button>
            </div>
            <div class="create-hint">
              <Icon icon="mingcute:information-line" width="13" height="13" />
              {{ $t('transferHint') }}
            </div>
          </div>
        </div>

        <!-- Incoming requests -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:inbox-2-line" width="15" height="15" />
            {{ $t('transferIncoming') }}
            <el-badge v-if="incomingTransfers.length > 0" :value="incomingTransfers.length" type="danger" style="margin-left:6px" />
          </div>
          <div v-if="!incomingLoading && incomingTransfers.length === 0" class="empty-hint">
            {{ $t('noMoreData') }}
          </div>
          <div v-loading="incomingLoading" element-loading-background="transparent">
            <div
              v-for="item in incomingTransfers"
              :key="item.transferId"
              class="transfer-card incoming"
            >
              <div class="card-left">
                <div class="card-avatar">
                  <Icon icon="hugeicons:mailbox-01" width="16" height="16" />
                </div>
                <div class="card-info">
                  <div class="card-email">{{ item.accountEmail }}</div>
                  <div class="card-time">{{ tzDayjs(item.createTime).format('YYYY-MM-DD HH:mm') }}</div>
                </div>
              </div>
              <div class="card-actions">
                <el-button size="small" type="primary" @click="doAccept(item)">
                  <Icon icon="mingcute:check-line" width="14" height="14" style="margin-right:4px"/>
                  {{ $t('acceptTransfer') }}
                </el-button>
                <el-button size="small" plain @click="doReject(item)">{{ $t('rejectTransfer') }}</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Outgoing requests -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:send-plane-line" width="15" height="15" />
            {{ $t('transferOutgoing') }}
          </div>
          <div v-if="!sentLoading && sentTransfers.length === 0" class="empty-hint">
            {{ $t('noMoreData') }}
          </div>
          <div v-loading="sentLoading" element-loading-background="transparent">
            <div
              v-for="item in sentTransfers"
              :key="item.transferId"
              class="transfer-card"
            >
              <div class="card-left">
                <div class="card-avatar">
                  <Icon icon="hugeicons:mailbox-01" width="16" height="16" />
                </div>
                <div class="card-info">
                  <div class="card-email">{{ item.accountEmail }}</div>
                  <div class="card-time">{{ tzDayjs(item.createTime).format('YYYY-MM-DD HH:mm') }}</div>
                </div>
              </div>
              <el-tag
                :type="item.status === 0 ? 'warning' : item.status === 1 ? 'success' : 'info'"
                size="small"
                round
              >
                {{ $t('transferStatus' + item.status) }}
              </el-tag>
            </div>
          </div>
        </div>

      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, defineOptions } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import {
  transferCreate,
  transferAccept,
  transferReject,
  transferPendingList,
  transferSentList
} from '@/request/account-transfer.js'
import { accountList } from '@/request/account.js'
import { tzDayjs } from '@/utils/day.js'
import { useTransferStore } from '@/store/transfer.js'

defineOptions({ name: 'transfer' })

const { t } = useI18n()
const transferStore = useTransferStore()

const incomingTransfers = ref([])
const sentTransfers = ref([])
const incomingLoading = ref(false)
const sentLoading = ref(false)

// My accounts for initiate transfer
const myAccounts = ref([])
const accountsLoading = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  accountId: null,
  toDisplayId: ''
})

async function loadMyAccounts() {
  accountsLoading.value = true
  try {
    const list = await accountList(0, 200, null)
    myAccounts.value = list
    if (list.length > 0 && !createForm.accountId) {
      createForm.accountId = list[0].accountId
    }
  } finally {
    accountsLoading.value = false
  }
}

async function doCreate() {
  if (!createForm.accountId || !createForm.toDisplayId) return
  createLoading.value = true
  try {
    await transferCreate({ accountId: createForm.accountId, toDisplayId: createForm.toDisplayId })
    ElMessage({ message: t('transferCreateSuccess'), type: 'success', plain: true })
    createForm.toDisplayId = ''
    // Refresh outgoing list
    sentLoading.value = true
    sentTransfers.value = await transferSentList()
    sentLoading.value = false
  } finally {
    createLoading.value = false
  }
}

async function loadAll() {
  incomingLoading.value = true
  sentLoading.value = true
  const [incoming, sent] = await Promise.all([
    transferPendingList(),
    transferSentList()
  ])
  incomingTransfers.value = incoming
  sentTransfers.value = sent
  transferStore.pendingCount = incoming.length
  incomingLoading.value = false
  sentLoading.value = false
}

async function doAccept(item) {
  await transferAccept(item.transferId)
  ElMessage({ message: t('transferAcceptSuccess'), type: 'success', plain: true })
  incomingTransfers.value = incomingTransfers.value.filter(i => i.transferId !== item.transferId)
  transferStore.pendingCount = incomingTransfers.value.length
  // Refresh my accounts (new one added)
  loadMyAccounts()
}

async function doReject(item) {
  await transferReject(item.transferId)
  ElMessage({ message: t('transferRejectSuccess'), type: 'success', plain: true })
  incomingTransfers.value = incomingTransfers.value.filter(i => i.transferId !== item.transferId)
  transferStore.pendingCount = incomingTransfers.value.length
}

onMounted(() => {
  loadAll()
  loadMyAccounts()
})
</script>

<style lang="scss" scoped>
.transfer-box {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header-actions {
  padding: 0 16px;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;

  .page-title {
    flex: 1;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: -0.01em;
  }

  .icon {
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }
}

.scrollbar {
  flex: 1;
}

.content {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 680px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.empty-hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  padding: 12px 0;
}

/* Create transfer card */
.create-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--xi-radius);
  padding: 16px;
  background: var(--el-bg-color);
  box-shadow: var(--xi-shadow-sm);

  .create-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 5px;

    .field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--el-text-color-secondary);
    }
  }

  .create-hint {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-top: 10px;
    line-height: 1.5;
  }
}

/* Transfer record card */
.transfer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--xi-radius);
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 8px;
  background: var(--el-bg-color);
  transition: all 0.2s ease;
  box-shadow: var(--xi-shadow-sm);

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: var(--xi-shadow);
    transform: translateY(-1px);
  }

  &.incoming {
    border-left: 3px solid var(--el-color-primary-light-3);
  }

  .card-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;

    .card-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--el-fill-color-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--el-text-color-secondary);
      flex-shrink: 0;
    }

    .card-info {
      min-width: 0;
      .card-email {
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .card-time {
        font-size: 11px;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
      }
    }
  }

  .card-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 12px;
  }
}
</style>
