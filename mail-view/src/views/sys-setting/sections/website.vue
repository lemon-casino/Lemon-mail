<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('websiteSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ $t('siteIcon') }}</span>
            <el-tooltip effect="dark" :content="$t('siteIconDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <img :src="iconPreview" alt="icon" style="width:32px;height:32px;border-radius:6px;object-fit:cover;border:1px solid var(--el-border-color-lighter)"/>
            <el-button size="small" type="primary" :loading="iconUploading" @click="iconInputRef && iconInputRef.click()">{{ $t('uploadIcon') }}</el-button>
            <el-button v-if="setting.siteIcon" size="small" :loading="iconUploading" @click="resetIcon">{{ $t('restoreIcon') }}</el-button>
            <input ref="iconInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/svg+xml" style="display:none" @change="onIconChange"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('websiteReg') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.register"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('loginDomain') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.loginDomain"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('regKey') }}</span></div>
          <div>
            <el-select
                @change="change"
                :style="`width: ${ locale === 'en' ?  100 : 80 }px;`"
                v-model="setting.regKey"
                placeholder="Select"
            >
              <el-option
                  v-for="item in regKeyOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyHint') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyHintDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyHint"
              :placeholder="$t('regKeyHintPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyHintEn') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyHintEnDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyHintEn"
              :placeholder="$t('regKeyHintEnPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyLink') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyLinkDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyLink"
              :placeholder="$t('regKeyLinkPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('addAccount') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.addEmail"/>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('multipleEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('multipleEmailDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.manyEmail"/>
          </div>
        </div>
        <div class="setting-item">
          <div class="title-item"><span>{{ $t('websiteTitle') }}</span></div>
          <div class="email-title">
            <span>{{ setting.title }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="editTitleShow = true">
              <Icon icon="mingcute:edit-2-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="editTitleShow" :title="$t('changeTitle')"
               @closed="editTitle = setting.title">
      <form>
        <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle"/>
        <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";
import {setSiteIcon, deleteSiteIcon} from "@/request/setting.js";

defineOptions({
  name: 'sys-setting-website'
})

const {t, locale} = useI18n()
const {setting, settingLoading, editSetting, change, beforeChange, onSettingsLoaded, getSettings} = useSysSetting()

const iconInputRef = ref(null)
const iconUploading = ref(false)
const iconPreview = computed(() => {
  const icon = setting.value.siteIcon
  if (!icon) return '/public/mail.png'
  return icon.startsWith('http') ? icon : '/' + icon.replace(/^\//, '')
})

async function onIconChange(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage({message: t('iconTooLarge'), type: 'error', plain: true})
    return
  }
  iconUploading.value = true
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await setSiteIcon(base64)
    ElMessage({message: t('saveSuccessMsg'), type: 'success', plain: true})
    onSettingsRefresh()
  } catch (err) {
    ElMessage({message: t('saveFail'), type: 'error', plain: true})
  } finally {
    iconUploading.value = false
  }
}

async function resetIcon() {
  iconUploading.value = true
  try {
    await deleteSiteIcon()
    ElMessage({message: t('saveSuccessMsg'), type: 'success', plain: true})
    onSettingsRefresh()
  } catch (err) {
    ElMessage({message: t('saveFail'), type: 'error', plain: true})
  } finally {
    iconUploading.value = false
  }
}

function onSettingsRefresh() {
  getSettings()
}

const editTitleShow = ref(false)
const editTitle = ref('')

const regKeyEnabled = computed(() => setting.value.regKey === 0 || setting.value.regKey === 2)

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

onSettingsLoaded(() => {
  editTitle.value = setting.value.title
})

function saveTitle() {
  editSetting({title: editTitle.value}).then(ok => {
    if (ok) editTitleShow.value = false
  })
}
</script>

<style scoped lang="scss">
.email-title {
  font-weight: normal !important;
  display: flex;
  gap: 12px;
  align-items: center;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    padding: 6px 12px;
    border-radius: 6px;
    font-family: inherit;
  }

  .el-button {
    margin-top: 0;
  }
}
</style>
