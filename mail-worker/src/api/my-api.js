import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
});

app.put('/my/resetPassword', async (c) => {
	await userService.resetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/my/delete', async (c) => {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (userRow && userRow.email === c.env.admin) {
		return c.json(result.fail('The administrator account cannot be deleted / The administrator account cannot be deleted'));
	}
	await userService.delete(c, userId);
	return c.json(result.ok());
});

app.put('/my/lang', async (c) => {
	const { lang } = await c.req.json();
	if (lang && (lang === 'zh' || lang === 'en')) {
		await userService.updateLang(c, userContext.getUserId(c), lang);
	}
	return c.json(result.ok());
});


