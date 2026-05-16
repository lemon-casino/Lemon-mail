<template>
  <div class="account-box">
    <div class="head-opt">
      <Icon v-if="canAddAccount" class="icon add" icon="ion:add-outline" width="22" height="22" @click="add"/>
      <el-input
        v-model="searchKeyword"
        :placeholder="$t('searchAccount')"
        class="search-input"
        size="small"
        clearable
      >
        <template #prefix>
          <Icon icon="iconoir:search" width="14" height="14" />
        </template>
      </el-input>
      <el-tooltip v-if="isStorageRoute" :content="$t('storageTitle')" placement="top">
        <div class="storage-entry" @click="openStorage">
          <Icon class="icon archive" icon="solar:archive-minimalistic-outline" width="18" height="18" />
          <span v-if="collectedCount" class="storage-badge">{{ collectedCount }}</span>
        </div>
      </el-tooltip>
      <el-tooltip v-if="canRecoverAccount" :content="$t('accountRecoveryTitle')" placement="top">
        <div class="storage-entry recovery-entry" @click="openRecovery">
          <Icon class="icon archive" icon="mdi:restore" width="18" height="18" />
        </div>
      </el-tooltip>
      <Icon class="icon refresh" icon="ion:reload" width="16" height="16" @click="refresh"/>
    </div>

    <el-scrollbar class="scrollbar" ref="scrollbarRef">
      <div v-infinite-scroll="getAccountList" :infinite-scroll-distance="400" :infinite-scroll-immediate="false">
        <!-- Account rows -->
        <div
          v-for="item in filteredAccounts"
          :key="item.accountId"
          class="account-row"
          :class="{ 'row-active': accountStore.currentAccountId === item.accountId }"
          @click="changeAccount(item)"
        >
          <div class="row-left">
            <div class="row-icon" @click.stop="setAllReceive(item)">
              <Icon
                v-if="!item.allReceive"
                icon="eva:email-fill"
                width="15" height="15"
                class="icon-inbox"
              />
              <Icon
                v-else
                icon="flat-color-icons:folder"
                width="15" height="15"
              />
            </div>
            <span class="row-email">{{ item.email }}</span>
          </div>
          <div class="row-actions" @click.stop>
            <Icon
              icon="fluent-color:clipboard-24"
              width="16" height="16"
              class="action-icon"
              @click.stop="copyAccount(item.email)"
            />
            <el-dropdown trigger="click" placement="bottom-end">
              <Icon
                icon="mingcute:more-1-fill"
                width="16" height="16"
                class="action-icon"
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="hasPerm('email:send')" @click="openSetName(item)">{{ $t('rename') }}</el-dropdown-item>
                  <el-dropdown-item v-if="item.accountId !== userStore.user.account.accountId" @click="setAsTop(item)">{{ $t('pin') }}</el-dropdown-item>
                  <el-dropdown-item
                    v-if="item.accountId !== userStore.user.account.accountId && hasPerm('account:delete')"
                    @click="remove(item)"
                  >{{ $t('delete') }}</el-dropdown-item>
                  <el-dropdown-item @click="openTransfer(item)">{{ $t('transferAccount') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- No search results -->
        <div v-if="searchKeyword && filteredAccounts.length === 0 && !showAccountLoading" class="empty-search">
          <Icon icon="iconoir:search" width="22" height="22" />
          <span>{{ $t('noMessagesFound') }}</span>
        </div>

        <!-- Initial Loading Skeleton -->
        <template v-if="showAccountLoading">
          <div v-for="i in skeletonRows" :key="i" class="skeleton-row">
            <el-skeleton animated>
              <template #template>
                <div style="display:flex;align-items:center;gap:8px;padding:0 10px;">
                  <el-skeleton-item variant="circle" style="width:16px;height:16px;flex-shrink:0"/>
                  <el-skeleton-item variant="text" style="flex:1;height:14px"/>
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <!-- Follow Loading Skeleton -->
        <template v-if="accounts.length > 0 && !noLoading && !searchKeyword && !showAccountLoading">
          <div class="skeleton-row">
            <el-skeleton animated>
              <template #template>
                <div style="display:flex;align-items:center;gap:8px;padding:0 10px;">
                  <el-skeleton-item variant="circle" style="width:16px;height:16px;flex-shrink:0"/>
                  <el-skeleton-item variant="text" style="flex:1;height:14px"/>
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <div v-if="isStorageRoute && storageReady && noLoading && visibleAccounts.length === 0 && accounts.length > 0 && !searchKeyword" class="storage-empty">
          <span>{{ $t('storageAllCollected') }}</span>
          <el-button size="small" text type="primary" @click="openStorage">{{ $t('storageOpenAction') }}</el-button>
        </div>

        <div class="foot-tip" v-if="noLoading && activeAccounts.length > 0 && !searchKeyword">
          {{ activeAccounts.length }} {{ $t('accountTotal') }}
          <span v-if="isStorageRoute && collectedCount" class="foot-tip-meta">/ {{ collectedCount }} {{ $t('collectedMailboxes') }}</span>
        </div>
        <div class="empty" v-if="noLoading && accounts.length === 0 && !showAccountLoading">
          <el-empty :image-size="40" :description="$t('noMessagesFound')"/>
        </div>
      </div>
    </el-scrollbar>

    <!-- Add dialog -->
    <el-dialog v-model="showAdd" class="account-base-dialog" :title="$t('addAccount')">
      <div class="add-form">
        <div class="add-field">
          <label class="field-label">{{ $t('prefixMode') }}</label>
          <el-radio-group v-model="prefixMode" size="small" class="prefix-mode-group">
            <el-radio-button
              v-for="item in prefixModeOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="add-field">
          <label class="field-label">{{ $t('emailAccount') }}</label>
          <el-input
            v-model="addForm.email"
            ref="addRef"
            type="text"
            :placeholder="$t('emailAccount')"
            autocomplete="off"
          >
            <template #suffix>
              <el-tooltip :content="$t(prefixMode === 'word' ? 'wordPrefix' : 'randomPrefix')" placement="top">
                <Icon
                  icon="mingcute:refresh-2-line"
                  width="16" height="16"
                  class="rand-icon"
                  :class="{ loading: prefixGenerating }"
                  @click.stop="generatePrefix"
                />
              </el-tooltip>
            </template>
          </el-input>
        </div>
        <div class="add-field">
          <label class="field-label">{{ $t('select') }}</label>
          <el-select v-model="addForm.suffix" style="width: 100%">
            <el-option v-for="item in domainList" :key="item" :label="item" :value="item"/>
          </el-select>
        </div>
        <div class="email-preview" v-if="addForm.email">
          <Icon icon="mingcute:mail-line" width="13" height="13" />
          <span>{{ addForm.email }}{{ addForm.suffix }}</span>
        </div>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading">{{ $t('add') }}</el-button>
      </div>
      <div
        class="add-email-turnstile"
        :class="verifyShow ? 'turnstile-show' : 'turnstile-hide'"
        :data-sitekey="settingStore.settings.siteKey"
        data-callback="onTurnstileSuccess"
        data-error-callback="onTurnstileError"
      >
        <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
      </div>
    </el-dialog>

    <!-- Rename dialog -->
    <el-dialog v-model="setNameShow" class="account-base-dialog" :title="$t('changeUserName')">
      <div class="container">
        <el-input v-model="accountName" type="text" :placeholder="$t('username')" autocomplete="off"/>
        <el-button class="btn" type="primary" @click="setName" :loading="setNameLoading">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>

    <!-- Recovery dialog -->
    <el-dialog v-model="recoveryShow" class="account-base-dialog account-recovery-dialog" :title="$t('accountRecoveryTitle')">
      <div class="recovery-form">
        <div class="recovery-desc">{{ $t('accountRecoveryDesc') }}</div>
        <el-input
          v-model="recoveryKeyword"
          :placeholder="$t('accountRecoverySearch')"
          clearable
          @clear="loadRecoveryAccounts"
          @keyup.enter="loadRecoveryAccounts"
        >
          <template #append>
            <el-button @click="loadRecoveryAccounts">{{ $t('searchAction') }}</el-button>
          </template>
        </el-input>
        <div v-loading="recoveryLoading" class="recovery-list">
          <div v-for="item in recoveryAccounts" :key="item.accountId" class="recovery-row">
            <div class="recovery-info">
              <span class="recovery-email">{{ item.email }}</span>
              <span class="recovery-time">{{ item.createTime }}</span>
            </div>
            <el-button
              size="small"
              type="primary"
              text
              :loading="recoveryRestoreId === item.accountId"
              @click="restoreAccount(item)"
            >
              {{ $t('restore') }}
            </el-button>
          </div>
          <el-empty
            v-if="!recoveryLoading && recoveryAccounts.length === 0"
            :description="$t('accountRecoveryEmpty')"
            :image-size="60"
          />
        </div>
      </div>
    </el-dialog>

    <!-- Transfer dialog -->
    <el-dialog v-model="transferShow" class="account-base-dialog" :title="$t('transferAccountTitle')" width="400px">
      <div style="display: grid; gap: 12px; padding-bottom: 10px;">
        <div style="font-size: 13px; color: var(--el-text-color-secondary);">{{ $t('transferAccountDesc') }}</div>
        <div style="font-size: 13px;"><b>{{ transferAccount?.email }}</b></div>
        <el-input v-model="transferTargetId" :placeholder="$t('transferTargetIdPlaceholder')" />
        <el-button type="primary" :loading="transferLoading" @click="doTransfer">{{ $t('transferAccount') }}</el-button>
      </div>
    </el-dialog>

    <accountStoragePanel
      v-model="storageDialogVisible"
      :visible-accounts="visibleAccounts"
      :scope-label="storageScopeLabel"
      :collected-groups="collectedGroups"
      :loading="storageBusy"
      @collect-domain="collectDomain"
      @collect-accounts="collectAccounts"
      @release-accounts="releaseAccounts"
    />
  </div>
</template>

<script setup>
import { Icon } from "@iconify/vue";
import { nextTick, reactive, ref, computed, watch } from "vue";
import accountStoragePanel from "@/components/account-storage-panel/index.vue";
import {
  accountList,
  accountRecoveryList,
  accountAdd,
  accountGeneratePrefix,
  accountDelete,
  accountRestore,
  accountSetName,
  accountSetAllReceive,
  accountSetAsTop
} from "@/request/account.js";
import {
  accountStorageCollect,
  accountStorageConfig,
  accountStorageDomainCollect,
  accountStorageRelease,
} from "@/request/account-storage.js";
import { sleep } from "@/utils/time-utils.js";
import { buildAccountStorageState, getAccountDomain } from "@/utils/account-storage.js";
import { isEmail } from "@/utils/verify-utils.js";
import { useSettingStore } from "@/store/setting.js";
import { useAccountStore } from "@/store/account.js";
import { userDraftStore } from "@/store/draft.js";
import { useEmailStore } from "@/store/email.js";
import { useUserStore } from "@/store/user.js";
import { hasPerm } from "@/perm/perm.js";
import { useI18n } from "vue-i18n";
import { AccountAllReceiveEnum } from "@/enums/account-enum.js";
import { transferCreate } from '@/request/account-transfer.js';
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const draftStore = userDraftStore();
const emailStore = useEmailStore();
const canAddAccount = computed(() => {
  return hasPerm('account:add')
    && settingStore.settings?.addEmail === 0
    && settingStore.settings?.manyEmail === 0
    && userStore.user?.addEmailEnabled !== 0;
});
const canRecoverAccount = computed(() => hasPerm('account:delete'));

const showAdd = ref(false);
const addLoading = ref(false);
const prefixGenerating = ref(false);
const domainList = settingStore.domainList;
const accounts = reactive([]);
const noLoading = ref(false);
const loading = ref(false);
const followLoading = ref(false);
const verifyShow = ref(false);
const setNameShow = ref(false);
const setNameLoading = ref(false);
const accountName = ref(null);
const recoveryShow = ref(false);
const recoveryLoading = ref(false);
const recoveryRestoreId = ref(0);
const recoveryKeyword = ref('');
const recoveryAccounts = reactive([]);
const addRef = ref({});
const scrollbarRef = ref({});
const searchKeyword = ref('');
let account = null;
let turnstileId = null;
const botJsError = ref(false);
let verifyToken = '';
let verifyErrorCount = 0;
const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0]
});
const prefixMode = ref('word');
const prefixModeOptions = [
  { label: t('wordPrefix'), value: 'word' },
  { label: t('randomPrefix'), value: 'random' }
];
let skeletonRows = 8;
const queryParams = { size: 50 };
const storageDialogVisible = ref(false);
const storageConfigLoading = ref(false);
const storageMutationLoading = ref(false);
const storageLoadAllLoading = ref(false);
const storageState = reactive({
  loaded: false,
  scope: '',
  rules: [],
  overrides: [],
});

