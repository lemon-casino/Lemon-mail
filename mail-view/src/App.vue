<template>
  <el-config-provider :locale="settingStore.lang === 'zh' ? zhCn : null">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch } from "vue";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import { applyBootDark } from "@/utils/theme-utils.js";
const settingStore = useSettingStore()
const uiStore = useUiStore()
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
const { locale } = useI18n()
locale.value = settingStore.lang
watch(() => settingStore.lang, () => locale.value = settingStore.lang)

// Restore persisted day/night state so the login page receives the same state
applyBootDark()

// Apply color theme to <html> data attribute so CSS variables cascade
function applyTheme(theme) {
  document.documentElement.dataset.colorTheme = theme || 'indigo'
}
applyTheme(settingStore.settings?.colorTheme)
watch(() => settingStore.settings?.colorTheme, applyTheme)

// Apply login template to <html> so app skins can echo the login atmosphere
function applyLoginTemplate(template) {
  document.documentElement.dataset.loginTemplate = template || 'default'
}
applyLoginTemplate(settingStore.settings?.loginTemplate)
watch(() => settingStore.settings?.loginTemplate, applyLoginTemplate)
</script>
