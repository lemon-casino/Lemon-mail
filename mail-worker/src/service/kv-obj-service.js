const kvObjService = {

	async putObj(c, key, content, metadata) {
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map( key => c.env.kv.delete(key)));
	},

	async toObjResp(c, key) {

		const obj = await c.env.kv.getWithMetadata(key, { type: "arrayBuffer"});

		return new Response(obj.value, {
			headers: {
				'Content-Type': obj.metadata?.contentType || 'application/octet-stream',
				'Content-Disposition': obj.metadata?.contentDisposition || null,
				'Cache-Control': obj.metadata?.cacheControl || null
			}
		});

	}

};

export default kvObjService;
