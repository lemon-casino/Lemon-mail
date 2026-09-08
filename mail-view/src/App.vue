<template>
  <el-config-provider :locale="settingStore.lang === 'zh' ? zhCn : null">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
const { locale } = useI18n()
locale.value = settingStore.lang
watch(() => settingStore.lang, () => locale.value = settingStore.lang)

// Apply color theme to <html> data attribute so CSS variables cascade
function applyTheme(theme) {
  document.documentElement.dataset.colorTheme = theme || 'indigo'
}
applyTheme(settingStore.settings?.colorTheme)
watch(() => settingStore.settings?.colorTheme, applyTheme)
</script>
