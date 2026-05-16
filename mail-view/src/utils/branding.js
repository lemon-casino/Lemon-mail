import { cvtR2Url } from "@/utils/convert.js";

export function getSiteIconUrl(siteIcon) {
    return siteIcon ? cvtR2Url(siteIcon) : '/mail.png';
}

export function applySiteBranding(settings = {}) {
    if (settings.title) {
        document.title = settings.title;
    }

    const iconUrl = getSiteIconUrl(settings.siteIcon);
    const selectors = ['#site-favicon', 'link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];

    selectors.forEach((selector) => {
        const node = document.querySelector(selector);
        if (node) {
            node.setAttribute('href', iconUrl);
        }
    });
}
