import app from '../hono/hono';
import result from '../model/result';
import orm from '../entity/orm';
import subWorker from '../entity/sub-worker';
import { eq } from 'drizzle-orm';

app.get('/sub-worker/list', async (c) => {
	const rows = await orm(c).select().from(subWorker).all();
	const list = rows.map(r => ({
		...r,
		domains: (() => { try { return JSON.parse(r.domains); } catch { return []; } })(),
		apiToken: '••••••••',
	}));
	return c.json(result.ok(list));
});

app.post('/sub-worker/add', async (c) => {
	const { name, url, apiToken } = await c.req.json();
	if (!name || !url || !apiToken) {
		return c.json(result.fail('name, url, apiToken are required'));
	}
	const normalized = url.replace(/\/+$/, '');

	let domains = [];
	try {
		const res = await fetch(normalized + '/api/info', {
			headers: { 'x-api-token': apiToken },
			signal: AbortSignal.timeout(10000),
		});
		const data = await res.json();
		if (data?.code === 200 && data.data?.domains) {
			domains = data.data.domains;
		}
	} catch {}

	const row = await orm(c).insert(subWorker).values({
		name,
		url: normalized,
		apiToken,
		domains: JSON.stringify(domains),
	}).returning().get();

	return c.json(result.ok({ ...row, domains, apiToken: '••••••••' }));
});

app.post('/sub-worker/test', async (c) => {
	const { url, apiToken } = await c.req.json();
	if (!url || !apiToken) {
		return c.json(result.fail('url, apiToken are required'));
	}
	const normalized = url.replace(/\/+$/, '');
	try {
		const res = await fetch(normalized + '/api/info', {
			headers: { 'x-api-token': apiToken },
			signal: AbortSignal.timeout(10000),
		});
		const data = await res.json();
		if (data?.code === 200) {
			return c.json(result.ok(data.data));
		}
		return c.json(result.fail('Server responded with error'));
	} catch (e) {
		return c.json(result.fail('Connection failed: ' + e.message));
	}
});

app.put('/sub-worker/:id', async (c) => {
	const id = parseInt(c.req.param('id'));
	const body = await c.req.json();
	const patch = {};
	if (body.name) patch.name = body.name;
	if (body.url) patch.url = body.url.replace(/\/+$/, '');
	if (body.apiToken) patch.apiToken = body.apiToken;

	if (patch.url || patch.apiToken) {
		const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
		if (row) {
			const testUrl = patch.url || row.url;
			const testToken = patch.apiToken || row.apiToken;
			try {
				const res = await fetch(testUrl + '/api/info', {
					headers: { 'x-api-token': testToken },
					signal: AbortSignal.timeout(10000),
				});
				const data = await res.json();
				if (data?.code === 200 && data.data?.domains) {
					patch.domains = JSON.stringify(data.data.domains);
				}
			} catch {}
		}
	}

	await orm(c).update(subWorker).set(patch).where(eq(subWorker.id, id)).run();
	return c.json(result.ok());
});

app.delete('/sub-worker/:id', async (c) => {
	const id = parseInt(c.req.param('id'));
	await orm(c).delete(subWorker).where(eq(subWorker.id, id)).run();
	return c.json(result.ok());
});

app.put('/sub-worker/:id/status', async (c) => {
	const id = parseInt(c.req.param('id'));
	const { status } = await c.req.json();
	await orm(c).update(subWorker).set({ status: status ? 1 : 0 }).where(eq(subWorker.id, id)).run();
	return c.json(result.ok());
});

app.get('/sub-worker/:id/mails', async (c) => {
	const id = parseInt(c.req.param('id'));
	const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
	if (!row || !row.status) {
		return c.json(result.fail('Sub-worker not found or disabled'));
	}

	const qs = new URL(c.req.url).search;
	try {
		const res = await fetch(row.url + '/api/mails' + qs, {
			headers: { 'x-api-token': row.apiToken },
			signal: AbortSignal.timeout(15000),
		});
		const data = await res.json();
		return c.json(result.ok(data?.data || data));
	} catch (e) {
		return c.json(result.fail('Proxy failed: ' + e.message));
	}
});

app.get('/sub-worker/:id/mail/:mailId', async (c) => {
	const id = parseInt(c.req.param('id'));
	const mailId = c.req.param('mailId');
	const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
	if (!row || !row.status) {
		return c.json(result.fail('Sub-worker not found or disabled'));
	}

	try {
		const res = await fetch(row.url + '/api/mail/' + mailId, {
			headers: { 'x-api-token': row.apiToken },
			signal: AbortSignal.timeout(15000),
		});
		const data = await res.json();
		return c.json(result.ok(data?.data || data));
	} catch (e) {
		return c.json(result.fail('Proxy failed: ' + e.message));
	}
});
