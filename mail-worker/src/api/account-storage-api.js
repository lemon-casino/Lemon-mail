import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import accountStorageService from '../service/account-storage-service';

app.get('/account/storage/config', async (c) => {
	const data = await accountStorageService.config(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/account/storage/domainCollect', async (c) => {
	const data = await accountStorageService.domainCollect(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/account/storage/collect', async (c) => {
	const data = await accountStorageService.collect(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/account/storage/release', async (c) => {
	const data = await accountStorageService.release(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});