const transferShow = ref(false);
const transferLoading = ref(false);
const transferAccount = ref(null);
const transferTargetId = ref('');
const storageScopeMap = {
  email: 'inbox',
  send: 'sent',
  draft: 'draft',
};
const storageScopeTitleMap = {
  inbox: 'inbox',
  sent: 'sent',
  draft: 'drafts',
};
const currentStorageScope = computed(() => {
  if (storageScopeMap[route.name]) {
    return storageScopeMap[route.name];
  }

  if (route.name === 'content') {
    const scope = String(route.query.storageScope || '').trim().toLowerCase();
    return Object.values(storageScopeMap).includes(scope) ? scope : '';
  }

  return '';
});
const isStorageRoute = computed(() => Boolean(currentStorageScope.value));
const storageScopeLabel = computed(() => {
  if (currentStorageScope.value) {
    return t(storageScopeTitleMap[currentStorageScope.value]);
  }

  if (route.meta?.title) {
    return t(route.meta.title);
  }

  return t('storageTitle');
});
const storageReady = computed(() => (
  !isStorageRoute.value || (storageState.loaded && storageState.scope === currentStorageScope.value)
));
const storageBusy = computed(() => storageConfigLoading.value || storageMutationLoading.value || storageLoadAllLoading.value);
const showAccountLoading = computed(() => loading.value || (isStorageRoute.value && !storageReady.value));
const storageView = computed(() => buildAccountStorageState(accounts, storageState.rules, storageState.overrides));
const visibleAccounts = computed(() => {
  if (!isStorageRoute.value) {
    return accounts;
  }

  if (!storageReady.value) {
    return [];
  }

  return storageView.value.visibleAccounts;
});
const collectedGroups = computed(() => (
  isStorageRoute.value && storageReady.value
    ? storageView.value.collectedGroups
    : []
));
const collectedCount = computed(() => (
  collectedGroups.value.reduce((sum, item) => sum + item.accounts.length, 0)
));
const activeAccounts = computed(() => (isStorageRoute.value ? visibleAccounts.value : accounts));

