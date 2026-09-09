import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import r2Service from './service/r2-service';
import oauthService from "./service/oauth-service";
import KvConst from './const/kv-const';

/** 把后台设置的站点标题与网站图标注入 index.html，避免标签页先闪现打包时的默认标题/图标 */
async function serveAssetWithSiteTitle(req, env) {
	const resp = await env.assets.fetch(req);
	const contentType = resp.headers.get('content-type') || '';
	if (!contentType.includes('text/html') || !resp.ok) return resp;
	try {
		const setting = await env.kv.get(KvConst.SETTING, { type: 'json' });
		const title = setting && typeof setting.title === 'string' ? setting.title.trim() : '';
		const icon = setting && typeof setting.siteIcon === 'string' ? setting.siteIcon.trim() : '';
		if (!title && !icon) return resp;
		let html = await resp.text();
		if (title) {
			const safeTitle = title.replace(/[<>&"']/g, '');
			html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
		}
		if (icon) {
			html = html.replace(/(<link[^>]*rel="icon"[^>]*href=")[^"]*(")/i, `$1${icon}$2`);
		}
		const headers = new Headers(resp.headers);
		headers.delete('content-length');
		headers.delete('etag');
		return new Response(html, { status: resp.status, headers });
	} catch (e) {
		return resp;
	}
}

export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			 return await r2Service.toObjResp( { env }, url.pathname.substring(1));
		 }

		if (env.assets) return await serveAssetWithSiteTitle(req, env);
		return new Response('Xi-Mail API is running. Frontend is deployed separately.', {
			status: 200, headers: { 'Content-Type': 'text/plain' }
		});
	},
	email: email,
	async scheduled(c, env, ctx) {
		await verifyRecordService.clearRecord({ env })
		await userService.resetDaySendCount({ env })
		await emailService.completeReceiveAll({ env })
		await emailService.autoClean({ env })
		await oauthService.clearNoBindOathUser({ env })
		await userService.autoBanInactiveUsers({ env })
	},
};
