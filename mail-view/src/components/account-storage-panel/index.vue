<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('storageTitle')"
    class="storage-dialog"
    modal-class="storage-dialog-overlay"
    align-center
    :width="dialogWidth"
  >
    <div v-loading="loading" class="storage-shell">
      <div class="storage-hero">
        <div class="hero-copy">
          <div class="hero-title">{{ $t('storageTitle') }}</div>
          <div class="hero-desc">{{ $t('storageDialogIntro', { scope: scopeLabel || $t('inbox') }) }}</div>
        </div>
        <el-tag effect="dark" round type="primary">{{ scopeLabel || $t('inbox') }}</el-tag>
      </div>

      <el-scrollbar class="storage-scroll">
        <div class="storage-root">
          <div class="storage-summary">
            <div class="summary-card">
              <span class="summary-label">{{ $t('visibleMailboxes') }}</span>
              <span class="summary-value">{{ visibleAccounts.length }}</span>
            </div>
            <div class="summary-card summary-warning">
              <span class="summary-label">{{ $t('collectedMailboxes') }}</span>
              <span class="summary-value">{{ collectedCount }}</span>
            </div>
          </div>

          <div class="storage-grid">
            <div class="storage-section">
              <div class="section-head">
                <div>
                  <div class="section-title">{{ $t('visibleMailboxes') }}</div>
                  <div class="section-desc">{{ $t('storageVisibleDesc') }}</div>
                </div>
                <div class="section-actions">
                  <span v-if="selectedIds.length" class="selected-count">{{ $t('selected') }} {{ selectedIds.length }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    :disabled="selectedIds.length === 0 || loading"
                    @click="collectSelected"
                  >
                    {{ $t('collectSelected') }}
                  </el-button>
                </div>
              </div>

              <div v-if="visibleGroups.length" class="domain-list">
                <div v-for="group in visibleGroups" :key="group.domain" class="domain-card">
                  <div class="domain-head">
                    <div>
                      <div class="domain-title">{{ group.domain }}</div>
                      <div class="domain-meta">{{ group.accounts.length }} {{ $t('accountTotal') }}</div>
                    </div>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="loading"
                      @click="emit('collect-domain', group.domain)"
                    >
                      {{ $t('collectByDomain') }}
                    </el-button>
                  </div>

                  <div v-for="item in group.accounts" :key="item.accountId" class="account-row">
                    <el-checkbox
                      :model-value="selectedSet.has(item.accountId)"
                      :disabled="loading"
                      @change="toggleSelection(item.accountId, $event)"
                    />
                    <span class="account-email">{{ item.email }}</span>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="loading"
                      @click="collectSingle(item.accountId)"
                    >
                      {{ $t('collectMailbox') }}
                    </el-button>
                  </div>
                </div>
              </div>

              <el-empty v-else :description="$t('storageEmptyVisible')" :image-size="70" />
            </div>

            <div class="storage-section">
            <div class="section-head">
              <div>
                <div class="section-title">{{ $t('collectedMailboxes') }}</div>
                <div class="section-desc">{{ $t('storageCollectedDesc') }}</div>
              </div>
            </div>

              <div v-if="collectedGroups.length" class="collected-list">
                <div
                  v-for="group in collectedGroups"
                  :key="group.domain"
                  class="domain-card collected-card"
                >
                  <button
                    type="button"
                    class="collected-head"
                    @click="toggleDomain(group.domain)"
                  >
                    <span class="domain-title">{{ group.domain }}</span>
                    <span class="collected-head-right">
                      <span class="domain-meta">{{ group.accounts.length }} {{ $t('accountTotal') }}</span>
                      <Icon
                        :icon="isExpanded(group.domain) ? 'mingcute:up-line' : 'mingcute:down-line'"
                        width="18"
                        height="18"
                      />
                    </span>
                  </button>

                  <div v-if="isExpanded(group.domain)" class="collected-body">
                    <div v-for="item in group.accounts" :key="item.accountId" class="account-row collected-row">
                      <span class="account-email">{{ item.email }}</span>
                      <el-button
                        size="small"
                        text
                        type="primary"
                        :disabled="loading"
                        @click.stop="emit('release-accounts', [item.accountId])"
                      >
                        {{ $t('releaseMailbox') }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <el-empty v-else :description="$t('storageEmptyCollected')" :image-size="70" />
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { groupAccountsByDomain } from '@/utils/account-storage.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  visibleAccounts: {
    type: Array,
    default: () => [],
  },
  scopeLabel: {
    type: String,
    default: '',
  },
  collectedGroups: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'collect-domain',
  'collect-accounts',
  'release-accounts',
]);

const MOBILE_BREAKPOINT = 767;
const STORAGE_DIALOG_MIN_WIDTH = 680;
const STORAGE_DIALOG_MAX_WIDTH = 860;
const STORAGE_DIALOG_EDGE_GAP = 24;
const STORAGE_DIALOG_MOBILE_GAP = 16;
const STORAGE_DIALOG_OVERLAY_LEFT_VAR = '--storage-dialog-overlay-left';
const STORAGE_DIALOG_OVERLAY_RIGHT_VAR = '--storage-dialog-overlay-right';

const selectedIds = ref([]);
const expandedDomains = ref([]);
const viewportWidth = ref(window.innerWidth);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const visibleGroups = computed(() => groupAccountsByDomain(props.visibleAccounts));
const selectedSet = computed(() => new Set(selectedIds.value));
const collectedCount = computed(() => props.collectedGroups.reduce((sum, item) => sum + item.accounts.length, 0));
const dialogWidth = computed(() => {
  if (viewportWidth.value <= MOBILE_BREAKPOINT) {
    return 'calc(100vw - 32px)';
  }

  const layoutOffset = getDesktopLayoutOffset();
  const availableWidth = viewportWidth.value - layoutOffset - STORAGE_DIALOG_EDGE_GAP * 2;
  const width = availableWidth >= STORAGE_DIALOG_MIN_WIDTH
    ? Math.min(STORAGE_DIALOG_MAX_WIDTH, availableWidth)
    : Math.max(320, availableWidth);
  return `${Math.min(width, viewportWidth.value - STORAGE_DIALOG_EDGE_GAP * 2)}px`;
});