// Filtered accounts based on search keyword
const filteredAccounts = computed(() => {
  if (!searchKeyword.value) return activeAccounts.value;
  const kw = searchKeyword.value.toLowerCase();
  return activeAccounts.value.filter(a =>
    a.email.toLowerCase().includes(kw) ||
    (a.name && a.name.toLowerCase().includes(kw))
  );
});

function syncAccountStoreAccounts() {
  accountStore.accounts = [...accounts];
}

function upsertAccountToTop(acc) {
  const index = accounts.findIndex(item => item.accountId === acc.accountId);
  if (index > -1) {
    accounts.splice(index, 1);
  }
  accounts.unshift(acc);
  syncAccountStoreAccounts();
}

if (hasPerm('account:query')) {
  getAccountList();
}

watch(currentStorageScope, async (scope) => {
  if (scope) {
    storageState.loaded = false;
    await loadStorageConfig(true);
  } else {
    storageDialogVisible.value = false;
    storageState.loaded = false;
    storageState.scope = '';
    storageState.rules = [];
    storageState.overrides = [];
  }
  ensureSelectedAccount();
}, { immediate: true });

watch(
  () => accounts.map(item => item.accountId).join(','),
  () => {
    if (!isStorageRoute.value) {
      ensureSelectedAccount();
    }
  },
  { immediate: true }
);

