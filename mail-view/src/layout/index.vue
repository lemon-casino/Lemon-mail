<template>
  <div class="layout">
    <aside
      class="aside"
      :class="uiStore.asideShow ? 'aside-show' : 'aside-hide'"
    >
      <Aside />
    </aside>
    <div
      :class="(uiStore.asideShow && isMobile) ? 'overlay-show' : 'overlay-hide'"
      @click="uiStore.asideShow = false"
    />
    <div class="main-area">
      <header class="top-bar">
        <Header />
      </header>
      <Main />
    </div>
  </div>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from "@/store/ui.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)

const handleResize = () => {
  isMobile.value = window.innerWidth < 1025
  uiStore.asideShow = window.innerWidth > 1024;
}

onMounted(() => {
  uiStore.writerRef = writerRef
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.layout {
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
}

.aside {
  flex-shrink: 0;
  transition: transform 0.2s ease, opacity 0.2s ease;
  z-index: 101;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  transform: translateX(-100%);
  opacity: 0;
}

.aside-show {
  transform: translateX(0);
  opacity: 1;
  box-shadow: var(--aside-right-border);

  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--aside-backgound);
  }
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
}

.top-bar {
  height: 52px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0;
  background: var(--el-bg-color);
}

.overlay-show {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99;
  transition: opacity 0.25s ease;
  backdrop-filter: blur(2px);
}

.overlay-hide {
  pointer-events: none;
  opacity: 0;
}
</style>