watch(
  () => props.visibleAccounts,
  (list) => {
    const validIds = new Set(list.map(item => item.accountId));
    selectedIds.value = selectedIds.value.filter(id => validIds.has(id));
  },
  { deep: true },
);

watch(
  () => props.collectedGroups,
  (groups) => {
    expandedDomains.value = groups.slice(0, 3).map(item => item.domain);
  },
  { immediate: true, deep: true },
);

watch(
  dialogVisible,
  async (visible) => {
    if (visible) {
      await nextTick();
      syncDialogOverlayPosition();
      return;
    }

    resetDialogOverlayPosition();
  },
);

onMounted(() => {
  window.addEventListener('resize', handleResize);
  syncDialogOverlayPosition();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  resetDialogOverlayPosition();
});

function handleResize() {
  viewportWidth.value = window.innerWidth;
  syncDialogOverlayPosition();
}

function getDesktopLayoutOffset() {
  const accountPanel = document.querySelector('.main-box-show > .show');
  const asidePanel = document.querySelector('.layout > .aside.aside-show');
  let offset = 0;

  if (asidePanel) {
    offset = Math.max(offset, Math.round(asidePanel.getBoundingClientRect().right));
  }

  if (accountPanel) {
    offset = Math.max(offset, Math.round(accountPanel.getBoundingClientRect().right));
  }

  return offset;
}

function syncDialogOverlayPosition() {
  const rootStyle = document.documentElement.style;

  if (viewportWidth.value <= MOBILE_BREAKPOINT) {
    rootStyle.setProperty(STORAGE_DIALOG_OVERLAY_LEFT_VAR, `${STORAGE_DIALOG_MOBILE_GAP}px`);
    rootStyle.setProperty(STORAGE_DIALOG_OVERLAY_RIGHT_VAR, `${STORAGE_DIALOG_MOBILE_GAP}px`);
    return;
  }

  const layoutOffset = getDesktopLayoutOffset();
  rootStyle.setProperty(STORAGE_DIALOG_OVERLAY_LEFT_VAR, `${layoutOffset + STORAGE_DIALOG_EDGE_GAP}px`);
  rootStyle.setProperty(STORAGE_DIALOG_OVERLAY_RIGHT_VAR, `${STORAGE_DIALOG_EDGE_GAP}px`);
}

function resetDialogOverlayPosition() {
  const rootStyle = document.documentElement.style;
  rootStyle.removeProperty(STORAGE_DIALOG_OVERLAY_LEFT_VAR);
  rootStyle.removeProperty(STORAGE_DIALOG_OVERLAY_RIGHT_VAR);
}

function toggleSelection(accountId, checked) {
  if (checked && !selectedSet.value.has(accountId)) {
    selectedIds.value.push(accountId);
    return;
  }

  if (!checked) {
    selectedIds.value = selectedIds.value.filter(id => id !== accountId);
  }
}

function collectSelected() {
  emit('collect-accounts', [...selectedIds.value]);
  selectedIds.value = [];
}

function collectSingle(accountId) {
  emit('collect-accounts', [accountId]);
  selectedIds.value = selectedIds.value.filter(id => id !== accountId);
}

function toggleDomain(domain) {
  if (expandedDomains.value.includes(domain)) {
    expandedDomains.value = expandedDomains.value.filter(item => item !== domain);
    return;
  }

  expandedDomains.value.push(domain);
}

function isExpanded(domain) {
  return expandedDomains.value.includes(domain);
}
</script>

<style scoped lang="scss">
:deep(.storage-dialog) {
  max-width: calc(100vw - 32px);
  border-radius: 18px;
  overflow: hidden;
}

:deep(.storage-dialog .el-dialog__body) {
  max-height: calc(100vh - 110px);
  overflow: hidden;
  padding: 12px 20px 20px;
}

:deep(.storage-dialog .el-dialog__header) {
  padding: 18px 20px 0;
  margin-right: 0;
}

:deep(.storage-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
}

.storage-shell {
  display: flex;
  flex-direction: column;
  height: min(760px, calc(100vh - 150px));
}

.storage-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  @media (max-width: 600px) {
    flex-direction: column;
  }
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-title {
  font-size: 16px;
  font-weight: 700;
}

.hero-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.storage-scroll {
  flex: 1;
  min-height: 0;
}

.storage-root {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  padding-right: 4px;
}

.storage-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.storage-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.summary-warning {
  background: #fff7ed;
  border-color: #fed7aa;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.storage-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 320px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color-page);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
}

.section-desc {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.selected-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.collected-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.domain-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}

.domain-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.domain-title {
  font-size: 13px;
  font-weight: 600;
}

.domain-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.account-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 2px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.account-row:first-of-type {
  border-top: 0;
}

.collected-row {
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0 12px;
}

.account-email {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12.5px;
}

.collected-card {
  padding: 0;
  overflow: hidden;
}

.collected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  padding: 12px 14px;
  border: 0;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.collected-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.collected-body {
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.collapse-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>

<style lang="scss">
.storage-dialog-overlay .el-overlay-dialog {
  box-sizing: border-box;
  padding-left: var(--storage-dialog-overlay-left, 24px);
  padding-right: var(--storage-dialog-overlay-right, 24px);
}
</style>