watch(
  () => visibleAccounts.value.map(item => item.accountId).join(','),
  () => {
    if (isStorageRoute.value && storageState.loaded) {
      ensureSelectedAccount();
    }
  },
  { immediate: true }
);

watch(() => accountStore.changeUserAccountName, () => {
  if (accounts[0]) accounts[0].name = accountStore.changeUserAccountName;
});

watch(() => addForm.suffix, () => {
  if (showAdd.value) {
    generatePrefix();
  }
});

watch(prefixMode, () => {
  if (showAdd.value) {
    generatePrefix();
  }
});


window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) return;
  verifyErrorCount++;
  console.warn('人机验加载失败', e);
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.add-email-turnstile');
      } else {
        window.turnstile.reset(turnstileId);
      }
    });
  }, 1500);
};

window.onTurnstileSuccess = (token) => { verifyToken = token; };

function getSkeletonRows() {
  if (accounts.length > 15) return skeletonRows = 15;
  if (accounts.length === 0) return skeletonRows = 8;
  skeletonRows = accounts.length;
}

function ensureSelectedAccount() {
  const list = isStorageRoute.value
    ? (storageState.loaded ? visibleAccounts.value : accounts)
    : accounts;

  if (list.length === 0) {
    clearCurrentAccount();
    return;
  }

  const exists = list.some(item => item.accountId === accountStore.currentAccountId);
  if (!exists) {
    changeAccount(list[0]);
  }
}

