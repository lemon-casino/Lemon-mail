import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useServerStore} from "@/store/server.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";

export async function init() {
    // 静态标题由 worker 注入站点标题，这里不再置空，避免标签页闪烁

    // 应用后台设置的网站图标（favicon）
    function applySiteIcon(icon) {
        if (!icon) return;
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = icon;
    }

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();
    const serverStore = useServerStore();

    serverStore.init();

    const token = serverStore.getToken();
    if (!settingStore.lang) {
        let lang = navigator.language.split('-')[0]
        lang = lang === 'zh' ? lang : 'en'
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    if (serverStore.needSetup) {
        removeLoading();
        return;
    }

    let setting = null;

    if (token) {
        const userPromise = loginUserInfo().catch(e => {
            console.error(e);
            return null;
        });

        const [s, user] = await Promise.all([websiteConfig(), userPromise]);
        setting = s;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;
        applySiteIcon(setting.siteIcon);

        if (user) {
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            if (user.lang) {
                settingStore.lang = user.lang;
                i18n.global.locale.value = user.lang;
            }

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        try {
            setting = await websiteConfig();
            settingStore.settings = setting;
            settingStore.domainList = setting.domainList;
            document.title = setting.title;
        applySiteIcon(setting.siteIcon);
        } catch {
            if (!serverStore.isStandalone) {
                serverStore.forceStandalone();
                removeLoading();
                router.replace({ name: 'setup' });
                return;
            }
        }
    }

    removeLoading();
}

function removeLoading() {
    if (window.innerWidth < 1025) {
        document.documentElement.style.setProperty('--loading-hide-transition', 'none')
    }
    const doc = document.getElementById('loading-first');
    doc.classList.add('loading-hide')
    setTimeout(() => {
        doc.remove()
    },1000)
}

