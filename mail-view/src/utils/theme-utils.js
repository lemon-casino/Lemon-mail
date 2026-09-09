import { useUiStore } from "@/store/ui.js";

/** 启动时把持久化的日夜状态应用到 <html>（登录页也能收到同一状态） */
export function applyBootDark() {
	const uiStore = useUiStore();
	document.documentElement.classList.toggle('dark', !!uiStore.dark);
}

/** 切换深浅色并同步 theme-color meta */
export function switchDark(nextIsDark, root) {
	root.setAttribute('class', nextIsDark ? 'dark' : '');
	const metaTag = document.getElementById('theme-color-meta');
	const isMobile = !window.matchMedia("(pointer: fine) and (hover: hover)").matches;
	if (metaTag) {
		metaTag.setAttribute('content', nextIsDark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#FFFFFF' : '#F1F1F1'));
	}
	useUiStore().dark = nextIsDark;
}

/** 带径向视图过渡的日夜切换（header 与登录页共用），e 为点击事件 */
export function openDark(e) {
	const uiStore = useUiStore();
	const nextIsDark = !uiStore.dark;
	const root = document.documentElement;

	if (!document.startViewTransition) {
		switchDark(nextIsDark, root);
		return;
	}

	const x = e.clientX
	const y = e.clientY
	const maxX = Math.max(x, window.innerWidth - x)
	const maxY = Math.max(y, window.innerHeight - y)
	const endRadius = Math.hypot(maxX, maxY)

	root.setAttribute('data-theme-to', nextIsDark ? 'dark' : 'light')
	root.style.setProperty('--vt-x', `${x}px`)
	root.style.setProperty('--vt-y', `${y}px`)
	root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)

	const transition = document.startViewTransition(() => {
		switchDark(nextIsDark, root);
	})

	transition.finished.finally(() => {
		root.removeAttribute('data-theme-to')
	})
}