function clearCurrentAccount() {
  accountStore.currentAccountId = 0;
  accountStore.currentAccount = {};
}

function keepNewAccountVisibleInCurrentScope(acc) {
  if (!storageReady.value || !isStorageRoute.value) {
    return;
  }

  const domain = getAccountDomain(acc?.email);
  if (!domain) {
    return;
  }

  const hasCollectedDomainRule = storageState.rules.some(rule => (
    rule.ruleType === 'domain' && getAccountDomain(rule.ruleValue) === domain
  ));

  if (!hasCollectedDomainRule) {
    return;
  }

  const accountId = Number(acc.accountId);
  const existing = storageState.overrides.find(item => (
    Number(item.accountId) === accountId && item.scope === currentStorageScope.value
  ));

  if (existing) {
    existing.displayState = 'visible';
    existing.sourceType = existing.sourceType || 'new_account_visible';
    return;
  }

  storageState.overrides.push({
    accountId,
    scope: currentStorageScope.value,
    displayState: 'visible',
    sourceType: 'new_account_visible',
  });
}

function setName() {
  let name = accountName.value;
  if (name === account.name) { setNameShow.value = false; return; }
  if (!name) {
    ElMessage({ message: t('emptyUserNameMsg'), type: 'error', plain: true });
    return;
  }
  setNameLoading.value = true;
  accountSetName(account.accountId, name).then(() => {
    account.name = name;
    setNameShow.value = false;
    if (account.accountId === userStore.user.account.accountId) userStore.user.name = name;
    ElMessage({ message: t('saveSuccessMsg'), type: 'success', plain: true });
  }).finally(() => { setNameLoading.value = false; });
}

function openSetName(accountItem) {
  accountName.value = accountItem.name;
  account = accountItem;
  setNameShow.value = true;
}

function setAllReceive(acc) {
  let allReceiveAccount = accounts.find(a => a.allReceive === AccountAllReceiveEnum.ENABLED);
  if (allReceiveAccount && allReceiveAccount.accountId !== acc.accountId) allReceiveAccount.allReceive = AccountAllReceiveEnum.DISABLED;
  acc.allReceive = acc.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
  accountSetAllReceive(acc.accountId).catch(() => {
    acc.allReceive = acc.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
    if (allReceiveAccount) allReceiveAccount.allReceive = AccountAllReceiveEnum.ENABLED;
  }).then(() => {
    if (acc.allReceive === AccountAllReceiveEnum.ENABLED) {
      ElMessage({ message: t('setSuccess'), type: 'success', plain: true });
    }
    changeAccount(acc);
    refreshScopedData();
  });
}

function remove(acc) {
  ElMessageBox.confirm(t('delConfirm', { msg: acc.email }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    accountDelete(acc.accountId).then(() => {
      const index = accounts.findIndex(item => item.accountId === acc.accountId);
      if (index > -1) {
        accounts.splice(index, 1);
      }
      syncAccountStoreAccounts();
      if (accounts.length < queryParams.size) getAccountList();
      ElMessage({ message: t('delSuccessMsg'), type: 'success', plain: true });
    });
  });
}

