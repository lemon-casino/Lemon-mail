<template>
  <div class="server-mgr">
    <!-- Server list -->
    <div class="server-list" v-if="serverStore.servers.length">
      <div
        v-for="server in serverStore.servers"
        :key="server.id"
        class="server-row"
        :class="{ active: server.id === serverStore.activeServerId }"
      >
        <div class="server-info">
          <div class="server-name-row">
            <span class="server-name">{{ server.name }}</span>
            <span v-if="server.id === serverStore.activeServerId" class="server-badge current">
              {{ $t('serverCurrent') }}
            </span>
            <span
              class="server-badge"
              :class="server.token ? 'online' : 'offline'"
            >
              {{ server.token ? $t('serverOnline') : $t('serverOffline') }}
            </span>
          </div>
          <span class="server-url">{{ server.url }}</span>
        </div>
        <div class="server-actions">
          <el-button
            v-if="server.id !== serverStore.activeServerId"
            size="small"
            @click="switchServer(server.id)"
          >{{ $t('serverSwitch') }}</el-button>
          <el-button
            size="small"
            :loading="testingId === server.id"
            @click="testConnect(server)"
          >{{ $t('serverTestConnect') }}</el-button>
          <el-button
            v-if="!isLocal(server)"
            size="small"
            type="danger"
            plain
            @click="removeServer(server.id)"
          >{{ $t('serverRemove') }}</el-button>
        </div>
      </div>
    </div>
    <div v-else class="server-empty">
      <span>{{ $t('serverEmpty') }}</span>
    </div>

    <!-- Add server form -->
    <div class="server-add">
      <div class="server-add-title">{{ $t('serverAdd') }}</div>
      <div class="server-add-form">
        <el-input
          v-model="newName"
          :placeholder="$t('serverNamePlaceholder')"
          size="default"
          style="flex: 0 0 120px"
        />
        <el-input
          v-model="newUrl"
          :placeholder="$t('serverUrlPlaceholder')"
          size="default"
          style="flex: 1"
          @keyup.enter="addServer"
        />
        <el-button type="primary" :loading="adding" :disabled="!newUrl.trim()" @click="addServer">
          {{ $t('serverAdd') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useServerStore } from '@/store/server.js'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { t } = useI18n()
const serverStore = useServerStore()

const newName = ref('')
const newUrl = ref('')
const adding = ref(false)
const testingId = ref(null)

function isLocal(server) {
  return server.id === 'local'
}

async function addServer() {
  const rawUrl = newUrl.value.trim()
  if (!rawUrl) return

  let apiUrl = rawUrl.replace(/\/+$/, '')
  if (!/^https?:\/\//.test(apiUrl)) apiUrl = 'https://' + apiUrl

  adding.value = true
  try {
    const res = await axios.get(apiUrl + '/setting/websiteConfig', { timeout: 10000 })
    if (res.data?.code === 200) {
      const name = newName.value.trim() || res.data.data?.title || 'Server'
      serverStore.addServer(name, apiUrl)
      newName.value = ''
      newUrl.value = ''
      ElMessage({ message: t('serverConnectSuccess'), type: 'success', plain: true })
    } else {
      ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
    }
  } catch {
    ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
  } finally {
    adding.value = false
  }
}

async function testConnect(server) {
  testingId.value = server.id
  try {
    const res = await axios.get(server.url + '/setting/websiteConfig', { timeout: 10000 })
    if (res.data?.code === 200) {
      serverStore.updateServer(server.id, { connected: true })
      ElMessage({ message: t('serverConnectSuccess'), type: 'success', plain: true })
    } else {
      serverStore.updateServer(server.id, { connected: false })
      ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
    }
  } catch {
    serverStore.updateServer(server.id, { connected: false })
    ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
  } finally {
    testingId.value = null
  }
}

function switchServer(id) {
  serverStore.setActiveServer(id)
}

function removeServer(id) {
  serverStore.removeServer(id)
}
</script>

<style lang="scss" scoped>
.server-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.server-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: border-color 0.15s;

  &.active {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.server-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.server-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.server-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.server-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.6;

  &.current {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  &.online {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }
  &.offline {
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
  }
}

.server-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.server-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.server-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 24px 0;
  font-size: 13px;
  margin-bottom: 16px;
}

.server-add {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 14px;
}

.server-add-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.server-add-form {
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 520px) {
    flex-wrap: wrap;

    > * { flex: 1 1 100% !important; }
  }
}
</style>