function openRecovery() {
  recoveryShow.value = true;
  recoveryKeyword.value = '';
  loadRecoveryAccounts();
}

function loadRecoveryAccounts() {
  if (recoveryLoading.value) return;
  recoveryLoading.value = true;
  accountRecoveryList(recoveryKeyword.value).then(list => {
    recoveryAccounts.splice(0, recoveryAccounts.length, ...list);
  }).finally(() => {
    recoveryLoading.value = false;
  });
}

function restoreAccount(acc) {
  ElMessageBox.confirm(t('accountRecoveryConfirm', { msg: acc.email }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    recoveryRestoreId.value = acc.accountId;
    accountRestore(acc.accountId).then(restoredAccount => {
      const index = recoveryAccounts.findIndex(item => item.accountId === acc.accountId);
      if (index > -1) {
        recoveryAccounts.splice(index, 1);
      }
      keepNewAccountVisibleInCurrentScope(restoredAccount);
      upsertAccountToTop(restoredAccount);
      changeAccount(restoredAccount);
      refreshScopedData();
      userStore.refreshUserInfo();
      ElMessage({ message: t('accountRecoverySuccess'), type: 'success', plain: true });
    }).finally(() => {
      recoveryRestoreId.value = 0;
    });
  });
}

function refresh() {
  if (loading.value) return;
  loading.value = false;
  followLoading.value = false;
  noLoading.value = false;
  storageState.loaded = false;
  queryParams.accountId = 0;
  queryParams.lastSort = null;
  getSkeletonRows();
  scrollbarRef.value.setScrollTop(0);
  accounts.splice(0, accounts.length);
  syncAccountStoreAccounts();
  getAccountList();
  if (isStorageRoute.value) {
    loadStorageConfig(true);
  }
}

function changeAccount(acc) {
  accountStore.currentAccountId = acc.accountId;
  accountStore.currentAccount = acc;
}

function add() {
  prefixMode.value = 'word';
  showAdd.value = true;
  addForm.suffix = settingStore.domainList[0];
  addForm.email = '';
  setTimeout(() => { addRef.value.focus(); }, 100);
  nextTick(() => {
    generatePrefix();
  });
}

function setAsTop(acc) {
  accountSetAsTop(acc.accountId).then(() => {
    ElMessage({ message: t('setSuccess'), type: 'success', plain: true });
    const currentIndex = accounts.findIndex(item => item.accountId === acc.accountId);
    const [item] = accounts.splice(currentIndex, 1);
    accounts.splice(1, 0, item);
    syncAccountStoreAccounts();
  });
}

async function copyAccount(email) {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true });
  } catch (err) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true });
  }
}

function getAccountList() {
  if (loading.value || followLoading.value || noLoading.value) return;
  if (accounts.length === 0) { loading.value = true; }
  else { followLoading.value = true; }
  let start = Date.now();
  const accountId = accounts.length > 0 ? accounts.at(-1).accountId : 0;
  const lastSort = accounts.length > 0 ? accounts.at(-1).sort : null;
  accountList(accountId, queryParams.size, lastSort).then(async list => {
    let duration = Date.now() - start;
    if (duration < 200) await sleep(200 - duration);
    if (list.length < queryParams.size) noLoading.value = true;
    if (accounts.length === 0 && list[0]) accountStore.currentAccount = list[0];
    accounts.push(...list);
    syncAccountStoreAccounts();
    loading.value = false;
    followLoading.value = false;
  }).catch(() => {
    loading.value = false;
    followLoading.value = false;
  });
}

async function loadStorageConfig(force = false) {
  if (!isStorageRoute.value || !hasPerm('account:query')) return;
  if (storageConfigLoading.value && !force) return;

  const scope = currentStorageScope.value;
  storageConfigLoading.value = true;
  try {
    const data = await accountStorageConfig(scope);
    storageState.scope = scope;
    storageState.rules = data.rules || [];
    storageState.overrides = data.overrides || [];
    storageState.loaded = true;
  } finally {
    storageConfigLoading.value = false;
  }
}

async function ensureAllAccountsLoaded() {
  if (storageLoadAllLoading.value || noLoading.value) return;

  storageLoadAllLoading.value = true;
  try {
    while (loading.value || followLoading.value) {
      await sleep(60);
    }

    while (!noLoading.value) {
      const lastAccount = accounts.at(-1);
      const list = await accountList(lastAccount?.accountId || 0, queryParams.size, lastAccount?.sort ?? null);
      if (!list.length) {
        noLoading.value = true;
        break;
      }
      accounts.push(...list);
      syncAccountStoreAccounts();
      if (list.length < queryParams.size) {
        noLoading.value = true;
      }
    }
  } finally {
    storageLoadAllLoading.value = false;
  }
}

async function openStorage() {
  storageDialogVisible.value = true;
  await Promise.all([
    loadStorageConfig(true),
    ensureAllAccountsLoaded()
  ]);
}

async function applyStorageMutation(action) {
  storageMutationLoading.value = true;
  try {
    const data = await action();
    storageState.scope = currentStorageScope.value;
    storageState.rules = data.rules || [];
    storageState.overrides = data.overrides || [];
    storageState.loaded = true;
    ensureSelectedAccount();
    refreshScopedData();
  } finally {
    storageMutationLoading.value = false;
  }
}

function collectDomain(domain) {
  applyStorageMutation(() => accountStorageDomainCollect(currentStorageScope.value, domain));
}

function collectAccounts(accountIds) {
  if (!accountIds.length) return;
  applyStorageMutation(() => accountStorageCollect(currentStorageScope.value, accountIds));
}

function releaseAccounts(accountIds) {
  if (!accountIds.length) return;
  applyStorageMutation(() => accountStorageRelease(currentStorageScope.value, accountIds));
}

function refreshScopedData() {
  if (currentStorageScope.value === 'inbox') {
    emailStore.emailScroll?.refreshList();
    return;
  }

  if (currentStorageScope.value === 'sent') {
    emailStore.sendScroll?.refreshList();
    return;
  }

  if (currentStorageScope.value === 'draft') {
    draftStore.refreshList++;
  }
}

function generatePrefix() {
  if (!addForm.suffix || prefixGenerating.value) {
    return;
  }

  prefixGenerating.value = true;
  accountGeneratePrefix(prefixMode.value, addForm.suffix).then(({ prefix }) => {
    addForm.email = prefix;
  }).catch(() => {
    ElMessage({ message: t('prefixGenerateFailed'), type: 'error', plain: true });
  }).finally(() => {
    prefixGenerating.value = false;
  });
}

function openTransfer(item) {
  transferAccount.value = item;
  transferTargetId.value = '';
  transferShow.value = true;
}

async function doTransfer() {
  if (!transferTargetId.value) return;
  transferLoading.value = true;
  try {
    await transferCreate({ accountId: transferAccount.value.accountId, toDisplayId: transferTargetId.value });
    transferShow.value = false;
    ElMessage({ message: t('transferCreateSuccess'), type: 'success', plain: true });
  } finally {
    transferLoading.value = false;
  }
}

function submit() {
  if (!addForm.email) {
    ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true });
    return;
  }
  if (addForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({ message: t('minEmailPrefix', { msg: settingStore.settings.minEmailPrefix }), type: 'error', plain: true });
    return;
  }
  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true });
    return;
  }
  if (!verifyToken && (settingStore.settings.addEmailVerify === 0 || (settingStore.settings.addEmailVerify === 2 && settingStore.settings.addVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true;
      nextTick(() => {
        if (!turnstileId) {
          try { turnstileId = window.turnstile.render('.add-email-turnstile'); }
          catch (e) { botJsError.value = true; }
        } else {
          window.turnstile.reset('.add-email-turnstile');
        }
      });
    } else if (!botJsError.value) {
      ElMessage({ message: t('botVerifyMsg'), type: 'error', plain: true });
    }
    return;
  }
  addLoading.value = true;
  accountAdd(addForm.email + addForm.suffix, verifyToken).then(acc => {
    addLoading.value = false;
    showAdd.value = false;
    addForm.email = '';
    keepNewAccountVisibleInCurrentScope(acc);
    upsertAccountToTop(acc);
    changeAccount(acc);
    verifyToken = '';
    settingStore.settings.addVerifyOpen = acc.addVerifyOpen;
    ElMessage({ message: t('addSuccessMsg'), type: 'success', plain: true });
    verifyShow.value = false;
    userStore.refreshUserInfo();
  }).catch(res => {
    if (res.code === 400) {
      verifyToken = '';
      if (turnstileId) window.turnstile.reset(turnstileId);
      else nextTick(() => { turnstileId = window.turnstile.render('.add-email-turnstile'); });
      verifyShow.value = true;
    }
    addLoading.value = false;
  });
}
</script>

<style>
path[fill="#ffdda1"] { fill: #ffdd7d; }
</style>
<style scoped lang="scss">
.account-box {
  border-right: 1px solid var(--el-border-color-lighter) !important;
  background-color: var(--el-bg-color);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.head-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 8px;
  flex-shrink: 0;

  .icon {
    cursor: pointer;
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }

  .search-input {
    flex: 1;
    min-width: 0;
    :deep(.el-input__wrapper) {
      padding: 0 6px;
      box-shadow: none !important;
      background: var(--base-fill);
      border-radius: var(--xi-radius-sm);
    }
    :deep(.el-input__inner) {
      font-size: 12px;
    }
  }

  .refresh {
    color: var(--el-text-color-placeholder);
    &:hover { color: var(--el-text-color-primary); }
  }

  .storage-entry {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;

    .archive {
      color: var(--el-text-color-secondary);
    }

    &:hover .archive {
      color: var(--el-text-color-primary);
    }
  }

  .storage-badge {
    position: absolute;
    top: -4px;
    right: -5px;
    min-width: 14px;
    height: 14px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--el-color-primary);
    color: #fff;
    font-size: 10px;
    line-height: 14px;
    text-align: center;
  }
}

.scrollbar {
  flex: 1;
  overflow: hidden;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  height: 34px;
  cursor: pointer;
  border-radius: var(--xi-radius-sm);
  margin: 1px 6px;
  transition: all 0.15s ease;
  gap: 4px;

  &:hover {
    background: var(--base-fill);
    .row-actions { opacity: 1; }
  }

  &.row-active {
    background: var(--el-color-primary-light-9);
    .row-email { font-weight: 600; color: var(--el-color-primary); }
    .row-actions { opacity: 1; }
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    flex: 1;

    .row-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      transition: background 0.15s;
      &:hover { background: var(--el-fill-color); }
      .icon-inbox { color: #f59e0b; }
    }

    .row-email {
      font-size: 12.5px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--el-text-color-regular);
      line-height: 1;
    }
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;

    .action-icon {
      cursor: pointer;
      padding: 3px;
      border-radius: 4px;
      color: var(--el-text-color-secondary);
      transition: all 0.15s;
      &:hover {
        background: var(--el-fill-color);
        color: var(--el-text-color-primary);
      }
    }
  }
}

.skeleton-row {
  height: 34px;
  display: flex;
  align-items: center;
  margin: 1px 6px;
}

.foot-tip {
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  padding: 8px 0 6px;
}

.foot-tip-meta {
  color: var(--el-color-warning);
}

.empty-search {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.storage-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 12px 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.btn {
  width: 100%;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recovery-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recovery-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.recovery-list {
  min-height: 120px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--xi-radius-sm);
  background: var(--el-fill-color-blank);
}

.recovery-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: 0;
  }
}

.recovery-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recovery-email {
  font-size: 13px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recovery-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 4px;
}

.add-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .field-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }
}

.prefix-mode-group {
  width: fit-content;
}

.rand-icon {
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  transition: color 0.15s;
  &.loading {
    animation: prefix-spin 0.8s linear infinite;
    pointer-events: none;
  }
  &:hover { color: var(--el-color-primary); }
}

.email-preview {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  font-size: 12.5px;
  color: var(--el-color-primary);
  font-family: monospace;
  border: 1px solid var(--el-border-color-lighter);
}

:deep(.account-base-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}


.add-email-turnstile { margin-top: 15px; }
.turnstile-show { opacity: 1; }
.turnstile-hide {
  opacity: 0;
  pointer-events: none;
  position: fixed;
}

@keyframes prefix-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
